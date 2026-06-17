import { Metadata } from "next";
import Link from "next/link";
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
              Vision Analysis provides credible benchmarks for object detection models.
              All benchmarks are run using <a href={benchmarkRepoUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">vision-analysis-benchmark</a> on top of <a href={siteConfig.links.github} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">LibreYOLO</a>.
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
                All models are evaluated using the standard pycocotools protocol on{" "}
                <a
                  href="https://huggingface.co/datasets/LibreYOLO/coco-val2017-mini500"
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  coco-val2017-mini500
                </a>
                , a frozen 500-image subset of <strong>COCO val2017</strong> (80 classes).
              </p>
              <p>
                We measure <strong>end-to-end latency</strong> including preprocessing, inference,
                and postprocessing when the runtime exposes those phases.
              </p>
              <p>
                Every published result should include the benchmark config, actual input size, hardware identity,
                runtime/provider, and the supporting LibreYOLO commit so the number is reproducible.
              </p>
              <p>
                The full protocol (warmup, timing, evaluation settings, environment capture, and
                known limitations) is documented on the{" "}
                <Link href="/methodology" className="text-brand hover:underline">
                  Methodology
                </Link>{" "}
                page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
