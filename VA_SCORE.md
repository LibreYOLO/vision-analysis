# VA V1 Score — Vision Analysis Compound Index

## What is the VA Score?

The VA Score is a single number (0–100) that ranks object detection models holistically. It's the computer vision equivalent of Artificial Analysis's "AA Index" for LLMs.

Unlike LLMs where a single "intelligence" axis makes sense (text in, text out), object detection models are deployed across wildly different hardware and use cases. The VA V1 Score accounts for this by compounding accuracy, speed on both cloud and edge hardware, and compute efficiency into one number.

## V1 Components

The VA V1 Score is the normalized average of 6 metrics:

| # | Metric | What it measures | Why it's included |
|---|--------|-----------------|-------------------|
| 1 | **mAP@50** | Detection quality | Did the model find the object? This is the metric that matters most in production. If your bounding box overlaps 50% with ground truth, you've detected it. |
| 2 | **mAP@50-95** | Localization precision | How tight is the bounding box? Averages across IoU thresholds 0.5–0.95. The strict thresholds (0.8, 0.9, 0.95) are somewhat academic, but this metric still captures meaningful localization quality. Including both mAP@50 and mAP@50-95 gives implicit extra weight to detection quality over pixel-perfect localization. |
| 3 | **mAP_small** | Small object detection | Can the model see small things (<32×32 px)? This is the hardest detection task and separates good models from great ones. COCO eval computes this for free — it's part of the standard pycocotools output. |
| 4 | **FPS on A100** | Cloud/GPU speed | How fast is the model on standard cloud hardware? This matters for batch processing, API endpoints, and any deployment where you're paying for GPU time. |
| 5 | **FPS on RPi5** | Edge/real-world speed | How fast is the model on constrained hardware? This is the honest speed metric. On a powerful GPU, a 3M parameter model and a 30M parameter model can look similarly fast because the GPU isn't stressed. On a Raspberry Pi 5, the true computational cost is exposed — differences that are invisible on an A100 become massive on edge hardware. |
| 6 | **mAP/GFLOP** | Compute efficiency | How much accuracy do you get per unit of compute? This rewards architecturally efficient models that achieve high mAP without brute-forcing it with more FLOPs. |

## Scoring Method

1. For each of the 6 metrics, compute the min-max normalization across all models that have a complete V1 score:
   - `normalized = (value - min) / (max - min) * 100`
   - For metrics where lower is better (none currently — FPS is higher-is-better), invert before normalizing.
2. Average the 6 normalized scores.
3. The result is the VA V1 Score (0–100).

## Requirements

A model **must have benchmarks on both A100 and Raspberry Pi 5** to receive a V1 score. Models with only one hardware benchmark are listed in the leaderboard but don't get a composite score.

This is a deliberate choice. A score that only uses GPU speed would be misleading — it compresses real performance differences and makes bloated models look fast.

## Design Decisions

### Why mAP@50 AND mAP@50-95?

mAP@50-95 includes mAP@50, so including both gives extra weight to detection quality. This is intentional. In real-world applications, detecting the object (IoU ≥ 0.5) matters far more than pixel-perfect localization (IoU ≥ 0.95). The strict thresholds in mAP@50-95 drag down scores in ways that don't reflect actual usefulness.

### Why two hardware benchmarks?

GPU benchmarks compress speed differences. An NVIDIA A100 has 19.5 TFLOPS FP32 — it barely breaks a sweat on small models. A 3M param model and a 25M param model can both hit high FPS because the GPU is memory-bound, not compute-bound. On edge hardware (RPi5), you're actually compute-bound and FPS directly reflects the model's true computational weight. Both perspectives matter.

### Why mAP_small?

Small object detection is the hardest task in object detection and the best differentiator between models. Two models with similar overall mAP can have drastically different mAP_small scores. This metric also comes free from COCO eval — no additional benchmark runs needed.

### Why mAP/GFLOP instead of mAP/param?

GFLOPs reflect actual computational cost at inference time. Parameter count reflects model size on disk but not necessarily compute cost (some architectures have more parameters but fewer operations per forward pass). For a speed-aware index, FLOP efficiency is more meaningful.

### What's NOT in V1 and why

| Excluded | Reason |
|----------|--------|
| Robustness (COCO-C, weather, corruption) | Requires generating corrupted datasets and additional eval runs. Good for V2. |
| Trainability (RF100, few-shot) | Requires 100+ fine-tuning runs per model. Significant compute investment. V3 candidate. |
| Video/temporal consistency | Requires video benchmarks and tracker integration. Different evaluation pipeline entirely. |
| Multi-dataset generalization (LVIS, Objects365) | Requires downloading additional datasets and running eval. Good V2 addition. |
| Quantization robustness | Requires exporting each model to INT8 and re-evaluating. Moderate effort, V2 candidate. |
| Ecosystem/license scoring | Subjective and hard to normalize. Better presented as metadata, not as part of a numeric score. |

## Future Versions

- **V2**: Add a second dataset (LVIS or Objects365), quantization degradation (FP32→INT8), and resolution robustness (mAP at 320px vs 640px).
- **V3**: Add trainability via RF100, corruption robustness via COCO-C.
- **V4**: Video/temporal metrics, more hardware targets (Jetson, mobile).

## Data Source

All metrics come from LibreYOLO benchmark runs evaluated on COCO val2017 (5,000 images, 80 classes). The benchmark pipeline measures end-to-end latency including preprocessing, inference, and postprocessing (NMS).
