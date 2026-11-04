"""
utils.py
--------
Utility helpers: seed fixing, checkpoint save/load, learning-rate scheduler,
training curve plotting, and label co-occurrence heatmap.
"""

import os
import random
import numpy as np
import torch
import matplotlib.pyplot as plt
import seaborn as sns

from preprocess import LABELS


# ─── Reproducibility ──────────────────────────────────────────────────────────

def set_seed(seed: int = 42):
    """Fix all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark     = False


# ─── Checkpointing ───────────────────────────────────────────────────────────

def save_checkpoint(model, optimizer, epoch: int,
                    val_auc: float, path: str):
    """Save model + optimiser state."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save({
        'epoch'     : epoch,
        'val_auc'   : val_auc,
        'model'     : model.state_dict(),
        'optimizer' : optimizer.state_dict(),
    }, path)
    print(f"[utils] Checkpoint saved: {path}  (epoch={epoch}, val_auc={val_auc:.4f})")


def load_checkpoint(model, optimizer, path: str, device: torch.device):
    """Load checkpoint; returns (epoch, val_auc)."""
    ckpt = torch.load(path, map_location=device)
    model.load_state_dict(ckpt['model'])
    if optimizer is not None:
        optimizer.load_state_dict(ckpt['optimizer'])
    print(f"[utils] Loaded checkpoint: {path}  (epoch={ckpt['epoch']})")
    return ckpt['epoch'], ckpt['val_auc']


# ─── Plotting ─────────────────────────────────────────────────────────────────

def plot_training_curves(history: dict, save_dir: str, model_name: str):
    """
    Plot loss and AUC curves from training history dict.
    history = {'train_loss': [...], 'val_loss': [...], 'val_auc': [...]}
    """
    os.makedirs(save_dir, exist_ok=True)
    epochs = range(1, len(history['train_loss']) + 1)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(f'Training Curves – {model_name}', fontsize=14, fontweight='bold')

    # Loss
    axes[0].plot(epochs, history['train_loss'], label='Train Loss', color='steelblue')
    axes[0].plot(epochs, history['val_loss'],   label='Val Loss',   color='coral')
    axes[0].set_xlabel('Epoch'); axes[0].set_ylabel('BCE Loss')
    axes[0].set_title('Loss'); axes[0].legend(); axes[0].grid(alpha=0.3)

    # AUC
    axes[1].plot(epochs, history['val_auc'], label='Val mAUC', color='mediumseagreen')
    axes[1].set_xlabel('Epoch'); axes[1].set_ylabel('Mean AUC')
    axes[1].set_title('Validation mAUC'); axes[1].legend(); axes[1].grid(alpha=0.3)
    axes[1].set_ylim(0.5, 1.0)

    plt.tight_layout()
    save_path = os.path.join(save_dir, f'{model_name}_curves.png')
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"[utils] Training curves saved: {save_path}")


def plot_cooccurrence_heatmap(C: np.ndarray, save_dir: str):
    """Plot label co-occurrence heatmap."""
    os.makedirs(save_dir, exist_ok=True)
    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(C, annot=True, fmt='.2f', xticklabels=LABELS, yticklabels=LABELS,
                cmap='YlOrRd', ax=ax, linewidths=0.5)
    ax.set_title('Label Co-occurrence Matrix  P(label_j | label_i)',
                 fontsize=13, fontweight='bold')
    plt.tight_layout()
    save_path = os.path.join(save_dir, 'label_cooccurrence.png')
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"[utils] Co-occurrence heatmap saved: {save_path}")


def plot_label_distribution(df, save_dir: str):
    """Bar chart of label frequencies."""
    os.makedirs(save_dir, exist_ok=True)
    counts = {lbl: df[f'lbl_{lbl}'].sum() for lbl in LABELS}
    sorted_labels = sorted(counts, key=counts.get, reverse=True)
    vals = [counts[l] for l in sorted_labels]

    fig, ax = plt.subplots(figsize=(14, 6))
    bars = ax.barh(sorted_labels, vals, color=plt.cm.viridis(np.linspace(0.2, 0.8, 14)))
    ax.set_xlabel('Number of Samples')
    ax.set_title('Disease Label Distribution', fontsize=13, fontweight='bold')
    ax.grid(axis='x', alpha=0.3)
    for bar, val in zip(bars, vals):
        ax.text(val + 50, bar.get_y() + bar.get_height()/2,
                str(int(val)), va='center', fontsize=9)
    plt.tight_layout()
    save_path = os.path.join(save_dir, 'label_distribution.png')
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"[utils] Label distribution saved: {save_path}")
