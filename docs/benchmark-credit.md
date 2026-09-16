# Benchmark authorship and provenance

Each run retains its original harness JSON. Publication metadata lives in
`submission-credits.json`, keyed by the exact submission filename. Rebuild
`generated/verified-results.v1.json` with the existing script after changes.

- `source_pr`: the Vision Analysis PR supplying the run.
- `submitted_by`: the public GitHub account submitting that PR, checked by the reviewer.
- `author`: optional, contributor-confirmed identity of the person who ran the
  benchmark. Do not infer authorship from submission, a Git commit, or a social profile.
- `author.display_name`: the name or pseudonym requested by the benchmark author.
- `author.links`: optional HTTPS `github`, `linkedin`, `x`, and `website` URLs
  supplied and approved by that author. No scraped photos or inferred profiles.
- `author.anonymous: true`: display Anonymous contributor and suppress author
  profiles and the submitter handle in the result table. Do not include a name
  or author links with this option. The source PR is still public, so this is
  anonymous presentation, not a guarantee of anonymity.

Example, after the author confirms the desired credit in their PR:

```json
{
  "exact-harness-filename.json": {
    "source_pr": "https://github.com/LibreYOLO/vision-analysis/pull/14",
    "submitted_by": "example",
    "author": {
      "display_name": "Example contributor",
      "links": {"github": "https://github.com/example"}
    }
  }
}
```

Older rows without confirmed credit remain unattributed. The source JSON link
remains available. Do not label them anonymous or project-authored by default.
The first Spark batch records its verified public submitter and source PR;
personal display credit is pending the contributor's choice.

The reviewer checks the source PR and the author's confirmation, then runs:

```sh
python3 scripts/validate_submission.py
python3 scripts/build_verified_results.py
npm test
```

Validation checks structure, supported configurations and credit links. It
does not independently reproduce a run or transfer the site's responsibility
for accepting and presenting data. Preserve the original run, version pins,
dataset fingerprint and source PR so errors can be investigated and corrected.

# DGX Spark metadata

The hardware catalogue describes installed capacity: 128 GB shared by CPU and
GPU, per NVIDIA's hardware guide. It is not 128 GB of dedicated VRAM. The harness
reports OS-visible memory in its existing GiB convention (`ram_gb` and
`unified_memory_gb`), which can be lower. `gpu_memory_gb: null` means there is no
dedicated GPU capacity reading. Older GB10 runs with zero in that field retain
their original bytes; use the hardware catalogue's unified-memory label.

Do not overwrite measured peak allocation with installed capacity. Do not edit
past measurements to make the metadata look complete or require a timing rerun
solely to replace unavailable hardware metadata.

Source: https://docs.nvidia.com/dgx/dgx-spark/hardware.html
