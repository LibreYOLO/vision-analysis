# Vision Analysis

Vision Analysis is the website and data repo for public object-detection benchmark records.

The benchmark harness lives in `vision-analysis-benchmark`. This repo stores reviewed submission JSON files, builds one canonical benchmark dataset, and serves that dataset through the website.

## Development

```bash
cd website
npm install
npm run dev
npm run build
npm run lint
```

## Data Flow

```text
vision-analysis-benchmark
  -> contributor runs benchmark locally
  -> submission JSON
  -> pull request adding submissions/*.json
  -> scripts/validate_submission.py
  -> scripts/build_verified_results.py
  -> generated/verified-results.v1.json
  -> website loader/fetcher
```

## Repo Layout

```text
schemas/
  submission.v1.json
submissions/
  *.json
generated/
  verified-results.v1.json
scripts/
  validate_submission.py
  build_verified_results.py
website/
  src/data/metadata/
  src/lib/data/
```

## Submission Flow

1. Run the harness from `vision-analysis-benchmark`.
2. Add the emitted JSON file under `submissions/`.
3. Open a pull request.
4. CI validates the schema and support matrix.
5. Commit the rebuilt `generated/verified-results.v1.json`.

## Commands

Validate submissions:

```bash
python3 scripts/validate_submission.py
```

Rebuild canonical results:

```bash
python3 scripts/build_verified_results.py
```

Run the site:

```bash
cd website
npm run dev
```

## Notes

- The website reads only `generated/verified-results.v1.json`.
- The website currently publishes raw benchmark metrics, not a composite score.
- Model, family, runtime, and hardware metadata still live under `website/src/data/metadata/`.
