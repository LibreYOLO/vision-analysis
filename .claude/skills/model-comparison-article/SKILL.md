---
name: model-comparison-article
description: Generate a two-model comparison article for visionanalysis.org that matches the structure and voice of article-pipeline/target_article_example_v1.html. Use when the user asks to produce, draft, or regenerate a model-vs-model comparison article.
---

# Usage

Args: `<modelA> <modelB> [hardware=rtx5080] [runtime=pytorch_fp32]`

Runtimes: `pytorch_fp32`, `onnx_fp32`, `tensorrt_fp16`.
Hardwares: any id in `website/src/data/metadata/hardware.json` (currently `rtx5080`, `a100`, `dgx_spark`, `rpi5`).

# Pipeline

1. **Fact sheet.**
   `python3 article-pipeline/fact-sheet/fact_sheet.py <modelA> <modelB> <hardware> <runtime>`
   Save stdout to `article-pipeline/output/<modelA>-vs-<modelB>-<hardware>.json`.

2. **Read the template.** Open `article-pipeline/target_article_example_v1.html`. It is the canonical structural and visual reference. Copy its CSS, section order, and element patterns.

3. **Write the article.** Produce `article-pipeline/output/<modelA>-vs-<modelB>-<hardware>.html` with the same layout and voice as the template, populated from the fact sheet.

4. **Validate.**
   `python3 article-pipeline/validators/number_audit.py article-pipeline/output/<modelA>-vs-<modelB>-<hardware>.html article-pipeline/output/<modelA>-vs-<modelB>-<hardware>.json`
   If it fails, fix the article and rerun until it passes.

# Section order (match target_article_example_v1.html)

1. `<h1>` = `<ModelA displayName> vs <ModelB displayName>`. No subtitle. Do not put hardware in the title.
2. Lede paragraph. One to three sentences stating the tradeoff using real numbers.
3. Tag row (COCO val2017, images count, input size, batch size, primary runtime display, primary hardware display).
4. Verdict block: two to four sentences with the key deltas (accuracy delta, fps delta, VRAM delta, ranking robustness claim if cross_* data present).
5. `Setup` h2 + dl (dataset, input/batch, primary hardware full spec, primary runtime, framework and Python version, weights origin, benchmark date and harness version in one line using `primary.benchmark_date` and `primary.benchmark_version`).
6. Metric-honesty callout: state mAP form (percent, e.g. 46.8 from the JSON's 0.468). State that precision and recall in the JSONs are single-threshold point measurements, not used for ranking.
7. `Results, side by side` h2 + one-line caption naming primary hardware, runtime, batch size + the full comparison table. Use `class="win"` on the winning cell per row. Include precision and recall rows flagged "not comparable, not ranked". Include a final efficiency row `mAP@50-95 per GFLOP` pulling `primary.efficiency.a_mAP_per_GFLOP` and `primary.efficiency.b_mAP_per_GFLOP` (shown as decimals, e.g. 0.0346; this is the compute-efficiency axis and is most informative when GFLOPs differ).
8. `Accuracy` h2 + short prose on the mAP breakdown. Close with one sentence stating the evaluated weights are LibreYOLO retrained checkpoints and that other weight sources (original author releases, independent retrains) may produce different values. **Do not compare measured mAP to paper-reported values. Do not mention paper mAP at all.**
9. `Latency and throughput` h2 + bullet list: where the gap lives (inference vs preprocess vs postprocess), jitter observation (fps_mean vs fps_p50 gap), note that GFLOPs do not predict wall clock.
10. `Memory` h2 + peak VRAM and peak host RAM observation.
11. `Does the ranking survive other runtimes and hardware?` h2 + two tables: cross-runtime on the primary hardware (one row per entry in `cross_runtime`), cross-hardware on the primary runtime (one row per entry in `cross_hardware`). TensorRT-multiplier callout if `tensorrt_fp16` is in `cross_runtime`.
12. `License and provenance` h2 + two-column kv block. License, release date, original repo URL, LibreYOLO weights URL, per model.
13. `When to pick which` h2 + three bullets: one per model, one on runtime conversion if TensorRT data exists.
14. `What this data does not tell you` h2 + gap list (batched throughput, tail latency beyond p50, INT8, confidence/NMS thresholds, energy, your domain data).
15. `Try it with LibreYOLO` h2 + code snippet using `LibreYOLO("LibreYOLO<Family><size>.pt")`. YOLOv9 prefix is `LibreYOLO9`, YOLOX prefix is `LibreYOLOX`. Include pip install hint and per-model comment line with params and mAP@50-95.
16. Footnote listing source JSON paths (primary + cross_runtime + cross_hardware files actually used) and the values of `primary.benchmark_date`, `primary.benchmark_version`, and `primary.a.software.libreyolo`.

# Fact sheet conventions

- All `primary.deltas_pct` values are A relative to B. Positive means A is higher than B. Example: `deltas_pct.fps = -11.21` means A's fps_mean is 11.21% lower than B's.
- `winners_by_axis` values are either a model id (winner), `"tie"` (delta within ±2%), or `null` (missing data).
- `cross_runtime` and `cross_hardware` arrays are empty when data is absent. If empty, drop the corresponding section and table from the article.
- mAP in the fact sheet is decimal form (0.468). In the article, show as percent (46.8). Scale once, consistently.
- **Params and GFLOPs**: use `primary.a.model_stats.params_millions` / `gflops` (benchmark-measured, source of truth). Fall back to `metadata.a.specs.paramsM` / `flopsG` only if the primary value is null. Some models (e.g. RF-DETR N/S/M) have zero in the metadata; the benchmark is authoritative.
- **Input size**: each model's default input comes from `primary.a.input_size` and `primary.b.input_size`. If `primary.input_size_match` is false, the two models were evaluated at different input resolutions. State this caveat prominently in the Setup section and mention it in the verdict block; the comparison is each-model-at-its-author-default, not same-pixels.

# Voice rules

See `article-pipeline/style/rules.md`. Non-negotiable points:
- No em dashes.
- No architectural speculation. Do not explain why architectures perform how they do. Backbone/neck/head names appear only in the specs row of tables, not in prose.
- No "Bottom line" or "Conclusion" sections. Verdict goes once at the top.
- Every number in the article must be traceable to the fact sheet. The validator enforces this.
