"""
compare_models.py
-----------------
Load all three saved checkpoints, run them on the test set, and produce a
side-by-side comparison table + bar chart.

Usage:
    python src/compare_models.py
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(__file__))

from preprocess import CSV_DIR, LABELS
from dataset    import build_dataloaders, IMAGES_DIR
from models     import build_model
from evaluate   import evaluate_model
from utils      import load_checkpoint

ROOT        = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODELS_DIR  = os.path.join(ROOT, 'models')
RESULTS_DIR = os.path.join(ROOT, 'outputs', 'results')
PLOTS_DIR   = os.path.join(ROOT, 'outputs', 'plots')

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def load_test_results():
    """Try loading saved JSON results; fall back to re-evaluating."""
    results = {}
    for name in ['br', 'gcn', 'attention']:
        path = os.path.join(RESULTS_DIR, f'{name}_test_metrics.json')
        if os.path.exists(path):
            with open(path) as f:
                results[name] = json.load(f)
            print(f"[compare] Loaded saved results for {name}")
        else:
            print(f"[compare] No saved results for {name} – skipping.")
    return results


def plot_comparison_bar(results: dict):
    """Bar chart comparing key metrics across models."""
    metrics_to_plot = ['mean_auc', 'f1_micro', 'f1_macro', 'mean_ap', 'hamming_loss']
    labels_map = {
        'mean_auc'     : 'Mean AUC',
        'f1_micro'     : 'F1 (micro)',
        'f1_macro'     : 'F1 (macro)',
        'mean_ap'      : 'Mean AP',
        'hamming_loss' : 'Hamming Loss ↓',
    }
    model_names = list(results.keys())
    colors = ['#4C72B0', '#55A868', '#C44E52']

    x = np.arange(len(metrics_to_plot))
    width = 0.25
    fig, ax = plt.subplots(figsize=(14, 6))

    for i, (mname, color) in enumerate(zip(model_names, colors)):
        vals = [results[mname].get(m, 0) for m in metrics_to_plot]
        bars = ax.bar(x + i * width, vals, width, label=mname.upper(),
                      color=color, alpha=0.85, edgecolor='white')
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                    f'{val:.3f}', ha='center', va='bottom', fontsize=8)

    ax.set_xticks(x + width)
    ax.set_xticklabels([labels_map[m] for m in metrics_to_plot], fontsize=11)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Model Comparison – Multi-Label Thoracic Disease Classification',
                 fontsize=13, fontweight='bold')
    ax.legend(fontsize=11)
    ax.set_ylim(0, 1.05)
    ax.grid(axis='y', alpha=0.3)
    plt.tight_layout()

    os.makedirs(PLOTS_DIR, exist_ok=True)
    path = os.path.join(PLOTS_DIR, 'model_comparison.png')
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"[compare] Comparison plot saved: {path}")


def print_comparison_table(results: dict):
    """Print markdown table."""
    metrics = ['mean_auc', 'mean_ap', 'f1_micro', 'f1_macro',
               'precision_micro', 'recall_micro', 'hamming_loss']
    rows = []
    for model_name, m in results.items():
        row = {'Model': model_name.upper()}
        for k in metrics:
            row[k] = f"{m.get(k, float('nan')):.4f}"
        rows.append(row)
    df = pd.DataFrame(rows).set_index('Model')
    print("\n" + df.to_markdown() + "\n")

    # Save as CSV
    os.makedirs(RESULTS_DIR, exist_ok=True)
    df.to_csv(os.path.join(RESULTS_DIR, 'comparison_table.csv'))
    print(f"[compare] Table saved to {RESULTS_DIR}/comparison_table.csv")


if __name__ == '__main__':
    results = load_test_results()
    if not results:
        print("[compare] No results found. Train models first with train.py")
        sys.exit(0)
    print_comparison_table(results)
    plot_comparison_bar(results)
