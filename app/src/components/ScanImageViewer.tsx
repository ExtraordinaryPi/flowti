import { useState, useEffect, useCallback, useRef } from 'react';
import { Spin } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import type { MarkerBarcodeEntry, ScanQuestionElement } from '../types/scan';
import { apiYToCanvas, apiRectYToCanvas } from '../utils/canvasUtils';

// ─── Canvas-Zeichnung ─────────────────────────────────────────────────────────

const CORNER_TYPES = ['UPPER_LEFT', 'UPPER_RIGHT', 'LOWER_LEFT', 'LOWER_RIGHT'];

function drawOverlays(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  markerEntries: MarkerBarcodeEntry[],
  questionElements: ScanQuestionElement[],
) {
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  if (w === 0 || h === 0) return;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  markerEntries.forEach(({ x, y, type }) => {
    const px = x * w;
    const py = apiYToCanvas(y, h);
    const isCorner = CORNER_TYPES.includes(type);
    const size = isCorner ? 16 : 12;
    ctx.strokeStyle = isCorner ? '#1677ff' : '#ff4d4f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px - size, py);
    ctx.lineTo(px + size, py);
    ctx.moveTo(px, py - size);
    ctx.lineTo(px, py + size);
    ctx.stroke();
    if (isCorner) {
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(22,119,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  questionElements.forEach(({ x, y, width, height, state }) => {
    ctx.strokeStyle = state === 'VALID' ? '#52c41a' : '#faad14';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * w, apiRectYToCanvas(y, height, h), width * w, height * h);
  });
}

// ─── Komponente ───────────────────────────────────────────────────────────────

interface Props {
  scanId: number;
  markerEntries: MarkerBarcodeEntry[];
  questionElements: ScanQuestionElement[];
}

export function ScanImageViewer({ scanId, markerEntries, questionElements }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setImgLoading(true);
    setBlobUrl(null);
    rawdataPaperbasedApi.getImage(scanId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => setImgLoading(false));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [scanId]);

  const redraw = useCallback(() => {
    if (imgRef.current && canvasRef.current) {
      drawOverlays(canvasRef.current, imgRef.current, markerEntries, questionElements);
    }
  }, [markerEntries, questionElements]);

  useEffect(() => { redraw(); }, [redraw]);

  // ResizeObserver: Canvas neu zeichnen wenn das Bild skaliert wird.
  // blobUrl als Dependency: erst wenn das <img> im DOM ist, ist imgRef.current verfügbar.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !blobUrl) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(img);
    return () => observer.disconnect();
  }, [redraw, blobUrl]);

  if (imgLoading && !blobUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileImageOutlined style={{ fontSize: 48, color: '#bbb' }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 4 }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={blobUrl}
          alt={`Scan ${scanId}`}
          style={{ display: 'block', maxWidth: '100%' }}
          onLoad={() => { setImgLoading(false); redraw(); }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}
