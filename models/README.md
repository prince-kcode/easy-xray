# Pretrained Model Weights Directory

Place trained PyTorch model checkpoints here:
- `xray_model.pth` — ResNet-50 3-class classifier (COVID-19, Normal, Pneumonia)
- `xray_detector.pth` — ResNet binary gatekeeper (validates whether image is a chest X-ray)

### Training Weights:
Run:
```bash
python train.py --epochs 10 --batch_size 32
python train_detector.py --epochs 5
```
Weights are excluded from Git repository to ensure fast and lightweight version control.
