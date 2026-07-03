import { MetadataRoute } from "next";
import { getModels, getHardware, getAllFamilies } from "@/lib/data";
import { publishedArticles } from "@/lib/articles";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;
  const models = getModels();
  const hardware = getHardware();
  const families = getAllFamilies();

  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hardware`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/parity`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/embed-builder`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  const familyPages = families.map((family) => ({
    url: `${baseUrl}/model/${family.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const modelPages = models.map((model) => ({
    url: `${baseUrl}/model/${model.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const hardwarePages = hardware.map((hw) => ({
    url: `${baseUrl}/hardware/${hw.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const articles = publishedArticles();
  const articlePages = articles.map((a) => ({
    url: `${baseUrl}/articles/${a.slug}`,
    lastModified: new Date(`${a.date}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const articleIndex = articles.length
    ? [
        {
          url: `${baseUrl}/articles`,
          lastModified: new Date(`${articles[0].date}T00:00:00Z`),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ]
    : [];

  return [
    ...staticPages,
    ...familyPages,
    ...modelPages,
    ...hardwarePages,
    ...articleIndex,
    ...articlePages,
  ];
}
