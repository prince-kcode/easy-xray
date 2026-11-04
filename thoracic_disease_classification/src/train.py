"""
train.py
--------
Main training script for Multi-Label Thoracic Disease Classification.

Usage:
    python src/train.py --model br
    python src/train.py --model gcn
    python src/train.py --model attention

All results are saved to outputs/results/ and outputs/plots/.
"""

import os
import sys
import argparse
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from tqdm import tqdm

# Add src/ to path
sys.path.insert(0, os.path.dirname(__file__))

from preprocess  import prepare_data, CSV_DIR
from dataset     import build_dataloaders, IMAGES_DIR
from models      import build_model
from evaluate    import evaluate_model, save_metrics, print_metrics
from utils       import (set_seed, save_checkpoint, load_checkpoint,
                          plot_training_curves, plot_cooccurrence_heatmap,
                          plot_label_distribution)

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT        = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODELS_DIR  = os.path.join(ROOT, 'models')
RESULTS_DIR = os.path.join(ROOT, 'outputs', 'results')
PLOTS_DIR   = os.path.join(ROOT, 'outputs', 'plots')


# ─── Argument parser ──────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description='Thoracic Disease Multi-Label Classification')
    p.add_argument('--model',      type=str,   default='br',
                   choices=['br', 'gcn', 'attention'],
                   help='Model type: br | gcn | attention')
    p.add_argument('--epochs',     type=int,   default=30)
    p.add_argument('--batch_size', type=int,   default=32)
    p.add_argument('--lr',         type=float, default=1e-4)
    p.add_argument('--img_size',   type=int,   default=224)
    p.add_argument('--num_workers',type=int,   default=4)
    p.add_argument('--seed',       type=int,   default=42)
    p.add_argument('--resume',     type=str,   default=None,
                   help='Path to checkpoint to resume from')
    p.add_argument('--no_pretrain',action='store_true',
                   help='Train from scratch (no ImageNet weights)')
    return p.parse_args()


# ─── Training loop ────────────────────────────────────────────────────────────

def train_one_epoch(model, loader, criterion, optimizer, device, epoch):
    model.train()
    total_loss = 0.0
    for images, labels in tqdm(loader, desc=f'Epoch {epoch} [train]', leave=False):
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad()
        logits = model(images)
        loss   = criterion(logits, labels)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()

        total_loss += loss.item() * images.size(0)

    return total_loss / len(loader.dataset)


def validate_one_epoch(model, loader, criterion, device, epoch):
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for images, labels in tqdm(loader, desc=f'Epoch {epoch} [val]', leave=False):
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            logits = model(images)
            loss   = criterion(logits, labels)
            total_loss += loss.item() * images.size(0)
    return total_loss / len(loader.dataset)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    set_seed(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n[train] Device: {device}")
    print(f"[train] Model : {args.model.upper()}")

    # ── Data ──────────────────────────────────────────────────────────────────
    import pandas as pd
    train_csv = os.path.join(CSV_DIR, 'train.csv')
    if os.path.exists(train_csv):
        train_df = pd.read_csv(train_csv)
        val_df   = pd.read_csv(os.path.join(CSV_DIR, 'val.csv'))
        test_df  = pd.read_csv(os.path.join(CSV_DIR, 'test.csv'))
        C        = np.load(os.path.join(CSV_DIR, 'cooccurrence.npy'))
        print("[train] Loaded pre-processed splits from CSV.")
    else:
        print("[train] Running preprocessing pipeline…")
        train_df, val_df, test_df, _, C = prepare_data()

    # Plots
    plot_cooccurrence_heatmap(C, PLOTS_DIR)
    plot_label_distribution(train_df, PLOTS_DIR)

    train_loader, val_loader, test_loader = build_dataloaders(
        train_df, val_df, test_df,
        images_dir  = IMAGES_DIR,
        img_size    = args.img_size,
        batch_size  = args.batch_size,
        num_workers = args.num_workers,
    )

    # ── Model ─────────────────────────────────────────────────────────────────
    model = build_model(
        args.model,
        cooccurrence_matrix = C if args.model == 'gcn' else None,
        pretrained          = not args.no_pretrain,
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[train] Trainable parameters: {total_params:,}")

    # ── Optimiser & scheduler ─────────────────────────────────────────────────
    # Use lower LR for backbone, higher for new heads
    backbone_params = []
    head_params     = []
    for name, param in model.named_parameters():
        if 'backbone' in name or 'features' in name:
            backbone_params.append(param)
        else:
            head_params.append(param)

    optimizer = optim.AdamW([
        {'params': backbone_params, 'lr': args.lr * 0.1},
        {'params': head_params,     'lr': args.lr},
    ], weight_decay=1e-4)

    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    # ── Loss: binary cross-entropy with pos_weight for class imbalance ────────
    from preprocess import LABELS
    label_cols = [f'lbl_{l}' for l in LABELS]
    pos_counts = train_df[label_cols].sum(0).values.astype(np.float32)
    neg_counts = len(train_df) - pos_counts
    pos_weight = torch.tensor(neg_counts / (pos_counts + 1e-6),
                              dtype=torch.float32).to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    # ── Resume ────────────────────────────────────────────────────────────────
    start_epoch = 1
    best_auc    = 0.0
    if args.resume and os.path.exists(args.resume):
        start_epoch, best_auc = load_checkpoint(model, optimizer, args.resume, device)
        start_epoch += 1

    # ── Training loop ─────────────────────────────────────────────────────────
    history = {'train_loss': [], 'val_loss': [], 'val_auc': []}
    ckpt_path = os.path.join(MODELS_DIR, f'{args.model}_best.pth')
    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"\n[train] Starting training for {args.epochs} epochs…\n")
    for epoch in range(start_epoch, args.epochs + 1):
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer, device, epoch)
        val_loss   = validate_one_epoch(model, val_loader, criterion, device, epoch)
        val_metrics = evaluate_model(model, val_loader, device)
        val_auc     = val_metrics['mean_auc']

        scheduler.step()

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_auc'].append(val_auc)

        lr_now = optimizer.param_groups[0]['lr']
        print(f"Epoch {epoch:03d}/{args.epochs}  "
              f"Train Loss: {train_loss:.4f}  "
              f"Val Loss: {val_loss:.4f}  "
              f"Val mAUC: {val_auc:.4f}  "
              f"LR: {lr_now:.2e}")

        if val_auc > best_auc:
            best_auc = val_auc
            save_checkpoint(model, optimizer, epoch, val_auc, ckpt_path)

    # ── Final evaluation on test set ──────────────────────────────────────────
    print("\n[train] Loading best checkpoint for test evaluation…")
    load_checkpoint(model, None, ckpt_path, device)
    test_metrics = evaluate_model(model, test_loader, device)
    print_metrics(test_metrics, model_name=args.model.upper())

    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    save_metrics(test_metrics, os.path.join(RESULTS_DIR, f'{args.model}_test_metrics.json'))

    # Save history
    with open(os.path.join(RESULTS_DIR, f'{args.model}_history.json'), 'w') as f:
        json.dump(history, f, indent=2)

    # Plot curves
    plot_training_curves(history, PLOTS_DIR, args.model)
    print(f"\n[train] Done! Best Val mAUC: {best_auc:.4f}")


if __name__ == '__main__':
    main()
