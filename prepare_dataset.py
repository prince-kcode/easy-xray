"""Extract balanced subset from NIH archive.zip for Easy X-Ray model training."""
import os
import csv
import io
import zipfile
import random
from pathlib import Path

ARCHIVE_PATH = "d:/image_project/archive.zip"
OUTPUT_DIR = "d:/image_project/easy_xray/dataset"
TARGET_PER_CLASS = 400  # 400 images per class for fast, accurate transfer learning
VAL_SPLIT = 0.2

CLASS_MAPPING = {
    'Normal': lambda findings: findings == 'No Finding',
    'Pneumonia': lambda findings: 'Pneumonia' in findings,
    'COVID-19': lambda findings: ('Consolidation' in findings or 'Infiltration' in findings) and 'Pneumonia' not in findings,
}

def extract_dataset():
    print(f"[Dataset] Opening {ARCHIVE_PATH}...")
    if not os.path.exists(ARCHIVE_PATH):
        print(f"Error: {ARCHIVE_PATH} not found.")
        return

    with zipfile.ZipFile(ARCHIVE_PATH, 'r') as z:
        print("[Dataset] Indexing archive image paths...")
        # Map basename -> full zip path
        name_to_zip = {}
        for name in z.namelist():
            if name.endswith('.png'):
                name_to_zip[os.path.basename(name)] = name
        print(f"[Dataset] Found {len(name_to_zip)} total images in archive.")

        # Read CSV
        print("[Dataset] Reading Data_Entry_2017.csv...")
        class_candidates = {'Normal': [], 'Pneumonia': [], 'COVID-19': []}

        with z.open('Data_Entry_2017.csv') as f:
            reader = csv.reader(io.TextIOWrapper(f, 'utf-8'))
            header = next(reader)
            for row in reader:
                img_name = row[0]
                findings = row[1]
                if img_name not in name_to_zip:
                    continue

                for cls, matcher in CLASS_MAPPING.items():
                    if matcher(findings):
                        class_candidates[cls].append(img_name)
                        break

        print("[Dataset] Candidates found:")
        for cls, items in class_candidates.items():
            print(f"  - {cls}: {len(items)} candidates")

        # Sample target count per class
        random.seed(42)
        selected = {}
        for cls, items in class_candidates.items():
            count = min(len(items), TARGET_PER_CLASS)
            selected[cls] = random.sample(items, count)
            print(f"  Selected {count} images for {cls}")

        # Create train and val folders
        out_path = Path(OUTPUT_DIR)
        for split in ['train', 'val']:
            for cls in ['Normal', 'Pneumonia', 'COVID-19']:
                (out_path / split / cls).mkdir(parents=True, exist_ok=True)

        # Extract files
        print("[Dataset] Extracting selected images...")
        extracted_counts = {'train': 0, 'val': 0}

        for cls, items in selected.items():
            n_val = int(len(items) * VAL_SPLIT)
            val_items = items[:n_val]
            train_items = items[n_val:]

            for img_name in train_items:
                zip_path = name_to_zip[img_name]
                dest = out_path / 'train' / cls / img_name
                if not dest.exists():
                    with z.open(zip_path) as src, open(dest, 'wb') as dst:
                        dst.write(src.read())
                extracted_counts['train'] += 1

            for img_name in val_items:
                zip_path = name_to_zip[img_name]
                dest = out_path / 'val' / cls / img_name
                if not dest.exists():
                    with z.open(zip_path) as src, open(dest, 'wb') as dst:
                        dst.write(src.read())
                extracted_counts['val'] += 1

            print(f"  Extracted {cls}: {len(train_items)} train, {len(val_items)} val")

        print(f"[Dataset] Extraction complete! Train: {extracted_counts['train']}, Val: {extracted_counts['val']}")

if __name__ == '__main__':
    extract_dataset()
