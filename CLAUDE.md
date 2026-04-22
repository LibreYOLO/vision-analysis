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

## Data Model

Three levels of metadata:

1. **`families.json`** — per-family: paper, authors, organization, originalRepo, detection approach, postprocessing, innovations, training dataset.
2. **`models.json`** — per-variant: architecture, specs (params/flops), weights URLs, license, release date, `inLibreYOLO`.
3. **Submission JSONs** — per-run: accuracy, speed, hardware, software versions, benchmark config, and provenance.

`source` in models.json points to **original author's weights** and **LibreYOLO's weights** separately. Family-level info (paper URL, code repo, authors) lives in `families.json`, not `models.json`.

## Adding New Benchmarks

Add the raw JSON file from the benchmark runner under `submissions/`, then rebuild `generated/verified-results.v1.json` with the root scripts. The website reads only the generated canonical dataset.

See README.md for full schema and step-by-step instructions.

### Key Fields in Benchmark JSONs

- `model.name` must match `id` in `models.json` (check `MODEL_NAME_MAP` in `transform.ts`)
- `eval` block: `{ dataset, split, numImages }`
- `implementation` block: `{ provider, version, repo, weightsOrigin }` — weightsOrigin is `"original"`, `"converted"`, or `"retrained"`
- `runtime` block: `{ format, precision, device }`
- Do NOT include `mAP_small/medium/large` as zeros — omit if not measured

## Metadata Files

- `website/src/data/metadata/families.json` — family-level metadata
- `website/src/data/metadata/models.json` — variant-level metadata
- `website/src/data/metadata/hardware.json` — hardware platforms
- `website/src/data/metadata/runtimes.json` — runtime definitions
- `website/src/data/metadata/datasets.json` — dataset definitions

## Git Policy

You can commit but not push. The user will handle pushes manually.
