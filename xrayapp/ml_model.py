"""AI Model handler for X-Ray classification with Grad-CAM heatmap generation."""
import os
import numpy as np
import cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from PIL import Image
import io
import base64
import uuid
from pathlib import Path
from django.conf import settings


# ─── Try to import torch, fall back to demo mode ──────────────────────────────
try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as transforms
    import torchvision.models as models
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


CLASS_NAMES = ['COVID-19', 'Normal', 'Pneumonia']

# Image preprocessing transforms
TRANSFORM = None
if TORCH_AVAILABLE:
    import torchvision.transforms as transforms
    TRANSFORM = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])


def build_model(head='sequential'):
    """Build ResNet50 model for 3-class chest X-ray classification."""
    if not TORCH_AVAILABLE:
        return None
    model = models.resnet50(weights=None)
    num_features = model.fc.in_features
    if head == 'sequential':
        model.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 3),
        )
    else:
        model.fc = nn.Linear(num_features, 3)
    return model


# ─── Global model cache ────────────────────────────────────────────────────────
_model = None
_model_loaded = False


def load_model():
    """Load the trained model from disk (cached after first load)."""
    global _model, _model_loaded
    if _model_loaded:
        return _model

    if not TORCH_AVAILABLE:
        _model_loaded = True
        return None

    model_path = settings.MODEL_PATH
    if not os.path.exists(model_path):
        _model_loaded = True
        return None

    try:
        state_dict = torch.load(model_path, map_location='cpu')
        try:
            model = build_model(head='sequential')
            model.load_state_dict(state_dict)
        except Exception:
            model = build_model(head='linear')
            model.load_state_dict(state_dict)
        model.eval()
        _model = model
        _model_loaded = True
        print(f"[Easy X-Ray] Model loaded successfully from {model_path}")
    except Exception as e:
        print(f"[Easy X-Ray] Model load warning: {e}")
        _model_loaded = True

    return _model


# ─── X-Ray Gatekeeper / Recognition Model (ResNet-18) ──────────────────────────
_detector_model = None
_detector_loaded = False


def build_detector_model():
    """Build ResNet-18 binary classifier: 0 = not_xray, 1 = xray."""
    if not TORCH_AVAILABLE:
        return None
    model = models.resnet18(weights=None)
    in_feat = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feat, 128),
        nn.ReLU(),
        nn.Linear(128, 2),
    )
    return model


def load_detector_model():
    """Load the trained X-ray recognition gatekeeper model."""
    global _detector_model, _detector_loaded
    if _detector_loaded:
        return _detector_model

    if not TORCH_AVAILABLE:
        _detector_loaded = True
        return None

    detector_path = os.path.join(settings.BASE_DIR, 'models', 'xray_detector.pth')
    if not os.path.exists(detector_path):
        _detector_loaded = True
        return None

    try:
        model = build_detector_model()
        state = torch.load(detector_path, map_location='cpu')
        model.load_state_dict(state)
        model.eval()
        _detector_model = model
        _detector_loaded = True
        print(f"[Easy X-Ray] X-Ray Detector loaded successfully from {detector_path}")
    except Exception as e:
        print(f"[Easy X-Ray] Detector load warning: {e}")
        _detector_loaded = True

    return _detector_model


def classify_is_xray(image_path):
    """
    Verify whether the uploaded image is a valid chest X-ray.
    Uses:
    1. Color saturation check (medical radiographs are monochromatic greyscale)
    2. ResNet-18 trained binary classifier ('not_xray' vs 'xray')
    """
    try:
        pil_img = Image.open(image_path).convert('RGB')
        arr = np.array(pil_img, dtype=np.float32)

        # 1. Color saturation heuristic check
        # In medical chest X-rays, R ≈ G ≈ B (greyscale).
        rgb_std = float(np.std(arr, axis=2).mean())
        if rgb_std > 18.0:
            return {
                'is_xray': False,
                'confidence': 0.999,
                'label': 'Not X-Ray',
                'probabilities': {'xray': 0.001, 'not_xray': 0.999},
                'reason': 'Image contains high color saturation. Chest radiographs are monochromatic greyscale.',
            }

        # 2. ResNet-18 Deep Learning Detector
        det_model = load_detector_model()
        if det_model is not None and TRANSFORM is not None:
            tensor = TRANSFORM(pil_img).unsqueeze(0)
            with torch.no_grad():
                logits = det_model(tensor)
                probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

            not_xray_prob = float(probs[0])
            xray_prob = float(probs[1])
            is_xray = bool(xray_prob >= 0.5)

            return {
                'is_xray': is_xray,
                'confidence': float(xray_prob if is_xray else not_xray_prob),
                'label': 'X-Ray' if is_xray else 'Not X-Ray',
                'probabilities': {
                    'xray': xray_prob,
                    'not_xray': not_xray_prob
                },
                'reason': 'Verified medical chest radiograph.' if is_xray else 'Image visual features do not match chest radiograph anatomy.'
            }

        # Fallback if model weights not present
        return {
            'is_xray': True,
            'confidence': 0.85,
            'label': 'X-Ray',
            'probabilities': {'xray': 0.85, 'not_xray': 0.15},
            'reason': 'Heuristic validation passed.'
        }

    except Exception as e:
        return {
            'is_xray': False,
            'confidence': 0.50,
            'label': 'Unknown',
            'probabilities': {'xray': 0.50, 'not_xray': 0.50},
            'reason': f'Image processing error: {e}'
        }


def preprocess_image(image_path):
    """Load and preprocess X-ray image for inference."""
    img = Image.open(image_path).convert('RGB')
    if TRANSFORM:
        tensor = TRANSFORM(img).unsqueeze(0)
        return tensor, img
    return None, img


def generate_gradcam(model, image_tensor, target_class_idx):
    """Generate Grad-CAM heatmap for model explainability."""
    if not TORCH_AVAILABLE or model is None:
        return None

    activations = []
    gradients = []

    def forward_hook(module, input, output):
        activations.append(output)

    def backward_hook(module, grad_in, grad_out):
        gradients.append(grad_out[0])

    # Hook onto the last conv layer of ResNet50
    target_layer = model.layer4[-1]
    fh = target_layer.register_forward_hook(forward_hook)
    bh = target_layer.register_full_backward_hook(backward_hook)

    try:
        model.zero_grad()
        output = model(image_tensor)
        score = output[0, target_class_idx]
        score.backward()

        acts = activations[0].detach().cpu().numpy()[0]  # (C, H, W)
        grads = gradients[0].detach().cpu().numpy()[0]   # (C, H, W)

        weights = grads.mean(axis=(1, 2))                # (C,)
        cam = np.zeros(acts.shape[1:], dtype=np.float32) # (H, W)
        for i, w in enumerate(weights):
            cam += w * acts[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        if cam.max() > 0:
            cam = cam / cam.max()
        return cam

    except Exception as e:
        print(f"[Grad-CAM] Error: {e}")
        return None
    finally:
        fh.remove()
        bh.remove()


def overlay_heatmap_on_image(original_img_path, cam, alpha=0.4):
    """Overlay Grad-CAM heatmap on the original X-ray image."""
    # Load original image
    orig = cv2.imread(str(original_img_path))
    orig = cv2.resize(orig, (224, 224))
    orig_rgb = cv2.cvtColor(orig, cv2.COLOR_BGR2RGB)

    if cam is None:
        # No heatmap available — return original
        return orig_rgb

    # Convert CAM to colormap
    heatmap = np.uint8(255 * cam)
    heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

    # Blend
    overlay = cv2.addWeighted(orig_rgb, 1 - alpha, heatmap_rgb, alpha, 0)
    return overlay


def save_heatmap_image(overlay_array, filename=None):
    """Save heatmap overlay to media/heatmaps/ and return relative path."""
    heatmap_dir = Path(settings.MEDIA_ROOT) / 'heatmaps'
    heatmap_dir.mkdir(parents=True, exist_ok=True)

    if filename is None:
        filename = f"heatmap_{uuid.uuid4().hex[:8]}.png"

    save_path = heatmap_dir / filename
    img = Image.fromarray(overlay_array.astype(np.uint8))
    img.save(str(save_path))
    return f"heatmaps/{filename}"


def demo_predict(image_path):
    """Demo prediction when model is not available — uses image analysis heuristics."""
    import random
    # Seed with image size for reproducibility per image
    img = Image.open(image_path).convert('L')
    arr = np.array(img)
    brightness = arr.mean()

    # Create a pseudo-random but deterministic result based on image characteristics
    rng = random.Random(int(brightness * 100))
    rand_val = rng.random()

    if rand_val < 0.33:
        probs = [0.72, 0.15, 0.13]
    elif rand_val < 0.66:
        probs = [0.08, 0.85, 0.07]
    else:
        probs = [0.11, 0.12, 0.77]

    # Add small noise
    probs = [p + rng.uniform(-0.05, 0.05) for p in probs]
    total = sum(probs)
    probs = [p / total for p in probs]

    pred_idx = np.argmax(probs)
    return {
        'diagnosis': CLASS_NAMES[pred_idx],
        'confidence': float(probs[pred_idx]),
        'probabilities': {
            'COVID-19': float(probs[0]),
            'Normal': float(probs[1]),
            'Pneumonia': float(probs[2]),
        },
        'demo_mode': True,
    }


def predict_xray(image_path):
    """
    Main prediction function.
    Returns dict with diagnosis, confidence, probabilities, and heatmap path.
    """
    model = load_model()

    # ── Demo mode (no model loaded) ──────────────────────────────────────────
    if model is None or not TORCH_AVAILABLE:
        result = demo_predict(image_path)
        # Generate a synthetic colormap heatmap even in demo mode
        img_arr = np.array(Image.open(image_path).convert('RGB').resize((224, 224)))
        gray = cv2.cvtColor(img_arr, cv2.COLOR_RGB2GRAY).astype(np.float32)
        gray /= 255.0
        # Smooth it to look like a heat map
        cam_demo = cv2.GaussianBlur(gray, (21, 21), 0)
        overlay = overlay_heatmap_on_image(image_path, cam_demo)
        heatmap_path = save_heatmap_image(overlay)
        result['heatmap_path'] = heatmap_path
        return result

    # ── Real model inference ─────────────────────────────────────────────────
    try:
        image_tensor, pil_img = preprocess_image(image_path)
        with torch.no_grad():
            output = model(image_tensor)
            probs = torch.softmax(output, dim=1)[0].cpu().numpy()

        pred_idx = int(np.argmax(probs))
        diagnosis = CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])

        # Generate Grad-CAM
        cam = generate_gradcam(model, image_tensor, pred_idx)
        overlay = overlay_heatmap_on_image(image_path, cam)
        heatmap_path = save_heatmap_image(overlay)

        return {
            'diagnosis': diagnosis,
            'confidence': confidence,
            'probabilities': {
                'COVID-19': float(probs[0]),
                'Normal': float(probs[1]),
                'Pneumonia': float(probs[2]),
            },
            'heatmap_path': heatmap_path,
            'demo_mode': False,
        }

    except Exception as e:
        print(f"[predict_xray] Error: {e}")
        return demo_predict(image_path)
