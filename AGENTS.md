# Agent Instructions

## Style
- Never use em dashes (Unicode U+2014, the long dash) anywhere: code, comments,
  docstrings, JSON, docs, commit messages, or generated prose. Use a plain ASCII
  hyphen (`-`), a colon, or rephrase the sentence.

## Licensing
- Cite and derive only from permissively licensed sources (MIT / Apache-2.0).
  Never reference, clone, or copy from GPL/AGPL projects (e.g. `WongKinYiu/yolov9`
  is GPL-3.0; Ultralytics is AGPL-3.0). For YOLOv9 use `MultimediaTechLab/YOLO`
  (MIT); for RT-DETR use `lyuwenyu/RT-DETR` / PaddleDetection (Apache-2.0).

## Production Deploys
- The Vercel project root directory is `website/`, even though benchmark
  submissions and generated data live at the repository root.
- A Git push can be insufficient when changes only touch root-level data or
  metadata. After pushing production data changes, run an explicit production
  deploy from the repository root: `npx vercel --prod --yes`.
- Before deploying, run `npm run build` from the repository root, or
  `npm run build` inside `website/`.
- After deploying, verify the live production URL, not just the Vercel preview
  URL. For the parity report, check `https://www.visionanalysis.org/parity`.
