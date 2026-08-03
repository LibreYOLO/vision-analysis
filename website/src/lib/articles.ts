// Article registry.
//
// Two sources merge here:
//   1. JSON content files under src/content/articles/ produced by the v2
//      article engine (article-pipeline/v2/). These carry blocks rendered by
//      ArticleRenderer; dropping a validated JSON in that folder publishes the
//      article, adds it to /articles, and puts it in the sitemap.
//   2. Legacy hand-registered entries (bodies hardcoded in the article page).
//
// Server-only: reads the filesystem at build time.

import "server-only";
import fs from "fs";
import path from "path";
import type { ArticleContent } from "@/lib/types/article";

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

// Legacy entries whose bodies live as React components in the article page.
const LEGACY_ARTICLES: Article[] = [
  {
    slug: "yolov9s-vs-yolox-s",
    title: "YOLOv9-S vs YOLOX-S: choosing a small detector",
    dek: "Two detectors near 9M parameters, measured on the same COCO protocol. Where each one wins on accuracy, latency, and edge support.",
    date: "2026-06-28",
    author: "Vision Analysis",
    readingMinutes: 6,
    tags: ["comparison", "edge", "yolov9", "yolox"],
    // Superseded by the yolov9-vs-yolox family comparison; kept as draft.
    status: "draft",
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

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "articles");

let contentCache: ArticleContent[] | null = null;

function loadContentArticles(): ArticleContent[] {
  if (contentCache) return contentCache;
  let files: string[] = [];
  try {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  const articles: ArticleContent[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const parsed = JSON.parse(raw) as ArticleContent;
      if (parsed.slug && parsed.title && Array.isArray(parsed.blocks)) {
        articles.push(parsed);
      } else {
        console.warn(`[articles] skipping malformed content file: ${file}`);
      }
    } catch (e) {
      console.warn(`[articles] failed to parse ${file}:`, e);
    }
  }
  contentCache = articles;
  return articles;
}

function toArticle(c: ArticleContent): Article {
  return {
    slug: c.slug,
    title: c.title,
    dek: c.dek,
    date: c.date,
    author: c.author,
    readingMinutes: c.readingMinutes,
    tags: c.tags,
    status: c.status,
  };
}

export function allArticles(): Article[] {
  const content = loadContentArticles().map(toArticle);
  const contentSlugs = new Set(content.map((a) => a.slug));
  const legacy = LEGACY_ARTICLES.filter((a) => !contentSlugs.has(a.slug));
  return [...content, ...legacy];
}

export function publishedArticles(): Article[] {
  return allArticles()
    .filter((a) => a.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function draftArticles(): Article[] {
  return allArticles()
    .filter((a) => a.status === "draft")
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getArticle(slug: string): Article | undefined {
  return allArticles().find((a) => a.slug === slug);
}

/** Full block content for engine-generated articles; undefined for legacy ones. */
export function getArticleContent(slug: string): ArticleContent | undefined {
  return loadContentArticles().find((a) => a.slug === slug);
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
