import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publishedArticles, draftArticles, formatArticleDate, type Article } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Guides and benchmark write-ups from Vision Analysis. Every number is sourced from a verified run, and charts are live, not screenshots.",
};

export default function ArticlesPage() {
  const published = publishedArticles();
  const drafts = draftArticles();

  return (
    <>
      <section className="bg-black pb-32">
        <div className="mx-auto max-w-[1280px] px-4 pt-4">
          <h1 className="mb-2 text-2xl font-semibold text-white">Articles</h1>
          <p className="max-w-2xl text-base text-white/60">
            Guides and comparisons for people who deploy detection models. Every number is sourced
            from a verified run, and the charts are live.
          </p>
        </div>
      </section>

      <div className="-mt-16 mx-auto max-w-[1280px] px-4 pb-8">
        <div className="section-group">
          <div className="section-group-content">
            <ul className="divide-y divide-border">
              {published.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="group block py-5 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <Meta article={article} />
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-foreground group-hover:text-brand">
                      {article.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-base text-muted-foreground">{article.dek}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-brand">
                      Read
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {drafts.length > 0 && (
          <div className="section-group">
            <div className="section-group-header">
              <h2>In progress</h2>
              <p className="text-base text-foreground">
                Drafts on the way. They publish once every number in them comes from a verified run.
              </p>
            </div>
            <div className="section-group-content">
              <ul className="divide-y divide-border">
                {drafts.map((article) => (
                  <li key={article.slug} className="py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        {article.tags.slice(0, 3).join(" · ")}
                      </span>
                      <span className="text-xs text-muted-foreground">In progress</span>
                    </div>
                    <h3 className="mt-1 text-lg font-medium text-foreground">{article.title}</h3>
                    <p className="mt-1 max-w-2xl text-base text-muted-foreground">{article.dek}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Meta({ article }: { article: Article }) {
  return (
    <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
      {formatArticleDate(article.date)} · {article.readingMinutes} min read
    </span>
  );
}
