import { ModelMetadata, FamilyMetadata } from "@/lib/types";
import { ModelBenchmarkEntry } from "@/lib/data";
import { siteConfig } from "@/config/site";
import { LIBREYOLO } from "@/config/libreyolo";

interface ModelStructuredDataProps {
  model: ModelMetadata;
  family?: FamilyMetadata;
  benchmarks: ModelBenchmarkEntry[];
}

const LICENSE_URLS: Record<string, string> = {
  "MIT": "https://opensource.org/licenses/MIT",
  "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
};

function licenseValue(license: string): string {
  return LICENSE_URLS[license] ?? license;
}

/**
 * schema.org JSON-LD for a single model page (server-rendered, invisible to
 * humans). Models the detector as SoftwareSourceCode that isPartOf the
 * MIT-licensed LibreYOLO library, with its key metrics as PropertyValues so AI
 * engines can cite the numbers. The full per-hardware table lives in the page
 * HTML and the /markdown twin.
 */
export function ModelStructuredData({ model, family, benchmarks }: ModelStructuredDataProps) {
  const url = siteConfig.url.replace(/\/$/, "");
  const pageUrl = `${url}/model/${model.id}`;

  const best = benchmarks
    .map((b) => b.result)
    .filter(Boolean)
    .sort((a, b) => b.mAP_50_95 - a.mAP_50_95)[0];

  const properties = [
    { name: "Parameters (M)", value: model.specs.paramsM },
    { name: "GFLOPs", value: model.specs.flopsG },
    { name: "Default input size (px)", value: model.specs.inputSizeDefault },
    best ? { name: "Best mAP@50-95 (%)", value: Number(best.mAP_50_95.toFixed(1)) } : null,
    model.paperReportedMap ? { name: "Paper mAP@50-95 (%)", value: model.paperReportedMap } : null,
  ].filter(Boolean) as Array<{ name: string; value: number }>;

  const description =
    `${model.displayName}: ${model.architecture.type} object detector ` +
    `(${model.architecture.backbone} backbone, ${model.detectionApproach}, ${model.postprocessing}), ` +
    `${model.specs.paramsM}M params, ${model.specs.flopsG} GFLOPs. ` +
    (model.inLibreYOLO
      ? `Available in ${LIBREYOLO.name}, the ${LIBREYOLO.libraryLicense}-licensed open-source library, free for commercial use.`
      : `Planned for ${LIBREYOLO.name}.`);

  const sameAs = [family?.paper?.url, family?.originalRepo].filter(Boolean) as string[];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#libreyolo`,
        name: LIBREYOLO.name,
        url: LIBREYOLO.github,
        sameAs: [LIBREYOLO.github],
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${pageUrl}#model`,
        name: model.displayName,
        description,
        url: pageUrl,
        applicationCategory: "Computer vision: object detection",
        programmingLanguage: "Python",
        license: licenseValue(model.license),
        datePublished: model.releaseDate,
        codeRepository: family?.originalRepo,
        ...(model.inLibreYOLO ? { isPartOf: { "@id": `${url}#libreyolo-library` } } : {}),
        author: family?.organization
          ? { "@type": "Organization", name: family.organization }
          : { "@id": `${url}#libreyolo` },
        producer: { "@id": `${url}#libreyolo` },
        ...(sameAs.length ? { sameAs } : {}),
        additionalProperty: properties.map((p) => ({
          "@type": "PropertyValue",
          name: p.name,
          value: p.value,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
