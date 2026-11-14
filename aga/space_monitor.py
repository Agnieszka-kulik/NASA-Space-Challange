import warnings
import numpy as np
import pandas as pd
import joblib
import wfdb
from scipy.signal import find_peaks
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_recall_fscore_support,
    roc_auc_score,
    log_loss,
    confusion_matrix,
    r2_score,
    mean_squared_error,
    mean_absolute_error,
    max_error,
)

warnings.filterwarnings("ignore")

# ==============================================================================
# 1. EKSTRAKCJA CECH FIZJOLOGICZNYCH Z PHYSIONET (noneeg/1.0.0)
# ==============================================================================

def map_stage_to_label(note: str) -> int:
    note_clean = note.lower().strip()
    if "relax" in note_clean:
        return 0  # Norma / Relaks
    elif "physical" in note_clean:
        return 1  # Wysiłek fizyczny (trening)
    elif "cognitive" in note_clean or "emotional" in note_clean or "stress" in note_clean:
        return 2  # Stres / Obciążenie poznawcze
    return -1


def extract_window_features(fast_win: np.ndarray, slow_win: np.ndarray, fs_fast: int = 8) -> dict:
    """
    Przetwarza okno sygnałów z opaski (domyślnie 30 s):
    - fast_win (8 Hz): [ax, ay, az, temp, eda]
    - slow_win (1 Hz): [SpO2, HR]
    """
    ax, ay, az, temp, eda = fast_win.T
    spo2, hr = slow_win.T

    acc_mag = np.sqrt(ax**2 + ay**2 + az**2)
    acc_std = float(np.nanstd(acc_mag))
    acc_energy = float(np.nanmean((acc_mag - np.nanmean(acc_mag))**2))

    eda_mean = float(np.nanmean(eda))
    eda_std = float(np.nanstd(eda))
    t_axis = np.arange(len(eda)) / fs_fast
    eda_slope = float(np.polyfit(t_axis, np.nan_to_num(eda, nan=eda_mean), 1)[0]) if len(eda) > 1 else 0.0
    peaks, _ = find_peaks(np.nan_to_num(eda, nan=eda_mean), prominence=0.02, distance=fs_fast)
    eda_peaks_per_min = float(len(peaks) * (60.0 / (len(eda) / fs_fast)))

    temp_mean = float(np.nanmean(temp))
    temp_diff = float(temp[-1] - temp[0]) if len(temp) > 1 else 0.0

    hr_mean = float(np.nanmean(hr))
    hr_std = float(np.nanstd(hr))
    hr_rmssd = float(np.sqrt(np.nanmean(np.diff(hr)**2))) if len(hr) > 1 else 0.0
    spo2_mean = float(np.nanmean(spo2))

    return {
        "acc_std": acc_std,
        "acc_energy": acc_energy,
        "eda_mean": eda_mean,
        "eda_std": eda_std,
        "eda_slope": eda_slope,
        "eda_peaks_per_min": eda_peaks_per_min,
        "temp_mean": temp_mean,
        "temp_diff": temp_diff,
        "hr_mean": hr_mean,
        "hr_std": hr_std,
        "hr_rmssd": hr_rmssd,
        "spo2_mean": spo2_mean,
    }


def load_noneeg_base(subjects=range(1, 21), win_sec: int = 30, step_sec: int = 15) -> pd.DataFrame:
    all_rows = []

    for subj_id in subjects:
        rec_fast_name = f"Subject{subj_id}_AccTempEDA"
        rec_slow_name = f"Subject{subj_id}_SpO2HR"

        try:
            rec_fast = wfdb.rdrecord(rec_fast_name, pn_dir="noneeg/1.0.0")
            rec_slow = wfdb.rdrecord(rec_slow_name, pn_dir="noneeg/1.0.0")
            ann = wfdb.rdann(rec_fast_name, "atr", pn_dir="noneeg/1.0.0")
        except Exception as e:
            print(f"[Pominięto] Subject{subj_id}: {e}")
            continue

        sig_fast, sig_slow = rec_fast.p_signal, rec_slow.p_signal
        fs_fast, fs_slow = int(rec_fast.fs), int(rec_slow.fs)

        stage_starts_sec = [s / fs_fast for s in ann.sample]
        stage_ends_sec = stage_starts_sec[1:] + [min(len(sig_fast) / fs_fast, len(sig_slow) / fs_slow)]

        subj_rows = []
        for start_s, end_s, note in zip(stage_starts_sec, stage_ends_sec, ann.aux_note):
            label = map_stage_to_label(note)
            if label == -1:
                continue

            curr = start_s + 15.0
            while curr + win_sec <= end_s:
                f_slice = sig_fast[int(curr * fs_fast): int((curr + win_sec) * fs_fast)]
                s_slice = sig_slow[int(curr * fs_slow): int((curr + win_sec) * fs_slow)]

                if np.isnan(f_slice).mean() < 0.2 and np.isnan(s_slice).mean() < 0.2:
                    feats = extract_window_features(f_slice, s_slice, fs_fast=fs_fast)
                    feats["subject_id"] = subj_id
                    feats["physio_label"] = label
                    subj_rows.append(feats)

                curr += step_sec

        if not subj_rows:
            continue

        df_subj = pd.DataFrame(subj_rows)
        baseline = df_subj[df_subj["physio_label"] == 0]
        for col in ["eda_mean", "hr_mean", "temp_mean", "hr_rmssd"]:
            base_val = baseline[col].median() if not baseline.empty else df_subj[col].median()
            df_subj[f"{col}_delta"] = df_subj[col] - base_val

        all_rows.append(df_subj)
        print(f"Załadowano Subject{subj_id}: {len(df_subj)} okien.")

    return pd.concat(all_rows, ignore_index=True)


# ==============================================================================
# 2. FUZJA DANYCH FIZJOLOGICZNYCH I AKUSTYCZNYCH W JEDEN ZBIÓR TRENINGOWY
# ==============================================================================

def build_unified_dataset(df_physio: pd.DataFrame, second_dataset_csv: str = None) -> pd.DataFrame:
    """
    Łączy cechy fizjologiczne z parametrami hałasu w jeden spójny zbiór (Early Fusion),
    tworząc dwie zmienne docelowe dla jednego modelu:
      - target_stress_level [0..100]: łączny poziom stresu / obciążenia psychofizycznego
      - target_change_location [0 lub 1]: czy czynniki środowiskowe szkodzą i trzeba zmienić miejsce
    """
    rng = np.random.default_rng(42)
    df = df_physio.copy()

    # Bazowy stres fizjologiczny z sygnałów EDA i HR (znormalizowany do 0..100)
    eda_z = np.clip((df["eda_mean_delta"] - df["eda_mean_delta"].min()) /
                    (df["eda_mean_delta"].quantile(0.95) - df["eda_mean_delta"].min() + 1e-6), 0, 1)
    hr_z = np.clip((df["hr_mean_delta"] - df["hr_mean_delta"].min()) /
                   (df["hr_mean_delta"].quantile(0.95) - df["hr_mean_delta"].min() + 1e-6), 0, 1)
    bio_intensity = 0.6 * eda_z + 0.4 * hr_z

    if second_dataset_csv:
        # Jeśli podano drugą bazę CSV (musi mieć kolumny: noise_db, exposure_min, stress_norm [0..1])
        df_ext = pd.read_csv(second_dataset_csv).sort_values("stress_norm").reset_index(drop=True)
        # Dopasowanie kwantylowe po poziomie stresu między obiema bazami
        df["rank_idx"] = (bio_intensity.rank(pct=True) * (len(df_ext) - 1)).astype(int)
        df["noise_db"] = df_ext.loc[df["rank_idx"], "noise_db"].values
        df["exposure_min"] = df_ext.loc[df["rank_idx"], "exposure_min"].values
        df["low_freq_ratio"] = df_ext.get("low_freq_ratio", pd.Series(rng.uniform(0.3, 0.8, len(df)))).values
        df.drop(columns=["rank_idx"], inplace=True)
    else:
        # Generowanie realistycznych scenariuszy środowiskowych (ciche vs głośne moduły ISS)
        # Połowa próbek trafia do strefy cichej (46-58 dBA), połowa do głośnej (61-76 dBA)
        is_noisy_zone = rng.choice([0, 1], size=len(df), p=[0.5, 0.5])
        df["noise_db"] = np.where(
            is_noisy_zone == 1,
            rng.uniform(61.0, 76.0, len(df)),
            rng.uniform(46.0, 58.5, len(df))
        )
        df["exposure_min"] = rng.uniform(5.0, 180.0, len(df))
        df["low_freq_ratio"] = np.where(
            is_noisy_zone == 1,
            rng.uniform(0.50, 0.90, len(df)),
            rng.uniform(0.20, 0.50, len(df))
        )

    # Obliczenie finalnych etykiet docelowych dla jednego modelu
    stress_levels = []
    change_locations = []

    for idx, row in df.iterrows():
        lbl = row["physio_label"]
        db = row["noise_db"]
        exp_m = row["exposure_min"]
        lf = row["low_freq_ratio"]
        bio = bio_intensity.loc[idx]

        # Kara akustyczna (rośnie nieliniowo powyżej 60 dBA oraz przy długiej ekspozycji)
        noise_penalty = max(0.0, (db - 58.0) * 1.1) + (exp_m / 180.0) * 6.0 + lf * 5.0

        if lbl == 0:  # Relaks / Norma
            s_lvl = 12.0 + bio * 18.0 + (noise_penalty * 0.45)
            # Nawet przy dobrym samopoczuciu ekstremalny hałas (>70 dBA przez >60 min) wymaga zmiany miejsca
            relocate = 1 if (db >= 70.0 and exp_m >= 60.0) else 0

        elif lbl == 1:  # Wysiłek fizyczny (wykryty przez akcelerometr!)
            s_lvl = 18.0 + bio * 15.0  # Stres poznawczy niski mimo wysokiego tętna
            relocate = 0  # Nie przerywamy treningu na bieżni z powodu hałasu urządzeń

        else:  # lbl == 2 -> Stres / Spadek koncentracji
            s_lvl = 62.0 + bio * 25.0 + (noise_penalty * 0.55)
            # Zmiana miejsca konieczna, jeśli spadek koncentracji współwystępuje ze szkodliwym hałasem
            relocate = 1 if (db >= 61.0 and (exp_m >= 20.0 or db >= 66.0)) else 0

        stress_levels.append(float(np.clip(s_lvl + rng.normal(0, 2.0), 0.0, 100.0)))
        change_locations.append(int(relocate))

    df["target_stress_level"] = stress_levels
    df["target_change_location"] = change_locations
    return df


# ==============================================================================
# 3. JEDEN ZINTEGROWANY MODEL ML + PEŁNE WSKAŹNIKI JAKOŚCI (WALIDACJA LOSO)
# ==============================================================================

class UnifiedAstronautModel:
    def __init__(self, relocation_threshold: float = 0.50):
        self.relocation_threshold = relocation_threshold
        self.feature_cols = []
        # Pojedynczy wielowyjściowy model drzewiasty (uczy się wspólnie obu celów)
        self.model = RandomForestRegressor(
            n_estimators=300,
            max_depth=10,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        )

    def fit_and_evaluate(self, df: pd.DataFrame) -> dict:
        ignore_cols = ["subject_id", "physio_label", "target_stress_level", "target_change_location"]
        self.feature_cols = [c for c in df.columns if c not in ignore_cols]

        X = df[self.feature_cols].fillna(0.0).values
        Y = df[["target_stress_level", "target_change_location"]].values
        groups = df["subject_id"].values

        # Walidacja Leave-One-Subject-Out (testowanie na nieznanym człowieku)
        logo = LeaveOneGroupOut()
        y_stress_true, y_stress_pred = [], []
        y_reloc_true, y_reloc_prob = [], []

        for train_idx, test_idx in logo.split(X, Y[:, 1], groups):
            fold_model = RandomForestRegressor(
                n_estimators=200, max_depth=10, min_samples_leaf=3, random_state=42, n_jobs=-1
            )
            fold_model.fit(X[train_idx], Y[train_idx])
            preds = fold_model.predict(X[test_idx])

            y_stress_true.extend(Y[test_idx, 0])
            y_stress_pred.extend(np.clip(preds[:, 0], 0.0, 100.0))

            y_reloc_true.extend(Y[test_idx, 1].astype(int))
            y_reloc_prob.extend(np.clip(preds[:, 1], 0.0, 1.0))

        y_stress_true = np.array(y_stress_true)
        y_stress_pred = np.array(y_stress_pred)
        y_reloc_true = np.array(y_reloc_true)
        y_reloc_prob = np.array(y_reloc_prob)
        y_reloc_pred = (y_reloc_prob >= self.relocation_threshold).astype(int)

        # Wskaźniki jakości dla DECYZJI O ZMIANIE MIEJSCA (Klasyfikacja)
        acc = accuracy_score(y_reloc_true, y_reloc_pred)
        bal_acc = balanced_accuracy_score(y_reloc_true, y_reloc_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_reloc_true, y_reloc_pred, average="binary", zero_division=0
        )
        roc_auc = roc_auc_score(y_reloc_true, y_reloc_prob)
        lloss = log_loss(y_reloc_true, np.clip(y_reloc_prob, 1e-6, 1 - 1e-6))
        cm = confusion_matrix(y_reloc_true, y_reloc_pred, labels=[0, 1])

        # Wskaźniki jakości dla POZIOMU STRESU 0-100% (Regresja)
        r2 = r2_score(y_stress_true, y_stress_pred)
        rmse = np.sqrt(mean_squared_error(y_stress_true, y_stress_pred))
        mae = mean_absolute_error(y_stress_true, y_stress_pred)
        m_err = max_error(y_stress_true, y_stress_pred)

        metrics = {
            # Wyjście 1: Zmiana miejsca
            "relocation_accuracy": round(acc, 4),
            "relocation_balanced_accuracy": round(bal_acc, 4),
            "relocation_precision": round(prec, 4),
            "relocation_recall_sensitivity": round(rec, 4),
            "relocation_f1_score": round(f1, 4),
            "relocation_roc_auc": round(roc_auc, 4),
            "relocation_log_loss": round(lloss, 4),
            # Wyjście 2: Poziom stresu (0-100%)
            "stress_r2_score": round(r2, 4),
            "stress_rmse_pct": round(rmse, 4),
            "stress_mae_pct": round(mae, 4),
            "stress_max_error_pct": round(m_err, 4),
        }

        print("\n" + "=" * 70)
        print("WSKAŹNIKI JAKOŚCI ZINTEGROWANEGO MODELU (WALIDACJA LOSO)")
        print("=" * 70)
        print("--- 1. Decyzja: Czy zmienić miejsce? (Klasyfikacja) ---")
        print(f"  Accuracy                     : {metrics['relocation_accuracy']}")
        print(f"  Balanced Accuracy            : {metrics['relocation_balanced_accuracy']}")
        print(f"  Precision                    : {metrics['relocation_precision']}")
        print(f"  Recall (Czułość wykrywania)  : {metrics['relocation_recall_sensitivity']}")
        print(f"  F1-Score                     : {metrics['relocation_f1_score']}")
        print(f"  ROC-AUC                      : {metrics['relocation_roc_auc']}")
        print(f"  Log-Loss                     : {metrics['relocation_log_loss']}")

        print("\nMacierz pomyłek (Zmiana miejsca):")
        print(pd.DataFrame(
            cm,
            index=["Prawda: 0 (Zostań)", "Prawda: 1 (Zmień miejsce)"],
            columns=["Pred: 0 (Zostań)", "Pred: 1 (Zmień miejsce)"]
        ))

        print("\n--- 2. Predykcja: Poziom stresu 0-100% (Regresja) ---")
        print(f"  R² Score                     : {metrics['stress_r2_score']}")
        print(f"  MAE (Średni błąd w pkt %)    : {metrics['stress_mae_pct']}%")
        print(f"  RMSE (Błąd kwadratowy)       : {metrics['stress_rmse_pct']}%")
        print(f"  Max Error                    : {metrics['stress_max_error_pct']}%")

        # Trening finalnego modelu na pełnym zbiorze
        self.model.fit(X, Y)
        return metrics

    def predict_current_user_state(self, user_data: dict) -> dict:
        """
        Sprawdza aktualny stan użytkownika na podstawie jego bieżących odczytów.
        Zwraca poziom stresu (0-100%) oraz decyzję, czy należy zmienić miejsce.
        """
        row_df = pd.DataFrame([user_data])
        # Uzupełnienie ewentualnych brakujących cech pochodnych zerami
        for col in self.feature_cols:
            if col not in row_df.columns:
                row_df[col] = 0.0

        X_curr = row_df[self.feature_cols].fillna(0.0).values
        pred = self.model.predict(X_curr)[0]

        stress_pct = float(np.clip(pred[0], 0.0, 100.0))
        reloc_prob = float(np.clip(pred[1], 0.0, 1.0))
        should_move = reloc_prob >= self.relocation_threshold

        # Interpretacja komunikatu dla użytkownika / astronauty
        if should_move:
            decision_text = "TAK — ZMIEŃ MIEJSCE (czynniki środowiskowe pogarszają koncentrację)"
        elif stress_pct >= 65.0:
            decision_text = "NIE — ZOSTAŃ, ALE ZRÓB PRZERWĘ (wysoki stres niezwiązany z hałasem)"
        elif user_data.get("acc_energy", 0.0) > 0.05:
            decision_text = "NIE — WYKRYTO WYSIŁEK FIZYCZNY (trening w normie)"
        else:
            decision_text = "NIE — WARUNKI OPTYMALNE (poziom stresu i akustyka w normie)"

        return {
            "poziom_stresu_procent": round(stress_pct, 1),
            "czy_zmienic_miejsce": should_move,
            "pewnosc_zmiany_miejsca": round(reloc_prob, 3),
            "komunikat": decision_text
        }


# ==============================================================================
# 4. PRZYKŁAD UŻYCIA NA AKTUALNYCH DANYCH UŻYTKOWNIKA
# ==============================================================================

if __name__ == "__main__":
    # Krok 1: Wczytanie danych z PhysioNet (możesz dać range(1, 5) dla szybkiego testu)
    df_physio = load_noneeg_base(subjects=range(1, 21), win_sec=30, step_sec=15)

    # Krok 2: Zbudowanie jednego połączonego zbioru danych
    df_unified = build_unified_dataset(df_physio, second_dataset_csv=None)

    # Krok 3: Trening jednego modelu i wyświetlenie wskaźników jakości
    unified_model = UnifiedAstronautModel(relocation_threshold=0.50)
    metrics = unified_model.fit_and_evaluate(df_unified)

    # Dodaj na końcu skryptu treningowego po wywołaniu fit_and_evaluate():
    artifact = {
        "model": unified_model.model,
        "feature_cols": unified_model.feature_cols,
        "threshold": unified_model.relocation_threshold
    }
    joblib.dump(artifact, "astronaut_model.joblib")
    print("Zapisano gotowy model do astronaut_model.joblib")

    # Krok 4: Sprawdzenie aktualnych danych użytkownika (symulacja 3 sytuacji)
    print("\n" + "=" * 70)
    print("TEST NA AKTUALNYCH DANYCH UŻYTKOWNIKA")
    print("=" * 70)

    # Przypadek A: Użytkownik w głośnym pomieszczeniu (72 dBA przez 50 min), wzrost potliwości (EDA) i tętna (HR)
    user_noisy_stressed = {
        "acc_std": 0.02, "acc_energy": 0.0004,
        "eda_mean": 3.8, "eda_std": 0.45, "eda_slope": 0.03, "eda_peaks_per_min": 6.0,
        "temp_mean": 33.1, "temp_diff": -0.2,
        "hr_mean": 96.0, "hr_std": 5.2, "hr_rmssd": 18.0, "spo2_mean": 97.5,
        "eda_mean_delta": 2.1, "hr_mean_delta": 22.0, "temp_mean_delta": -0.4, "hr_rmssd_delta": -15.0,
        "noise_db": 72.0, "exposure_min": 50.0, "low_freq_ratio": 0.78
    }

    # Przypadek B: Użytkownik w cichym pomieszczeniu (48 dBA), tętno i EDA w normie
    user_calm = {
        "acc_std": 0.01, "acc_energy": 0.0001,
        "eda_mean": 1.2, "eda_std": 0.05, "eda_slope": 0.0, "eda_peaks_per_min": 0.5,
        "temp_mean": 33.6, "temp_diff": 0.05,
        "hr_mean": 68.0, "hr_std": 2.1, "hr_rmssd": 42.0, "spo2_mean": 98.8,
        "eda_mean_delta": -0.1, "hr_mean_delta": -2.0, "temp_mean_delta": 0.1, "hr_rmssd_delta": 3.0,
        "noise_db": 48.0, "exposure_min": 15.0, "low_freq_ratio": 0.25
    }

    # Przypadek C: Użytkownik ćwiczy na bieżni (wysoki ruch acc_energy, wysokie HR i hałas 71 dBA)
    user_workout = {
        "acc_std": 0.48, "acc_energy": 0.23,
        "eda_mean": 4.5, "eda_std": 0.60, "eda_slope": 0.05, "eda_peaks_per_min": 4.0,
        "temp_mean": 34.2, "temp_diff": 0.4,
        "hr_mean": 138.0, "hr_std": 8.0, "hr_rmssd": 12.0, "spo2_mean": 97.0,
        "eda_mean_delta": 2.8, "hr_mean_delta": 64.0, "temp_mean_delta": 0.7, "hr_rmssd_delta": -22.0,
        "noise_db": 71.0, "exposure_min": 30.0, "low_freq_ratio": 0.65
    }

    for nazwa, dane in [
        ("Głośny moduł + spadek koncentracji", user_noisy_stressed),
        ("Cichy moduł + stan spoczynku", user_calm),
        ("Trening fizyczny w głośnej strefie", user_workout),
    ]:
        wynik = unified_model.predict_current_user_state(dane)
        print(f"\n[{nazwa}]")
        print(f"  Poziom stresu        : {wynik['poziom_stresu_procent']}%")
        print(f"  Czy zmienić miejsce? : {wynik['czy_zmienic_miejsce']} (pewność: {wynik['pewnosc_zmiany_miejsca']})")
        print(f"  Decyzja systemu      : {wynik['komunikat']}")