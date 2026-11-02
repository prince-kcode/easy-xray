"""Training script for Easy X-Ray chest X-ray classification model.

Dataset folder structure expected:
    dataset/
        train/
            COVID-19/
            Normal/
            Pneumonia/
        val/         (optional — auto-split from train if missing)
            COVID-19/
            Normal/
            Pneumonia/

Usage:
    python train.py --data_dir path/to/dataset --epochs 20 --batch_size 32
"""

import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import torchvision.transforms as transforms
import torchvision.models as models
from torchvision.datasets import ImageFolder
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path


CLASS_NAMES = ['COVID-19', 'Normal', 'Pneumonia']


def get_transforms(train=True):
    if train:
        return transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])


def build_model(num_classes=3, pretrained=True):
    """Build ResNet50 with transfer learning."""
    weights = models.ResNet50_Weights.DEFAULT if pretrained else None
    model = models.resnet50(weights=weights)
    # Freeze early layers
    for param in list(model.parameters())[:-20]:
        param.requires_grad = False
    # Replace classifier
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes),
    )
    return model


def train_one_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss, correct, total = 0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += imgs.size(0)
    return total_loss / total, 100.0 * correct / total


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0, 0, 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            total_loss += loss.item() * imgs.size(0)
            _, predicted = outputs.max(1)
            correct += predicted.eq(labels).sum().item()
            total += imgs.size(0)
    return total_loss / total, 100.0 * correct / total


def save_training_plot(train_losses, val_losses, train_accs, val_accs, output_dir):
    """Save training history plot."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    epochs = range(1, len(train_losses) + 1)

    ax1.plot(epochs, train_losses, 'b-o', label='Train Loss', linewidth=2)
    ax1.plot(epochs, val_losses, 'r-o', label='Val Loss', linewidth=2)
    ax1.set_title('Training & Validation Loss', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs, train_accs, 'b-o', label='Train Accuracy', linewidth=2)
    ax2.plot(epochs, val_accs, 'r-o', label='Val Accuracy', linewidth=2)
    ax2.set_title('Training & Validation Accuracy', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy (%)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plot_path = output_dir / 'training_history.png'
    plt.savefig(str(plot_path), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[Train] Training plot saved: {plot_path}")


def main():
    parser = argparse.ArgumentParser(description='Easy X-Ray Model Training')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=10, help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--output_dir', type=str, default='models', help='Where to save model')
    parser.add_argument('--no_pretrained', action='store_true', help='Train from scratch')
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[Train] Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    print(f"[Train] Data directory: {data_dir}")

    # ── Load datasets ─────────────────────────────────────────────────────────
    train_dir = data_dir / 'train'
    val_dir = data_dir / 'val'

    if not train_dir.exists():
        train_dir = data_dir

    train_ds = ImageFolder(str(train_dir), transform=get_transforms(train=True))

    if val_dir.exists() and len(list(val_dir.iterdir())) > 0:
        val_ds = ImageFolder(str(val_dir), transform=get_transforms(train=False))
    else:
        val_size = int(0.2 * len(train_ds))
        train_size = len(train_ds) - val_size
        train_ds, val_ds = random_split(train_ds, [train_size, val_size])
        print("[Train] No val/ folder found -- auto-splitting 80/20")

    print(f"[Train] Train samples: {len(train_ds)} | Val samples: {len(val_ds)}")
    classes = train_ds.dataset.classes if hasattr(train_ds, 'dataset') else train_ds.classes
    print(f"[Train] Classes: {classes}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # ── Build model ───────────────────────────────────────────────────────────
    pretrained = not args.no_pretrained
    model = build_model(num_classes=3, pretrained=pretrained).to(device)
    print(f"[Train] Model built ({'pretrained ResNet50' if pretrained else 'from scratch'})")

    # ── Loss, optimizer, scheduler ────────────────────────────────────────────
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # ── Training loop ─────────────────────────────────────────────────────────
    best_val_acc = 0.0
    train_losses, val_losses, train_accs, val_accs = [], [], [], []

    print("\n" + "="*60)
    print("   Starting Training -- Easy X-Ray Model (ResNet-50)")
    print("="*60)

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        train_losses.append(train_loss)
        val_losses.append(val_loss)
        train_accs.append(train_acc)
        val_accs.append(val_acc)

        status_tag = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_path = output_dir / 'xray_model.pth'
            torch.save(model.state_dict(), str(best_path))
            status_tag = " -> Best model saved!"

        print(f"Epoch [{epoch:02d}/{args.epochs}] "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%{status_tag}")

    print("="*60)
    print(f"[Train] Best Validation Accuracy: {best_val_acc:.2f}%")
    print(f"[Train] Model saved to: {output_dir / 'xray_model.pth'}")

    save_training_plot(train_losses, val_losses, train_accs, val_accs, output_dir)
    print("[Train] Training complete successfully!")


if __name__ == '__main__':
    main()
