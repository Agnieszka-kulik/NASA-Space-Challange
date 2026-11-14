#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automatyczne pobieranie i wizualizacja zbioru NASA OSDR OSD-575 (SpaceX Inspiration4).
Wymagania: pip install pandas numpy matplotlib
Użycie:
    python osdr_osd575_wizualizacja.py
    python osdr_osd575_wizualizacja.py --show
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
import warnings
import zipfile
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

STUDY_ID = "OSD-575"
OSDR_FILES_API = "https://osdr.nasa.gov/osdr/data/osd/files/575"
OSDR_BASE_URL = "https://osdr.nasa.gov"

# Kluczowe biomarkery powiązane ze stresem metabolicznym, zmęczeniem i reakcją zapalną
PRIORITY_MARKERS = [
    "Glucose", "Albumin", "ALT", "AST", "Creatinine", "Sodium", "Potassium",
    "IL-6", "IL6", "TNFa", "TNF-a", "TNF", "IFNg", "IFN-g", "IFNG",
    "IL-1b", "IL1B", "IL-10", "IL10", "MCP-1", "CCL2", "CRP", "SAA",
]


def download_osd575(data_dir: Path, force: bool = False) -> list[Path]:
    """Pobiera pliki CSV/TSV oraz metadane ISA dla badania OSD-575 z API NASA OSDR."""
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"Łączenie z API NASA OSDR dla {STUDY_ID}...")

    req = urllib.request.Request(OSDR_FILES_API, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    study_block = payload.get("studies", {}).get(STUDY_ID, {})
    study_files = study_block.get("study_files", [])
    if not study_files:
        raise RuntimeError(f"Nie znaleziono listy plików w odpowiedzi API dla {STUDY_ID}.")

    downloaded: list[Path] = []
    for item in study_files:
        fname = item.get("file_name", "")
        remote_url = item.get("remote_url", "")
        if not fname or not remote_url:
            continue

        # Pobieramy tabele pomiarowe (CSV/TSV) oraz archiwum metadanych ISA (ZIP)
        if not fname.lower().endswith((".csv", ".tsv", ".zip")):
            continue

        dest = data_dir / fname
        if dest.exists() and not force:
            print(f"[CACHE] {fname}")
        else:
            full_url = urllib.parse.urljoin(OSDR_BASE_URL, remote_url)
            print(f"[POBIERANIE] {fname}...")
            urllib.request.urlretrieve(full_url, dest)

        downloaded.append(dest)

        # Wypakowanie pliku s_OSD-575.txt z archiwum metadanych ISA
        if dest.suffix.lower() == ".zip":
            with zipfile.ZipFile(dest, "r") as zf:
                for member in zf.namelist():
                    if Path(member).name.startswith("s_") and member.endswith(".txt"):
                        target_txt = data_dir / Path(member).name
                        target_txt.write_bytes(zf.read(member))
                        downloaded.append(target_txt)

    return downloaded


def timepoint_sort_key(tp: str) -> int:
    """Sortuje punkty czasowe chronologicznie: L-92, L-44, L-3, R+1, R+45, R+82, R+194."""
    m = re.match(r"^([LR])([+-]?\d+)$", str(tp).strip())
    if not m:
        return 9999
    phase, val = m.group(1), int(m.group(2))
    return -abs(val) if phase == "L" else abs(val)


def load_sample_metadata(data_dir: Path) -> pd.DataFrame:
    """Wczytuje tabelę próbek s_OSD-575.txt (astronauta, płeć, czas, faza lotu)."""
    s_files = list(data_dir.glob("s_*.txt"))
    if not s_files:
        return pd.DataFrame()

    meta = pd.read_csv(s_files[0], sep="\t")
    rename_map = {}
    for col in meta.columns:
        low = col.lower()
        if "source name" in low:
            rename_map[col] = "crew"
        elif "sample name" in low:
            rename_map[col] = "sample_name"
        elif "factor value: time" in low:
            rename_map[col] = "time_label"
        elif "factor value: spaceflight" in low:
            rename_map[col] = "flight_phase"
    meta = meta.rename(columns=rename_map)

    if "sample_name" in meta.columns:
        meta["timepoint"] = meta["sample_name"].astype(str).str.extract(r"([LR][+-]\d+)")[0]
        if "crew" not in meta.columns:
            meta["crew"] = meta["sample_name"].astype(str).str.extract(r"(C00\d)")[0]

    keep = [c for c in ["sample_name", "crew", "timepoint", "flight_phase"] if c in meta.columns]
    return meta[keep].drop_duplicates()


def load_assay_tables(data_dir: Path, meta: pd.DataFrame) -> list[tuple[str, pd.DataFrame]]:
    """Wczytuje pliki z wynikami paneli (CMP, HD71, HDCVD9, NULISA) i dołącza oś czasu."""
    csv_files = sorted(data_dir.glob("*.csv"))
    # Preferuj ustandaryzowane pliki ALSDA Transformed, jeśli występują obok surowych
    transformed = [f for f in csv_files if "transformed" in f.name.lower()]
    files_to_use = transformed if transformed else csv_files

    datasets: list[tuple[str, pd.DataFrame]] = []
    for f in files_to_use:
        try:
            df = pd.read_csv(f)
        except Exception as exc:
            print(f"[POMINIĘTO] {f.name}: {exc}")
            continue

        # Wykryj kolumnę z identyfikatorem próbki (np. C001_serum_L-92) lub astronauty (C001)
        sample_col = None
        crew_col = None
        for col in df.columns:
            vals = df[col].astype(str)
            if vals.str.contains(r"C00\d.*_[LR][+-]\d+", regex=True).any():
                sample_col = col
                break
            if vals.str.fullmatch(r"C00\d").any():
                crew_col = col

        if sample_col:
            df["sample_name"] = df[sample_col].astype(str).str.strip()
            df["crew"] = df["sample_name"].str.extract(r"(C00\d)")[0]
            df["timepoint"] = df["sample_name"].str.extract(r"([LR][+-]\d+)")[0]
        elif crew_col:
            df["crew"] = df[crew_col].astype(str).str.strip()
            for col in df.columns:
                extracted = df[col].astype(str).str.extract(r"([LR][+-]\d+)")[0]
                if extracted.notna().any():
                    df["timepoint"] = extracted
                    break

        if "timepoint" not in df.columns and not meta.empty and "sample_name" in df.columns:
            df = df.merge(meta, on="sample_name", how="left", suffixes=("", "_meta"))

        if "crew" not in df.columns or "timepoint" not in df.columns:
            continue

        df = df.dropna(subset=["crew", "timepoint"]).copy()
        df["flight_phase"] = np.where(df["timepoint"].str.startswith("L"), "Pre-flight", "Post-flight")
        df["time_order"] = df["timepoint"].map(timepoint_sort_key)
        df = df.sort_values(["crew", "time_order"]).reset_index(drop=True)

        # Konwersja kolumn pomiarowych na typ numeryczny
        meta_cols = {"sample_name", "crew", "timepoint", "flight_phase", "time_order", sample_col, crew_col}
        num_cols = []
        for col in df.columns:
            if col in meta_cols:
                continue
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() >= 10 and converted.nunique(dropna=True) > 1:
                df[col] = converted
                num_cols.append(col)

        if num_cols:
            clean_name = f.stem.replace("OSD-575_", "").replace("_TRANSFORMED", "")
            print(f"[OK] {clean_name}: {len(df)} próbek, {len(num_cols)} biomarkerów")
            datasets.append((clean_name, df))

    return datasets


def compute_preflight_zscore(df: pd.DataFrame, marker_cols: list[str]) -> pd.DataFrame:
    """Oblicza Z-score każdego biomarkera względem indywidualnej normy Pre-flight astronauty."""
    z_df = df[["crew", "timepoint", "flight_phase", "time_order"]].copy()
    pre = df[df["flight_phase"] == "Pre-flight"]

    means = pre.groupby("crew")[marker_cols].mean()
    stds = pre.groupby("crew")[marker_cols].std().replace(0, np.nan)

    for col in marker_cols:
        mu = df["crew"].map(means[col])
        sd = df["crew"].map(stds[col])
        z_df[col] = (df[col] - mu) / sd

    return z_df


def select_top_markers(df: pd.DataFrame, z_df: pd.DataFrame, marker_cols: list[str], top_n: int = 6) -> list[str]:
    """Wybiera priorytetowe biomarkery stresu lub te o największym skoku w dniu powrotu (R+1)."""
    selected = []
    norm_lookup = {re.sub(r"[^a-z0-9]", "", c.lower()): c for c in marker_cols}
    for pm in PRIORITY_MARKERS:
        key = re.sub(r"[^a-z0-9]", "", pm.lower())
        if key in norm_lookup and norm_lookup[key] not in selected:
            selected.append(norm_lookup[key])
        if len(selected) >= top_n:
            return selected

    # Uzupełnij markerami o największym bezwzględnym odchyleniu Z-score w dniu R+1
    r1 = z_df[z_df["timepoint"] == "R+1"][marker_cols].abs().mean().dropna().sort_values(ascending=False)
    for col in r1.index:
        if col not in selected:
            selected.append(col)
        if len(selected) >= top_n:
            break
    return selected


def save_fig(fig: plt.Figure, path: Path, show: bool) -> None:
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    print(f"  -> Zapisano: {path.name}")
    if show:
        plt.show()
    plt.close(fig)


def plot_trajectories(df: pd.DataFrame, markers: list[str], title_prefix: str, out_dir: Path, show: bool) -> None:
    """Wykres 1: Trajektorie wybranych biomarkerów przed lotem (L) i po powrocie (R) dla załogi."""
    timepoints = sorted(df["timepoint"].unique(), key=timepoint_sort_key)
    tp_to_x = {tp: i for i, tp in enumerate(timepoints)}

    # Indeks podziału między lotem a powrotem (między ostatnim L-* a pierwszym R+*)
    pre_indices = [i for i, tp in enumerate(timepoints) if tp.startswith("L")]
    split_x = (max(pre_indices) + 0.5) if pre_indices else None

    n_cols = 2
    n_rows = int(np.ceil(len(markers) / n_cols))
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(13, 3.6 * n_rows), sharex=True)
    axes = np.atleast_1d(axes).flatten()

    crew_colors = {"C001": "#1f77b4", "C002": "#d62728", "C003": "#2ca02c", "C004": "#9467bd"}

    for ax, marker in zip(axes, markers):
        for crew, grp in df.groupby("crew"):
            grp = grp.dropna(subset=[marker]).sort_values("time_order")
            xs = [tp_to_x[tp] for tp in grp["timepoint"]]
            ax.plot(
                xs, grp[marker],
                marker="o", linewidth=1.6, markersize=5,
                color=crew_colors.get(crew, None), label=crew
            )

        if split_x is not None:
            ax.axvline(split_x, color="#c0392b", linestyle="--", linewidth=1.3, alpha=0.8)
            ax.axvspan(split_x, len(timepoints) - 0.5, color="#fadbd8", alpha=0.22)

        ax.set_title(marker, fontweight="bold", fontsize=10)
        ax.set_xticks(range(len(timepoints)))
        ax.set_xticklabels(timepoints, rotation=25)
        ax.grid(True, linestyle=":", alpha=0.5)

    for ax in axes[len(markers):]:
        ax.set_visible(False)

    axes[0].legend(title="Astronauta", loc="upper left", fontsize=8, ncol=2)
    fig.suptitle(f"{title_prefix} – Przebieg biomarkerów przed lotem (L) i po powrocie (R)", fontsize=13, fontweight="bold")
    save_fig(fig, out_dir / f"{title_prefix}_01_trajektorie.png", show)


def plot_zscore_heatmap(z_df: pd.DataFrame, marker_cols: list[str], title_prefix: str, out_dir: Path, show: bool) -> None:
    """Wykres 2: Mapa ciepła średniego Z-score (odchylenie od normy Pre-flight) w czasie misji."""
    timepoints = sorted(z_df["timepoint"].unique(), key=timepoint_sort_key)
    mean_by_tp = z_df.groupby("timepoint")[marker_cols].mean().reindex(timepoints)

    # Wybierz maksymalnie 25 biomarkerów o największej dynamice zmian w trakcie misji
    variability = mean_by_tp.abs().max().dropna().sort_values(ascending=False)
    top_cols = variability.head(25).index.tolist()
    if len(top_cols) < 2:
        return

    mat = mean_by_tp[top_cols].T.values  # wiersze: biomarkery, kolumny: czas
    fig, ax = plt.subplots(figsize=(10, max(5, 0.35 * len(top_cols))))
    im = ax.imshow(mat, cmap="RdBu_r", vmin=-3.0, vmax=3.0, aspect="auto")
    fig.colorbar(im, ax=ax, label="Średni Z-score względem normy Pre-flight załogi")

    ax.set_xticks(range(len(timepoints)))
    ax.set_xticklabels(timepoints)
    ax.set_yticks(range(len(top_cols)))
    ax.set_yticklabels(top_cols, fontsize=8.5)
    ax.set_xlabel("Punkt czasowy misji (L = przed startem, R = po lądowaniu)")
    ax.set_title(f"{title_prefix} – Indeks odchylenia od linii bazowej (Allostatic Shift)", fontweight="bold")
    save_fig(fig, out_dir / f"{title_prefix}_02_zscore_heatmap.png", show)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pobiera dane NASA OSDR OSD-575 i tworzy wizualizacje.")
    parser.add_argument("--data-dir", default="osd575_data", help="Folder na pobrane pliki z OSDR")
    parser.add_argument("--output", default="wykresy_osd575", help="Folder na wykresy PNG")
    parser.add_argument("--force", action="store_true", help="Wymuś ponowne pobranie plików z sieci")
    parser.add_argument("--show", action="store_true", help="Wyświetlaj wykresy na ekranie")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    download_osd575(data_dir, force=args.force)
    meta = load_sample_metadata(data_dir)
    datasets = load_assay_tables(data_dir, meta)

    if not datasets:
        raise SystemExit("Nie udało się wczytać tabel pomiarowych z pobranych plików OSD-575.")

    non_marker_cols = {"sample_name", "crew", "timepoint", "flight_phase", "time_order"}

    for name, df in datasets:
        marker_cols = [c for c in df.columns if c not in non_marker_cols and pd.api.types.is_numeric_dtype(df[c])]
        if not marker_cols:
            continue

        print(f"\nGenerowanie wykresów dla panelu: {name}")
        z_df = compute_preflight_zscore(df, marker_cols)
        top_markers = select_top_markers(df, z_df, marker_cols, top_n=6)

        plot_trajectories(df, top_markers, name, out_dir, args.show)
        plot_zscore_heatmap(z_df, marker_cols, name, out_dir, args.show)

    print(f"\nZakończono. Wszystkie wykresy zapisano w: {out_dir.resolve()}")


if __name__ == "__main__":
    warnings.filterwarnings("ignore", category=FutureWarning)
    main()