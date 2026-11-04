"""
preprocess.py
-------------
Data loading and preprocessing for NIH Chest X-ray dataset.
Handles label parsing, train/val/test splits, and co-occurrence matrix computation.
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import json

# ─── Constants ────────────────────────────────────────────────────────────────
DATA_DIR   = os.path.join(os.path.dirname(__file__), '..', 'data')
CSV_DIR    = os.path.join(DATA_DIR, 'csv')
IMAGES_DIR = os.path.join(DATA_DIR, 'images')

LABELS = [
    'Atelectasis', 'Consolidation', 'Infiltration', 'Pneumothorax',
    'Edema', 'Emphysema', 'Fibrosis', 'Effusion', 'Pneumonia',
    'Pleural_Thickening', 'Cardiomegaly', 'Nodule', 'Mass', 'Hernia'
]
NUM_CLASSES = len(LABELS)
LABEL2IDX   = {l: i for i, l in enumerate(LABELS)}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_csv(csv_path: str = None) -> pd.DataFrame:
    """Load the NIH Data_Entry_2017.csv."""
    if csv_path is None:
        csv_path = os.path.join(CSV_DIR, 'Data_Entry_2017.csv')
    df = pd.read_csv(csv_path)
    return df


def encode_labels(finding_labels: pd.Series) -> np.ndarray:
    """
    Convert 'Finding Labels' column (pipe-separated strings) to
    a binary multi-hot numpy array of shape (N, 14).
    """
    N = len(finding_labels)
    y = np.zeros((N, NUM_CLASSES), dtype=np.float32)
    for i, label_str in enumerate(finding_labels):
        for lbl in str(label_str).split('|'):
            lbl = lbl.strip()
            if lbl in LABEL2IDX:
                y[i, LABEL2IDX[lbl]] = 1.0
    return y


def compute_cooccurrence_matrix(y: np.ndarray) -> np.ndarray:
    """
    Compute normalised label co-occurrence matrix.
    C[i,j] = P(label_j | label_i)
    Shape: (14, 14)
    """
    co = y.T @ y                           # (14, 14) raw co-occurrence counts
    diag = np.diag(co)                     # label frequencies
    diag[diag == 0] = 1                    # avoid div-by-zero
    C = co / diag[:, None]                 # normalise rows
    np.fill_diagonal(C, 0)                 # remove self-loops
    return C.astype(np.float32)


def prepare_data(csv_path: str = None,
                 val_size: float = 0.10,
                 test_size: float = 0.10,
                 random_state: int = 42):
    """
    Full preprocessing pipeline.
    Returns train_df, val_df, test_df, label_matrix (full), cooccurrence_matrix.
    """
    df = load_csv(csv_path)

    # Filter to only images that exist on disk
    existing = set(os.listdir(IMAGES_DIR)) if os.path.isdir(IMAGES_DIR) else set()
    if existing:
        df = df[df['Image Index'].isin(existing)].reset_index(drop=True)
        print(f"[preprocess] Found {len(df)} images on disk.")
    else:
        print("[preprocess] WARNING: Images directory is empty or missing. "
              "Using full CSV without filtering.")

    # Encode labels
    y = encode_labels(df['Finding Labels'])
    df[[f'lbl_{l}' for l in LABELS]] = y

    # Remove 'No Finding' rows (optional: keep if you want normal class)
    has_disease = (y.sum(axis=1) > 0)
    df_disease = df[has_disease].reset_index(drop=True)
    y_disease  = y[has_disease]

    print(f"[preprocess] Rows with at least one disease label: {len(df_disease)}")

    # Train / val / test split (stratify on most common label = Infiltration)
    stratify_col = y_disease[:, LABEL2IDX['Infiltration']].astype(int)
    train_idx, temp_idx = train_test_split(
        np.arange(len(df_disease)),
        test_size=val_size + test_size,
        random_state=random_state,
        stratify=stratify_col
    )
    val_ratio = val_size / (val_size + test_size)
    val_idx, test_idx = train_test_split(
        temp_idx,
        test_size=1 - val_ratio,
        random_state=random_state
    )

    train_df = df_disease.iloc[train_idx].reset_index(drop=True)
    val_df   = df_disease.iloc[val_idx].reset_index(drop=True)
    test_df  = df_disease.iloc[test_idx].reset_index(drop=True)

    print(f"[preprocess] Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

    # Co-occurrence matrix from training set
    y_train = y_disease[train_idx]
    C = compute_cooccurrence_matrix(y_train)

    # Save splits to csv/
    os.makedirs(CSV_DIR, exist_ok=True)
    train_df.to_csv(os.path.join(CSV_DIR, 'train.csv'), index=False)
    val_df.to_csv(os.path.join(CSV_DIR, 'val.csv'),   index=False)
    test_df.to_csv(os.path.join(CSV_DIR, 'test.csv'),  index=False)
    np.save(os.path.join(CSV_DIR, 'cooccurrence.npy'), C)
    print("[preprocess] Saved train.csv, val.csv, test.csv, cooccurrence.npy")

    return train_df, val_df, test_df, y_disease, C


if __name__ == '__main__':
    prepare_data()
