# Wymagane biblioteki:
# pip install wfdb pandas numpy matplotlib

import wfdb
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# 1. Konfiguracja - wybór badanego (dostępne: Subject1 ... Subject20)
SUBJECT_ID = "Subject2"
DATASET = "noneeg"

print(f"Pobieranie danych dla {SUBJECT_ID} z PhysioNet ({DATASET})...")

# Pobranie sygnałów fizjologicznych bezpośrednio z serwerów PhysioNet
# - AccTempEDA (8 Hz): akcelerometr (ax, ay, az), temperatura skóry, przewodnictwo skóry (EDA)
# - SpO2HR (1 Hz): saturacja krwi (SpO2) oraz tętno (HR)
rec_eda = wfdb.rdrecord(f"{SUBJECT_ID}_AccTempEDA", pn_dir=DATASET)
rec_hr = wfdb.rdrecord(f"{SUBJECT_ID}_SpO2HR", pn_dir=DATASET)
ann = wfdb.rdann(f"{SUBJECT_ID}_AccTempEDA", "atr", pn_dir=DATASET)

# 2. Budowa ramek danych (DataFrame) z osią czasu w minutach
fs_eda = rec_eda.fs
t_eda_min = np.arange(rec_eda.sig_len) / fs_eda / 60.0

df_eda = pd.DataFrame(rec_eda.p_signal, columns=rec_eda.sig_name)
df_eda["time_min"] = t_eda_min

fs_hr = rec_hr.fs
t_hr_min = np.arange(rec_hr.sig_len) / fs_hr / 60.0

df_hr = pd.DataFrame(rec_hr.p_signal, columns=rec_hr.sig_name)
df_hr["time_min"] = t_hr_min

# 3. Przypisanie etykiet faz eksperymentu z pliku adnotacji (.atr)
df_eda["stage"] = "Baseline"
stage_intervals = []

for i in range(len(ann.sample)):
    start_idx = ann.sample[i]
    end_idx = ann.sample[i + 1] if i + 1 < len(ann.sample) else rec_eda.sig_len
    # Usunięcie ewentualnych znaków null (\x00) z opisów WFDB
    label = ann.aux_note[i].replace("\x00", "").strip() or f"Stage_{i+1}"
    df_eda.loc[start_idx:end_idx, "stage"] = label
    stage_intervals.append((start_idx / fs_eda / 60.0, end_idx / fs_eda / 60.0, label))

# Wyświetlenie podsumowania statystycznego dla każdej fazy stresu
print("\n--- Średnie wartości parametrów wg fazy protokołu ---")
summary_eda = df_eda.groupby("stage")[["EDA", "temp"]].agg(["mean", "std"]).round(3)
print(summary_eda)

# 4. Wizualizacja przebiegu sygnałów oraz stref stresu
fig, axes = plt.subplots(3, 1, figsize=(13, 9), sharex=True)
fig.suptitle(
    f"Reakcja fizjologiczna na stres akustyczny i poznawczy ({SUBJECT_ID} - PhysioNet noneeg)",
    fontsize=13,
    fontweight="bold",
)

# Kolory tła dla poszczególnych faz eksperymentu
stage_colors = {
    "Relax": "#d4efdf",
    "PhysicalStress": "#fcf3cf",
    "CognitiveStress": "#d6eaf8",
    "EmotionalStress": "#fadbd8",  # m.in. nagły bodziec dźwiękowy
}

def shade_stages(ax, add_legend=False):
    seen_labels = set()
    for start_m, end_m, label in stage_intervals:
        color = stage_colors.get(label, "#eaecee")
        lbl = label if (add_legend and label not in seen_labels) else None
        if lbl:
            seen_labels.add(label)
        ax.axvspan(start_m, end_m, color=color, alpha=0.45, label=lbl)

# Panel 1: Przewodnictwo skóry (EDA) - najszybszy wskaźnik reakcji na nagły hałas
shade_stages(axes[0], add_legend=True)
axes[0].plot(df_eda["time_min"], df_eda["EDA"], color="#1f618d", linewidth=1.2)
axes[0].set_ylabel("EDA [µS]")
axes[0].set_title("Aktywność elektrodermalna (EDA) – pobudzenie układu współczulnego")
axes[0].legend(loc="upper right", ncol=4, fontsize=8.5, framealpha=0.9)
axes[0].grid(True, linestyle="--", alpha=0.4)

# Panel 2: Tętno (HR)
shade_stages(axes[1])
axes[1].plot(df_hr["time_min"], df_hr["hr"], color="#c0392b", linewidth=1.3)
axes[1].set_ylabel("Tętno HR [bpm]")
axes[1].set_title("Tętno (Heart Rate) – obciążenie układu krążenia")
axes[1].grid(True, linestyle="--", alpha=0.4)

# Panel 3: Temperatura skóry (Temp)
shade_stages(axes[2])
axes[2].plot(df_eda["time_min"], df_eda["temp"], color="#d35400", linewidth=1.2)
axes[2].set_ylabel("Temp [°C]")
axes[2].set_xlabel("Czas trwania eksperymentu [minuty]")
axes[2].set_title("Temperatura obwodowa skóry")
axes[2].grid(True, linestyle="--", alpha=0.4)

# Pokazanie i zapisanie wykresu
plt.tight_layout()
plt.savefig("noneeg_stres_wizualizacja.png", dpi=150)
plt.show()