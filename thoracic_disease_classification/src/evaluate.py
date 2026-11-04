"""
evaluate.py
-----------
Evaluation metrics for multi-label classification:
  - Per-label AUC-ROC
  - Mean AUC (mAUC)
  - F1 score (micro / macro)
  - Precision / Recall
  - Hamming Loss
"""

import numpy as np
import json
import os
from sklearn.metrics import (
    roc_auc_score, f1_score, precision_score,
    recall_score, hamming_loss, average_precision_score
)
import torch
from torch.utils.data import DataLoader

from preprocess import LABELS, NUM_CLASSES


# ─── Core metric computation ──────────────────────────────────────────────────

def compute_metrics(y_true: np.ndarray,
                    y_score: np.ndarray,
                    threshold: float = 0.5) -> dict:
    """
    Compute full suite of multi-label metrics.

    Args:
        y_true  : (N, 14) binary ground-truth array
        y_score : (N, 14) predicted probability array (after sigmoid)
        threshold: binarisation threshold for F1/Precision/Recall

    Returns:
        dict of metrics
    """
    y_pred = (y_score >= threshold).astype(int)

    # Per-label AUC-ROC (skip labels with only one class in y_true)
    per_label_auc = {}
    for i, lbl in enumerate(LABELS):
        if len(np.unique(y_true[:, i])) < 2:
            per_label_auc[lbl] = float('nan')
        else:
            per_label_auc[lbl] = roc_auc_score(y_true[:, i], y_score[:, i])

    valid_aucs = [v for v in per_label_auc.values() if not np.isnan(v)]
    mean_auc   = float(np.mean(valid_aucs)) if valid_aucs else float('nan')

    metrics = {
        'mean_auc'        : mean_auc,
        'per_label_auc'   : per_label_auc,
        'f1_micro'        : f1_score(y_true, y_pred, average='micro', zero_division=0),
        'f1_macro'        : f1_score(y_true, y_pred, average='macro', zero_division=0),
        'precision_micro' : precision_score(y_true, y_pred, average='micro', zero_division=0),
        'recall_micro'    : recall_score(y_true, y_pred, average='micro', zero_division=0),
        'hamming_loss'    : hamming_loss(y_true, y_pred),
        'mean_ap'         : average_precision_score(y_true, y_score, average='macro'),
    }
    return metrics


# ─── Model evaluation loop ────────────────────────────────────────────────────

@torch.no_grad()
def evaluate_model(model, loader: DataLoader,
                   device: torch.device,
                   threshold: float = 0.5) -> dict:
    """
    Run model over DataLoader, collect predictions, return metrics dict.
    """
    model.eval()
    all_logits = []
    all_labels = []

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        logits = model(images)
        all_logits.append(logits.cpu())
        all_labels.append(labels.cpu())

    all_logits = torch.cat(all_logits, dim=0)
    all_labels = torch.cat(all_labels, dim=0)

    y_score = torch.sigmoid(all_logits).numpy()
    y_true  = all_labels.numpy()

    return compute_metrics(y_true, y_score, threshold)


# ─── Save / display helpers ───────────────────────────────────────────────────

def save_metrics(metrics: dict, path: str):
    """Save metrics dict to a JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"[evaluate] Metrics saved to {path}")


def print_metrics(metrics: dict, model_name: str = ''):
    """Pretty-print evaluation metrics."""
    print(f"\n{'='*55}")
    print(f"  Evaluation Results  {model_name}")
    print(f"{'='*55}")
    print(f"  Mean AUC    : {metrics['mean_auc']:.4f}")
    print(f"  Mean AP     : {metrics['mean_ap']:.4f}")
    print(f"  F1 (micro)  : {metrics['f1_micro']:.4f}")
    print(f"  F1 (macro)  : {metrics['f1_macro']:.4f}")
    print(f"  Precision   : {metrics['precision_micro']:.4f}")
    print(f"  Recall      : {metrics['recall_micro']:.4f}")
    print(f"  Hamming Loss: {metrics['hamming_loss']:.4f}")
    print(f"\n  Per-Label AUC:")
    for lbl, auc in metrics['per_label_auc'].items():
        bar = '█' * int((auc if not np.isnan(auc) else 0) * 20)
        print(f"    {lbl:<22} {auc:.4f}  {bar}")
    print(f"{'='*55}\n")
