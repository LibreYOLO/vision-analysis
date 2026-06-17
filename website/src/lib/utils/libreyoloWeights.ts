// Canonical LibreYOLO weight filenames, per libreyolo docs/nomenclature.md.
// Schema: Libre<FAMILY><size>.pt  (all-caps family prefix, lowercase size, .pt).
// The class loaded with these is `LibreYOLO`, e.g. LibreYOLO("LibreDFINEx.pt").

const FILENAME_PREFIX: Record<string, string> = {
  yolox: "LibreYOLOX",
  yolov9: "LibreYOLO9",
  yolonas: "LibreYOLONAS",
  dfine: "LibreDFINE",
  deim: "LibreDEIM",
  deimv2: "LibreDEIMv2",
  rtdetr: "LibreRTDETR",
  rtdetrv2: "LibreRTDETRv2",
  rtdetrv4: "LibreRTDETRv4",
  rfdetr: "LibreRFDETR",
  picodet: "LibrePICODET",
  ec: "LibreEC",
};

// YOLOX is the only family whose display variant differs from the size code
// (the metadata stores "nano"/"tiny" but the weight uses "n"/"t").
function sizeCode(family: string, variant: string): string {
  if (family === "yolox") {
    if (variant === "nano") return "n";
    if (variant === "tiny") return "t";
  }
  return variant;
}

/**
 * Canonical weight filename for a LibreYOLO model, e.g. "LibreDFINEx.pt".
 * Returns null for families not packaged in LibreYOLO (e.g. yolov8 / yolov10).
 */
export function libreyoloWeightsFile(family: string, variant: string): string | null {
  const prefix = FILENAME_PREFIX[family];
  if (!prefix) return null;
  return `${prefix}${sizeCode(family, variant)}.pt`;
}
