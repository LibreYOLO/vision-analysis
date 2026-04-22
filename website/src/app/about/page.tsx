import { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: "About Vision Analysis - credible and deep analysis of computer vision models.",
};

export default function AboutPage() {
  const submissionsUrl = "https://github.com/LibreYOLO/vision-analysis/tree/main/submissions";
  const supportMatrixUrl = "https://github.com/LibreYOLO/vision-analysis/blob/main/support-matrix.json";
  const benchmarkRepoUrl = "https://github.com/LibreYOLO/vision-analysis-benchmark";

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="text-2xl font-semibold text-white mb-2">About Vision Analysis</h1>
          <p className="text-white/60 text-base max-w-2xl">
            Credible and deep analysis of computer vision models.
          </p>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        {/* Mission */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Mission</h2>
          </div>
          <div className="section-group-content prose max-w-none">
            <p className="text-base text-foreground leading-relaxed">
              Vision Analysis provides credible, reproducible benchmarks for object detection models.
              We publish raw measurements first: mAP, latency, throughput, memory, runtime, hardware, and provenance.
              All benchmarks are run using <a href={benchmarkRepoUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">vision-analysis-benchmark</a> on top of <a href={siteConfig.links.github} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">LibreYOLO</a>.
            </p>
          </div>
        </div>

        <div className="section-group">
          <div className="section-group-header">
            <h2>What We Publish</h2>
          </div>
          <div className="section-group-content">
            <p className="text-base text-foreground leading-relaxed mb-4">
              Vision Analysis does not currently publish a composite score. The site shows atomic metrics only, so every row is traceable back to one benchmark run.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { metric: "Accuracy", desc: "COCO mAP metrics from the benchmark output." },
                { metric: "Latency", desc: "Measured end-to-end milliseconds per image." },
                { metric: "Throughput", desc: "Images per second from the same run." },
                { metric: "Memory", desc: "RAM and VRAM where the runtime can measure them." },
                { metric: "Runtime", desc: "Backend, provider, precision, and actual input size used." },
                { metric: "Provenance", desc: "Harness version, LibreYOLO commit, hardware, and config." },
              ].map((item) => (
                <div key={item.metric} className="bg-surface-muted rounded p-4">
                  <p className="font-semibold text-sm text-brand mb-1">{item.metric}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              If Vision Analysis introduces a score later, it should be computed downstream from stored benchmark records, not inside the harness.
            </p>
          </div>
        </div>

        <div className="section-group">
          <div className="section-group-header">
            <h2>Submission Flow</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                Community contributors run the harness locally, produce a submission JSON, and open a pull request adding that file under{" "}
                <a href={submissionsUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  <code>submissions/</code>
                </a>.
              </p>
              <p>
                CI validates each submission against the schema and the current{" "}
                <a href={supportMatrixUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                  support matrix
                </a>
                , then rebuilds the canonical benchmark dataset consumed by the website.
              </p>
              <p>
                The site renders only from the generated canonical dataset. Raw submission files stay in the repo for review and provenance, but the public UI reads the rebuilt verified snapshot.
              </p>
            </div>
          </div>
        </div>

        <div className="section-group">
          <div className="section-group-header">
            <h2>Methodology</h2>
          </div>
          <div className="section-group-content">
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                All models are evaluated on <strong>COCO val2017</strong> (5,000 images, 80 classes)
                using the standard pycocotools evaluation protocol.
              </p>
              <p>
                We measure <strong>end-to-end latency</strong> including preprocessing, inference,
                and postprocessing when the runtime exposes those phases.
              </p>
              <p>
                Every published result should include the benchmark config, actual input size, hardware identity,
                runtime/provider, and the supporting LibreYOLO commit so the number is reproducible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
