# ML → Digital Twin

`export_twin_ml.py` runs our wearable models on Empatica E4 recordings and saves the results to
`public/twin/ml_export.json`. The Digital Twin page (`/twin/:astronautId`) loads that file automatically:

| Model | Twin indicator | Shown in |
|---|---|---|
| `ACTIVITY_DETECTOR.pkl` (Random Forest, 10 s windows) | `exerciseMin` – minutes of exercise per day | Muscles & fitness |
| `RECOVERY_TIME_PREDICTOR.pkl` (sklearn pipeline, uses `HR_baseline`) | `recoveryH` – hours to recover | Muscles & fitness |

Without the file, these indicators show **demo values** (badge “ML · demo values”).

## Run

```bash
pip install pandas numpy scikit-learn joblib
python ml/export_twin_ml.py --data path/to/Wearable_Dataset --models path/to/wearable-model
```

Before running, check in the script:

- `SESSIONS` – which participant’s recordings “play” which astronaut, and on which mission day,
- `CLASS_NAMES` – label encoding of ACTIVITY_DETECTOR (print `model.classes_`),
- `RECOVERY_UNIT` – whether the recovery model returns minutes or hours,
- `recovery_features()` – assumes `*_change` = last − first value of the session; adjust if training used something else.

The script compares the computed features with `feature_names_in_` of each model and stops with a list
of missing features if they don’t match the training code.
