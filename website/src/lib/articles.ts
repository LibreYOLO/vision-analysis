// Article registry for the Articles section.
//
// v1 proposal: metadata lives here and bodies are rendered in the site shell so a
// piece can embed LIVE benchmark charts (not screenshots). In production this list
// would be generated from MDX files under content/articles, but the shape stays the
// same: every article is metadata + an on-brand, verified body.

export interface Article {
  slug: string;
  title: string;
  dek: string;
  date: string; // ISO yyyy-mm-dd
  author: string;
  readingMinutes: number;
  tags: string[];
  status: "published" | "draft";
}

export const ARTICLES: Article[] = [
  {
    slug: "yolov9s-vs-yolox-s",
    title: "YOLOv9-S vs YOLOX-S: choosing a small detector",
    dek: "Two detectors near 9M parameters, measured on the same COCO protocol. Where each one wins on accuracy, latency, and edge support.",
    date: "2026-06-28",
    author: "Vision Analysis",
    readingMinutes: 6,
    tags: ["comparison", "edge", "yolov9", "yolox"],
    status: "published",
  },
  {
    slug: "how-to-run-rtmdet-with-libreyolo",
    title: "How to run RTMDet with LibreYOLO",
    dek: "A step-by-step guide to loading and benchmarking RTMDet through the LibreYOLO API.",
    date: "2026-07-05",
    author: "Vision Analysis",
    readingMinutes: 8,
    tags: ["guide", "rtmdet", "libreyolo"],
    status: "draft",
  },
  {
    slug: "picking-an-edge-detector-for-jetson-orin",
    title: "Picking an edge detector for Jetson Orin Nano",
    dek: "Reading the accuracy-vs-latency frontier for embedded GPU deployment, with TensorRT in the mix.",
    date: "2026-07-12",
    author: "Vision Analysis",
    readingMinutes: 7,
    tags: ["guide", "edge", "jetson", "tensorrt"],
    status: "draft",
  },
];

export function publishedArticles(): Article[] {
  return ARTICLES.filter((a) => a.status === "published").sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function draftArticles(): Article[] {
  return ARTICLES.filter((a) => a.status === "draft").sort((a, b) => a.date.localeCompare(b.date));
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function formatArticleDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
