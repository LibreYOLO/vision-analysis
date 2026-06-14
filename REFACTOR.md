# Refactor: decouple accuracy from performance (full-coordinate results)

**Branch:** `visionanalysis-refacto`
**Status:** Proposed — not yet implemented
**Scope:** `vision-analysis` (website + data layer). Follow-ups noted for `vision-analysis-benchmark` (harness).

---

## TL;DR

A benchmark result currently fuses **accuracy** and **performance** into one record whose
identity is only `(model, hardware, runtime)`. Any extra dimension — batch size, input size,
or evaluation image count — is silently dropped, so the site cannot represent batch sweeps,
cannot tell a 500-image subset run from a 5000-image full-val run, and mis-keys new hardware.

The fix is to treat the two measurement types as what they are:

- **Accuracy** is a property of `(model, precision, dataset)`. It is hardware- and
  batch-independent. Measure once on full COCO val2017; publish one canonical number.
- **Performance** (latency / throughput / peak memory) is the multi-dimensional cube keyed by
  `(model, hardware, backend, precision, inputSize, batchSize)`. Measure per device; a small
  image subset is statistically fine for timing.

The harness **already emits** every field needed (`hardware.id`, `config.batch_size`,
`config.input_size`, `dataset.num_images`, `runtime.precision`). The website simply discards
most of it. So the core of this refactor is **"stop discarding the coordinate,"** not a rewrite.
All 74 existing submissions are already complete full-val records and need **zero changes**.

---

## Problem statement

### Symptoms

1. **Batch sweeps collide and silently disappear.** `loader.ts` groups results by
   `${hardware}__${runtime}` (`loader.ts:77`) and then `dedupeGrouped` keeps only **one record
   per `model`**, latest by timestamp (`loader.ts:58-71`). Submit batch 1/2/4/8/16/32 for the
   same model on the same hardware/runtime and five of six are thrown away. `batchSize` rides on
   the record (`transform.ts:249`, `benchmark.ts:26`) but is part of **no key**.

2. **Subset runs are indistinguishable from full-val.** `transform.ts:246` hardcodes
   `dataset: "coco_val2017"`, and `BenchmarkResult` has **no `numImages` field** — the image
   count is dropped on transform. A 500-image Jetson run and a 5000-image A100 run render
   identically. Meanwhile `methodology/page.tsx:69` publicly states *"All accuracy numbers are
   computed on COCO val2017 (5,000 images…)"*, and the harness itself labels `--limit` runs
   *"SUBSET - not a full-val2017 submission."* Publishing subset mAP under that banner would make
   the site contradict its own stated protocol.

3. **New hardware is mis-keyed.** The website re-derives the hardware id from the GPU **name
   string** (`transform.ts:95-106`) and ignores the clean `hardware.id` the harness already sets.
   On a Jetson, `torch.cuda.get_device_name()` typically returns `"Orin"` — which matches neither
   the `"jetson"` pattern nor anything in `hardware.json` — so it slugifies to `"orin"`, with no
   metadata entry, and the tier vanishes from the leaderboard selector. (The existing 5070 Ti
   entry only works today by accident of the slugify fallback matching its `hardware.json` id.)

4. **Cross-hardware accuracy divergence has no policy.** Two full-val runs of the same model on
   different hardware will not produce bit-identical mAP (TF32 matmuls, kernel/reduction-order
   differences, cuDNN/torch/Pillow version skew). Today the loader just keeps the latest
   timestamp, so the published number can silently change when a new hardware tier is added, and
   genuine config drift (e.g. TF32 on vs off, wrong commit) is never flagged.

5. **Latent input-size bug (same root cause).** Benchmark one model at 640 and at 1280 on the
   same hardware/runtime and one is dropped — identical mechanism to the batch-size collision.

### Root cause

A result's **identity is incomplete** (`model, hardware, runtime` only), and a single record
**conflates two measurement types** (accuracy + performance) that have different natural keys.
The website compounds this by **re-deriving or discarding** coordinate fields the harness already
provides. Every symptom above is a facet of this one issue.

---

## Design principles

1. **Two record types, two keys.**
   - Accuracy identity: `(model, dataset, precision)` — *not* hardware, *not* batch.
   - Performance identity: `(model, hardware, backend, precision, inputSize, batchSize)`.
2. **Trust the harness coordinate.** The harness already emits `hardware.id`,
   `config.batch_size`, `config.input_size`, `dataset.num_images`, `runtime.precision`. Read
   them; stop re-deriving or dropping them.
3. **Backward compatible by construction.** Existing submissions are complete (verified: an old
   A100 record and a recent 5070 Ti record both carry `hardware.id`, `config.batch_size=1`,
   `config.input_size=640`, `dataset.num_images=5000`, `runtime.precision=fp32`). For current
   data — one row per `(model, hardware)`, all batch=1 / 5000-img / 640px — full-coordinate keying
   produces **identical output** to today. New behavior only activates when new-shape data arrives.
4. **Divergence is a signal, not a display problem.** Small accuracy differences across hardware
   are physics (round and pick a reference); large ones mean a protocol/config break and should be
   caught by a build-time gate, never averaged away.

---

## Proposed solution (staged, each step independently shippable & revertible)

### Step 1 — Full-coordinate identity + read fields already present

Goal: stop dropping/colliding. After this step the existing site renders byte-identically; new
dimensions (batch, input size, subset, new hardware) stop colliding.

- **`benchmark.ts`** — extend `BenchmarkResult` with `numImages: number`, `datasetVariant: string`
  (e.g. `"full"` | `"mini500"`), `precision: string`, and ensure `inputSize`/`batchSize` are
  first-class (they already exist).
- **`transform.ts`**
  - Extend `RawBenchmark` to include `hardware.id`, `config`, `dataset`/`eval` blocks.
  - **Prefer `raw.hardware.id`**; only fall back to GPU-string derivation when absent. (Fixes
    Jetson + retro-fixes 5070 Ti fragility.)
  - Read `eval.numImages` / `dataset.num_images` instead of hardcoding the dataset; set
    `datasetVariant` from the count (5000 ⇒ `full`, else a registered subset id).
  - Carry `precision` from `runtime.precision`.
- **`loader.ts`** — change the dedup identity from `result.model` to the **full performance
  coordinate** `model | hardware | backend | precision | inputSize | batchSize`. "Latest
  timestamp wins" still applies *within* an identical coordinate (re-runs collapse correctly).
- **`fetcher.ts`** — `getModelBenchmarks` must stop returning one arbitrary row per
  `(hardware, runtime)` (`fetcher.ts:47-54`); return all coordinates so the model page can show
  multiple input sizes / batch sizes.
- **Metadata** — register `coco_val2017_mini500` in `datasets.json` (500 imgs, deterministic
  `sorted(getImgIds())[:500]`), and add a `jetson_orin` entry to `hardware.json`
  (category `edge`, 8 GB, ~7–15 W).

**Verification:** rebuild `generated/verified-results.v1.json` and confirm the rendered
a100 / 5070-ti leaderboard + model-page rows are unchanged (diff the generated JSON; the existing
tiers must be identical). Ship the proof in the same PR.

### Step 2 — Canonical accuracy policy

Goal: one stable, citable mAP per `(model, dataset, precision)`, and automatic detection of drift.

- **Reference platform.** Designate one platform as the accuracy source (recommend **A100**:
  oldest, most standard, most stable). Its full-val mAP is *the* published number. Every other
  tier's accuracy becomes a performance-run byproduct, never the headline.
- **Canonical-accuracy join** (read-time projection in the loader/fetcher — **no data
  migration**, submissions stay one blob): build a lookup `(model, dataset, precision) → mAP*`
  from full-val records on the reference platform. The model page / leaderboard read accuracy from
  this lookup and performance from the coordinate rows.
- **Agreement gate** (in `scripts/benchmark_data.py`): when another full-val run exists for the
  same `(model, dataset, precision)`, assert it agrees with the reference within tolerance
  (e.g. ≤ 0.3 mAP). Within tolerance → ignore for accuracy, keep its speed. Outside → **warn/fail
  the build** so TF32/version/commit drift is caught, not published.
- **Subset accuracy never published as full-val.** A `datasetVariant !== "full"` record may show
  its speed/memory but must source its displayed mAP from the canonical lookup (or be badged
  "subset, indicative" and excluded from rankings).

### Step 3 — Surface the new dimensions (UI)

- **Leaderboard** — pin to `batchSize=1`, `datasetVariant="full"`, default input size, so the
  cross-model ranking stays apples-to-apples. Existing behavior unchanged. (Optional batch
  selector later, defaulting to 1.)
- **Model page** — add a "Throughput scaling" section: hardware dropdown + FPS/latency/VRAM-vs-
  batch curve and table. This is the natural home for batch sweeps (a sweep is inherently
  per-`(model, hardware)`). Add a column/label for input size when multiple exist.
- **Hardware page** — new tiers (Jetson) appear automatically once metadata + `hardware.id`
  preference land. Add an edge-tier note (see harness follow-up on conf).

### Harness follow-ups (`vision-analysis-benchmark`, separate branch/PR)

These are needed for *future* runs, not for the existing data or the website refactor:

- **Record TF32 / matmul precision** — the submission's `runtime` (`{format, precision, provider,
  device}`) does not capture `allow_tf32`; two "fp32" runs can differ because of it. For canonical
  accuracy, pin TF32 **off** (or record the flag) so the reference is reproducible.
- **Tighten the commit guard** — `validate_submission` lets `libreyolo_commit == "unknown"` pass
  (`benchmark_data.py:147-152`); this is the one path that could let different model code yield a
  divergent mAP unflagged. Require a pinned commit for full-val accuracy submissions.
- **Add `--subset` / dataset-variant labeling** — emit `datasetVariant` + correct `num_images`
  instead of the harness's `--limit` "not a valid submission" path, so subset performance runs are
  first-class (this is what the Jetson mini-500 tier needs).
- **Add `--batch-sizes 1 2 4 8 16 32`** — requires a genuinely batched code path (collate
  `[B,3,H,W]`, batched forward, per-image NMS over the batch, batched timing, VRAM-at-batch);
  `benchmark.py:308` currently loops one image at a time. Scope to GPU hardware only.

---

## Backward compatibility & non-goals

- **No submission rewrites.** All changes are additive reads + a read-time projection. The 74
  existing JSONs are untouched and remain the reference data (A100/5070 Ti = canonical accuracy +
  desktop-GPU performance tier).
- **No schema break.** `schema_version` stays `va.submission.v1`; the fields being read are
  already present.
- **Non-goals (for now):** a composite VA score; deployment-conf (e.g. 0.25) timing passes;
  fp16/int8 accuracy lineages (the design accommodates them via the `precision` axis, but they are
  not part of this refactor).

---

## Open decisions

1. **Reference platform for canonical accuracy** — A100 (recommended) vs 5070 Ti (daily rig).
   One-line, swappable.
2. **Accuracy tolerance** for the agreement gate — proposed 0.3 mAP; tighten once TF32 is pinned.
3. **Backend and accuracy** — does `(model, dataset, precision)` need a `backend` term
   (pytorch vs onnx may differ slightly)? Default: canonical = reference platform's PyTorch
   full-val; treat onnx as a separate lineage only if measured divergence warrants.
4. **Subset accuracy display** — borrow canonical mAP silently vs show a visible "subset,
   indicative" badge. Recommend badge for honesty.

---

## Why this order

Step 1 is low-risk (reads existing fields; proven byte-identical for current tiers) and is the
linchpin for all three problems — batch sweeps, the Jetson mini-500 tier, and new-hardware
wiring. Step 2 makes accuracy trustworthy and self-checking. Step 3 is pure additive UI. The
harness follow-ups can land independently afterward.
