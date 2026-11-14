import warnings
import numpy as np
import pandas as pd
import wfdb
from scipy.signal import find_peaks
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import LeaveOneGroupOut, KFold
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_recall_fscore_support,
    roc_auc_score,
    log_loss,
    confusion_matrix,
    classification_report,
    r2_score,
    mean_squared_error,
    mean_absolute_error,
    max_error,
    f1_score,
)

warnings.filterwarnings("ignore")

# ==============================================================================
# MODUŁ 1: POBIERANIE I EKSTRAKCJA CECH Z PHYSIONET (noneeg/1.0.0)
# ==============================================================================

def map_stage_to_label(note: str) -> int:
    note_clean = note.lower().strip()
    if "relax" in note_clean:
        return 0
    elif "physical" in note_clean:
        return 1
    elif "cognitive" in note_clean or "emotional" in note_clean or "stress" in note_clean:
        return 2
    return -1


def extract_window_features(fast_win: np.ndarray, slow_win: np.ndarray, fs_fast: int = 8) -> dict:
    ax, ay, az, temp, eda = fast_win.T
    spo2, hr = slow_win.T

    acc_mag = np.sqrt(ax**2 + ay**2 + az**2)
    acc_std = np.nanstd(acc_mag)
    acc_energy = np.nanmean((acc_mag - np.nanmean(acc_mag))**2)

    eda_mean = np.nanmean(eda)
    eda_std = np.nanstd(eda)
    t_axis = np.arange(len(eda)) / fs_fast
    eda_slope = np.polyfit(t_axis, np.nan_to_num(eda, nan=eda_mean), 1)[0] if len(eda) > 1 else 0.0
    peaks, _ = find_peaks(np.nan_to_num(eda, nan=eda_mean), prominence=0.02, distance=fs_fast)
    eda_peaks_per_min = len(peaks) * (60.0 / (len(eda) / fs_fast))

    temp_mean = np.nanmean(temp)
    temp_diff = temp[-1] - temp[0] if len(temp) > 1 else 0.0

    hr_mean = np.nanmean(hr)
    hr_std = np.nanstd(hr)
    hr_rmssd = np.sqrt(np.nanmean(np.diff(hr)**2)) if len(hr) > 1 else 0.0
    spo2_mean = np.nanmean(spo2)

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


def load_noneeg_dataset(subjects=range(1, 21), win_sec: int = 30, step_sec: int = 15) -> pd.DataFrame:
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

        sig_fast = rec_fast.p_signal
        sig_slow = rec_slow.p_signal
        fs_fast = int(rec_fast.fs)
        fs_slow = int(rec_slow.fs)

        stage_starts_sec = [s / fs_fast for s in ann.sample]
        stage_notes = ann.aux_note
        total_sec = min(len(sig_fast) / fs_fast, len(sig_slow) / fs_slow)
        stage_ends_sec = stage_starts_sec[1:] + [total_sec]

        subj_rows = []
        for start_s, end_s, note in zip(stage_starts_sec, stage_ends_sec, stage_notes):
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
                    feats["label"] = label
                    subj_rows.append(feats)

                curr += step_sec

        if not subj_rows:
            continue

        df_subj = pd.DataFrame(subj_rows)

        baseline = df_subj[df_subj["label"] == 0]
        if not baseline.empty:
            for col in ["eda_mean", "hr_mean", "temp_mean", "hr_rmssd"]:
                df_subj[f"{col}_delta"] = df_subj[col] - baseline[col].median()
        else:
            for col in ["eda_mean", "hr_mean", "temp_mean", "hr_rmssd"]:
                df_subj[f"{col}_delta"] = 0.0

        all_rows.append(df_subj)
        print(f"Załadowano Subject{subj_id}: {len(df_subj)} okien czasowych.")

    return pd.concat(all_rows, ignore_index=True)


# ==============================================================================
# MODUŁ 2: TRENING I WSKAŹNIKI JAKOŚCI MODELU A (KLASYFIKACJA)
# ==============================================================================

def train_physiological_model(df: pd.DataFrame):
    """
    Trenuje Model A (klasyfikator stanu poznawczego) z walidacją LOSO
    i wylicza pełny zestaw metryk klasyfikacyjnych oraz kalibracji prawdopodobieństwa.
    """
    feature_cols = [c for c in df.columns if c not in ["subject_id", "label"]]
    X = df[feature_cols].fillna(0.0).values
    y = df["label"].values
    groups = df["subject_id"].values

    logo = LeaveOneGroupOut()
    y_true_all, y_pred_all, y_proba_all = [], [], []

    for train_idx, test_idx in logo.split(X, y, groups):
        clf = RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
        clf.fit(X[train_idx], y[train_idx])
        preds = clf.predict(X[test_idx])
        probas = clf.predict_proba(X[test_idx])

        y_true_all.extend(y[test_idx])
        y_pred_all.extend(preds)
        y_proba_all.extend(probas)

    y_true_arr = np.array(y_true_all)
    y_pred_arr = np.array(y_pred_all)
    y_proba_arr = np.array(y_proba_all)

    # Obliczanie wskaźników jakości
    acc = accuracy_score(y_true_arr, y_pred_arr)
    bal_acc = balanced_accuracy_score(y_true_arr, y_pred_arr)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true_arr, y_pred_arr, average="macro", zero_division=0
    )
    prec_per_class, rec_per_class, f1_per_class, _ = precision_recall_fscore_support(
        y_true_arr, y_pred_arr, labels=[0, 1, 2], zero_division=0
    )

    try:
        roc_auc = roc_auc_score(y_true_arr, y_proba_arr, multi_class="ovr", average="macro")
        lloss = log_loss(y_true_arr, y_proba_arr, labels=[0, 1, 2])
    except ValueError:
        roc_auc = float("nan")
        lloss = float("nan")

    cm = confusion_matrix(y_true_arr, y_pred_arr, labels=[0, 1, 2])

    metrics_a = {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision_macro": round(prec_macro, 4),
        "recall_macro": round(rec_macro, 4),
        "f1_macro": round(f1_macro, 4),
        "roc_auc_ovr": round(roc_auc, 4),
        "log_loss": round(lloss, 4),
        "overload_precision": round(prec_per_class[2], 4),
        "overload_recall_sensitivity": round(rec_per_class[2], 4),
        "overload_f1": round(f1_per_class[2], 4),
    }

    print("\n" + "=" * 65)
    print("WSKAŹNIKI JAKOŚCI — MODEL A (FIZJOLOGIA / WALIDACJA LOSO)")
    print("=" * 65)
    for k, v in metrics_a.items():
        print(f"  {k:<30}: {v}")

    print("\nMacierz pomyłek (wiersze = prawda, kolumny = predykcja):")
    cm_df = pd.DataFrame(
        cm,
        index=["Prawda: 0 (Relaks)", "Prawda: 1 (Wysiłek)", "Prawda: 2 (Przeciążenie)"],
        columns=["Pred: 0", "Pred: 1", "Pred: 2"]
    )
    print(cm_df)

    # Trening finalnego modelu na wszystkich danych
    final_model = RandomForestClassifier(
        n_estimators=300, max_depth=8, class_weight="balanced", random_state=42, n_jobs=-1
    )
    final_model.fit(X, y)
    return final_model, feature_cols, metrics_a


# ==============================================================================
# MODUŁ 3: TRENING I WSKAŹNIKI JAKOŚCI MODELU B (REGRESJA RYZYKA HAŁASU)
# ==============================================================================

def train_acoustic_risk_model(csv_path: str = None, risk_threshold: float = 0.60):
    """
    Trenuje Model B (regresor ryzyka akustycznego R_noise) z 5-krotną walidacją krzyżową
    i wylicza metryki regresji (R2, RMSE, MAE, Max Error) oraz skuteczność klasyfikacji
    przekroczenia progu alarmowego.
    """
    if csv_path:
        df_noise = pd.read_csv(csv_path)
    else:
        rng = np.random.default_rng(42)
        n = 1500
        noise_db = rng.uniform(45.0, 82.0, n)
        exposure_min = rng.uniform(1.0, 240.0, n)
        low_freq_ratio = rng.uniform(0.2, 0.9, n)

        risk = (
            1.0 / (1.0 + np.exp(-0.22 * (noise_db - 62.0))) * 0.65
            + np.clip(exposure_min / 180.0, 0, 1) * 0.20
            + low_freq_ratio * 0.15
            + rng.normal(0, 0.03, n)
        )
        df_noise = pd.DataFrame({
            "noise_db": noise_db,
            "exposure_min": exposure_min,
            "low_freq_ratio": low_freq_ratio,
            "risk_score": np.clip(risk, 0.0, 1.0)
        })

    features = ["noise_db", "exposure_min", "low_freq_ratio"]
    X = df_noise[features].values
    y = df_noise["risk_score"].values

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    y_true_all, y_pred_all = [], []

    for train_idx, test_idx in kf.split(X):
        reg = GradientBoostingRegressor(n_estimators=150, max_depth=4, random_state=42)
        reg.fit(X[train_idx], y[train_idx])
        preds = np.clip(reg.predict(X[test_idx]), 0.0, 1.0)

        y_true_all.extend(y[test_idx])
        y_pred_all.extend(preds)

    y_true_arr = np.array(y_true_all)
    y_pred_arr = np.array(y_pred_all)

    # Metryki ciągłe (regresja)
    r2 = r2_score(y_true_arr, y_pred_arr)
    rmse = np.sqrt(mean_squared_error(y_true_arr, y_pred_arr))
    mae = mean_absolute_error(y_true_arr, y_pred_arr)
    m_err = max_error(y_true_arr, y_pred_arr)

    # Metryki progowe (czy prawidłowo wykrywa niebezpieczny hałas >= risk_threshold)
    y_true_bin = (y_true_arr >= risk_threshold).astype(int)
    y_pred_bin = (y_pred_arr >= risk_threshold).astype(int)
    thresh_acc = accuracy_score(y_true_bin, y_pred_bin)
    thresh_f1 = f1_score(y_true_bin, y_pred_bin, zero_division=0)

    metrics_b = {
        "r2_score": round(r2, 4),
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "max_error": round(m_err, 4),
        f"threshold_accuracy (@{risk_threshold})": round(thresh_acc, 4),
        f"threshold_f1 (@{risk_threshold})": round(thresh_f1, 4),
    }

    print("\n" + "=" * 65)
    print("WSKAŹNIKI JAKOŚCI — MODEL B (RYZYKO AKUSTYCZNE / 5-FOLD CV)")
    print("=" * 65)
    for k, v in metrics_b.items():
        print(f"  {k:<30}: {v}")

    # Trening finalnego modelu B na całości
    final_model_b = GradientBoostingRegressor(n_estimators=150, max_depth=4, random_state=42)
    final_model_b.fit(X, y)
    return final_model_b, metrics_b


# ==============================================================================
# MODUŁ 4: SILNIK DECYZYJNY ASTRONAUTY (LATE FUSION)
# ==============================================================================

class AstronautCognitiveMonitor:
    def __init__(self, model_physio, physio_cols, model_acoustic,
                 overload_threshold: float = 0.65, noise_threshold: float = 0.60):
        self.model_physio = model_physio
        self.physio_cols = physio_cols
        self.model_acoustic = model_acoustic
        self.overload_threshold = overload_threshold
        self.noise_threshold = noise_threshold

    def evaluate(self, physio_features: dict, noise_db: float,
                 exposure_min: float, low_freq_ratio: float = 0.5) -> dict:
        X_phys = pd.DataFrame([physio_features])[self.physio_cols].fillna(0.0).values
        probs = self.model_physio.predict_proba(X_phys)[0]
        p_relax, p_physical, p_overload = probs[0], probs[1], probs[2]

        X_noise = pd.DataFrame([{
            "noise_db": noise_db,
            "exposure_min": exposure_min,
            "low_freq_ratio": low_freq_ratio
        }])
        r_noise = float(np.clip(self.model_acoustic.predict(X_noise)[0], 0.0, 1.0))

        if p_physical > 0.60:
            status = "WYSIŁEK FIZYCZNY (TRENING)"
            action = "Wykryto aktywność ruchową. Alerty stresu poznawczego wstrzymane."
        elif p_overload >= self.overload_threshold and r_noise >= self.noise_threshold:
            status = "ALARM KRYTYCZNY: Zmień moduł stacji!"
            action = (f"Hałas ({noise_db:.1f} dBA przez {exposure_min:.0f} min) obniża Twoją "
                      f"koncentrację (P_overload={p_overload:.2f}). Przejdź do cichszego modułu.")
        elif p_overload < self.overload_threshold and r_noise >= self.noise_threshold:
            status = "OSTRZEŻENIE PREWENCYJNE"
            action = (f"Koncentracja w normie, ale hałas ({noise_db:.1f} dBA) przekracza próg. "
                      f"Załóż słuchawki ANC lub ogranicz pobyt do 15 min.")
        elif p_overload >= self.overload_threshold and r_noise < self.noise_threshold:
            status = "ZMĘCZENIE POZNAWCZE (NIEZWIĄZANE Z HAŁASEM)"
            action = (f"Spadek koncentracji (P_overload={p_overload:.2f}) mimo dobrej akustyki. "
                      f"Zalecana 10-minutowa przerwa.")
        else:
            status = "WARUNKI OPTYMALNE"
            action = "Koncentracja i środowisko akustyczne w normie."

        return {
            "status": status,
            "p_overload": round(p_overload, 3),
            "p_physical": round(p_physical, 3),
            "r_noise": round(r_noise, 3),
            "recommendation": action
        }


# ==============================================================================
# URUCHOMIENIE
# ==============================================================================

if __name__ == "__main__":
    df_physio = load_noneeg_dataset(subjects=range(1, 21), win_sec=30, step_sec=15)

    model_a, physio_feature_names, metrics_a = train_physiological_model(df_physio)
    model_b, metrics_b = train_acoustic_risk_model(csv_path=None, risk_threshold=0.60)

    monitor = AstronautCognitiveMonitor(model_a, physio_feature_names, model_b)

    sample_stress = df_physio[df_physio["label"] == 2].iloc[0].to_dict()
    res = monitor.evaluate(sample_stress, noise_db=71.0, exposure_min=65.0, low_freq_ratio=0.75)

    print("\n" + "=" * 65)
    print("PRZYKŁADOWA DECYZJA SYSTEMU")
    print("=" * 65)
    print(f"Status: {res['status']} | P_overload={res['p_overload']} | R_noise={res['r_noise']}")
    print(f"Rekomendacja: {res['recommendation']}")