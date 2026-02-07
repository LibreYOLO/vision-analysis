# Vision Analysis

LibreYOLO benchmark comparison website. Compares YOLOX and YOLOv9 models across hardware and runtimes.

## Project Structure

The website lives in `website/`. Everything else at the root is documentation or config.

## Development

```bash
cd website
npm run dev     # local dev server
npm run build   # production build
npm run lint    # eslint
```

## Deploying to Production

```bash
cd website
npx vercel --prod
```

## Adding New Benchmarks

Drop the raw JSON file from the LibreYOLO benchmark runner into `website/benchmarks/`. The build-time loader (`website/src/lib/data/loader.ts`) auto-discovers all JSON files in that directory, transforms them, and groups by `{hardware}__{runtime}`.

No manual script needed — just drop the file and rebuild.

### Naming Convention

Files in `website/benchmarks/` follow: `{model}_benchmark.json` or `{model}_{hardware}.json` for non-default hardware. Examples:
- `yolov9s_benchmark.json` — A100 benchmark
- `yolov9t_rpi5.json` — Raspberry Pi 5 benchmark

### Expected JSON Structure

```json
{
  "model": {
    "name": "yolov9-s",
    "family": "yolov9",
    "variant": "s",
    "source": "libreyolo",
    "weights": "libreyolo9s.pt",
    "input_size": 640
  },
  "runtime": {
    "format": "pytorch",
    "precision": "fp32",
    "device": "cpu"
  },
  "hardware": {
    "gpu": "Raspberry Pi 5 Model B Rev 1.1",
    "gpu_memory_gb": 0,
    "driver_version": "N/A",
    "cuda_version": "N/A",
    "cpu": "Unknown",
    "cpu_cores": 0,
    "ram_gb": 7
  },
  "software": {
    "python": "3.13.5",
    "torch": "2.10.0+cpu",
    "libreyolo": "0.1.4"
  },
  "accuracy": {
    "mAP_50": 0.6216,
    "mAP_50_95": 0.4537,
    "precision": 0.6713,
    "recall": 0.5814,
    "mAP_small": 0.0,
    "mAP_medium": 0.0,
    "mAP_large": 0.0
  },
  "timing": {
    "batch_size": 1,
    "num_images": 5000,
    "ms_per_image": 744.79,
    "preprocess_ms": 2.90,
    "inference_ms": 734.87,
    "postprocess_ms": 3.99
  },
  "throughput": {
    "fps": 1.34
  },
  "model_stats": {
    "params_millions": 7.23,
    "gflops": 0.0
  },
  "metadata": {
    "benchmark_date": "2026-02-07",
    "benchmark_version": "1.0"
  }
}
```

Hardware is auto-detected from `hardware.gpu` (e.g. "NVIDIA A100" → `a100`, "Raspberry Pi 5" → `rpi5`). Runtime is built from `runtime.format` + `runtime.precision` (e.g. `pytorch_fp32`). mAP values in decimal form (0–1) are converted to percentages automatically. If `model_stats.gflops` or `params_millions` is 0, the loader falls back to values from `website/src/data/metadata/models.json`.

## Hardware & Runtime Metadata

To add a new hardware platform or runtime, update the corresponding metadata file:
- `website/src/data/metadata/hardware.json`
- `website/src/data/metadata/runtimes.json`
- `website/src/data/metadata/models.json`

## Git Policy

You can commit but not push. The user will handle pushes manually.
