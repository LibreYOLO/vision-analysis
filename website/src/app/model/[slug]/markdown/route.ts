import {
  getModels,
  getModelById,
  getModelBenchmarks,
  getFamilyById,
  getHardwareById,
  getRuntimeById,
} from "@/lib/data";
import { buildModelMarkdown, ModelBenchRow } from "@/lib/llm/modelMarkdown";

/**
 * Markdown twin of each model page, served at /model/[slug]/markdown and
 * advertised from the page via <link rel="alternate" type="text/markdown">.
 * Clean, LLM-ingestible text, no HTML chrome. Invisible to humans unless they
 * navigate to it directly.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return getModels().map((model) => ({ slug: model.id }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const model = getModelById(slug);
  if (!model) {
    return new Response("Not found", { status: 404 });
  }

  const family = getFamilyById(model.family);
  const rows: ModelBenchRow[] = getModelBenchmarks(slug).map((b) => ({
    hardwareLabel: getHardwareById(b.hardware)?.displayName ?? b.hardware,
    runtimeLabel: getRuntimeById(b.runtime)?.displayName ?? b.runtime,
    result: b.result,
  }));

  const markdown = buildModelMarkdown(model, family, rows);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
