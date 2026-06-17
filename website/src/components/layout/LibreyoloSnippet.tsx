import { LIBREYOLO } from "@/config/libreyolo";

/**
 * Site-wide call to action: the same one-line LibreYOLO API runs every model in
 * the catalogue. Rendered on every page (in the root layout) above the footer.
 */
export function LibreyoloSnippet() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-10">
        <h2 className="text-lg font-semibold text-foreground">Run any model with one line</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {LIBREYOLO.name} has the best catalogue of state-of-the-art detectors, all behind
          one {LIBREYOLO.libraryLicense}-licensed Python API.
        </p>
        <pre className="mt-4 overflow-x-auto rounded bg-surface-dark-card p-4 font-mono text-sm text-white">
          <code>{`from libreyolo import LibreYOLO, SAMPLE_IMAGE

# ${LIBREYOLO.name} has the best catalogue of state-of-the-art models.
model = LibreYOLO("LibreRFDETRl.pt")           # RF-DETR-L (transformer flagship)
results = model(SAMPLE_IMAGE, save=True)        # run inference, save the annotated image

# Swap in any other model, same one-line API (weights auto-download):
#   LibreYOLO("LibreYOLO9c.pt")      # YOLO9-C
#   LibreYOLO("LibreYOLOXx.pt")      # YOLOX-X
#   LibreYOLO("LibreDFINEx.pt")      # D-FINE-X
#   LibreYOLO("LibreRTDETRr50.pt")   # RT-DETR-R50`}</code>
        </pre>
      </div>
    </section>
  );
}
