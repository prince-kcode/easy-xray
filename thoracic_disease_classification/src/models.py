"""
models.py
---------
Three model architectures for multi-label thoracic disease classification:

1. BinaryRelevanceModel  – Baseline: DenseNet121 backbone, independent sigmoid per label
2. GCNModel              – DenseNet121 + Graph Convolutional Network over label co-occurrence
3. AttentionModel        – DenseNet121 + Multi-Head Self-Attention over label embeddings
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models

NUM_CLASSES = 14


# ══════════════════════════════════════════════════════════════════════════════
# 1. BASELINE – Binary Relevance
# ══════════════════════════════════════════════════════════════════════════════

class BinaryRelevanceModel(nn.Module):
    """
    DenseNet-121 backbone with independent FC head per label.
    Each label treated as a separate binary classification problem.
    """

    def __init__(self, num_classes: int = NUM_CLASSES,
                 pretrained: bool = True, dropout: float = 0.5):
        super().__init__()
        backbone = models.densenet121(
            weights=models.DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        )
        in_features = backbone.classifier.in_features
        backbone.classifier = nn.Identity()   # remove original head
        self.backbone  = backbone
        self.dropout   = nn.Dropout(dropout)
        self.classifier = nn.Linear(in_features, num_classes)

    def forward(self, x):
        feats  = self.backbone(x)              # (B, 1024)
        feats  = self.dropout(feats)
        logits = self.classifier(feats)        # (B, 14)
        return logits                          # BCEWithLogitsLoss applied outside


# ══════════════════════════════════════════════════════════════════════════════
# 2. GRAPH-BASED – Label Co-occurrence GCN
# ══════════════════════════════════════════════════════════════════════════════

class GraphConvLayer(nn.Module):
    """Simple GCN layer: H' = A_hat * H * W."""

    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        self.W = nn.Linear(in_dim, out_dim, bias=False)

    def forward(self, H, A_hat):
        """
        H     : (14, in_dim)
        A_hat : (14, 14) normalised adjacency (with self-loops)
        """
        return F.relu(A_hat @ self.W(H))


class GCNModel(nn.Module):
    """
    DenseNet-121 visual encoder + 2-layer GCN label classifier.
    The GCN takes label embeddings and the co-occurrence adjacency matrix
    to produce class-specific query vectors, which are dot-producted with
    visual features to produce logits.
    """

    def __init__(self, num_classes: int = NUM_CLASSES,
                 cooccurrence_matrix: np.ndarray = None,
                 embed_dim: int = 256,
                 pretrained: bool = True,
                 dropout: float = 0.5):
        super().__init__()

        # ── Visual backbone ──────────────────────────────────────────────────
        backbone = models.densenet121(
            weights=models.DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        )
        in_features = backbone.classifier.in_features   # 1024
        backbone.classifier = nn.Identity()
        self.backbone   = backbone
        self.dropout    = nn.Dropout(dropout)
        self.proj       = nn.Linear(in_features, embed_dim)

        # ── Label graph (GCN) ─────────────────────────────────────────────────
        self.label_embed = nn.Parameter(
            torch.randn(num_classes, embed_dim)           # learnable label embeddings
        )
        self.gcn1 = GraphConvLayer(embed_dim, embed_dim)
        self.gcn2 = GraphConvLayer(embed_dim, embed_dim)

        # ── Adjacency (normalised co-occurrence) ─────────────────────────────
        if cooccurrence_matrix is not None:
            A = torch.tensor(cooccurrence_matrix, dtype=torch.float32)
        else:
            A = torch.eye(num_classes)
        # Add self-loops and row-normalise
        A = A + torch.eye(num_classes)
        D_inv = torch.diag(1.0 / A.sum(dim=1))
        A_hat = D_inv @ A
        self.register_buffer('A_hat', A_hat)

    def forward(self, x):
        B = x.size(0)

        # Visual features
        v = self.proj(self.dropout(self.backbone(x)))    # (B, embed_dim)

        # GCN over labels
        H = self.gcn1(self.label_embed, self.A_hat)      # (14, embed_dim)
        H = self.gcn2(H, self.A_hat)                     # (14, embed_dim)

        # Dot-product: (B, embed_dim) x (embed_dim, 14) -> (B, 14)
        logits = v @ H.t()
        return logits


# ══════════════════════════════════════════════════════════════════════════════
# 3. ATTENTION-BASED – Multi-Head Self-Attention on label queries
# ══════════════════════════════════════════════════════════════════════════════

class LabelAttentionModel(nn.Module):
    """
    DenseNet-121 + Multi-Head Cross-Attention.

    Label embeddings act as queries; spatial image features act as keys/values.
    Each label attends to different image regions, producing label-specific
    feature vectors for classification.
    """

    def __init__(self, num_classes: int = NUM_CLASSES,
                 embed_dim: int = 512, num_heads: int = 8,
                 pretrained: bool = True, dropout: float = 0.3):
        super().__init__()

        # ── Visual backbone (keep spatial features) ───────────────────────────
        backbone = models.densenet121(
            weights=models.DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        )
        # Remove pooling and classifier; keep conv features
        self.features     = backbone.features
        self.feat_proj    = nn.Conv2d(1024, embed_dim, kernel_size=1)

        # ── Label embeddings ─────────────────────────────────────────────────
        self.label_embed  = nn.Parameter(torch.randn(num_classes, embed_dim))

        # ── Cross-attention ───────────────────────────────────────────────────
        self.cross_attn   = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, batch_first=True
        )
        self.norm1        = nn.LayerNorm(embed_dim)
        self.ff           = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim * 2, embed_dim),
        )
        self.norm2        = nn.LayerNorm(embed_dim)
        self.classifier   = nn.Linear(embed_dim, 1)   # one logit per label

    def forward(self, x):
        B = x.size(0)

        # Spatial features: (B, embed_dim, H, W)
        feat = F.relu(self.features(x), inplace=True)
        feat = self.feat_proj(feat)                                  # (B, D, H, W)
        H, W = feat.shape[2], feat.shape[3]
        feat_seq = feat.flatten(2).permute(0, 2, 1)                  # (B, HW, D)

        # Label queries: (B, 14, D)
        queries = self.label_embed.unsqueeze(0).expand(B, -1, -1)

        # Cross-attention: labels query image regions
        attn_out, _ = self.cross_attn(queries, feat_seq, feat_seq)   # (B, 14, D)
        attn_out    = self.norm1(queries + attn_out)
        attn_out    = self.norm2(attn_out + self.ff(attn_out))

        # (B, 14, 1) -> (B, 14)
        logits = self.classifier(attn_out).squeeze(-1)
        return logits


# ══════════════════════════════════════════════════════════════════════════════
# Factory
# ══════════════════════════════════════════════════════════════════════════════

def build_model(model_name: str,
                cooccurrence_matrix: np.ndarray = None,
                pretrained: bool = True) -> nn.Module:
    """
    Instantiate a model by name.

    Args:
        model_name          : One of 'br', 'gcn', 'attention'
        cooccurrence_matrix : Required for 'gcn'
        pretrained          : Use ImageNet pre-trained weights

    Returns:
        nn.Module
    """
    name = model_name.lower()
    if name == 'br':
        return BinaryRelevanceModel(pretrained=pretrained)
    elif name == 'gcn':
        return GCNModel(cooccurrence_matrix=cooccurrence_matrix, pretrained=pretrained)
    elif name in ('attention', 'attn'):
        return LabelAttentionModel(pretrained=pretrained)
    else:
        raise ValueError(f"Unknown model '{model_name}'. Choose from: br, gcn, attention")
