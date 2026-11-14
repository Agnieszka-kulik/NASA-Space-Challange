"""
Export results of our wearable ML models for the Digital Twin web app.

  ACTIVITY_DETECTOR.pkl        -> exercise minutes per mission day   (twin indicator "exerciseMin")
  RECOVERY_TIME_PREDICTOR.pkl  -> recovery time after each session   (twin indicator "recoveryH")

Output: ../public/twin/ml_export.json  – the app loads it automatically (the "ML · demo values"
badge changes to "ML"). Without this file the app shows demo values.

Usage (from the project root, in the same Python env where the models were trained):
    pip install pandas numpy scikit-learn joblib
    python ml/export_twin_ml.py --data path/to/Wearable_Dataset --models path/to/wearable-model

Which recordings belong to which astronaut / mission day is set in SESSIONS below.
Feature names are taken from the models themselves (feature_names_in_), so the script stops with a
clear message if something does not match the training code.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------------------------
# CONFIG – adjust to your data
# ---------------------------------------------------------------------------------------------

# astronaut id in the app -> list of (mission day, session folder relative to --data)
# Each real participant "plays" one astronaut; sessions are placed on mission days.
SESSIONS: dict[str, list[tuple[int, str]]] = {
    "a1": [(2, "AEROBIC/S17"), (9, "ANAEROBIC/S17"), (16, "AEROBIC/S17")],
    "a2": [(3, "AEROBIC/S03"), (10, "ANAEROBIC/S03"), (17, "AEROBIC/S03")],
    "a3": [(1, "AEROBIC/f04"), (8, "ANAEROBIC/f04"), (15, "AEROBIC/f04")],
    "a4": [(4, "AEROBIC/S16"), (11, "ANAEROBIC/S16"), (18, "AEROBIC/S16")],
    "a5": [(5, "AEROBIC/S07"), (12, "ANAEROBIC/S07"), (18, "AEROBIC/S07")],
    "a6": [(6, "AEROBIC/f05"), (13, "ANAEROBIC/f05"), (18, "AEROBIC/f05")],
}

# label encoding used when training ACTIVITY_DETECTOR (notebook: AEROBIC=0, ANAEROBIC=1).
# If your newer model has a REST class, add it here (e.g. 2: "REST").
CLASS_NAMES = {0: "AEROBIC", 1: "ANAEROBIC", 2: "REST"}

# unit of RECOVERY_TIME_PREDICTOR output – check with the person who trained it
RECOVERY_UNIT = "minutes"  # "minutes" or "hours"

WINDOW_S = 10  # ACTIVITY_DETECTOR was trained on 10-second windows at 1 Hz
SIGNALS = ["ACC_x", "ACC_y", "ACC_z", "ACC_magnitude", "BVP", "EDA", "TEMP", "HR"]


# ---------------------------------------------------------------------------------------------
# Loading Empatica E4 files (same as in activity_detectio.ipynb)
# ---------------------------------------------------------------------------------------------
def load_signal(folder: Path, filename: str, columns: list[str]) -> pd.DataFrame:
    raw = pd.read_csv(folder / filename, header=None)
    start = pd.to_datetime(raw.iloc[0, 0], utc=True)
    fs = float(raw.iloc[1, 0])
    values = raw.iloc[2:, : len(columns)].apply(pd.to_numeric, errors="coerce").reset_index(drop=True)
    values.index = start + pd.to_timedelta(np.arange(len(values)) / fs, unit="s")
    values.columns = columns
    return values


def load_session(folder: Path) -> pd.DataFrame:
    acc = load_signal(folder, "ACC.csv", ["ACC_x", "ACC_y", "ACC_z"])
    parts = [
        acc.resample("1s").mean(),
        load_signal(folder, "BVP.csv", ["BVP"]).resample("1s").mean(),
        load_signal(folder, "EDA.csv", ["EDA"]).resample("1s").mean(),
        load_signal(folder, "TEMP.csv", ["TEMP"]).resample("1s").mean(),
        load_signal(folder, "HR.csv", ["HR"]).resample("1s").mean(),
    ]
    df = pd.concat(parts, axis=1)
    df["ACC_magnitude"] = np.sqrt(df["ACC_x"] ** 2 + df["ACC_y"] ** 2 + df["ACC_z"] ** 2)
    df["HR"] = df["HR"].interpolate(limit_area="inside")
    return df.dropna()


# ---------------------------------------------------------------------------------------------
# Features
# ---------------------------------------------------------------------------------------------
def activity_features(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for start in range(0, len(df) - WINDOW_S + 1, WINDOW_S):
        w = df.iloc[start : start + WINDOW_S]
        row = {}
        for s in SIGNALS:
            row[f"{s}_mean"], row[f"{s}_std"] = w[s].mean(), w[s].std()
            row[f"{s}_min"], row[f"{s}_max"] = w[s].min(), w[s].max()
        rows.append(row)
    return pd.DataFrame(rows)


def recovery_features(df: pd.DataFrame, hr_baseline: float) -> pd.DataFrame:
    """One row per session. ASSUMPTION: '*_change' = last value - first value of the session."""
    row: dict[str, float] = {"HR_baseline": hr_baseline}
    for s in SIGNALS:
        prefix = s if s.startswith("ACC") else f"{s}_value"
        x = df[s]
        row[f"{prefix}_mean"], row[f"{prefix}_std"] = x.mean(), x.std()
        row[f"{prefix}_min"], row[f"{prefix}_max"] = x.min(), x.max()
        row[f"{prefix}_change"] = x.iloc[-1] - x.iloc[0]
    return pd.DataFrame([row])


def select(features: pd.DataFrame, model, name: str) -> pd.DataFrame:
    expected = list(getattr(model, "feature_names_in_", features.columns))
    missing = [c for c in expected if c not in features.columns]
    if missing:
        raise SystemExit(f"{name}: features missing vs training: {missing}\nAdjust the feature code to match the notebook.")
    return features[expected]


# ---------------------------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path, help="folder Wearable_Dataset (with AEROBIC/ ANAEROBIC/ STRESS/)")
    ap.add_argument("--models", required=True, type=Path, help="folder with ACTIVITY_DETECTOR.pkl and RECOVERY_TIME_PREDICTOR.pkl")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "public" / "twin" / "ml_export.json")
    args = ap.parse_args()

    activity = joblib.load(args.models / "ACTIVITY_DETECTOR.pkl")
    recovery = joblib.load(args.models / "RECOVERY_TIME_PREDICTOR.pkl")
    print("ACTIVITY_DETECTOR classes:", getattr(activity, "classes_", "?"))
    print("RECOVERY_TIME_PREDICTOR:", recovery)

    out: dict = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Wearable Device Dataset (Empatica E4) + team models ACTIVITY_DETECTOR / RECOVERY_TIME_PREDICTOR",
        "astronauts": {},
    }

    for astronaut, sessions in SESSIONS.items():
        exercise: dict[str, float] = {}
        recov: dict[str, float] = {}
        for day, rel in sessions:
            folder = args.data / rel
            if not folder.exists():
                print(f"  ! missing {folder} – skipped")
                continue
            df = load_session(folder)
            # personal resting HR = lowest 10th percentile of the session (simple proxy)
            hr_baseline = float(np.percentile(df["HR"], 10))

            feats = activity_features(df)
            labels = activity.predict(select(feats, activity, "ACTIVITY_DETECTOR"))
            names = [CLASS_NAMES.get(int(l), str(l)) if str(l).isdigit() else str(l) for l in labels]
            active_windows = sum(1 for n in names if n.upper() != "REST")
            exercise[str(day)] = round(active_windows * WINDOW_S / 60, 1)

            pred = float(recovery.predict(select(recovery_features(df, hr_baseline), recovery, "RECOVERY_TIME_PREDICTOR"))[0])
            recov[str(day)] = round(pred / 60 if RECOVERY_UNIT == "minutes" else pred, 1)
            print(f"  {astronaut} day {day}: {exercise[str(day)]} min exercise, recovery {recov[str(day)]} h  ({rel})")

        out["astronauts"][astronaut] = {"exerciseMin": exercise, "recoveryH": recov}

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=2))
    print(f"\nSaved {args.out}  – refresh the Digital Twin page.")


if __name__ == "__main__":
    main()
