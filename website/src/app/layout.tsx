import type { Metadata } from "next";
import { M_PLUS_2, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header, Footer, ThemeProvider, LibreyoloSnippet } from "@/components/layout";
import { SiteFeedback } from "@/components/feedback/SiteFeedback";
import type { SearchItem } from "@/components/layout/SearchDialog";
import { siteConfig } from "@/config/site";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getModels, getHardware } from "@/lib/data";

const mplus2 = M_PLUS_2({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "YOLO",
    "object detection",
    "benchmark",
    "computer vision",
    "mAP",
    "LibreYOLO",
    "YOLOv9",
    "YOLOX",
    "YOLOv8",
    "Ultralytics",
    "machine learning",
  ],
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  // OG/Twitter images intentionally omitted: the file-based opengraph-image.tsx
  // generators provide them (public/og-default.png does not exist).
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function buildSearchItems(): SearchItem[] {
  const modelItems: SearchItem[] = getModels().map((model) => ({
    label: model.displayName,
    sublabel: model.family,
    href: `/model/${model.id}`,
    group: "Models",
    family: model.family,
  }));
  const hardwareItems: SearchItem[] = getHardware().map((hw) => ({
    label: hw.displayName,
    sublabel: hw.specs.gpuName ?? hw.specs.cpuName,
    href: `/hardware/${hw.id}`,
    group: "Hardware",
  }));
  const pageItems: SearchItem[] = [
    { label: "Leaderboard", href: "/", group: "Pages" },
    { label: "Compare Models", href: "/compare", group: "Pages" },
    { label: "Hardware", href: "/hardware", group: "Pages" },
    { label: "Port Fidelity (Parity)", href: "/parity", group: "Pages" },
    { label: "Methodology", href: "/methodology", group: "Pages" },
    { label: "About", href: "/about", group: "Pages" },
  ];
  return [...modelItems, ...hardwareItems, ...pageItems];
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchItems = buildSearchItems();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${mplus2.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Header searchItems={searchItems} />
            <main className="flex-1">{children}</main>
            <LibreyoloSnippet />
            <Footer />
            <SiteFeedback />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
