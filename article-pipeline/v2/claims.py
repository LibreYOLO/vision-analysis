#!/usr/bin/env python3
"""Claims compiler for the v2 article engine.

Reads the canonical verified dataset (generated/verified-results.v1.json) plus
metadata, computes every number an article of a given type is allowed to cite,
and emits pre-phrased CANDIDATE CLAIMS with significance gates. The writer
(an LLM subagent) picks and phrases from passed claims only; it never invents
a number. The validator (validate.py) enforces this.

Article types:
  vs <modelA> <modelB> [--hardware H] [--runtime R]
  hardware-guide <hardware> [--runtime R]
  runtime-guide <hardware> <baseline_runtime> <target_runtime>
  license-guide [--hardware H] [--runtime R]
  finding scan [--hardware H]
  list                      (coverage report: what can be written)

Output: JSON written to article-pipeline/v2/output/<slug>.claims.json and a
one-line gate summary on stderr. Exit code 0 if the gate passed, 2 if not
(DO NOT write an article when the gate fails).
"""
import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATED = ROOT / "generated" / "verified-results.v1.json"
METADATA = ROOT / "website" / "src" / "data" / "metadata"
OUTPUT = Path(__file__).resolve().parent / "output"

DEFAULT_HARDWARE = "nvidia_geforce_rtx_5070_ti"
DEFAULT_RUNTIME = "pytorch_fp32"

PERMISSIVE = {"Apache-2.0", "MIT", "BSD-3-Clause"}

# Significance thresholds (relative %, unless noted)
TIE_PCT = 2.0            # below this a metric axis is a tie
SPEED_PCT = 5.0          # fps delta worth claiming
MEMORY_PCT = 10.0        # VRAM delta worth claiming
EFFICIENCY_PCT = 15.0    # mAP-per-GFLOP delta worth claiming
SMALL_OBJ_PCT = 10.0     # mAP_small relative delta worth claiming
ACC_PTS = 0.5            # mAP@50-95 percentage-point delta worth claiming
PAIR_PARAMS_RATIO = 2.5  # above this a vs pair is not meaningful
JITTER_PCT = 12.0        # fps_mean vs fps_p50 gap that counts as jitter
TRT_ACC_DROP_PTS = 0.5   # accuracy loss under conversion worth flagging


# ---------------------------------------------------------------- loading

def _load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def load_dataset():
    data = _load(GENERATED)
    models_meta = {m["id"]: m for m in _load(METADATA / "models.json")["models"]}
    hardware_meta = {h["id"]: h for h in _load(METADATA / "hardware.json")["hardware"]}
    runtimes_meta = {r["id"]: r for r in _load(METADATA / "runtimes.json")["runtimes"]}

    index = {}  # (model_id, hardware_id, runtime_id) -> latest bench
    for bench in data.get("results", []):
        model_id = (bench.get("model") or {}).get("id")
        hw_id = (bench.get("hardware") or {}).get("id")
        runtime = bench.get("runtime") or {}
        rt_id = f"{runtime.get('format')}_{runtime.get('precision')}"
        if not model_id or not hw_id:
            continue
        key = (model_id, hw_id, rt_id)
        created = bench.get("created_at") or ""
        prev = index.get(key)
        if prev is None or created > (prev.get("created_at") or ""):
            index[key] = bench
    return index, models_meta, hardware_meta, runtimes_meta


# ---------------------------------------------------------------- helpers

def pct(a, b):
    if a is None or b is None or b == 0:
        return None
    return round((a - b) / b * 100, 2)


def get_map(bench):
    return bench["accuracy"]["mAP_50_95"]


def get_fps(bench):
    return bench["throughput"]["fps_mean"]


def timing(bench, key):
    t = bench.get("timing") or {}
    total = t.get("total_ms")
    if isinstance(total, dict):
        if key == "ms_per_image":
            return total.get("mean")
        return total.get(key)
    return t.get(key)


def params_m(bench, meta):
    v = (bench.get("model_stats") or {}).get("params_millions")
    if v:
        return v
    m = meta.get(bench["model"]["id"]) if isinstance(meta, dict) else None
    return (m or {}).get("specs", {}).get("paramsM")


def flops_g(bench, meta):
    v = (bench.get("model_stats") or {}).get("gflops")
    if v:
        return v
    m = meta.get(bench["model"]["id"]) if isinstance(meta, dict) else None
    return (m or {}).get("specs", {}).get("flopsG")


def rt_display(rt_id, runtimes_meta):
    r = runtimes_meta.get(rt_id)
    return r["displayName"] if r else rt_id


def hw_display(hw_id, hardware_meta):
    h = hardware_meta.get(hw_id)
    return h["displayName"] if h else hw_id


def model_display(model_id, models_meta):
    m = models_meta.get(model_id)
    return m["displayName"] if m else model_id


def is_permissive(model_id, models_meta):
    return (models_meta.get(model_id) or {}).get("license") in PERMISSIVE


def map_pts(x):
    """decimal mAP -> percent points, 1 decimal"""
    return round(x * 100, 1)


def core_slice(bench):
    return {
        "mAP_50_95": bench["accuracy"]["mAP_50_95"],
        "mAP_50": bench["accuracy"]["mAP_50"],
        "mAP_small": bench["accuracy"].get("mAP_small"),
        "mAP_medium": bench["accuracy"].get("mAP_medium"),
        "mAP_large": bench["accuracy"].get("mAP_large"),
        "fps_mean": bench["throughput"]["fps_mean"],
        "fps_p50": bench["throughput"].get("fps_p50"),
        "ms_per_image": timing(bench, "ms_per_image"),
        "inference_ms": timing(bench, "inference_ms"),
        "preprocess_ms": timing(bench, "preprocess_ms"),
        "postprocess_ms": timing(bench, "postprocess_ms"),
        "p95_ms": timing(bench, "p95"),
        "peak_vram_mb": (bench.get("memory") or {}).get("peak_vram_mb"),
        "peak_ram_mb": (bench.get("memory") or {}).get("peak_ram_mb"),
        "params_millions": (bench.get("model_stats") or {}).get("params_millions"),
        "gflops": (bench.get("model_stats") or {}).get("gflops"),
        "input_size": bench["model"].get("input_size"),
        "config": bench.get("config"),
        "eval": bench.get("eval"),
        "benchmark_date": (bench.get("metadata") or {}).get("benchmark_date"),
    }


def claim(cid, kind, statement, values, passed, strength="normal"):
    return {
        "id": cid,
        "kind": kind,
        "statement": statement,
        "values": values,
        "passed": bool(passed),
        "strength": strength,
    }


def collect_numbers(obj, out):
    """Recursively collect every numeric leaf; for decimal mAP-like values also
    add the x100 percent form so prose can quote either form."""
    if isinstance(obj, bool):
        return
    if isinstance(obj, (int, float)):
        if obj is not None:
            out.add(round(float(obj), 4))
            if 0 < obj <= 1.0:
                out.add(round(float(obj) * 100, 4))
        return
    if isinstance(obj, dict):
        for v in obj.values():
            collect_numbers(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_numbers(v, out)


ALWAYS_ALLOWED = {
    0.001, 0.6, 300, 640, 500, 5000, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    50, 75, 95, 100,
}


def finalize(meta_block, facts, claims, gate_min, slug, extra_allowed=None):
    passed = [c for c in claims if c["passed"]]
    gate = {
        "passed": len(passed) >= gate_min,
        "passed_claims": len(passed),
        "required": gate_min,
        "reason": None if len(passed) >= gate_min else
        f"only {len(passed)} claims cleared significance thresholds; "
        f"{gate_min} required. Do not write this article.",
    }
    allowed = set()
    collect_numbers(facts, allowed)
    for c in claims:
        collect_numbers(c["values"], allowed)
    allowed |= ALWAYS_ALLOWED
    if extra_allowed:
        allowed |= set(extra_allowed)
    doc = {
        "engine": "article-pipeline-v2",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "slug": slug,
        "meta": meta_block,
        "facts": facts,
        "claims": claims,
        "gate": gate,
        "allowed_numbers": sorted(allowed),
    }
    return doc


# ---------------------------------------------------------------- vs

def build_vs(index, models_meta, hardware_meta, runtimes_meta, a_id, b_id, hw, rt):
    a_id, b_id = sorted([a_id, b_id])  # canonical order, matches /vs slug rule
    a = index.get((a_id, hw, rt))
    b = index.get((b_id, hw, rt))
    if a is None or b is None:
        missing = [m for m, x in [(a_id, a), (b_id, b)] if x is None]
        sys.exit(f"ERROR: no verified result for {missing} on {hw}/{rt}. "
                 f"Run 'claims.py list' to see coverage.")

    a_meta, b_meta = models_meta.get(a_id, {}), models_meta.get(b_id, {})
    a_name, b_name = model_display(a_id, models_meta), model_display(b_id, models_meta)
    hw_name = hw_display(hw, hardware_meta)
    rt_name = rt_display(rt, runtimes_meta)

    a_map, b_map = get_map(a), get_map(b)
    a_fps, b_fps = get_fps(a), get_fps(b)
    a_params, b_params = params_m(a, models_meta), params_m(b, models_meta)
    a_flops, b_flops = flops_g(a, models_meta), flops_g(b, models_meta)

    facts = {
        "a": {"id": a_id, "displayName": a_name,
              "license": a_meta.get("license"), "releaseDate": a_meta.get("releaseDate"),
              "inLibreYOLO": a_meta.get("inLibreYOLO"), "bench": core_slice(a)},
        "b": {"id": b_id, "displayName": b_name,
              "license": b_meta.get("license"), "releaseDate": b_meta.get("releaseDate"),
              "inLibreYOLO": b_meta.get("inLibreYOLO"), "bench": core_slice(b)},
        "primary": {"hardware": hw, "hardware_display": hw_name,
                    "runtime": rt, "runtime_display": rt_name},
        "deltas_pct": {
            "mAP_50_95": pct(a_map, b_map),
            "fps": pct(a_fps, b_fps),
            "params": pct(a_params, b_params),
            "flops": pct(a_flops, b_flops),
            "peak_vram": pct(core_slice(a)["peak_vram_mb"], core_slice(b)["peak_vram_mb"]),
        },
        "map_pts": {"a": map_pts(a_map), "b": map_pts(b_map),
                    "delta": round(map_pts(a_map) - map_pts(b_map), 1)},
    }

    claims = []

    # pair meaningfulness
    ratio = max(a_params, b_params) / min(a_params, b_params) if a_params and b_params else None
    pair_ok = ratio is not None and ratio <= PAIR_PARAMS_RATIO
    facts["pair"] = {"params_ratio": round(ratio, 2) if ratio else None, "meaningful": pair_ok}

    # accuracy
    d_pts = facts["map_pts"]["delta"]
    if abs(d_pts) >= ACC_PTS:
        w, l = (a_name, b_name) if d_pts > 0 else (b_name, a_name)
        claims.append(claim(
            "accuracy_winner", "accuracy",
            f"{w} measures {abs(d_pts)} mAP points higher than {l} on {hw_name} "
            f"({rt_name}): {facts['map_pts']['a']} vs {facts['map_pts']['b']} mAP@50-95.",
            {"delta_pts": abs(d_pts), "a_map": facts["map_pts"]["a"], "b_map": facts["map_pts"]["b"]},
            True, "strong"))
    else:
        claims.append(claim(
            "accuracy_tie", "accuracy",
            f"Accuracy is a tie: {facts['map_pts']['a']} vs {facts['map_pts']['b']} "
            f"mAP@50-95 ({abs(d_pts)} points apart, below the {ACC_PTS}-point threshold).",
            {"a_map": facts["map_pts"]["a"], "b_map": facts["map_pts"]["b"]},
            True))

    # speed
    d_fps = facts["deltas_pct"]["fps"]
    if d_fps is not None and abs(d_fps) >= SPEED_PCT:
        w = a_name if d_fps > 0 else b_name
        claims.append(claim(
            "speed_winner", "speed",
            f"{w} is {abs(d_fps)}% faster: {round(a_fps, 1)} vs {round(b_fps, 1)} FPS "
            f"({round(timing(a, 'ms_per_image'), 2)} vs {round(timing(b, 'ms_per_image'), 2)} ms/image).",
            {"delta_pct": abs(d_fps), "a_fps": round(a_fps, 1), "b_fps": round(b_fps, 1)},
            True, "strong"))

    # efficiency
    a_eff = round(a_map / a_flops, 5) if a_flops else None
    b_eff = round(b_map / b_flops, 5) if b_flops else None
    facts["efficiency"] = {"a_mAP_per_GFLOP": a_eff, "b_mAP_per_GFLOP": b_eff}
    if a_eff and b_eff:
        d_eff = pct(a_eff, b_eff)
        if abs(d_eff) >= EFFICIENCY_PCT:
            w = a_name if d_eff > 0 else b_name
            claims.append(claim(
                "efficiency_winner", "efficiency",
                f"{w} extracts {abs(d_eff)}% more mAP per GFLOP "
                f"({a_eff} vs {b_eff}).",
                {"a": a_eff, "b": b_eff, "delta_pct": abs(d_eff)}, True))

    # memory
    d_vram = facts["deltas_pct"]["peak_vram"]
    if d_vram is not None and abs(d_vram) >= MEMORY_PCT:
        w = b_name if d_vram > 0 else a_name  # lower is better
        claims.append(claim(
            "memory_winner", "memory",
            f"{w} uses less peak VRAM: "
            f"{round(core_slice(a)['peak_vram_mb'])} vs {round(core_slice(b)['peak_vram_mb'])} MB.",
            {"a_vram": round(core_slice(a)["peak_vram_mb"]),
             "b_vram": round(core_slice(b)["peak_vram_mb"])}, True))

    # small objects
    a_s, b_s = a["accuracy"].get("mAP_small"), b["accuracy"].get("mAP_small")
    if a_s and b_s:
        d_small = pct(a_s, b_s)
        if abs(d_small) >= SMALL_OBJ_PCT:
            w = a_name if d_small > 0 else b_name
            claims.append(claim(
                "small_object_gap", "accuracy",
                f"{w} leads on small objects: {map_pts(a_s)} vs {map_pts(b_s)} mAP_small "
                f"({abs(d_small)}% relative gap).",
                {"a": map_pts(a_s), "b": map_pts(b_s), "delta_pct": abs(d_small)}, True))

    # license edge
    a_perm, b_perm = is_permissive(a_id, models_meta), is_permissive(b_id, models_meta)
    if a_perm != b_perm:
        perm_name = a_name if a_perm else b_name
        other = b_name if a_perm else a_name
        perm_lic = a_meta.get("license") if a_perm else b_meta.get("license")
        other_lic = b_meta.get("license") if a_perm else a_meta.get("license")
        claims.append(claim(
            "license_edge", "license",
            f"{perm_name} ships under {perm_lic}; {other} is {other_lic}. For commercial "
            f"embedding, {perm_name} is the safe default.",
            {"permissive": perm_lic, "other": other_lic}, True, "strong"))

    # cross-runtime and cross-hardware: does the accuracy/speed verdict survive?
    cross_runtime, cross_hardware = [], []
    primary_speed_winner = a_id if (d_fps or 0) > 0 else b_id
    flips = []
    all_rts = sorted({k[2] for k in index if k[1] == hw})
    for rt2 in all_rts:
        a2, b2 = index.get((a_id, hw, rt2)), index.get((b_id, hw, rt2))
        if a2 and b2:
            cross_runtime.append({
                "runtime": rt2, "display": rt_display(rt2, runtimes_meta),
                "a": {"mAP": map_pts(get_map(a2)), "fps": round(get_fps(a2), 1)},
                "b": {"mAP": map_pts(get_map(b2)), "fps": round(get_fps(b2), 1)},
            })
            w2 = a_id if get_fps(a2) > get_fps(b2) else b_id
            if rt2 != rt and abs(pct(get_fps(a2), get_fps(b2)) or 0) >= SPEED_PCT and w2 != primary_speed_winner:
                flips.append(("runtime", rt_display(rt2, runtimes_meta)))
    all_hws = sorted({k[1] for k in index})
    for hw2 in all_hws:
        a2, b2 = index.get((a_id, hw2, rt)), index.get((b_id, hw2, rt))
        if a2 and b2:
            cross_hardware.append({
                "hardware": hw2, "display": hw_display(hw2, hardware_meta),
                "a": {"mAP": map_pts(get_map(a2)), "fps": round(get_fps(a2), 1)},
                "b": {"mAP": map_pts(get_map(b2)), "fps": round(get_fps(b2), 1)},
            })
            w2 = a_id if get_fps(a2) > get_fps(b2) else b_id
            if hw2 != hw and abs(pct(get_fps(a2), get_fps(b2)) or 0) >= SPEED_PCT and w2 != primary_speed_winner:
                flips.append(("hardware", hw_display(hw2, hardware_meta)))
    facts["cross_runtime"] = cross_runtime
    facts["cross_hardware"] = cross_hardware

    if flips:
        where = ", ".join(f"{k}: {v}" for k, v in flips)
        claims.append(claim(
            "ranking_flip", "robustness",
            f"The speed verdict does NOT survive everywhere. It flips on {where}. "
            f"State this; it is the most useful fact in the article.",
            {"flips": [f"{k}:{v}" for k, v in flips]}, True, "strong"))
    elif len(cross_hardware) + len(cross_runtime) > 2:
        claims.append(claim(
            "ranking_stable", "robustness",
            f"The verdict holds across {len(cross_runtime)} runtimes and "
            f"{len(cross_hardware)} hardware platforms with verified data.",
            {"n_runtimes": len(cross_runtime), "n_hardware": len(cross_hardware)}, True))

    # input size caveat (mandatory if mismatched)
    a_in, b_in = a["model"].get("input_size"), b["model"].get("input_size")
    facts["input_sizes"] = {"a": a_in, "b": b_in, "match": a_in == b_in}
    if a_in != b_in:
        claims.append(claim(
            "input_size_caveat", "caveat",
            f"MANDATORY CAVEAT: {a_name} runs at {a_in} px and {b_name} at {b_in} px "
            f"(each model at its author default). Say this in Setup and the verdict.",
            {"a": a_in, "b": b_in}, True, "strong"))

    if not pair_ok:
        claims.append(claim(
            "pair_not_meaningful", "caveat",
            f"Params ratio is {facts['pair']['params_ratio']}x (> {PAIR_PARAMS_RATIO}x). "
            f"These models are different size classes; the comparison is not meaningful.",
            {"ratio": facts["pair"]["params_ratio"]}, True))

    slug = f"{a_id}-vs-{b_id}"
    meta_block = {"type": "vs", "a": a_id, "b": b_id, "hardware": hw, "runtime": rt}
    gate_min = 2 if pair_ok else 999  # unmeaningful pairs never pass
    return finalize(meta_block, facts, claims, gate_min, slug)


# ---------------------------------------------------------------- family-vs

@lru_cache(maxsize=1)
def _families_meta():
    data = _load(METADATA / "families.json")["families"]
    return {f["id"]: f for f in data}


def _family_display(fam_id):
    f = _families_meta().get(fam_id)
    return f["displayName"] if f else fam_id


def _family_all_permissive(fam_id, models_meta):
    variants = [m for m in models_meta.values() if m.get("family") == fam_id]
    lics = [m.get("license") for m in variants]
    return bool(lics) and all(l in PERMISSIVE for l in lics)


def _family_frontier(fam_id, hw, rt, index, models_meta):
    """Every variant of a family with data on hw/rt, sorted by params ascending."""
    rows = []
    for m in models_meta.values():
        if m.get("family") != fam_id:
            continue
        bench = index.get((m["id"], hw, rt))
        if not bench:
            continue
        p = params_m(bench, models_meta)
        if not p:
            continue
        rows.append({
            "id": m["id"], "displayName": m["displayName"], "params": round(p, 2),
            "mAP": map_pts(get_map(bench)), "fps": round(get_fps(bench), 1),
            "license": m.get("license"),
        })
    return sorted(rows, key=lambda r: r["params"])


def build_family_vs(index, models_meta, hardware_meta, runtimes_meta,
                    fam_a, fam_b, hw=DEFAULT_HARDWARE, rt=DEFAULT_RUNTIME):
    fam_a, fam_b = sorted([fam_a, fam_b])  # canonical slug order
    a_front = _family_frontier(fam_a, hw, rt, index, models_meta)
    b_front = _family_frontier(fam_b, hw, rt, index, models_meta)
    if len(a_front) < 2 or len(b_front) < 2:
        sys.exit(f"ERROR: need >=2 variants each with data on {hw}/{rt}; "
                 f"{fam_a}={len(a_front)} {fam_b}={len(b_front)}.")

    a_name, b_name = _family_display(fam_a), _family_display(fam_b)
    hw_name, rt_name = hw_display(hw, hardware_meta), rt_display(rt, runtimes_meta)

    # match each A variant to nearest-params B variant (matched-compute view)
    matched = []
    for a in a_front:
        b = min(b_front, key=lambda r: abs(r["params"] - a["params"]))
        ratio = max(a["params"], b["params"]) / min(a["params"], b["params"])
        if ratio > 1.6:  # no fair compute match
            continue
        matched.append({
            "a": a, "b": b,
            "mAP_delta_pts": round(a["mAP"] - b["mAP"], 1),
            "fps_delta_pct": pct(a["fps"], b["fps"]),
        })
    # dedup on (a_id,b_id)
    seen, uniq = set(), []
    for mp in matched:
        key = (mp["a"]["id"], mp["b"]["id"])
        if key not in seen:
            seen.add(key)
            uniq.append(mp)
    matched = uniq
    if len(matched) < 2:
        sys.exit(f"ERROR: fewer than 2 matched-compute pairs between {fam_a} and {fam_b} "
                 f"on {hw}/{rt}. Frontiers do not overlap in params.")

    deltas = [mp["mAP_delta_pts"] for mp in matched]
    mean_map_delta = round(sum(deltas) / len(deltas), 1)
    a_wins = sum(1 for d in deltas if d > 0)
    b_wins = sum(1 for d in deltas if d < 0)
    fps_deltas = [mp["fps_delta_pct"] for mp in matched if mp["fps_delta_pct"] is not None]
    mean_fps_delta = round(sum(fps_deltas) / len(fps_deltas), 1) if fps_deltas else None

    flagship = {"a": a_front[-1], "b": b_front[-1]}
    smallest = {"a": a_front[0], "b": b_front[0]}

    # crossover: which family leads on accuracy in the low-param vs high-param half
    low = [mp for mp in matched if mp["a"]["params"] <= (matched[0]["a"]["params"] + matched[-1]["a"]["params"]) / 2]
    high = [mp for mp in matched if mp not in low]
    def _lead(group):
        if not group:
            return None
        s = sum(mp["mAP_delta_pts"] for mp in group) / len(group)
        return fam_a if s > 0 else (fam_b if s < 0 else "tie")
    low_lead, high_lead = _lead(low), _lead(high)

    a_perm = _family_all_permissive(fam_a, models_meta)
    b_perm = _family_all_permissive(fam_b, models_meta)

    facts = {
        "families": {"a": fam_a, "b": fam_b, "a_display": a_name, "b_display": b_name},
        "primary": {"hardware": hw, "hardware_display": hw_name,
                    "runtime": rt, "runtime_display": rt_name},
        "a_frontier": a_front, "b_frontier": b_front,
        "matched_pairs": matched,
        "aggregate": {
            "n_pairs": len(matched), "mean_mAP_delta_pts": mean_map_delta,
            "a_wins": a_wins, "b_wins": b_wins, "mean_fps_delta_pct": mean_fps_delta,
        },
        "flagship": flagship, "smallest": smallest,
        "crossover": {"low_param_leader": low_lead, "high_param_leader": high_lead},
        "license": {"a_all_permissive": a_perm, "b_all_permissive": b_perm},
        "chart_highlight": ",".join([r["id"] for r in a_front] + [r["id"] for r in b_front]),
    }

    claims = []

    # aggregate accuracy edge at matched compute
    if abs(mean_map_delta) >= 0.5:
        lead = a_name if mean_map_delta > 0 else b_name
        claims.append(claim(
            "family_accuracy_edge", "accuracy",
            f"At matched compute, {lead} averages {abs(mean_map_delta)} mAP points higher across "
            f"{len(matched)} paired variants on {hw_name}. {a_name} wins {a_wins}, {b_name} wins {b_wins}.",
            {"mean_delta_pts": abs(mean_map_delta), "a_wins": a_wins, "b_wins": b_wins}, True, "strong"))
    else:
        claims.append(claim(
            "family_accuracy_tie", "accuracy",
            f"At matched compute the two families are even: mean gap {abs(mean_map_delta)} mAP points "
            f"across {len(matched)} pairs ({a_name} wins {a_wins}, {b_name} wins {b_wins}).",
            {"mean_delta_pts": abs(mean_map_delta)}, True))

    # aggregate speed edge
    if mean_fps_delta is not None and abs(mean_fps_delta) >= SPEED_PCT:
        lead = a_name if mean_fps_delta > 0 else b_name
        claims.append(claim(
            "family_speed_edge", "speed",
            f"At matched compute, {lead} is {abs(mean_fps_delta)}% faster on average on {hw_name} "
            f"({rt_name}).",
            {"mean_delta_pct": abs(mean_fps_delta)}, True, "strong"))

    # crossover
    if low_lead and high_lead and low_lead != high_lead and "tie" not in (low_lead, high_lead):
        claims.append(claim(
            "family_crossover", "robustness",
            f"The frontier crosses: {_family_display(low_lead)} leads at the small-model end, "
            f"{_family_display(high_lead)} leads at the large-model end. There is no single winner; "
            f"the choice depends on your size class.",
            {"low": low_lead, "high": high_lead}, True, "strong"))

    # flagship end
    fa, fb = flagship["a"], flagship["b"]
    claims.append(claim(
        "flagship", "accuracy",
        f"At the top end, {a_name}'s largest measured variant ({fa['displayName']}) reaches "
        f"{fa['mAP']} mAP; {b_name}'s ({fb['displayName']}) reaches {fb['mAP']} mAP.",
        {"a": fa, "b": fb}, abs(fa["mAP"] - fb["mAP"]) >= 0.5))

    # efficient end
    sa, sb = smallest["a"], smallest["b"]
    claims.append(claim(
        "efficient_end", "efficiency",
        f"At the small end, {a_name}'s {sa['displayName']} ({sa['params']}M, {sa['mAP']} mAP, {sa['fps']} FPS) "
        f"faces {b_name}'s {sb['displayName']} ({sb['params']}M, {sb['mAP']} mAP, {sb['fps']} FPS).",
        {"a": sa, "b": sb}, True))

    # license edge at family level
    if a_perm != b_perm:
        perm_fam = a_name if a_perm else b_name
        other_fam = b_name if a_perm else a_name
        claims.append(claim(
            "family_license_edge", "license",
            f"Every measured {perm_fam} variant ships under a permissive license; {other_fam} does not. "
            f"For commercial embedding, {perm_fam} is the safe default.",
            {"permissive_family": perm_fam}, True, "strong"))

    # coverage
    claims.append(claim(
        "coverage", "ranking",
        f"{a_name} fields {len(a_front)} measured variants, {b_name} fields {len(b_front)}, "
        f"all on the same protocol on {hw_name}.",
        {"a_n": len(a_front), "b_n": len(b_front)}, True))

    slug = f"{fam_a}-vs-{fam_b}"
    meta_block = {"type": "family-vs", "a": fam_a, "b": fam_b, "hardware": hw, "runtime": rt}
    return finalize(meta_block, facts, claims, 2, slug)


# ---------------------------------------------------------------- hardware-guide

def build_hardware_guide(index, models_meta, hardware_meta, runtimes_meta, hw, rt):
    rows = []
    for (m, h, r), bench in index.items():
        if h == hw and r == rt:
            rows.append((m, bench))
    if len(rows) < 8:
        sys.exit(f"ERROR: only {len(rows)} models on {hw}/{rt}; need at least 8 for a guide.")

    hw_name = hw_display(hw, hardware_meta)
    rt_name = rt_display(rt, runtimes_meta)

    entries = []
    for m, bench in rows:
        entries.append({
            "model": m, "displayName": model_display(m, models_meta),
            "family": (models_meta.get(m) or {}).get("family"),
            "license": (models_meta.get(m) or {}).get("license"),
            "mAP": map_pts(get_map(bench)), "fps": round(get_fps(bench), 1),
            "ms": round(timing(bench, "ms_per_image") or 0, 2),
            "params_millions": (bench.get("model_stats") or {}).get("params_millions"),
        })
    by_map = sorted(entries, key=lambda e: -e["mAP"])
    by_fps = sorted(entries, key=lambda e: -e["fps"])

    # pareto frontier on (fps, mAP)
    pareto = []
    best_map = -1
    for e in by_fps:
        if e["mAP"] > best_map:
            pareto.append(e["model"])
            best_map = e["mAP"]

    # latency budget picks
    budgets = [10, 33, 100] if "rpi5" not in hw else [50, 100, 500]
    budget_picks = {}
    for b in budgets:
        ok = [e for e in entries if e["ms"] and e["ms"] <= b]
        if ok:
            budget_picks[str(b)] = max(ok, key=lambda e: e["mAP"])

    permissive = [e for e in entries if e["license"] in PERMISSIVE]
    best_perm = max(permissive, key=lambda e: e["mAP"]) if permissive else None
    overall = by_map[0]

    facts = {
        "hardware": hw, "hardware_display": hw_name,
        "runtime": rt, "runtime_display": rt_name,
        "n_models": len(entries),
        "leaderboard": by_map,
        "pareto_models": pareto,
        "budget_picks": budget_picks,
        "best_overall": overall,
        "best_permissive": best_perm,
        "fastest": by_fps[0],
    }

    claims = [
        claim("best_overall", "ranking",
              f"{overall['displayName']} leads on {hw_name} at {overall['mAP']} mAP@50-95 "
              f"({overall['fps']} FPS, {rt_name}).",
              overall, True, "strong"),
        claim("fastest", "ranking",
              f"{by_fps[0]['displayName']} is the fastest measured: {by_fps[0]['fps']} FPS "
              f"at {by_fps[0]['mAP']} mAP.",
              by_fps[0], True, "strong"),
        claim("pareto", "ranking",
              f"The measured accuracy-speed frontier on {hw_name} is: "
              + ", ".join(model_display(m, models_meta) for m in pareto) + ".",
              {"pareto": pareto}, len(pareto) >= 3),
    ]
    if best_perm and best_perm["model"] != overall["model"]:
        gap = round(overall["mAP"] - best_perm["mAP"], 1)
        claims.append(claim(
            "best_permissive", "license",
            f"Best permissive-license pick: {best_perm['displayName']} "
            f"({best_perm['license']}), {gap} mAP points behind the overall leader.",
            {"pick": best_perm, "gap_pts": gap}, True, "strong"))
    for b, e in budget_picks.items():
        claims.append(claim(
            f"budget_{b}ms", "budget",
            f"Under {b} ms/image on {hw_name}: {e['displayName']} is the most accurate "
            f"({e['mAP']} mAP at {e['ms']} ms).",
            {"budget_ms": int(b), "pick": e}, True))

    slug = f"best-object-detection-{hw.replace('_', '-')}"
    meta_block = {"type": "hardware-guide", "hardware": hw, "runtime": rt}
    return finalize(meta_block, facts, claims, 3, slug)


# ---------------------------------------------------------------- runtime-guide

def build_runtime_guide(index, models_meta, hardware_meta, runtimes_meta, hw, base_rt, tgt_rt):
    pairs = []
    for (m, h, r), bench in index.items():
        if h == hw and r == base_rt:
            tgt = index.get((m, hw, tgt_rt))
            if tgt:
                pairs.append((m, bench, tgt))
    if len(pairs) < 8:
        sys.exit(f"ERROR: only {len(pairs)} models have both {base_rt} and {tgt_rt} on {hw}.")

    hw_name = hw_display(hw, hardware_meta)
    base_name = rt_display(base_rt, runtimes_meta)
    tgt_name = rt_display(tgt_rt, runtimes_meta)

    rows = []
    for m, b0, b1 in pairs:
        speedup = round(get_fps(b1) / get_fps(b0), 2) if get_fps(b0) else None
        acc_delta = round(map_pts(get_map(b1)) - map_pts(get_map(b0)), 1)
        rows.append({
            "model": m, "displayName": model_display(m, models_meta),
            "family": (models_meta.get(m) or {}).get("family"),
            "baseline_fps": round(get_fps(b0), 1), "target_fps": round(get_fps(b1), 1),
            "speedup_x": speedup, "mAP_delta_pts": acc_delta,
            "baseline_mAP": map_pts(get_map(b0)), "target_mAP": map_pts(get_map(b1)),
        })
    rows.sort(key=lambda r: -(r["speedup_x"] or 0))
    speedups = sorted(r["speedup_x"] for r in rows if r["speedup_x"])
    median = speedups[len(speedups) // 2]
    fam_speed = defaultdict(list)
    for r in rows:
        fam_speed[r["family"]].append(r["speedup_x"])
    fam_median = {f: sorted(v)[len(v) // 2] for f, v in fam_speed.items()}
    best_fam = max(fam_median.items(), key=lambda kv: kv[1])
    worst_fam = min(fam_median.items(), key=lambda kv: kv[1])
    acc_losers = [r for r in rows if r["mAP_delta_pts"] <= -TRT_ACC_DROP_PTS]
    regressions = [r for r in rows if r["speedup_x"] and r["speedup_x"] < 1.0]

    facts = {
        "hardware": hw, "hardware_display": hw_name,
        "baseline": base_rt, "baseline_display": base_name,
        "target": tgt_rt, "target_display": tgt_name,
        "n_models": len(rows), "rows": rows,
        "speedup": {"median_x": median, "min_x": speedups[0], "max_x": speedups[-1]},
        "family_median_speedup": fam_median,
        "accuracy_losers": acc_losers, "speed_regressions": regressions,
    }

    claims = [
        claim("median_speedup", "speed",
              f"Across {len(rows)} models on {hw_name}, {tgt_name} gives a median "
              f"{median}x over {base_name} (range {speedups[0]}x to {speedups[-1]}x).",
              facts["speedup"], True, "strong"),
        claim("top_gainer", "speed",
              f"Biggest gain: {rows[0]['displayName']} at {rows[0]['speedup_x']}x "
              f"({rows[0]['baseline_fps']} to {rows[0]['target_fps']} FPS).",
              rows[0], True),
        claim("family_spread", "speed",
              f"Family medians differ: {best_fam[0]} gains {best_fam[1]}x, "
              f"{worst_fam[0]} only {worst_fam[1]}x. Conversion gain is architecture-dependent.",
              {"best": best_fam, "worst": worst_fam},
              abs(best_fam[1] - worst_fam[1]) >= 0.3),
        claim("accuracy_cost", "accuracy",
              (f"{len(acc_losers)} of {len(rows)} models lose {TRT_ACC_DROP_PTS}+ mAP points "
               f"under {tgt_name}: " + ", ".join(f"{r['displayName']} ({r['mAP_delta_pts']})" for r in acc_losers[:5])
               ) if acc_losers else
              f"No model loses more than {TRT_ACC_DROP_PTS} mAP points converting to {tgt_name}.",
              {"losers": acc_losers[:5]}, True, "strong"),
    ]
    if regressions:
        claims.append(claim(
            "speed_regression", "anomaly",
            f"{len(regressions)} models get SLOWER under {tgt_name}: "
            + ", ".join(f"{r['displayName']} ({r['speedup_x']}x)" for r in regressions[:5]),
            {"regressions": regressions[:5]}, True, "strong"))

    slug = f"{tgt_rt.replace('_', '-')}-vs-{base_rt.replace('_', '-')}-{hw.replace('_', '-')}"
    meta_block = {"type": "runtime-guide", "hardware": hw,
                  "baseline": base_rt, "target": tgt_rt}
    return finalize(meta_block, facts, claims, 3, slug)


# ---------------------------------------------------------------- license-guide

def build_license_guide(index, models_meta, hardware_meta, runtimes_meta, hw, rt):
    entries = {}
    for (m, h, r), bench in index.items():
        if h == hw and r == rt:
            entries[m] = bench
    perm = {m: b for m, b in entries.items() if is_permissive(m, models_meta)}
    nonperm = {m: b for m, b in entries.items() if not is_permissive(m, models_meta)
               and (models_meta.get(m) or {}).get("license")}
    if len(perm) < 5 or len(nonperm) < 2:
        sys.exit(f"ERROR: need >=5 permissive and >=2 non-permissive models with data on {hw}/{rt} "
                 f"(have {len(perm)}/{len(nonperm)}).")

    hw_name = hw_display(hw, hardware_meta)
    rt_name = rt_display(rt, runtimes_meta)

    matchups, claims = [], []
    for m, bench in sorted(nonperm.items(), key=lambda kv: -get_map(kv[1])):
        m_map, m_fps = map_pts(get_map(bench)), round(get_fps(bench), 1)
        # nearest permissive within accuracy, prefer faster
        cands = [(p, pb) for p, pb in perm.items()
                 if map_pts(get_map(pb)) >= m_map - 1.0]
        alt = max(cands, key=lambda kv: get_fps(kv[1]))[0] if cands else None
        entry = {
            "model": m, "displayName": model_display(m, models_meta),
            "license": (models_meta.get(m) or {}).get("license"),
            "mAP": m_map, "fps": m_fps,
            "alternative": None,
        }
        if alt:
            ab = perm[alt]
            entry["alternative"] = {
                "model": alt, "displayName": model_display(alt, models_meta),
                "license": (models_meta.get(alt) or {}).get("license"),
                "mAP": map_pts(get_map(ab)), "fps": round(get_fps(ab), 1),
                "mAP_gap_pts": round(map_pts(get_map(ab)) - m_map, 1),
            }
            claims.append(claim(
                f"alt_{m}", "license",
                f"{entry['alternative']['displayName']} ({entry['alternative']['license']}) matches "
                f"{entry['displayName']} ({entry['license']}) within "
                f"{abs(entry['alternative']['mAP_gap_pts'])} mAP points on {hw_name}: "
                f"{entry['alternative']['mAP']} vs {m_map} mAP, "
                f"{entry['alternative']['fps']} vs {m_fps} FPS.",
                entry, True, "strong"))
        matchups.append(entry)

    facts = {
        "hardware": hw, "hardware_display": hw_name,
        "runtime": rt, "runtime_display": rt_name,
        "n_permissive": len(perm), "n_nonpermissive": len(nonperm),
        "matchups": matchups,
        "permissive_leaderboard": sorted(
            [{"model": m, "displayName": model_display(m, models_meta),
              "license": (models_meta.get(m) or {}).get("license"),
              "mAP": map_pts(get_map(b)), "fps": round(get_fps(b), 1)}
             for m, b in perm.items()], key=lambda e: -e["mAP"]),
    }
    slug = f"permissive-license-detection-models-{hw.replace('_', '-')}"
    meta_block = {"type": "license-guide", "hardware": hw, "runtime": rt}
    return finalize(meta_block, facts, claims, 2, slug)


# ---------------------------------------------------------------- finding scan

def build_finding_scan(index, models_meta, hardware_meta, runtimes_meta, hw_filter):
    findings = []

    # 1. jitter outliers: fps_mean much higher than fps_p50
    for (m, h, r), bench in index.items():
        if hw_filter and h != hw_filter:
            continue
        mean, p50 = get_fps(bench), bench["throughput"].get("fps_p50")
        if mean and p50:
            gap = pct(mean, p50)
            if gap and abs(gap) >= JITTER_PCT:
                findings.append({
                    "kind": "jitter", "model": m, "hardware": h, "runtime": r,
                    "fps_mean": round(mean, 1), "fps_p50": round(p50, 1),
                    "gap_pct": gap,
                    "note": f"{model_display(m, models_meta)} on {hw_display(h, hardware_meta)}/{r}: "
                            f"fps_mean {round(mean,1)} vs fps_p50 {round(p50,1)} ({gap}% gap).",
                })

    # 2. tensorrt regressions (fp16 slower than fp32, or accuracy cliff)
    for (m, h, r), bench in index.items():
        if r != "tensorrt_fp16" or (hw_filter and h != hw_filter):
            continue
        fp32 = index.get((m, h, "tensorrt_fp32"))
        if fp32:
            if get_fps(bench) < get_fps(fp32):
                findings.append({
                    "kind": "trt_fp16_slower", "model": m, "hardware": h,
                    "fp16_fps": round(get_fps(bench), 1), "fp32_fps": round(get_fps(fp32), 1),
                    "note": f"{model_display(m, models_meta)} on {hw_display(h, hardware_meta)}: "
                            f"TensorRT FP16 ({round(get_fps(bench),1)} FPS) is slower than FP32 "
                            f"({round(get_fps(fp32),1)} FPS).",
                })
            acc_drop = map_pts(get_map(fp32)) - map_pts(get_map(bench))
            if acc_drop >= TRT_ACC_DROP_PTS:
                findings.append({
                    "kind": "fp16_accuracy_cliff", "model": m, "hardware": h,
                    "drop_pts": round(acc_drop, 1),
                    "fp32_mAP": map_pts(get_map(fp32)), "fp16_mAP": map_pts(get_map(bench)),
                    "note": f"{model_display(m, models_meta)} loses {round(acc_drop,1)} mAP points "
                            f"going FP32 to FP16 on {hw_display(h, hardware_meta)}.",
                })

    # 3. cross-hardware ranking flips among near-peers (same runtime)
    hws = sorted({k[1] for k in index})
    models = sorted({k[0] for k in index})
    rt = DEFAULT_RUNTIME
    for i, m1 in enumerate(models):
        for m2 in models[i + 1:]:
            p1, p2 = params_m_safe(index, models_meta, m1), params_m_safe(index, models_meta, m2)
            if not p1 or not p2 or max(p1, p2) / min(p1, p2) > PAIR_PARAMS_RATIO:
                continue
            winners = {}
            for h in hws:
                b1, b2 = index.get((m1, h, rt)), index.get((m2, h, rt))
                if b1 and b2 and abs(pct(get_fps(b1), get_fps(b2)) or 0) >= SPEED_PCT:
                    winners[h] = m1 if get_fps(b1) > get_fps(b2) else m2
            if len(set(winners.values())) > 1:
                findings.append({
                    "kind": "ranking_flip", "models": [m1, m2], "runtime": rt,
                    "winners_by_hardware": winners,
                    "note": f"Speed winner between {model_display(m1, models_meta)} and "
                            f"{model_display(m2, models_meta)} flips across hardware: "
                            + ", ".join(f"{hw_display(h, hardware_meta)}: {model_display(w, models_meta)}"
                                        for h, w in winners.items()),
                })

    facts = {"n_findings": len(findings), "findings": findings}
    claims = [claim(f"finding_{i}", f["kind"], f["note"], f, True)
              for i, f in enumerate(findings)]
    slug = "finding-scan"
    meta_block = {"type": "finding", "hardware": hw_filter}
    return finalize(meta_block, facts, claims, 1, slug)


def params_m_safe(index, models_meta, m):
    for (mm, h, r), bench in index.items():
        if mm == m:
            return params_m(bench, models_meta)
    return None


# ---------------------------------------------------------------- list

def coverage_report(index, models_meta, hardware_meta, runtimes_meta):
    by_hw_rt = defaultdict(set)
    for (m, h, r) in index:
        by_hw_rt[(h, r)].add(m)
    print("Coverage (models with verified data):")
    for (h, r), ms in sorted(by_hw_rt.items(), key=lambda kv: -len(kv[1])):
        print(f"  {h:32s} {r:16s} {len(ms):3d} models")
    print("\nViable vs pairs (same hw/rt, params ratio <= "
          f"{PAIR_PARAMS_RATIO}, cross-family): run vs with any two model ids above.")
    print("Model ids:", ", ".join(sorted({k[0] for k in index})))


# ---------------------------------------------------------------- plan

# Demand proxy: families and sizes people actually search for and deploy. This
# is the ONE piece of editorial judgment in the engine. Not in the allowlist
# does not mean "never write", it means "do not auto-prioritize at scale".
POPULAR_FAMILIES = {
    "yolov9": 3, "yolox": 3, "rtdetr": 3, "rfdetr": 3, "dfine": 2,
    "deim": 2, "rtdetrv2": 2, "yolonas": 2, "deimv2": 1, "picodet": 1,
    "rtdetrv4": 1, "ec": 1,
}
SIZE_ORDER = ["n", "nano", "atto", "femto", "pico", "t", "tiny", "s", "m",
              "c", "l", "r18", "r34", "r50", "r50m", "r101", "x"]


def _size_token(model_id, models_meta):
    return (models_meta.get(model_id) or {}).get("variant", "")


def _size_rank(model_id, models_meta):
    tok = _size_token(model_id, models_meta)
    return SIZE_ORDER.index(tok) if tok in SIZE_ORDER else 99


def _vs_significance(a, b, models_meta):
    """Cheap significance count + which axes, mirroring build_vs gates."""
    axes = []
    am, bm = get_map(a), get_map(b)
    if abs(map_pts(am) - map_pts(bm)) >= ACC_PTS:
        axes.append("accuracy")
    d_fps = pct(get_fps(a), get_fps(b))
    if d_fps is not None and abs(d_fps) >= SPEED_PCT:
        axes.append("speed")
    afl, bfl = flops_g(a, models_meta), flops_g(b, models_meta)
    if afl and bfl and abs(pct(am / afl, bm / bfl) or 0) >= EFFICIENCY_PCT:
        axes.append("efficiency")
    va = (a.get("memory") or {}).get("peak_vram_mb")
    vb = (b.get("memory") or {}).get("peak_vram_mb")
    if va and vb and abs(pct(va, vb) or 0) >= MEMORY_PCT:
        axes.append("memory")
    as_, bs_ = a["accuracy"].get("mAP_small"), b["accuracy"].get("mAP_small")
    if as_ and bs_ and abs(pct(as_, bs_) or 0) >= SMALL_OBJ_PCT:
        axes.append("small_object")
    la = (models_meta.get(a["model"]["id"]) or {}).get("license") in PERMISSIVE
    lb = (models_meta.get(b["model"]["id"]) or {}).get("license") in PERMISSIVE
    if la != lb:
        axes.append("license")
    return axes


def _has_ranking_flip(a_id, b_id, index):
    """Speed winner differs across hardware on the default runtime."""
    winners = set()
    for h in {k[1] for k in index}:
        a2, b2 = index.get((a_id, h, DEFAULT_RUNTIME)), index.get((b_id, h, DEFAULT_RUNTIME))
        if a2 and b2 and abs(pct(get_fps(a2), get_fps(b2)) or 0) >= SPEED_PCT:
            winners.add(a_id if get_fps(a2) > get_fps(b2) else b_id)
    return len(winners) > 1


def build_plan(index, models_meta, hardware_meta, runtimes_meta, limit, vs_slice):
    """Enumerate every viable article, score, de-duplicate, rank."""
    hw, rt = vs_slice
    items = []

    # --- vs pairs on the chosen primary slice ---
    models = sorted({k[0] for k in index if k[1] == hw and k[2] == rt})
    seen_shape = defaultdict(int)  # (family-pair, size-class-pair) -> count
    vs_rows = []
    for a_id, b_id in __import__("itertools").combinations(models, 2):
        a, b = index[(a_id, hw, rt)], index[(b_id, hw, rt)]
        ap, bp = params_m(a, models_meta), params_m(b, models_meta)
        if not ap or not bp or max(ap, bp) / min(ap, bp) > PAIR_PARAMS_RATIO:
            continue
        axes = _vs_significance(a, b, models_meta)
        if len(axes) < 2:
            continue
        fa = (models_meta.get(a_id) or {}).get("family")
        fb = (models_meta.get(b_id) or {}).get("family")
        cross = fa != fb
        flip = _has_ranking_flip(a_id, b_id, index)
        # score: demand (popular families) + differentiation (cross-family,
        # ranking flip, license edge, small-object story) + delta richness
        score = 0.0
        score += POPULAR_FAMILIES.get(fa, 0) + POPULAR_FAMILIES.get(fb, 0)
        score += 3 if cross else -1  # same-family adjacent is lower value
        score += 4 if flip else 0
        score += 2 if "license" in axes else 0
        score += 1.5 if "small_object" in axes else 0
        score += 0.5 * len(axes)
        # de-dup: penalize the Nth article with the same family+size shape
        shape = (frozenset([fa, fb]),
                 frozenset([_size_token(a_id, models_meta), _size_token(b_id, models_meta)]))
        dup_n = seen_shape[shape]
        score -= 3 * dup_n
        seen_shape[shape] += 1
        vs_rows.append({
            "type": "vs", "slug": f"{a_id}-vs-{b_id}",
            "cmd": f"vs {a_id} {b_id} --hardware {hw} --runtime {rt}",
            "score": round(score, 2), "axes": axes, "cross_family": cross,
            "ranking_flip": flip,
        })
    vs_rows.sort(key=lambda r: -r["score"])
    items += vs_rows

    # --- hardware guides (every hw x meaningful runtime with >=8 models) ---
    hw_rt = defaultdict(set)
    for (m, h, r) in index:
        hw_rt[(h, r)].add(m)
    for (h, r), ms in hw_rt.items():
        if len(ms) >= 8:
            items.append({
                "type": "hardware-guide",
                "slug": f"best-object-detection-{h.replace('_', '-')}",
                "cmd": f"hardware-guide {h} --runtime {r}",
                "score": round(6 + min(len(ms), 20) * 0.1, 2),
                "n_models": len(ms), "runtime": r,
            })

    # --- runtime guides (hw with a baseline+target pair, >=8 overlap) ---
    for h in {k[1] for k in index}:
        rts = sorted({k[2] for k in index if k[1] == h})
        for base in rts:
            for tgt in rts:
                if base == tgt:
                    continue
                overlap = sum(1 for m in {k[0] for k in index}
                              if index.get((m, h, base)) and index.get((m, h, tgt)))
                if overlap >= 8 and ("fp16" in tgt or tgt.startswith("tensorrt")
                                     or tgt.startswith("onnx") or "int8" in tgt):
                    items.append({
                        "type": "runtime-guide",
                        "slug": f"{tgt.replace('_', '-')}-vs-{base.replace('_', '-')}-{h.replace('_', '-')}",
                        "cmd": f"runtime-guide {h} {base} {tgt}",
                        "score": round(5 + overlap * 0.05, 2), "overlap": overlap,
                    })

    # --- license guides (hw with >=2 non-permissive + >=5 permissive) ---
    for (h, r), ms in hw_rt.items():
        perm = sum(1 for m in ms if (models_meta.get(m) or {}).get("license") in PERMISSIVE)
        nonperm = sum(1 for m in ms
                      if (models_meta.get(m) or {}).get("license")
                      and (models_meta.get(m) or {}).get("license") not in PERMISSIVE)
        if perm >= 5 and nonperm >= 2:
            items.append({
                "type": "license-guide",
                "slug": f"permissive-license-detection-models-{h.replace('_', '-')}",
                "cmd": f"license-guide --hardware {h} --runtime {r}",
                "score": round(5.5 + nonperm * 0.2, 2), "nonpermissive": nonperm,
            })

    # dedupe guide slugs (same slug from multiple runtimes -> keep best score)
    best = {}
    for it in items:
        key = it["slug"]
        if key not in best or it["score"] > best[key]["score"]:
            best[key] = it
    ranked = sorted(best.values(), key=lambda r: -r["score"])
    if limit:
        ranked = ranked[:limit]
    return ranked


def plan_report(index, models_meta, hardware_meta, runtimes_meta, limit, vs_slice, as_json):
    ranked = build_plan(index, models_meta, hardware_meta, runtimes_meta, limit, vs_slice)
    if as_json:
        print(json.dumps(ranked, indent=2))
        return
    by_type = defaultdict(int)
    for r in ranked:
        by_type[r["type"]] += 1
    print(f"PLAN: {len(ranked)} articles (primary vs slice {vs_slice[0]}/{vs_slice[1]})")
    for t, n in sorted(by_type.items(), key=lambda kv: -kv[1]):
        print(f"  {t:16s} {n}")
    print("\nrank  score  type              slug")
    for i, r in enumerate(ranked, 1):
        tags = []
        if r.get("ranking_flip"):
            tags.append("FLIP")
        if r.get("cross_family") is False:
            tags.append("same-fam")
        tag = (" [" + ",".join(tags) + "]") if tags else ""
        print(f"{i:4d}  {r['score']:5.1f}  {r['type']:16s}  {r['slug']}{tag}")


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_vs = sub.add_parser("vs")
    p_vs.add_argument("a"); p_vs.add_argument("b")
    p_vs.add_argument("--hardware", default=DEFAULT_HARDWARE)
    p_vs.add_argument("--runtime", default=DEFAULT_RUNTIME)

    p_fv = sub.add_parser("family-vs")
    p_fv.add_argument("a"); p_fv.add_argument("b")
    p_fv.add_argument("--hardware", default=DEFAULT_HARDWARE)
    p_fv.add_argument("--runtime", default=DEFAULT_RUNTIME)

    p_hg = sub.add_parser("hardware-guide")
    p_hg.add_argument("hardware")
    p_hg.add_argument("--runtime", default=DEFAULT_RUNTIME)

    p_rg = sub.add_parser("runtime-guide")
    p_rg.add_argument("hardware"); p_rg.add_argument("baseline"); p_rg.add_argument("target")

    p_lg = sub.add_parser("license-guide")
    p_lg.add_argument("--hardware", default=DEFAULT_HARDWARE)
    p_lg.add_argument("--runtime", default=DEFAULT_RUNTIME)

    p_f = sub.add_parser("finding")
    p_f.add_argument("action", choices=["scan"])
    p_f.add_argument("--hardware", default=None)

    sub.add_parser("list")

    p_plan = sub.add_parser("plan")
    p_plan.add_argument("--limit", type=int, default=0, help="top N articles (0 = all)")
    p_plan.add_argument("--hardware", default=DEFAULT_HARDWARE, help="primary hw for vs pairs")
    p_plan.add_argument("--runtime", default=DEFAULT_RUNTIME, help="primary runtime for vs pairs")
    p_plan.add_argument("--json", action="store_true", help="emit ranked worklist as JSON")

    args = ap.parse_args()
    index, models_meta, hardware_meta, runtimes_meta = load_dataset()

    if args.cmd == "list":
        coverage_report(index, models_meta, hardware_meta, runtimes_meta)
        return

    if args.cmd == "plan":
        plan_report(index, models_meta, hardware_meta, runtimes_meta,
                    args.limit, (args.hardware, args.runtime), args.json)
        return

    if args.cmd == "vs":
        doc = build_vs(index, models_meta, hardware_meta, runtimes_meta,
                       args.a, args.b, args.hardware, args.runtime)
    elif args.cmd == "family-vs":
        doc = build_family_vs(index, models_meta, hardware_meta, runtimes_meta,
                              args.a, args.b, args.hardware, args.runtime)
    elif args.cmd == "hardware-guide":
        doc = build_hardware_guide(index, models_meta, hardware_meta, runtimes_meta,
                                   args.hardware, args.runtime)
    elif args.cmd == "runtime-guide":
        doc = build_runtime_guide(index, models_meta, hardware_meta, runtimes_meta,
                                  args.hardware, args.baseline, args.target)
    elif args.cmd == "license-guide":
        doc = build_license_guide(index, models_meta, hardware_meta, runtimes_meta,
                                  args.hardware, args.runtime)
    elif args.cmd == "finding":
        doc = build_finding_scan(index, models_meta, hardware_meta, runtimes_meta,
                                 args.hardware)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / f"{doc['slug']}.claims.json"
    out_path.write_text(json.dumps(doc, indent=2), encoding="utf-8")

    gate = doc["gate"]
    n_passed = gate["passed_claims"]
    print(json.dumps(doc, indent=2))
    print(f"\nWROTE {out_path}", file=sys.stderr)
    if gate["passed"]:
        print(f"GATE PASSED: {n_passed} claims cleared (need {gate['required']}). "
              f"OK to write '{doc['slug']}'.", file=sys.stderr)
    else:
        print(f"GATE FAILED: {gate['reason']}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
