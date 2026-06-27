import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Benchmark Embed Showcase - Vision Analysis',
  description: 'JARVIS Tactical Benchmark Display - all embed widgets on one page',
};

const GOLD = '#f59e0b';
const RED = '#ef4444';
const STEEL = '#38bdf8';
const BG = '#03060f';

interface Panel {
  id: string;
  label: string;
  type: string;
  desc: string;
  src: string;
  height: number;
  span?: 1 | 2;
}

const panels: Panel[] = [
  {
    id: '01',
    label: 'PARETO // RTX 5070 Ti · TensorRT',
    type: 'PARETO',
    desc: 'YOLO families on consumer GPU - TensorRT acceleration',
    src: '/embed/pareto?models=yolov9t,yolov9s,yolov9m,yolov9c,yolox-nano,yolox-tiny,yolox-s,yolox-m,yolox-l,yolox-x&hw=nvidia_geforce_rtx_5070_ti&rt=tensorrt_fp32',
    height: 420,
    span: 2,
  },
  {
    id: '02',
    label: 'PARETO // Jetson Orin · TensorRT',
    type: 'PARETO',
    desc: 'Edge deployment - embedded GPU at the frontier',
    src: '/embed/pareto?models=yolov9t,yolov9s,yolov9m,yolov9c,yolox-nano,yolox-tiny,yolox-s,yolox-m,yolox-l,yolox-x&hw=jetson_orin&rt=tensorrt_fp32',
    height: 420,
    span: 2,
  },
  {
    id: '03',
    label: 'PARETO // YOLO-NAS · A100',
    type: 'PARETO',
    desc: 'Neural Architecture Search efficiency curve',
    src: '/embed/pareto?models=yolonas-s,yolonas-m,yolonas-l&hw=a100&rt=pytorch_fp32',
    height: 420,
    span: 1,
  },
  {
    id: '04',
    label: 'PARETO // YOLOv9 · RTX PyTorch',
    type: 'PARETO',
    desc: 'GELAN architecture scaling law',
    src: '/embed/pareto?models=yolov9t,yolov9s,yolov9m,yolov9c&hw=nvidia_geforce_rtx_5070_ti&rt=pytorch_fp32',
    height: 420,
    span: 1,
  },
  {
    id: '05',
    label: 'MODEL CARD // YOLO-NAS-L',
    type: 'MODEL CARD',
    desc: 'Flagship NAS-optimized detector',
    src: '/embed/model/yolonas-l',
    height: 280,
    span: 1,
  },
  {
    id: '06',
    label: 'MODEL CARD // YOLOv9-C',
    type: 'MODEL CARD',
    desc: 'GELAN-C: the compact compact killer',
    src: '/embed/model/yolov9c',
    height: 280,
    span: 1,
  },
  {
    id: '07',
    label: 'FAMILY TABLE // YOLOv9 · RTX TensorRT',
    type: 'FAMILY TABLE',
    desc: 'All 4 variants - pick your compute budget',
    src: '/embed/family/yolov9?hw=nvidia_geforce_rtx_5070_ti&rt=tensorrt_fp32',
    height: 320,
    span: 2,
  },
  {
    id: '08',
    label: 'FAMILY TABLE // YOLO-NAS · A100 PyTorch',
    type: 'FAMILY TABLE',
    desc: 'S · M · L - NAS variant selection matrix',
    src: '/embed/family/yolonas?hw=a100&rt=pytorch_fp32',
    height: 320,
    span: 2,
  },
  {
    id: '09',
    label: 'LEADERBOARD // RTX 5070 Ti · TensorRT · Top 10',
    type: 'LEADERBOARD',
    desc: 'Consumer GPU speed kings',
    src: '/embed/leaderboard?hw=nvidia_geforce_rtx_5070_ti&rt=tensorrt_fp32&limit=10',
    height: 400,
    span: 1,
  },
  {
    id: '10',
    label: 'SPEED BREAKDOWN // YOLOv9-C · RTX PyTorch',
    type: 'SPEED',
    desc: 'Pipeline timing: where does the time go?',
    src: '/embed/speed/yolov9c?hw=nvidia_geforce_rtx_5070_ti&rt=pytorch_fp32',
    height: 220,
    span: 1,
  },
  {
    id: '11',
    label: 'SCATTER // YOLO-NAS: accuracy vs parameters',
    type: 'SCATTER',
    desc: 'Where NAS models sit in the landscape - all others greyed out',
    src: '/embed/scatter?highlight=yolonas-s,yolonas-m,yolonas-l',
    height: 420,
    span: 2,
  },
  {
    id: '12',
    label: 'SCATTER // YOLOv9-C highlighted',
    type: 'SCATTER',
    desc: 'Single model protagonist view',
    src: '/embed/scatter?highlight=yolov9c',
    height: 420,
    span: 1,
  },
  {
    id: '13',
    label: 'SCATTER // YOLOv9 family curve',
    type: 'SCATTER',
    desc: 'Full YOLOv9 scaling curve vs landscape',
    src: '/embed/scatter?highlight=yolov9t,yolov9s,yolov9m,yolov9c',
    height: 420,
    span: 1,
  },
];

export default function ShowcasePage() {
  return (
    <div
      style={{
        background: BG,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '32px 24px 48px' }}>
        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: 'monospace',
              fontSize: 32,
              fontWeight: 700,
              color: GOLD,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 4,
              textShadow: '0 0 20px rgba(245,158,11,0.4)',
            }}
          >
            VISION ANALYSIS // EMBED SYSTEM
          </h1>
          <div
            style={{
              width: 280,
              height: 1,
              background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
              margin: '10px auto 12px',
            }}
          />
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: STEEL,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            JARVIS TACTICAL BENCHMARK DISPLAY - STARK INDUSTRIES AI DIVISION
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
          }}
        >
          {panels.map(panel => (
            <div
              key={panel.id}
              style={{
                gridColumn: panel.span === 2 ? '1 / -1' : undefined,
                background: 'rgba(8,12,20,0.85)',
                border: `1px solid rgba(245,158,11,0.22)`,
                borderRadius: 6,
                padding: '12px 14px 14px',
                boxShadow: '0 0 12px rgba(245,158,11,0.3)',
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: GOLD,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}
                >
                  [{panel.id}] {panel.label}
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  color: '#475569',
                  marginBottom: 10,
                  letterSpacing: '0.03em',
                }}
              >
                {panel.desc}
              </p>
              <iframe
                src={panel.src}
                height={panel.height}
                width="100%"
                loading="lazy"
                style={{ border: 'none', display: 'block', borderRadius: 3 }}
                title={`${panel.type} - ${panel.label}`}
              />
            </div>
          ))}
        </div>

        <footer
          style={{
            marginTop: 48,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 10,
            color: RED,
            letterSpacing: '0.1em',
            opacity: 0.65,
          }}
        >
          VISION ANALYSIS // BENCHMARK INTELLIGENCE SYSTEM // CLASSIFIED // STARK TECH
        </footer>
      </div>
    </div>
  );
}
