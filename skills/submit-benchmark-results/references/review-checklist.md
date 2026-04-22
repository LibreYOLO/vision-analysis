# Review Checklist

Use this checklist before submitting or approving benchmark data.

## File placement

- File is under `submissions/`
- File extension is `.json`
- One file contains one benchmark run only

## Required top-level fields

- `schema_version == "va.submission.v1"`
- `submission_id`
- `created_at`
- `benchmark`
- `model`
- `config`
- `hardware`
- `runtime`
- `accuracy`
- `timing`
- `throughput`
- `model_stats`
- `metadata`

## Model checks

- `model.id` is in `support-matrix.json`
- `model.family`, `model.variant`, and `model.input_size` are present
- `config.input_size` reflects the actual run, not a paper default

## Runtime checks

- `runtime.format` is supported
- `runtime.provider` is allowed for that backend
- `runtime.precision` is allowed for that backend
- `runtime.device` is present

Current support matrix:

- `pytorch`: `cpu`, `cuda`, `mps` with `fp32`
- `onnx`: `cpu`, `cuda` with `fp32`

## Provenance checks

- `benchmark.libreyolo_commit` matches `support-matrix.json` unless the value is `unknown`
- `created_at` is valid ISO-8601
- `metadata.benchmark_date` is valid ISO-8601
- `hardware.id` is non-empty
- `submission_id` is unique across `submissions/*.json`

## Numeric sanity

- No negative numeric values in `config`, `hardware`, `accuracy`, `timing`, `throughput`, or `model_stats`
- Do not encode unsupported metrics as fake zeros just to satisfy a shape

## Required commands

```bash
python3 scripts/validate_submission.py
python3 scripts/build_verified_results.py
git diff -- submissions generated/verified-results.v1.json
```

## PR readiness

- Diff contains only the intended submission file plus the rebuilt generated file
- Local validation passed
- Rebuild passed
- PR summary names model, hardware, runtime, and libreyolo identifier
