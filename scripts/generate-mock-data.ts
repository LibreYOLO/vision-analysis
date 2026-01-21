/**
 * Mock Data Generator for Vision Analysis
 *
 * Generates realistic benchmark data for 35+ computer vision models
 * across multiple hardware configurations.
 *
 * Run with: npx tsx scripts/generate-mock-data.ts
 */

import * as fs from "fs";
import * as path from "path";

// Model definitions with base metrics from published papers
interface ModelDefinition {
  id: string;
  family: string;
  variant: string;
  displayName: string;
  baseMaP: number; // mAP@50-95 on COCO
  paramsM: number; // Parameters in millions
  flopsG: number; // GFLOPs
  baseInferenceMs: number; // Base inference time on A100 TensorRT
  nmsTime?: number; // Postprocess time (YOLOv10 has ~0)
  architecture: {
    type: "one-stage" | "two-stage" | "transformer";
    backbone: string;
    neck: string;
    head: string;
  };
  source: {
    provider: string;
    repo: string;
    weightsUrl: string;
    paperUrl?: string;
    codeUrl: string;
  };
  license: string;
  releaseDate: string;
  tags: string[];
  notes?: string;
}

const MODEL_DEFINITIONS: ModelDefinition[] = [
  // YOLOv8 family
  {
    id: "yolov8n",
    family: "yolov8",
    variant: "n",
    displayName: "YOLOv8-N",
    baseMaP: 37.3,
    paramsM: 3.2,
    flopsG: 8.7,
    baseInferenceMs: 1.5,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov8n",
      paperUrl: "https://arxiv.org/abs/2305.09972",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2023-01-10",
    tags: ["production-ready", "real-time", "edge-friendly"],
    notes: "Nano variant, best for edge deployment",
  },
  {
    id: "yolov8s",
    family: "yolov8",
    variant: "s",
    displayName: "YOLOv8-S",
    baseMaP: 44.9,
    paramsM: 11.2,
    flopsG: 28.6,
    baseInferenceMs: 2.8,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov8s",
      paperUrl: "https://arxiv.org/abs/2305.09972",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2023-01-10",
    tags: ["production-ready", "balanced"],
  },
  {
    id: "yolov8m",
    family: "yolov8",
    variant: "m",
    displayName: "YOLOv8-M",
    baseMaP: 50.2,
    paramsM: 25.9,
    flopsG: 78.9,
    baseInferenceMs: 5.2,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov8m",
      paperUrl: "https://arxiv.org/abs/2305.09972",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2023-01-10",
    tags: ["production-ready", "balanced"],
  },
  {
    id: "yolov8l",
    family: "yolov8",
    variant: "l",
    displayName: "YOLOv8-L",
    baseMaP: 52.9,
    paramsM: 43.7,
    flopsG: 165.2,
    baseInferenceMs: 8.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov8l",
      paperUrl: "https://arxiv.org/abs/2305.09972",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2023-01-10",
    tags: ["production-ready", "high-accuracy"],
  },
  {
    id: "yolov8x",
    family: "yolov8",
    variant: "x",
    displayName: "YOLOv8-X",
    baseMaP: 53.9,
    paramsM: 68.2,
    flopsG: 257.8,
    baseInferenceMs: 12.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov8x",
      paperUrl: "https://arxiv.org/abs/2305.09972",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2023-01-10",
    tags: ["production-ready", "highest-accuracy"],
    notes: "Largest YOLOv8 variant, best accuracy in the family",
  },

  // YOLOv9 family
  {
    id: "yolov9t",
    family: "yolov9",
    variant: "t",
    displayName: "YOLOv9-T",
    baseMaP: 38.3,
    paramsM: 2.0,
    flopsG: 7.7,
    baseInferenceMs: 1.4,
    architecture: {
      type: "one-stage",
      backbone: "GELAN",
      neck: "PGI",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov9t",
      paperUrl: "https://arxiv.org/abs/2402.13616",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-02-21",
    tags: ["programmable-gradient", "efficient"],
  },
  {
    id: "yolov9s",
    family: "yolov9",
    variant: "s",
    displayName: "YOLOv9-S",
    baseMaP: 46.8,
    paramsM: 7.2,
    flopsG: 26.7,
    baseInferenceMs: 2.5,
    architecture: {
      type: "one-stage",
      backbone: "GELAN",
      neck: "PGI",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov9s",
      paperUrl: "https://arxiv.org/abs/2402.13616",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-02-21",
    tags: ["programmable-gradient", "efficient"],
  },
  {
    id: "yolov9m",
    family: "yolov9",
    variant: "m",
    displayName: "YOLOv9-M",
    baseMaP: 51.4,
    paramsM: 20.1,
    flopsG: 76.8,
    baseInferenceMs: 5.0,
    architecture: {
      type: "one-stage",
      backbone: "GELAN",
      neck: "PGI",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov9m",
      paperUrl: "https://arxiv.org/abs/2402.13616",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-02-21",
    tags: ["programmable-gradient", "balanced"],
  },
  {
    id: "yolov9c",
    family: "yolov9",
    variant: "c",
    displayName: "YOLOv9-C",
    baseMaP: 53.0,
    paramsM: 25.5,
    flopsG: 102.8,
    baseInferenceMs: 6.8,
    architecture: {
      type: "one-stage",
      backbone: "GELAN",
      neck: "PGI",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov9c",
      paperUrl: "https://arxiv.org/abs/2402.13616",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-02-21",
    tags: ["programmable-gradient", "high-accuracy"],
  },
  {
    id: "yolov9e",
    family: "yolov9",
    variant: "e",
    displayName: "YOLOv9-E",
    baseMaP: 55.6,
    paramsM: 58.1,
    flopsG: 192.5,
    baseInferenceMs: 11.2,
    architecture: {
      type: "one-stage",
      backbone: "GELAN",
      neck: "PGI",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov9e",
      paperUrl: "https://arxiv.org/abs/2402.13616",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-02-21",
    tags: ["programmable-gradient", "highest-accuracy"],
    notes: "Highest accuracy YOLOv9 variant",
  },

  // YOLOv10 family (NMS-free!)
  {
    id: "yolov10n",
    family: "yolov10",
    variant: "n",
    displayName: "YOLOv10-N",
    baseMaP: 38.5,
    paramsM: 2.3,
    flopsG: 6.7,
    baseInferenceMs: 1.3,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10n",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "real-time", "edge-friendly"],
    notes: "No NMS required - fastest end-to-end",
  },
  {
    id: "yolov10s",
    family: "yolov10",
    variant: "s",
    displayName: "YOLOv10-S",
    baseMaP: 46.3,
    paramsM: 7.2,
    flopsG: 21.6,
    baseInferenceMs: 2.2,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10s",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "balanced"],
  },
  {
    id: "yolov10m",
    family: "yolov10",
    variant: "m",
    displayName: "YOLOv10-M",
    baseMaP: 51.1,
    paramsM: 15.4,
    flopsG: 59.1,
    baseInferenceMs: 4.2,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10m",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "balanced"],
  },
  {
    id: "yolov10b",
    family: "yolov10",
    variant: "b",
    displayName: "YOLOv10-B",
    baseMaP: 52.5,
    paramsM: 19.1,
    flopsG: 92.0,
    baseInferenceMs: 5.5,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10b",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "high-accuracy"],
  },
  {
    id: "yolov10l",
    family: "yolov10",
    variant: "l",
    displayName: "YOLOv10-L",
    baseMaP: 53.2,
    paramsM: 24.4,
    flopsG: 120.3,
    baseInferenceMs: 7.1,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10l",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "high-accuracy"],
  },
  {
    id: "yolov10x",
    family: "yolov10",
    variant: "x",
    displayName: "YOLOv10-X",
    baseMaP: 54.4,
    paramsM: 29.5,
    flopsG: 160.4,
    baseInferenceMs: 9.8,
    nmsTime: 0.1,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "NMS-Free",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov10x",
      paperUrl: "https://arxiv.org/abs/2405.14458",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-05-23",
    tags: ["nms-free", "highest-accuracy"],
    notes: "Best accuracy-speed tradeoff due to NMS-free design",
  },

  // YOLOv11 family
  {
    id: "yolov11n",
    family: "yolov11",
    variant: "n",
    displayName: "YOLOv11-N",
    baseMaP: 39.5,
    paramsM: 2.6,
    flopsG: 6.5,
    baseInferenceMs: 1.4,
    architecture: {
      type: "one-stage",
      backbone: "C3K2",
      neck: "SPPF",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov11n",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-09-30",
    tags: ["latest", "efficient"],
  },
  {
    id: "yolov11s",
    family: "yolov11",
    variant: "s",
    displayName: "YOLOv11-S",
    baseMaP: 47.0,
    paramsM: 9.4,
    flopsG: 21.5,
    baseInferenceMs: 2.4,
    architecture: {
      type: "one-stage",
      backbone: "C3K2",
      neck: "SPPF",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov11s",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-09-30",
    tags: ["latest", "balanced"],
  },
  {
    id: "yolov11m",
    family: "yolov11",
    variant: "m",
    displayName: "YOLOv11-M",
    baseMaP: 51.5,
    paramsM: 20.1,
    flopsG: 68.0,
    baseInferenceMs: 4.8,
    architecture: {
      type: "one-stage",
      backbone: "C3K2",
      neck: "SPPF",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov11m",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-09-30",
    tags: ["latest", "balanced"],
  },
  {
    id: "yolov11l",
    family: "yolov11",
    variant: "l",
    displayName: "YOLOv11-L",
    baseMaP: 53.4,
    paramsM: 25.3,
    flopsG: 87.0,
    baseInferenceMs: 6.2,
    architecture: {
      type: "one-stage",
      backbone: "C3K2",
      neck: "SPPF",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov11l",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-09-30",
    tags: ["latest", "high-accuracy"],
  },
  {
    id: "yolov11x",
    family: "yolov11",
    variant: "x",
    displayName: "YOLOv11-X",
    baseMaP: 54.7,
    paramsM: 56.9,
    flopsG: 195.0,
    baseInferenceMs: 10.5,
    architecture: {
      type: "one-stage",
      backbone: "C3K2",
      neck: "SPPF",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov11x",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "MIT",
    releaseDate: "2024-09-30",
    tags: ["latest", "highest-accuracy"],
  },

  // YOLO-NAS family
  {
    id: "yolo-nas-s",
    family: "yolo-nas",
    variant: "s",
    displayName: "YOLO-NAS-S",
    baseMaP: 47.5,
    paramsM: 12.2,
    flopsG: 32.8,
    baseInferenceMs: 3.1,
    architecture: {
      type: "one-stage",
      backbone: "NAS-Optimized",
      neck: "QSP",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolo-nas-s",
      paperUrl: "https://arxiv.org/abs/2302.06349",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-05-10",
    tags: ["nas-optimized", "efficient"],
    notes: "Neural Architecture Search designed by Deci AI",
  },
  {
    id: "yolo-nas-m",
    family: "yolo-nas",
    variant: "m",
    displayName: "YOLO-NAS-M",
    baseMaP: 51.5,
    paramsM: 31.9,
    flopsG: 87.5,
    baseInferenceMs: 5.8,
    architecture: {
      type: "one-stage",
      backbone: "NAS-Optimized",
      neck: "QSP",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolo-nas-m",
      paperUrl: "https://arxiv.org/abs/2302.06349",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-05-10",
    tags: ["nas-optimized", "balanced"],
  },
  {
    id: "yolo-nas-l",
    family: "yolo-nas",
    variant: "l",
    displayName: "YOLO-NAS-L",
    baseMaP: 52.2,
    paramsM: 44.5,
    flopsG: 121.2,
    baseInferenceMs: 7.5,
    architecture: {
      type: "one-stage",
      backbone: "NAS-Optimized",
      neck: "QSP",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolo-nas-l",
      paperUrl: "https://arxiv.org/abs/2302.06349",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-05-10",
    tags: ["nas-optimized", "high-accuracy"],
  },

  // RT-DETR family
  {
    id: "rtdetr-r18",
    family: "rtdetr",
    variant: "r18",
    displayName: "RT-DETR-R18",
    baseMaP: 46.5,
    paramsM: 20.0,
    flopsG: 60.0,
    baseInferenceMs: 4.8,
    architecture: {
      type: "transformer",
      backbone: "ResNet-18",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-r18",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms"],
    notes: "First real-time DETR, no NMS required",
  },
  {
    id: "rtdetr-r34",
    family: "rtdetr",
    variant: "r34",
    displayName: "RT-DETR-R34",
    baseMaP: 48.9,
    paramsM: 31.0,
    flopsG: 92.0,
    baseInferenceMs: 6.2,
    architecture: {
      type: "transformer",
      backbone: "ResNet-34",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-r34",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms"],
  },
  {
    id: "rtdetr-r50",
    family: "rtdetr",
    variant: "r50",
    displayName: "RT-DETR-R50",
    baseMaP: 53.1,
    paramsM: 42.0,
    flopsG: 136.0,
    baseInferenceMs: 8.5,
    architecture: {
      type: "transformer",
      backbone: "ResNet-50",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-r50",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms", "high-accuracy"],
  },
  {
    id: "rtdetr-r101",
    family: "rtdetr",
    variant: "r101",
    displayName: "RT-DETR-R101",
    baseMaP: 54.3,
    paramsM: 76.0,
    flopsG: 259.0,
    baseInferenceMs: 13.2,
    architecture: {
      type: "transformer",
      backbone: "ResNet-101",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-r101",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms", "highest-accuracy"],
  },
  {
    id: "rtdetr-l",
    family: "rtdetr",
    variant: "l",
    displayName: "RT-DETR-L",
    baseMaP: 53.0,
    paramsM: 32.0,
    flopsG: 110.0,
    baseInferenceMs: 7.2,
    architecture: {
      type: "transformer",
      backbone: "HGNetv2",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-l",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms", "efficient"],
  },
  {
    id: "rtdetr-x",
    family: "rtdetr",
    variant: "x",
    displayName: "RT-DETR-X",
    baseMaP: 54.8,
    paramsM: 67.0,
    flopsG: 234.0,
    baseInferenceMs: 12.8,
    architecture: {
      type: "transformer",
      backbone: "HGNetv2",
      neck: "HybridEncoder",
      head: "DETR",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/rtdetr-x",
      paperUrl: "https://arxiv.org/abs/2304.08069",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2023-04-17",
    tags: ["transformer", "no-nms", "highest-accuracy"],
    notes: "Often achieves highest mAP among real-time detectors",
  },

  // YOLOX family
  {
    id: "yolox-nano",
    family: "yolox",
    variant: "nano",
    displayName: "YOLOX-Nano",
    baseMaP: 25.8,
    paramsM: 0.9,
    flopsG: 1.1,
    baseInferenceMs: 0.8,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-nano",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["ultra-lightweight", "edge"],
  },
  {
    id: "yolox-tiny",
    family: "yolox",
    variant: "tiny",
    displayName: "YOLOX-Tiny",
    baseMaP: 32.8,
    paramsM: 5.1,
    flopsG: 6.5,
    baseInferenceMs: 1.2,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-tiny",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["lightweight", "edge"],
  },
  {
    id: "yolox-s",
    family: "yolox",
    variant: "s",
    displayName: "YOLOX-S",
    baseMaP: 40.5,
    paramsM: 9.0,
    flopsG: 26.8,
    baseInferenceMs: 2.4,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-s",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["balanced", "megvii"],
  },
  {
    id: "yolox-m",
    family: "yolox",
    variant: "m",
    displayName: "YOLOX-M",
    baseMaP: 46.9,
    paramsM: 25.3,
    flopsG: 73.8,
    baseInferenceMs: 5.0,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-m",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["balanced", "megvii"],
  },
  {
    id: "yolox-l",
    family: "yolox",
    variant: "l",
    displayName: "YOLOX-L",
    baseMaP: 49.7,
    paramsM: 54.2,
    flopsG: 155.6,
    baseInferenceMs: 9.2,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-l",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["high-accuracy", "megvii"],
  },
  {
    id: "yolox-x",
    family: "yolox",
    variant: "x",
    displayName: "YOLOX-X",
    baseMaP: 51.1,
    paramsM: 99.1,
    flopsG: 281.9,
    baseInferenceMs: 15.5,
    architecture: {
      type: "one-stage",
      backbone: "CSPDarknet",
      neck: "PAFPN",
      head: "Decoupled",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolox-x",
      paperUrl: "https://arxiv.org/abs/2107.08430",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "Apache-2.0",
    releaseDate: "2021-07-18",
    tags: ["highest-accuracy", "megvii"],
  },

  // YOLOv7 family
  {
    id: "yolov7-tiny",
    family: "yolov7",
    variant: "tiny",
    displayName: "YOLOv7-Tiny",
    baseMaP: 37.4,
    paramsM: 6.2,
    flopsG: 13.7,
    baseInferenceMs: 1.8,
    architecture: {
      type: "one-stage",
      backbone: "E-ELAN",
      neck: "SPPCSPC",
      head: "RepConv",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov7-tiny",
      paperUrl: "https://arxiv.org/abs/2207.02696",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "GPL-3.0",
    releaseDate: "2022-07-06",
    tags: ["edge-friendly", "efficient"],
  },
  {
    id: "yolov7",
    family: "yolov7",
    variant: "base",
    displayName: "YOLOv7",
    baseMaP: 51.4,
    paramsM: 36.9,
    flopsG: 104.7,
    baseInferenceMs: 7.0,
    architecture: {
      type: "one-stage",
      backbone: "E-ELAN",
      neck: "SPPCSPC",
      head: "RepConv",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov7",
      paperUrl: "https://arxiv.org/abs/2207.02696",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "GPL-3.0",
    releaseDate: "2022-07-06",
    tags: ["balanced", "widely-used"],
  },
  {
    id: "yolov7-x",
    family: "yolov7",
    variant: "x",
    displayName: "YOLOv7-X",
    baseMaP: 53.1,
    paramsM: 71.3,
    flopsG: 189.9,
    baseInferenceMs: 11.8,
    architecture: {
      type: "one-stage",
      backbone: "E-ELAN",
      neck: "SPPCSPC",
      head: "RepConv",
    },
    source: {
      provider: "LibreYOLO",
      repo: "Libre-YOLO/libreyolo",
      weightsUrl: "https://huggingface.co/Libre-YOLO/yolov7-x",
      paperUrl: "https://arxiv.org/abs/2207.02696",
      codeUrl: "https://github.com/Libre-YOLO/libreyolo",
    },
    license: "GPL-3.0",
    releaseDate: "2022-07-06",
    tags: ["high-accuracy"],
  },
];

// Hardware speed multipliers (relative to A100 TensorRT FP16)
const HARDWARE_MULTIPLIERS: Record<string, number> = {
  a100_tensorrt_fp16: 1.0,
  t4_tensorrt_fp16: 2.8,
  cpu_onnx: 25.0,
};

// Hardware definitions
const HARDWARE_DEFINITIONS = [
  {
    id: "a100_tensorrt_fp16",
    displayName: "NVIDIA A100 (TensorRT FP16)",
    category: "cloud_gpu" as const,
    specs: {
      gpuName: "NVIDIA A100-SXM4-80GB",
      vramGb: 80,
      fp16Tflops: 312,
      tdpWatts: 400,
    },
    providers: [
      { name: "RunPod", costPerHour: 1.89, url: "https://runpod.io" },
      { name: "Lambda", costPerHour: 1.99, url: "https://lambdalabs.com" },
      { name: "AWS p4d", costPerHour: 3.0, url: "https://aws.amazon.com" },
    ],
  },
  {
    id: "t4_tensorrt_fp16",
    displayName: "NVIDIA T4 (TensorRT FP16)",
    category: "cloud_gpu" as const,
    specs: {
      gpuName: "NVIDIA Tesla T4",
      vramGb: 16,
      fp16Tflops: 65,
      tdpWatts: 70,
    },
    providers: [
      { name: "GCP", costPerHour: 0.35, url: "https://cloud.google.com" },
      { name: "Lambda", costPerHour: 0.5, url: "https://lambdalabs.com" },
    ],
  },
  {
    id: "cpu_onnx",
    displayName: "CPU (ONNX Runtime)",
    category: "cpu" as const,
    specs: {
      gpuName: "Intel Xeon (8 cores)",
    },
    providers: [
      { name: "Any Cloud", costPerHour: 0.1, url: "#" },
    ],
  },
];

// Dataset definition
const DATASET_DEFINITIONS = [
  {
    id: "coco_val2017",
    displayName: "COCO val2017",
    task: "detection",
    stats: {
      numImages: 5000,
      numClasses: 80,
      numInstances: 36781,
    },
    license: "CC BY 4.0",
  },
];

// Generate benchmark result for a model on specific hardware
function generateBenchmarkResult(
  model: ModelDefinition,
  hardwareId: string,
  multiplier: number
): Record<string, unknown> {
  const nmsTime = model.nmsTime !== undefined ? model.nmsTime : 2.5;
  const preprocessMs = 1.0 + Math.random() * 0.5;
  const inferenceMs =
    model.baseInferenceMs * multiplier * (0.95 + Math.random() * 0.1);
  const postprocessMs = nmsTime * multiplier * (0.9 + Math.random() * 0.2);
  const totalMs = preprocessMs + inferenceMs + postprocessMs;

  // Calculate mAP variants with realistic relationships
  const mAP_50_95 = model.baseMaP + (Math.random() - 0.5) * 0.3;
  const mAP_50 = mAP_50_95 * 1.35 + (Math.random() - 0.5) * 0.5;
  const mAP_75 = mAP_50_95 * 1.08 + (Math.random() - 0.5) * 0.4;
  const mAP_small = mAP_50_95 * 0.68 + (Math.random() - 0.5) * 2;
  const mAP_medium = mAP_50_95 * 1.1 + (Math.random() - 0.5) * 1;
  const mAP_large = mAP_50_95 * 1.28 + (Math.random() - 0.5) * 1;

  return {
    model: model.id,
    family: model.family,
    variant: model.variant,
    dataset: "coco_val2017",
    hardware: hardwareId,
    exportFormat: hardwareId.includes("tensorrt")
      ? "tensorrt_fp16"
      : hardwareId.includes("onnx")
        ? "onnx"
        : "pytorch",
    batchSize: 1,
    inputSize: 640,

    mAP_50_95: Math.round(mAP_50_95 * 10) / 10,
    mAP_50: Math.round(mAP_50 * 10) / 10,
    mAP_75: Math.round(mAP_75 * 10) / 10,
    mAP_small: Math.round(mAP_small * 10) / 10,
    mAP_medium: Math.round(mAP_medium * 10) / 10,
    mAP_large: Math.round(mAP_large * 10) / 10,

    preprocessMs: Math.round(preprocessMs * 10) / 10,
    inferenceMs: Math.round(inferenceMs * 10) / 10,
    postprocessMs: Math.round(postprocessMs * 10) / 10,
    totalMs: Math.round(totalMs * 10) / 10,
    throughputFps: Math.round((1000 / totalMs) * 10) / 10,

    peakVramMb: Math.round(
      model.paramsM * 35 + model.flopsG * 2 + Math.random() * 200
    ),
    peakRamMb: Math.round(model.paramsM * 50 + 500 + Math.random() * 300),

    mAPPerGflop: Math.round((mAP_50_95 / model.flopsG) * 1000) / 1000,
    mAPPerMParams: Math.round((mAP_50_95 / model.paramsM) * 100) / 100,

    paramsM: model.paramsM,
    flopsG: model.flopsG,

    timestamp: new Date().toISOString(),
  };
}

// Generate model metadata
function generateModelMetadata(model: ModelDefinition) {
  return {
    id: model.id,
    displayName: model.displayName,
    family: model.family,
    variant: model.variant,
    task: "detection",
    architecture: model.architecture,
    specs: {
      paramsM: model.paramsM,
      flopsG: model.flopsG,
      inputSizeDefault: 640,
    },
    source: model.source,
    license: model.license,
    releaseDate: model.releaseDate,
    tags: model.tags,
    notes: model.notes,
  };
}

// Main execution
function main() {
  const dataDir = path.join(__dirname, "..", "data");
  const resultsDir = path.join(dataDir, "results", "coco_val2017", "detection");
  const metadataDir = path.join(dataDir, "metadata");

  // Ensure directories exist
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });

  console.log(`Generating mock data for ${MODEL_DEFINITIONS.length} models...`);

  // Generate benchmark results for each hardware
  for (const [hardwareId, multiplier] of Object.entries(HARDWARE_MULTIPLIERS)) {
    const results = MODEL_DEFINITIONS.map((model) =>
      generateBenchmarkResult(model, hardwareId, multiplier)
    );

    const filename = path.join(resultsDir, `${hardwareId}.json`);
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`  Created ${filename} (${results.length} models)`);
  }

  // Generate model metadata
  const models = MODEL_DEFINITIONS.map(generateModelMetadata);
  const modelsFile = path.join(metadataDir, "models.json");
  fs.writeFileSync(modelsFile, JSON.stringify({ models }, null, 2));
  console.log(`  Created ${modelsFile}`);

  // Generate hardware metadata
  const hardwareFile = path.join(metadataDir, "hardware.json");
  fs.writeFileSync(
    hardwareFile,
    JSON.stringify({ hardware: HARDWARE_DEFINITIONS }, null, 2)
  );
  console.log(`  Created ${hardwareFile}`);

  // Generate dataset metadata
  const datasetsFile = path.join(metadataDir, "datasets.json");
  fs.writeFileSync(
    datasetsFile,
    JSON.stringify({ datasets: DATASET_DEFINITIONS }, null, 2)
  );
  console.log(`  Created ${datasetsFile}`);

  console.log("\nMock data generation complete!");
  console.log(`Total models: ${MODEL_DEFINITIONS.length}`);
  console.log(`Hardware configs: ${Object.keys(HARDWARE_MULTIPLIERS).length}`);
}

main();
