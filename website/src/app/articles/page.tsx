import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles",
  description: "Benchmark comparison articles - auto-generated deep dives into model matchups.",
};

const articles = [
  {
    id: "v2-yolov9t-vs-yoloxs",
    title: "YOLOv9-T vs YOLOX-S",
    description:
      "Paper provenance cards, author/venue/org, innovation tags, architectural insights, FAQ with real context.",
    tag: "Comparison",
  },
  {
    id: "v2-yolov9c-vs-yoloxm",
    title: "YOLOv9-C vs YOLOX-M",
    description:
      "Same-weight-class matchup (~25M params). Isolates architectural progress: PGI/GELAN vs SimOTA.",
    tag: "Comparison",
  },
  {
    id: "v2-yolov9s-vs-yoloxs",
    title: "YOLOv9-S vs YOLOX-S",
    description:
      "FLOP-matched analysis (~13.5G each). Quantifies 3 years of progress at identical compute.",
    tag: "Comparison",
  },
  {
    id: "v1-balanced",
    title: "V1 - Balanced",
    description: "Clean dark theme, tables + bars + code snippets. Standard article flow.",
    tag: "Template",
  },
  {
    id: "v2-data-story",
    title: "V2 - Data Story",
    description: "Big number hero, narrative box, stat cards, recommendation cards.",
    tag: "Template",
  },
  {
    id: "v3-minimal",
    title: "V3 - Minimal / Editorial",
    description: "Light theme, serif font, zero visual noise. Reads like an academic blog post.",
    tag: "Template",
  },
  {
    id: "v4-dashboard",
    title: "V4 - Dashboard",
    description: "Data-dense, minimal prose. Metric tiles, visual bars, side-by-side spec panels.",
    tag: "Template",
  },
  {
    id: "v5-longform",
    title: "V5 - Long-form + TOC",
    description: "Sidebar table of contents, deeper background, key insight callouts.",
    tag: "Template",
  },
  {
    id: "v6-agent-optimized",
    title: "V6 - AI Agent Optimized",
    description: "Schema.org markup, semantic key facts, FAQ section for featured snippets.",
    tag: "Template",
  },
  {
    id: "v7-cinematic",
    title: "V7 - Cinematic Data",
    description: "Glassmorphism, gradient glows, dramatic face-off layout, radial accents.",
    tag: "Template",
  },
  {
    id: "v8-editorial",
    title: "V8 - Editorial Premium",
    description: "Bloomberg/Stripe-level editorial. Serif typography, muted gold accents, pull quotes.",
    tag: "Template",
  },
  {
    id: "v9-neon",
    title: "V9 - Neon",
    description: "Pink + cyan neon palette. Gradient title, glowing bars, vibrant dark theme.",
    tag: "Template",
  },
  {
    id: "v10-amber",
    title: "V10 - Amber & Warm",
    description: "Warm dark tones with amber + teal accents. Earthy, cozy feel.",
    tag: "Template",
  },
  {
    id: "v11-ice",
    title: "V11 - Ice (Light)",
    description: "Light theme with indigo + rose. White cards, soft shadows.",
    tag: "Template",
  },
  {
    id: "v12-forest",
    title: "V12 - Forest",
    description: "Deep green dark theme with lime + sky blue. Side-by-side hero cards.",
    tag: "Template",
  },
  {
    id: "v13-purple",
    title: "V13 - Purple Haze",
    description: "Violet + orange on deep purple. Gradient face-off layout with VS divider.",
    tag: "Template",
  },
  {
    id: "v14-mono",
    title: "V14 - Monospace Terminal",
    description: "All-monospace, terminal aesthetic. Fake CLI output as hero, brutalist.",
    tag: "Template",
  },
];

export default function ArticlesPage() {
  const comparisons = articles.filter((a) => a.tag === "Comparison");
  const templates = articles.filter((a) => a.tag === "Template");

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="text-2xl font-semibold text-white mb-2">Articles</h1>
          <p className="text-white/60 text-base max-w-2xl">
            Benchmark comparison deep-dives and article template explorations.
          </p>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        {/* Comparisons */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Model Comparisons</h2>
            <p className="text-base text-foreground">
              Head-to-head benchmark analyses using real LibreYOLO data.
            </p>
          </div>
          <div className="section-group-content">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comparisons.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}.html`}
                  target="_blank"
                  className="group block rounded border border-border bg-card p-4 transition-all hover:border-brand hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase text-brand bg-brand-light px-2 py-0.5 rounded">
                      {article.tag}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-foreground mb-1 group-hover:text-brand transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{article.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="section-group">
          <div className="section-group-header">
            <h2>Article Templates</h2>
            <p className="text-base text-foreground">
              Design explorations for auto-generated benchmark articles.
            </p>
          </div>
          <div className="section-group-content">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}.html`}
                  target="_blank"
                  className="group block rounded border border-border bg-card p-4 transition-all hover:border-brand hover:shadow-sm"
                >
                  <h2 className="text-sm font-semibold text-foreground mb-1 group-hover:text-brand transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">{article.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
