// Article content schema for the v2 article engine.
//
// An article is metadata + an ordered list of blocks. Text blocks carry the
// only LLM-written prose (validated against the claims file by
// article-pipeline/v2/validate.py). Data blocks are declarative: they name a
// slice of the verified dataset and the site renders them live, so tables and
// charts stay current when new benchmark data lands without touching prose.

export type ArticleType =
  | "vs"
  | "hardware-guide"
  | "runtime-guide"
  | "license-guide"
  | "finding";

export interface ProseBlock {
  kind: "prose";
  text: string; // minimal markdown: [link](href), `code`, **bold**
}

export interface VerdictBlock {
  kind: "verdict";
  text: string;
}

export interface HeadingBlock {
  kind: "heading";
  text: string;
}

export interface CalloutBlock {
  kind: "callout";
  text: string;
}

export interface ChartBlock {
  kind: "chart";
  src: string; // /embed/... route
  caption: string;
  height?: number;
}

export interface CodeBlock {
  kind: "code";
  language: string;
  text: string;
}

export interface KvBlock {
  kind: "kv";
  title: string;
  items: Array<{ k: string; v: string; href?: string }>;
}

export interface ComparisonTableBlock {
  kind: "comparison-table";
  models: string[]; // model ids, 2+
  hardware: string;
  runtime: string;
  caption?: string;
}

export interface RankingTableBlock {
  kind: "ranking-table";
  hardware: string;
  runtime: string;
  metric: "mAP_50_95" | "throughputFps";
  limit?: number;
  licenseFilter?: "permissive";
  maxParamsM?: number;
  caption?: string;
}

export interface SpeedupTableBlock {
  kind: "speedup-table";
  hardware: string;
  baseline: string; // runtime id
  target: string; // runtime id
  limit?: number;
  caption?: string;
}

export interface MethodologyBlock {
  kind: "methodology";
}

export type ArticleBlock =
  | ProseBlock
  | VerdictBlock
  | HeadingBlock
  | CalloutBlock
  | ChartBlock
  | CodeBlock
  | KvBlock
  | ComparisonTableBlock
  | RankingTableBlock
  | SpeedupTableBlock
  | MethodologyBlock;

export interface ArticleContent {
  slug: string;
  type: ArticleType;
  title: string;
  dek: string;
  date: string; // ISO yyyy-mm-dd, set to the newest benchmark date used
  author: string;
  readingMinutes: number;
  tags: string[];
  status: "published" | "draft";
  claimsFile: string; // repo-root-relative path to the claims JSON
  blocks: ArticleBlock[];
}
