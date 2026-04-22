---
name: submit-benchmark-results
description: >-
  Submit or review Vision Analysis benchmark result JSONs. Use when asked to
  add a new benchmark submission under submissions/, validate benchmark JSONs,
  rebuild generated/verified-results.v1.json, or open a GitHub PR for benchmark
  data with git and gh.
---

# Submit Benchmark Results

Use this skill only in the `vision-analysis` repo.

## Scope

- One submission file = one benchmark run.
- Submission files live in `submissions/`.
- Public website data comes from `generated/verified-results.v1.json`.
- Validation rules live in `scripts/benchmark_data.py`.
- CI re-runs the same checks in `.github/workflows/benchmark-submissions.yml`.

## Inputs

- A submission JSON path from the harness, or an existing file already under `submissions/`
- Optionally a branch name and PR title

Prefer the harness-emitted filename. Do not invent a second format unless the user asks.

## Workflow

1. Read the current rules before touching files:
   - `support-matrix.json`
   - `schemas/submission.v1.json`
   - `scripts/benchmark_data.py`

2. Place the submission JSON under `submissions/` if it is not there already.

3. Review the JSON manually before opening a PR.
   - Use `references/review-checklist.md`.
   - If the file is malformed, unsupported, or obviously fabricated, fix it if you own it. Otherwise stop and report the issue.

4. Run the repo validators:
   - `python3 scripts/validate_submission.py`
   - `python3 scripts/build_verified_results.py`

5. Review the git diff carefully.
   - Expected changes are the new file in `submissions/` and the rebuilt `generated/verified-results.v1.json`.
   - Do not include unrelated files unless the user explicitly asked for them.
   - If `generated/verified-results.v1.json` changes in a way that does not match the submission set, investigate before continuing.

6. Open the PR if requested and `gh` is authenticated.
   - `gh auth status`
   - `git switch -c benchmark/<short-name>`
   - `git add submissions/<file> generated/verified-results.v1.json`
   - `git commit -m "Add benchmark submission for <model> on <hardware>"`
   - `git push -u origin <branch>`
   - `gh pr create --fill`

7. In the PR body, summarize:
   - model id
   - runtime format / provider / precision
   - hardware id
   - libreyolo identifier
   - whether validation and generated-data rebuild both passed

## Review priorities

When reviewing someone else's submission, findings should focus on:

- unsupported `model.id`
- unsupported runtime backend, provider, or precision
- wrong `benchmark.libreyolo_commit` for the current support matrix
- invalid timestamps
- duplicate `submission_id`
- negative numeric values
- stale or missing rebuild of `generated/verified-results.v1.json`
- unrelated files bundled into the PR

## Hard rules

- Do not hand-edit `generated/verified-results.v1.json`; always rebuild it with the script.
- Do not approve a PR that changes benchmark data without a passing local validation run.
- Do not silently coerce bad data into shape. Either fix a clearly mechanical issue or report it.
- Do not route benchmark submissions through issues when a PR is available. The canonical flow is PR-based.

## Reference files

- Review checklist: `references/review-checklist.md`
