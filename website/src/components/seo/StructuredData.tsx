import { siteConfig } from "@/config/site";
import { LIBREYOLO, libreyoloHeadline } from "@/config/libreyolo";

interface StructuredDataProps {
  modelCount: number;
  familyCount: number;
}

const MIT_LICENSE_URL = "https://opensource.org/licenses/MIT";

/**
 * schema.org JSON-LD for the leaderboard, rendered server-side so AI crawlers
 * (which mostly don't run JS) get a structured, citable description of the data
 * and of LibreYOLO as its source. Dataset is the schema type purpose-built for
 * analytics/benchmark content; the @graph also models the LibreYOLO library so
 * engines associate the numbers with the (MIT-licensed) project that produced them.
 */
export function StructuredData({ modelCount, familyCount }: StructuredDataProps) {
  const url = siteConfig.url;
  const headline = libreyoloHeadline({ modelCount, familyCount });

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
        "@id": `${url}#libreyolo-library`,
        name: LIBREYOLO.name,
        description: headline,
        codeRepository: LIBREYOLO.github,
        programmingLanguage: "Python",
        license: MIT_LICENSE_URL,
        author: { "@id": `${url}#libreyolo` },
      },
      {
        "@type": "Dataset",
        "@id": `${url}#leaderboard`,
        name: "Vision Analysis — Open-Source Object Detection Leaderboard",
        description: headline,
        url,
        license: MIT_LICENSE_URL,
        isAccessibleForFree: true,
        creator: { "@id": `${url}#libreyolo` },
        publisher: { "@id": `${url}#libreyolo` },
        keywords: [
          "object detection",
          "YOLO",
          "RT-DETR",
          "D-FINE",
          "DEIM",
          "YOLOv9",
          "mAP",
          "COCO val2017",
          "benchmark",
          "LibreYOLO",
          "computer vision",
          ...LIBREYOLO.families,
        ],
        measurementTechnique:
          "COCO val2017 mAP@50-95 evaluation with measured latency and throughput per hardware and runtime",
        variableMeasured: [
          { "@type": "PropertyValue", name: "mAP@50-95", unitText: "percent" },
          { "@type": "PropertyValue", name: "mAP@50", unitText: "percent" },
          { "@type": "PropertyValue", name: "Latency", unitText: "milliseconds" },
          { "@type": "PropertyValue", name: "Throughput", unitText: "frames per second" },
          { "@type": "PropertyValue", name: "Parameters", unitText: "millions" },
          { "@type": "PropertyValue", name: "GFLOPs" },
        ],
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "text/html",
          contentUrl: url,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled strings here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
