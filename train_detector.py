"""Train an X-Ray vs Not-X-Ray gatekeeper verification model (ResNet-18 binary classifier)."""
import os
import csv
import io
import zipfile
import random
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import cv2

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
import torchvision.models as models

ARCHIVE_PATH = "d:/image_project/archive.zip"
DETECTOR_DATA_DIR = "d:/image_project/easy_xray/detector_data"
MODEL_OUTPUT_DIR = "d:/image_project/easy_xray/models"
N_SAMPLES_PER_CLASS = 450
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# ════════════════════════════════════════════════════════════════════
# 1. GENERATE DIVERSE NON-XRAY SAMPLES (Photos, Documents, Text, Patterns)
# ════════════════════════════════════════════════════════════════════

def generate_non_xray_image(idx, output_path):
    """Generate high-quality non-xray synthetic natural/document/pattern images."""
    size = (300, 300)
    img_type = idx % 6

    if img_type == 0:
        # Colorful landscape / natural gradient with shapes
        arr = np.zeros((size[0], size[1], 3), dtype=np.uint8)
        color1 = np.random.randint(0, 255, 3)
        color2 = np.random.randint(0, 255, 3)
        for y in range(size[0]):
            alpha = y / size[0]
            arr[y, :] = (1 - alpha) * color1 + alpha * color2
        img = Image.fromarray(arr)
        draw = ImageDraw.Draw(img)
        for _ in range(5):
            x1, y1 = np.random.randint(0, 200, 2)
            draw.rectangle([x1, y1, x1 + 80, y1 + 80], fill=tuple(np.random.randint(50, 255, 3)))

    elif img_type == 1:
        # Document / Text / Invoice screenshot lookalike
        img = Image.new('RGB', size, color=(245, 245, 245))
        draw = ImageDraw.Draw(img)
        # Draw fake text lines
        for y in range(30, 270, 16):
            w = np.random.randint(120, 260)
            draw.line([(20, y), (20 + w, y)], fill=(40, 40, 40), width=4)
        # Draw table borders
        draw.rectangle([20, 120, 280, 220], outline=(100, 100, 100), width=2)

    elif img_type == 2:
        # Portrait / Face / Avatar simulation
        img = Image.new('RGB', size, color=tuple(np.random.randint(180, 240, 3)))
        draw = ImageDraw.Draw(img)
        skin_color = (np.random.randint(200, 255), np.random.randint(170, 220), np.random.randint(140, 190))
        draw.ellipse([80, 50, 220, 210], fill=skin_color)
        draw.ellipse([110, 100, 135, 125], fill=(30, 30, 30))
        draw.ellipse([165, 100, 190, 125], fill=(30, 30, 30))
        draw.arc([115, 140, 185, 175], start=0, end=180, fill=(180, 50, 50), width=4)

    elif img_type == 3:
        # Photographic natural object (colorful circle/fruits/ball)
        img = Image.new('RGB', size, color=(np.random.randint(20, 80), np.random.randint(40, 120), np.random.randint(20, 80)))
        draw = ImageDraw.Draw(img)
        center = (np.random.randint(100, 200), np.random.randint(100, 200))
        r = np.random.randint(40, 80)
        draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r], fill=tuple(np.random.randint(150, 255, 3)))

    elif img_type == 4:
        # Technical chart / Plot / UI mockup
        img = Image.new('RGB', size, color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        points = [(x, int(150 + 60 * np.sin(x / 25.0) + np.random.randint(-15, 15))) for x in range(20, 280, 15)]
        draw.line(points, fill=(0, 229, 255), width=3)
        draw.rectangle([20, 20, 280, 280], outline=(50, 80, 120), width=2)

    else:
        # Greyscale texture / Noise / Wall / Non-medical structure
        noise = np.random.randint(0, 256, (size[0], size[1]), dtype=np.uint8)
        blurred = cv2.GaussianBlur(noise, (15, 15), 0)
        img = Image.fromarray(np.stack([blurred]*3, axis=-1))

    img.save(str(output_path), quality=90)


# ════════════════════════════════════════════════════════════════════
# 2. PREPARE BINARY DATASET (xray vs not_xray)
# ════════════════════════════════════════════════════════════════════

def prepare_detector_dataset():
    base_dir = Path(DETECTOR_DATA_DIR)
    for split in ['train', 'val']:
        (base_dir / split / 'xray').mkdir(parents=True, exist_ok=True)
        (base_dir / split / 'not_xray').mkdir(parents=True, exist_ok=True)

    print("[Detector Dataset] 1. Extracting real Chest X-Rays from archive...")
    val_count = int(N_SAMPLES_PER_CLASS * 0.2)
    train_count = N_SAMPLES_PER_CLASS - val_count

    with zipfile.ZipFile(ARCHIVE_PATH, 'r') as z:
        xray_names = [n for n in z.namelist() if n.endswith('.png')][:N_SAMPLES_PER_CLASS]
        random.seed(101)
        random.shuffle(xray_names)

        train_xrays = xray_names[:train_count]
        val_xrays = xray_names[train_count:N_SAMPLES_PER_CLASS]

        for n in train_xrays:
            dest = base_dir / 'train' / 'xray' / os.path.basename(n)
            if not dest.exists():
                with z.open(n) as src, open(dest, 'wb') as dst:
                    dst.write(src.read())

        for n in val_xrays:
            dest = base_dir / 'val' / 'xray' / os.path.basename(n)
            if not dest.exists():
                with z.open(n) as src, open(dest, 'wb') as dst:
                    dst.write(src.read())

    print(f"  Extracted {train_count} train X-Rays, {val_count} val X-Rays.")

    print("[Detector Dataset] 2. Synthesizing diverse Non-X-Ray images (photos, documents, avatars, charts)...")
    for i in range(train_count):
        dest = base_dir / 'train' / 'not_xray' / f"non_xray_{i:04d}.jpg"
        if not dest.exists():
            generate_non_xray_image(i, dest)

    for i in range(val_count):
        dest = base_dir / 'val' / 'not_xray' / f"non_xray_val_{i:04d}.jpg"
        if not dest.exists():
            generate_non_xray_image(i + 1000, dest)

    print(f"  Generated {train_count} train Non-X-Rays, {val_count} val Non-X-Rays.")


# ════════════════════════════════════════════════════════════════════
# 3. MODEL ARCHITECTURE & TRAINING
# ════════════════════════════════════════════════════════════════════

def get_transforms():
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def build_detector_model():
    """ResNet-18 binary classifier: 0 = not_xray, 1 = xray."""
    weights = models.ResNet18_Weights.DEFAULT
    model = models.resnet18(weights=weights)
    # Freeze early layers
    for param in list(model.parameters())[:-10]:
        param.requires_grad = False
    in_feat = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feat, 128),
        nn.ReLU(),
        nn.Linear(128, 2),
    )
    return model


def train_detector(epochs=5, batch_size=32, lr=0.001):
    prepare_detector_dataset()

    train_tf, val_tf = get_transforms()
    train_dir = Path(DETECTOR_DATA_DIR) / 'train'
    val_dir = Path(DETECTOR_DATA_DIR) / 'val'

    from torchvision.datasets import ImageFolder
    train_ds = ImageFolder(str(train_dir), transform=train_tf)
    val_ds = ImageFolder(str(val_dir), transform=val_tf)

    print(f"\n[Training] Classes: {train_ds.classes}")
    # train_ds.classes is ['not_xray', 'xray']
    assert train_ds.classes == ['not_xray', 'xray']

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = build_detector_model().to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=lr)

    print("\n" + "="*60)
    print("   Starting X-Ray Recognition Model Training (ResNet-18)")
    print("="*60)

    best_acc = 0.0
    out_path = Path(MODEL_OUTPUT_DIR) / 'xray_detector.pth'

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss, correct, total = 0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * imgs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(labels).sum().item()
            total += imgs.size(0)
        train_acc = 100.0 * correct / total

        # Evaluate
        model.eval()
        val_loss, val_correct, val_total = 0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * imgs.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                val_total += imgs.size(0)
        val_acc = 100.0 * val_correct / val_total

        status = ""
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), str(out_path))
            status = " -> Saved Best Detector!"

        print(f"Epoch [{epoch:02d}/{epochs}] "
              f"Train Loss: {train_loss/total:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss/val_total:.4f} | Val Acc: {val_acc:.2f}%{status}")

    print("="*60)
    print(f"[Detector] Best Validation Accuracy: {best_acc:.2f}%")
    print(f"[Detector] Model saved to: {out_path}")
    return out_path


if __name__ == '__main__':
    train_detector(epochs=5)
