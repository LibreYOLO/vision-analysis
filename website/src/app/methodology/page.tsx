import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Vision Analysis benchmarks object detection models: COCO val2017 accuracy via pycocotools, synchronized end-to-end timing with warmup, full environment capture, and reviewed submissions.",
  alternates: { canonical: "/methodology" },
};

const benchmarkRepoUrl = "https://github.com/LibreYOLO/vision-analysis-benchmark";
const submissionsUrl = "https://github.com/LibreYOLO/vision-analysis/tree/main/submissions";
const schemaUrl = "https://github.com/LibreYOLO/vision-analysis/blob/main/schemas/submission.v1.json";

export default function MethodologyPage() {
  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="text-2xl font-semibold text-white mb-2">Methodology</h1>
          <p className="text-white/60 text-base max-w-2xl">
            Every number on this site comes from a reviewed, reproducible benchmark run. This page
            documents exactly how those numbers are produced.
          </p>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        {/* Pipeline */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>From run to published number</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                Benchmarks are produced by the open-source{" "}
                <a href={benchmarkRepoUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  vision-analysis-benchmark
                </a>{" "}
                harness. Each run emits a single JSON file that records the result together with
                the exact LibreYOLO version and commit used, so the number can be reproduced later.
              </p>
              <p>
                Result files are submitted by pull request to{" "}
                <a href={submissionsUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  <code>submissions/</code>
                </a>{" "}
                and validated against a{" "}
                <a href={schemaUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  published schema
                </a>
                . After review, the canonical verified dataset is rebuilt and the website renders
                exclusively from that snapshot. Raw submissions stay in the repository for
                provenance.
              </p>
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Accuracy</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                All accuracy numbers are computed on <strong>COCO val2017</strong> (5,000 images,
                80 classes) with <strong>pycocotools COCOeval</strong> in bounding-box mode. The
                harness records all 12 standard COCO metrics: mAP@50-95, mAP@50, mAP@75, mAP for
                small/medium/large objects, and the AR (average recall) variants. The site
                headlines mAP@50-95, the strictest and most standard of these.
              </p>
              <p>
                Evaluation settings follow the convention used by the original model releases:
                confidence threshold <code>0.001</code>, NMS IoU <code>0.6</code>, maximum{" "}
                <code>300</code> detections per image, and the model&apos;s native input size
                (recorded per run, typically 640).
              </p>
            </div>
          </div>
        </div>

        {/* Speed */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Speed</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                Latency is measured <strong>end to end</strong> at batch size 1 and split into
                preprocess, inference, and postprocess phases. This means NMS and decoding costs
                are included: a model with a heavy postprocessing stage will show honest, higher
                end-to-end latency here than in inference-only marketing numbers.
              </p>
              <p>
                Before timing, the harness warms the model up (10 iterations on CUDA and Apple
                MPS, 3 on CPU). Each measurement uses device synchronization
                (<code>torch.cuda.synchronize</code> or the MPS equivalent) around{" "}
                <code>time.perf_counter</code>, so asynchronous GPU work cannot leak across
                timestamps. Per-image timings are aggregated as mean, standard deviation, p50,
                p95, and p99; throughput (FPS) is derived from them. Peak VRAM is recorded on
                CUDA, along with peak host RAM.
              </p>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Environment capture</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                Every submission embeds the full environment it was measured on: GPU model, driver
                and CUDA version, CPU model and core count, RAM, plus Python, PyTorch,
                ONNX Runtime, and LibreYOLO versions. Two results are only compared on the site
                when they share the same hardware and runtime combination.
              </p>
              <p>
                Runtimes covered by the harness today: <strong>PyTorch</strong> (CPU and NVIDIA
                CUDA) and <strong>ONNX Runtime</strong> (CPU and NVIDIA CUDA). TensorRT and
                OpenVINO are not yet part of the harness.
              </p>
            </div>
          </div>
        </div>

        {/* Provenance */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Weights provenance and parity</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                Each result declares where its weights came from: <code>original</code> (the
                authors&apos; release), <code>converted</code> (key-remapped into LibreYOLO format,
                learned parameters unchanged), or <code>retrained</code>. To verify that
                conversion does not change behavior, we continuously cross-check measured accuracy
                against the numbers claimed by the original authors on the{" "}
                <Link href="/parity" className="text-brand hover:underline">
                  Port Fidelity
                </Link>{" "}
                page.
              </p>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Known limitations</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Timing focuses on batch size 1 (the latency-critical deployment case);
                  large-batch throughput is not currently measured.
                </li>
                <li>
                  Apple MPS runs work but memory reporting on that path is incomplete, so
                  MPS results may omit VRAM figures.
                </li>
                <li>
                  YOLO-NAS is excluded from harness runs because its weights are gated by
                  license terms that prevent redistribution.
                </li>
                <li>
                  Hardware coverage is community-driven: a model/hardware cell is empty until a
                  reviewed submission for that combination lands.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
