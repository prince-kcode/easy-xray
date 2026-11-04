"""
dataset.py
----------
PyTorch Dataset class for NIH Chest X-ray multi-label classification.
Supports augmentation and image caching.
"""

import os
import numpy as np
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T

from preprocess import LABELS, NUM_CLASSES, IMAGES_DIR

# ─── Image transforms ─────────────────────────────────────────────────────────

def get_transforms(split: str = 'train', img_size: int = 224):
    """Return torchvision transforms for train / val / test."""
    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]

    if split == 'train':
        return T.Compose([
            T.Resize((img_size + 32, img_size + 32)),
            T.RandomCrop(img_size),
            T.RandomHorizontalFlip(),
            T.RandomRotation(10),
            T.ColorJitter(brightness=0.2, contrast=0.2),
            T.ToTensor(),
            T.Normalize(mean, std),
        ])
    else:
        return T.Compose([
            T.Resize((img_size, img_size)),
            T.ToTensor(),
            T.Normalize(mean, std),
        ])


# ─── Dataset ──────────────────────────────────────────────────────────────────

class ChestXrayDataset(Dataset):
    """
    PyTorch Dataset for NIH Chest X-ray multi-label classification.

    Args:
        df         : DataFrame with 'Image Index' column and label columns.
        images_dir : Directory containing .png images.
        split      : 'train', 'val', or 'test'.
        img_size   : Square crop size (default 224).
    """

    def __init__(self,
                 df: pd.DataFrame,
                 images_dir: str = IMAGES_DIR,
                 split: str = 'train',
                 img_size: int = 224):
        self.df         = df.reset_index(drop=True)
        self.images_dir = images_dir
        self.transform  = get_transforms(split, img_size)
        self.label_cols = [f'lbl_{l}' for l in LABELS]

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        img_path = os.path.join(self.images_dir, row['Image Index'])

        # Load image
        image = Image.open(img_path).convert('RGB')
        image = self.transform(image)

        # Multi-hot label vector
        label = torch.tensor(
            row[self.label_cols].values.astype(np.float32),
            dtype=torch.float32
        )
        return image, label


# ─── DataLoader factory ───────────────────────────────────────────────────────

def build_dataloaders(train_df, val_df, test_df,
                      images_dir: str = IMAGES_DIR,
                      img_size: int = 224,
                      batch_size: int = 32,
                      num_workers: int = 4):
    """Return (train_loader, val_loader, test_loader)."""
    train_ds = ChestXrayDataset(train_df, images_dir, split='train', img_size=img_size)
    val_ds   = ChestXrayDataset(val_df,   images_dir, split='val',   img_size=img_size)
    test_ds  = ChestXrayDataset(test_df,  images_dir, split='test',  img_size=img_size)

    train_loader = DataLoader(train_ds, batch_size=batch_size,
                              shuffle=True,  num_workers=num_workers, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size,
                              shuffle=False, num_workers=num_workers, pin_memory=True)
    test_loader  = DataLoader(test_ds,  batch_size=batch_size,
                              shuffle=False, num_workers=num_workers, pin_memory=True)

    return train_loader, val_loader, test_loader
