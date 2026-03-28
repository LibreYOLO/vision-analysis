import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: "About Vision Analysis - credible and deep analysis of computer vision models.",
};

export default function AboutPage() {
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
              We measure what matters: accuracy, speed on real hardware, and computational efficiency.
              All benchmarks are run using <a href={siteConfig.links.github} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">LibreYOLO</a>, our open-source benchmarking framework.
            </p>
          </div>
        </div>

        {/* VA v1 Score */}
        <div className="section-group">
          <div className="section-group-header">
            <h2 id="va-score">VA v1 Score</h2>
          </div>
          <div className="section-group-content">
            <p className="text-base text-foreground leading-relaxed mb-4">
              The VA v1 Score is a compound index (0–100) that ranks object detection models across 6 metrics:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { metric: "mAP@50", desc: "Detection quality - did the model find the object?" },
                { metric: "mAP@50-95", desc: "Localization precision - how tight is the bounding box?" },
                { metric: "mAP_small", desc: "Small object detection - can it see objects <32x32 px?" },
                { metric: "FPS (A100)", desc: "Cloud speed - throughput on standard GPU hardware" },
                { metric: "FPS (RPi5)", desc: "Edge speed - real-world performance on constrained hardware" },
                { metric: "mAP/GFLOP", desc: "Compute efficiency - accuracy per unit of compute" },
              ].map((item) => (
                <div key={item.metric} className="bg-surface-muted rounded p-4">
                  <p className="font-semibold text-sm text-brand mb-1">{item.metric}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Each metric is min-max normalized across all models, then averaged. A model must have benchmarks
              on both A100 and Raspberry Pi 5 to receive a V1 score.
            </p>
          </div>
        </div>

        {/* Methodology */}
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
                We measure <strong>end-to-end latency</strong> including preprocessing, model inference,
                and postprocessing (NMS). This captures the true cost of running a model in production,
                not just the forward pass.
              </p>
              <p>
                Benchmarks are run on standardized hardware with controlled conditions.
                All results are reproducible using the LibreYOLO framework.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
