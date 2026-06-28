import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getArticle, publishedArticles, formatArticleDate } from "@/lib/articles";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return publishedArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: article.title,
    description: article.dek,
    openGraph: {
      title: `${article.title} | ${siteConfig.name}`,
      description: article.dek,
      type: "article",
    },
  };
}

// v1 proposal: bodies are React so they can embed live charts. In production this
// map is replaced by MDX files under content/articles, same metadata + body shape.
const BODIES: Record<string, () => React.ReactNode> = {
  "yolov9s-vs-yolox-s": Yolov9sVsYoloxS,
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  const Body = BODIES[slug];

  if (!article || article.status !== "published" || !Body) {
    notFound();
    return null;
  }

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[760px] px-4 pt-4">
          <Link
            href="/articles"
            className="mb-6 inline-flex items-center text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All articles
          </Link>
          <div className="text-xs uppercase tracking-[0.1em] text-white/40">
            {article.tags.slice(0, 3).join(" · ")}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">{article.title}</h1>
          <p className="mt-3 text-lg text-white/60">{article.dek}</p>
          <div className="mt-4 text-sm text-white/40">
            {article.author} · {formatArticleDate(article.date)} · {article.readingMinutes} min read
          </div>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[760px] px-4 pb-16">
        <article className="article-body rounded border border-border bg-card p-6 sm:p-9">
          <Body />
        </article>
      </div>
    </>
  );
}

function ProposalNote() {
  return (
    <p className="mb-6 rounded border-l-2 border-brand bg-brand-subtle px-4 py-3 text-sm text-muted-foreground">
      Proposal preview. The layout and voice are the proposed final form; the chart below is live,
      verified data. In production the prose figures are pulled from the same dataset through the
      article fact-sheet, so nothing here is hand-typed.
    </p>
  );
}

function LiveChart({
  src,
  caption,
  height = 460,
}: {
  src: string;
  caption: string;
  height?: number;
}) {
  return (
    <figure className="my-7 overflow-hidden rounded border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Live chart
        </span>
        <span className="text-xs text-muted-foreground">verified data</span>
      </div>
      <iframe
        src={src}
        width="100%"
        height={height}
        loading="lazy"
        className="block border-0"
        title={caption}
      />
      <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-9 mb-2 text-xl font-semibold text-foreground">{children}</h2>;
}

function Verdict() {
  return (
    <div className="mb-8 rounded border border-border bg-surface-muted p-4">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Verdict
      </div>
      <p className="mt-2 text-base leading-relaxed text-foreground">
        Take YOLOv9-S when accuracy per parameter matters and you ship to GPU or CPU. Take YOLOX-S
        when you want the widest runtime and edge-NPU support behind an Apache-2.0 license. Both sit
        near 13.5 GFLOPs, so the choice is about deployment target, not compute budget.
      </p>
    </div>
  );
}

function Yolov9sVsYoloxS() {
  return (
    <>
      <ProposalNote />
      <Verdict />

      <p className="text-base leading-relaxed text-foreground">
        YOLOv9-S and YOLOX-S are close on paper. YOLOv9-S is 7.2M parameters and 13.5 GFLOPs.
        YOLOX-S is 9.0M parameters and 13.5 GFLOPs. Same input size, same compute, both anchor-free.
        The differences show up in accuracy per parameter and in which runtimes you can ship.
      </p>

      <H2>What the data shows</H2>
      <p className="text-base leading-relaxed text-foreground">
        The chart below is the same component the leaderboard uses, scoped to these two models. It
        reads from the verified dataset, so it stays in sync with every new run. Drag, hover, and
        read the exact coordinates.
      </p>
      <LiveChart
        src="/embed/scatter?highlight=yolov9s,yolox-s"
        caption="Accuracy vs parameters on COCO val2017. YOLOv9-S and YOLOX-S highlighted against the full landscape."
      />

      <H2>Accuracy</H2>
      <p className="text-base leading-relaxed text-foreground">
        All numbers here come from LibreYOLO retrained checkpoints on the frozen 500-image COCO
        val2017 slice. Other weight sources can yield different values. For the measured mAP at this
        size class, read the highlighted points above and the per-model pages.
      </p>

      <H2>Speed and edge support</H2>
      <p className="text-base leading-relaxed text-foreground">
        Both are single-stage convolutional detectors, so both export cleanly to ONNX, TensorRT, and
        the edge runtimes. YOLOX-S ships under Apache-2.0, which is the looser license if you embed
        it in a commercial product. For Raspberry Pi and NPU targets, check the hardware pages for
        the runtimes that have verified rows.
      </p>

      <H2>How we measured</H2>
      <p className="text-base leading-relaxed text-foreground">
        Every model runs through the same protocol: conf 0.001, IoU 0.6, max 300 detections,
        pycocotools mAP, on the same 500-image slice across all hardware and runtimes. The full
        protocol is on the{" "}
        <Link href="/methodology" className="text-brand hover:underline">
          methodology
        </Link>{" "}
        page. To compare these two on your own target, open{" "}
        <Link href="/compare" className="text-brand hover:underline">
          compare
        </Link>
        .
      </p>
    </>
  );
}
