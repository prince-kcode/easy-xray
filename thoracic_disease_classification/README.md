# Multi-Label Thoracic Disease Classification with Label Correlation Modeling
**Student:** PRINCE KUMAR | **ID:** 20241CA0048

## Project Overview
This project models dependencies among co-occurring chest X-ray findings (e.g., effusion + consolidation) and compares binary relevance vs. graph/attention-based approaches for multi-label classification.

## Dataset
- **Source:** NIH Chest X-rays ([Kaggle](https://www.kaggle.com/datasets/nih-chest-xrays/data))
- **Images:** 112,120 frontal-view X-rays from 30,805 unique patients
- **Labels:** 14 thoracic disease labels (multi-label)

## 14 Disease Labels
1. Atelectasis, 2. Consolidation, 3. Infiltration, 4. Pneumothorax, 5. Edema
6. Emphysema, 7. Fibrosis, 8. Effusion, 9. Pneumonia, 10. Pleural Thickening
11. Cardiomegaly, 12. Nodule, 13. Mass, 14. Hernia

## Project Structure
```
thoracic_disease_classification/
├── data/
│   ├── images/          <- Paste all chest X-ray images here
│   └── csv/             <- Paste Data_Entry_2017.csv here
├── src/                 <- All Python source files
├── notebooks/           <- EDA & experiments
├── models/              <- Saved checkpoints
└── outputs/             <- Plots & results
```

## Approaches Compared
| Approach | Description |
|----------|-------------|
| Binary Relevance (BR) | Treats each label independently (baseline) |
| Graph-Based (GCN) | Uses label co-occurrence graph with GCN |
| Attention-Based | Self-attention over label embeddings |

## Setup
```bash
pip install -r requirements.txt
python src/train.py --model br
python src/train.py --model gcn
python src/train.py --model attention
```
