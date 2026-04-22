#!/usr/bin/env python3
"""Model-comparison fact sheet.

Pulls the primary benchmark for a model pair on a chosen hardware/runtime, plus
all available cross-runtime slices on the same hardware and all cross-hardware
slices on the same runtime. Metadata from models.json and hardware.json.
Emits JSON on stdout.

Usage:
  fact_sheet.py <modelA> <modelB> [primary_hardware=rtx5080] [primary_runtime=pytorch_fp32]
"""
import json
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
METADATA = ROOT / "website" / "src" / "data" / "metadata"
BENCH = ROOT / "website" / "benchmarks"
GENERATED = ROOT / "generated" / "verified-results.v1.json"

RUNTIMES = {
    "pytorch_fp32": {"suffix": "", "format": "pytorch", "precision": "fp32", "device": "gpu", "display": "PyTorch FP32"},
    "onnx_fp32": {"suffix": "_onnx", "format": "onnx", "precision": "fp32", "device": "gpu", "display": "ONNX FP32"},
    "tensorrt_fp16": {"suffix": "_tensorrt", "format": "tensorrt", "precision": "fp16", "device": "gpu", "display": "TensorRT FP16"},
}

TIE_PCT = 2.0


def _load(p):
    return json.loads(p.read_text())


def _slug(model_id):
    return model_id.replace("-", "")


def _bench_path(model_id, hardware, runtime_id):
    return BENCH / f"{_slug(model_id)}_{hardware}{RUNTIMES[runtime_id]['suffix']}.json"


def _runtime_id_from_bench(bench):
    runtime = bench.get("runtime") or {}
    return f"{runtime.get('format', 'unknown')}_{runtime.get('precision', 'unknown')}"


def _model_id_from_bench(bench):
    model = bench.get("model") or {}
    if model.get("id"):
        return model["id"]

    name = str(model.get("name", "")).lower()
    family = str(model.get("family", "")).lower()
    variant = str(model.get("variant", "")).lower()
    if family.startswith("yolov9"):
        return f"yolov9{variant}"
    if family.startswith("yolox"):
        return f"yolox-{variant}"
    if family in {"rfdetr", "rtdetr"}:
        return f"{family}-{variant}"
    return name or None


@lru_cache(maxsize=1)
def _generated_index():
    if not GENERATED.exists():
        return {}

    parsed = _load(GENERATED)
    index = {}
    for bench in parsed.get("results", []):
        if not isinstance(bench, dict):
            continue
        model_id = _model_id_from_bench(bench)
        hardware_id = (bench.get("hardware") or {}).get("id")
        runtime_id = _runtime_id_from_bench(bench)
        if not model_id or not hardware_id or runtime_id not in RUNTIMES:
            continue
        created_at = bench.get("created_at") or bench.get("metadata", {}).get("benchmark_date") or ""
        key = (model_id, hardware_id, runtime_id)
        existing = index.get(key)
        existing_created_at = existing.get("created_at") if isinstance(existing, dict) else ""
        if existing is None or created_at > existing_created_at:
            index[key] = bench
    return index


def _try_load_bench(model_id, hardware, runtime_id):
    generated_bench = _generated_index().get((model_id, hardware, runtime_id))
    if generated_bench is not None:
        return generated_bench
    p = _bench_path(model_id, hardware, runtime_id)
    return _load(p) if p.exists() else None


def _find(lst, key, value):
    for item in lst:
        if item.get(key) == value:
            return item
    return None


def _pct(a, b):
    if not b:
        return None
    return round((a - b) / b * 100, 2)


def _winner(a_id, b_id, a_val, b_val, higher_is_better=True, tie_pct=TIE_PCT):
    if a_val is None or b_val is None or a_val == 0 or b_val == 0:
        return None
    delta = _pct(a_val, b_val) if higher_is_better else _pct(b_val, a_val)
    if abs(delta) < tie_pct:
        return "tie"
    a_wins = (a_val > b_val) if higher_is_better else (a_val < b_val)
    return a_id if a_wins else b_id


def _full_slice(bench):
    return {
        "accuracy": bench["accuracy"],
        "timing": bench["timing"],
        "throughput": bench["throughput"],
        "memory": bench["memory"],
        "hardware": bench["hardware"],
        "software": bench["software"],
        "runtime": bench["runtime"],
        "eval": bench["eval"],
        "model_stats": bench.get("model_stats", {}),
        "input_size": bench["model"].get("input_size"),
        "benchmark_date": bench.get("metadata", {}).get("benchmark_date"),
    }


def _timing_metric(bench, key):
    timing = bench.get("timing") or {}
    if key in timing:
        return timing[key]

    total_ms = timing.get("total_ms")
    if isinstance(total_ms, dict):
        if key == "ms_per_image":
            return total_ms.get("mean")
        return total_ms.get(key)

    return None


def _params_m(bench, meta):
    """Prefer benchmark-measured params; fall back to metadata if missing or zero."""
    stats = bench.get("model_stats") or {}
    v = stats.get("params_millions")
    if v:
        return v
    return meta["specs"]["paramsM"]


def _flops_g(bench, meta):
    stats = bench.get("model_stats") or {}
    v = stats.get("gflops")
    if v:
        return v
    return meta["specs"]["flopsG"]


def _core_metrics(bench):
    return {
        "fps_mean": bench["throughput"]["fps_mean"],
        "fps_p50": bench["throughput"]["fps_p50"],
        "ms_per_image": _timing_metric(bench, "ms_per_image"),
        "inference_ms": _timing_metric(bench, "inference_ms"),
        "mAP_50_95": bench["accuracy"]["mAP_50_95"],
        "mAP_50": bench["accuracy"]["mAP_50"],
        "peak_vram_mb": bench["memory"].get("peak_vram_mb"),
    }


def _model_block(meta):
    # paperReportedMap is intentionally NOT exposed: the pipeline never compares
    # measured numbers to paper values. Articles state that the evaluated weights
    # are LibreYOLO retrained and that other sources may yield different values.
    return {
        "id": meta["id"],
        "displayName": meta["displayName"],
        "family": meta["family"],
        "license": meta["license"],
        "releaseDate": meta["releaseDate"],
        "architecture": meta["architecture"],
        "detectionApproach": meta["detectionApproach"],
        "postprocessing": meta["postprocessing"],
        "specs": meta["specs"],
        "source": meta.get("source"),
        "inLibreYOLO": meta.get("inLibreYOLO"),
    }


def build(a_id, b_id, primary_hw="rtx5080", primary_rt="pytorch_fp32"):
    if primary_rt not in RUNTIMES:
        raise SystemExit(f"unknown runtime: {primary_rt}. Known: {list(RUNTIMES)}")

    models = _load(METADATA / "models.json")["models"]
    hardwares = _load(METADATA / "hardware.json")["hardware"]

    a_meta = _find(models, "id", a_id)
    b_meta = _find(models, "id", b_id)
    if a_meta is None:
        raise SystemExit(f"model not found: {a_id}")
    if b_meta is None:
        raise SystemExit(f"model not found: {b_id}")
    hw_meta = _find(hardwares, "id", primary_hw)

    a_bench = _try_load_bench(a_id, primary_hw, primary_rt)
    b_bench = _try_load_bench(b_id, primary_hw, primary_rt)
    if a_bench is None or b_bench is None:
        raise SystemExit(f"primary bench missing for {a_id}/{b_id} on {primary_hw}/{primary_rt}")

    a_fps = a_bench["throughput"]["fps_mean"]
    b_fps = b_bench["throughput"]["fps_mean"]
    a_map = a_bench["accuracy"]["mAP_50_95"]
    b_map = b_bench["accuracy"]["mAP_50_95"]
    a_params = _params_m(a_bench, a_meta)
    b_params = _params_m(b_bench, b_meta)
    a_flops = _flops_g(a_bench, a_meta)
    b_flops = _flops_g(b_bench, b_meta)
    a_input = a_bench["model"].get("input_size")
    b_input = b_bench["model"].get("input_size")

    primary = {
        "hardware": primary_hw,
        "hardware_display": hw_meta["displayName"] if hw_meta else primary_hw,
        "runtime": primary_rt,
        "runtime_display": RUNTIMES[primary_rt]["display"],
        "benchmark_date": a_bench.get("metadata", {}).get("benchmark_date"),
        "benchmark_version": a_bench.get("metadata", {}).get("benchmark_version"),
        "a": _full_slice(a_bench),
        "b": _full_slice(b_bench),
        "deltas_pct": {
            "mAP_50_95": _pct(a_map, b_map),
            "mAP_50": _pct(a_bench["accuracy"]["mAP_50"], b_bench["accuracy"]["mAP_50"]),
            "fps": _pct(a_fps, b_fps),
            "total_ms": _pct(_timing_metric(a_bench, "ms_per_image"), _timing_metric(b_bench, "ms_per_image")),
            "params": _pct(a_params, b_params),
            "flops": _pct(a_flops, b_flops),
            "peak_vram": _pct(a_bench["memory"]["peak_vram_mb"], b_bench["memory"]["peak_vram_mb"]),
        },
        "winners_by_axis": {
            "mAP_50_95": _winner(a_id, b_id, a_map, b_map),
            "mAP_50": _winner(a_id, b_id, a_bench["accuracy"]["mAP_50"], b_bench["accuracy"]["mAP_50"]),
            "mAP_small": _winner(a_id, b_id, a_bench["accuracy"]["mAP_small"], b_bench["accuracy"]["mAP_small"]),
            "fps": _winner(a_id, b_id, a_fps, b_fps),
            "inference_ms": _winner(a_id, b_id, _timing_metric(a_bench, "inference_ms"), _timing_metric(b_bench, "inference_ms"), higher_is_better=False),
            "peak_vram": _winner(a_id, b_id, a_bench["memory"]["peak_vram_mb"], b_bench["memory"]["peak_vram_mb"], higher_is_better=False),
            "params_smaller": _winner(a_id, b_id, a_params, b_params, higher_is_better=False),
            "flops_smaller": _winner(a_id, b_id, a_flops, b_flops, higher_is_better=False),
        },
        "input_size_match": (a_input == b_input) if (a_input and b_input) else None,
        "input_sizes": {"a": a_input, "b": b_input},
        "efficiency": {
            "a_mAP_per_GFLOP": round(a_map / a_flops, 5) if a_flops else None,
            "b_mAP_per_GFLOP": round(b_map / b_flops, 5) if b_flops else None,
        },
    }

    cross_runtime = []
    for rt_id, rt_info in RUNTIMES.items():
        a_rt = _try_load_bench(a_id, primary_hw, rt_id)
        b_rt = _try_load_bench(b_id, primary_hw, rt_id)
        if a_rt and b_rt:
            cross_runtime.append({
                "runtime": rt_id,
                "display": rt_info["display"],
                "a": _core_metrics(a_rt),
                "b": _core_metrics(b_rt),
            })

    cross_hardware = []
    for h in hardwares:
        a_h = _try_load_bench(a_id, h["id"], primary_rt)
        b_h = _try_load_bench(b_id, h["id"], primary_rt)
        if a_h and b_h:
            cross_hardware.append({
                "hardware": h["id"],
                "display": h["displayName"],
                "category": h.get("category"),
                "specs": h.get("specs"),
                "a": _core_metrics(a_h),
                "b": _core_metrics(b_h),
            })

    return {
        "pair": {"a": a_id, "b": b_id},
        "metadata": {"a": _model_block(a_meta), "b": _model_block(b_meta)},
        "primary": primary,
        "cross_runtime": cross_runtime,
        "cross_hardware": cross_hardware,
    }


def main():
    if len(sys.argv) < 3:
        print("usage: fact_sheet.py <modelA> <modelB> [primary_hardware=rtx5080] [primary_runtime=pytorch_fp32]", file=sys.stderr)
        sys.exit(1)
    a, b = sys.argv[1], sys.argv[2]
    hw = sys.argv[3] if len(sys.argv) > 3 else "rtx5080"
    rt = sys.argv[4] if len(sys.argv) > 4 else "pytorch_fp32"
    print(json.dumps(build(a, b, hw, rt), indent=2))


if __name__ == "__main__":
    main()
