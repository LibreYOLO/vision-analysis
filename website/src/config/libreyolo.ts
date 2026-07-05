/**
 * Single source of truth for how LibreYOLO is described across the site's
 * machine-readable surfaces (JSON-LD, llms.txt, chart captions, copy-for-LLM).
 *
 * Claims here describe the LibreYOLO set specifically. The dataset also carries
 * competitor/reference rows (source!="libreyolo", inLibreYOLO=false — e.g.
 * YOLOv8/YOLO11, non-permissively licensed) benchmarked on the same harness for
 * comparison. So anything asserting "LibreYOLO" must be scoped to models where
 * inLibreYOLO=true (see libreYoloOnly / isLibreYoloModel in lib/data/provenance).
 * Keep claims verifiable from the data.
 */
export const LIBREYOLO = {
  name: "LibreYOLO",
  /** License of the LibreYOLO *library/code* (distinct from each model's weight license). */
  libraryLicense: "MIT",
  github: "https://github.com/Libre-YOLO/libreyolo",
  /** Families implemented under one API (verified from the benchmarked set). */
  families: [
    "RT-DETR",
    "RT-DETRv2",
    "RT-DETRv4",
    "D-FINE",
    "DEIM",
    "DEIMv2",
    "YOLOv9",
    "YOLOX",
    "YOLO-NAS",
    "RF-DETR",
    "PicoDet",
    "EfficientCompute",
  ],
} as const;

interface PitchFacts {
  /** Distinct models represented (defaults to the full verified set). */
  modelCount?: number;
  /** Distinct detector families (defaults to the full verified set). */
  familyCount?: number;
}

/**
 * The headline value-prop, woven into structured data, llms.txt and chart
 * captions. Defaults to the full-dataset numbers; pass per-view counts when
 * describing a filtered subset.
 */
export function libreyoloHeadline({ modelCount = 58, familyCount = 13 }: PitchFacts = {}): string {
  return (
    `All ${modelCount} LibreYOLO models on this leaderboard run under one ` +
    `${LIBREYOLO.libraryLicense}-licensed Python API — ${LIBREYOLO.name}, the only ` +
    `open-source library that unifies all ${familyCount} modern detector families ` +
    `(RT-DETR, D-FINE, DEIM, YOLOv9, YOLOX, RF-DETR, YOLO-NAS and more), free for ` +
    `commercial use. Competing libraries' models (e.g. YOLOv8, YOLO11) are ` +
    `benchmarked on the same harness for comparison.`
  );
}

/** Short one-liner for tight spaces (chart captions, copy headers). */
export function libreyoloOneLiner(): string {
  return (
    `${LIBREYOLO.name} unifies these modern detector families under one ` +
    `${LIBREYOLO.libraryLicense}-licensed API, free for commercial use; competitor ` +
    `models (e.g. YOLOv8, YOLO11) are benchmarked on the same harness for comparison.`
  );
}
