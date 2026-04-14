import { useState, useEffect, useRef } from 'react';
import { Spin } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import type { ScanQuestionElement, ScanEntryValue } from '../types/scan';
import { apiRectYToCanvas, mouseYToApiY } from '../utils/canvasUtils';

// ─── Farben ──────────────────────────────────────────────────────────────────

const ENTRY_FILL: Record<string, string> = {
  CHECKED:   'rgba(82,196,26,0.18)',
  CORRECTED: 'rgba(250,140,22,0.18)',
  UNCHECKED: 'rgba(0,0,0,0.04)',
};
const ENTRY_STROKE: Record<string, string> = {
  CHECKED:   '#52c41a',
  CORRECTED: '#fa8c16',
  UNCHECKED: '#d9d9d9',
};

// ─── Komponente ───────────────────────────────────────────────────────────────
//
// Strategie: Canvas wird in nativer Bildauflösung gezeichnet (canvas.width =
// img.naturalWidth). CSS übernimmt das Runterskalieren via width:100%.
// Dadurch passt das Overlay immer exakt, unabhängig vom Layout-Timing.

interface Props {
  scanId: number;
  questionElements: ScanQuestionElement[];
  entryValues: ScanEntryValue[];
  selectedId: number | null;
  onEntryClick: (id: number | null) => void;
}

export function ScanValidationViewer({
  scanId,
  questionElements,
  entryValues,
  selectedId,
  onEntryClick,
}: Props) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);

  // Bild laden
  useEffect(() => {
    setLoading(true);
    setImgEl(null);
    rawdataPaperbasedApi.getImage(scanId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const img = new window.Image();
        img.onload = () => { setImgEl(img); setLoading(false); };
        img.onerror = () => setLoading(false);
        img.src = url;
      })
      .catch(() => setLoading(false));
    return () => {
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [scanId]);

  // Canvas zeichnen (native Auflösung — kein Layout-Timing-Problem)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;

    const W = imgEl.naturalWidth;
    const H = imgEl.naturalHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgEl, 0, 0, W, H);

    // Fragen — dünner gelber Rahmen
    questionElements.forEach(({ x, y, width, height }) => {
      ctx.strokeStyle = 'rgba(250,173,20,0.55)';
      ctx.lineWidth = Math.max(1, W * 0.001);
      ctx.strokeRect(x * W, apiRectYToCanvas(y, height, H), width * W, height * H);
    });

    // Antwort-Boxen
    entryValues.filter((e) => e.representationType === 'CHECK').forEach((ev) => {
      const { id, x, y, width, height, value } = ev;
      const isSelected = id === selectedId;
      ctx.fillStyle = isSelected ? 'rgba(22,119,255,0.2)' : (ENTRY_FILL[value] ?? ENTRY_FILL.UNCHECKED);
      ctx.fillRect(x * W, apiRectYToCanvas(y, height, H), width * W, height * H);
      ctx.strokeStyle = isSelected ? '#1677ff' : (ENTRY_STROKE[value] ?? '#d9d9d9');
      ctx.lineWidth = isSelected ? Math.max(3, W * 0.0015) : Math.max(2, W * 0.001);
      ctx.strokeRect(x * W, apiRectYToCanvas(y, height, H), width * W, height * H);
    });
  }, [imgEl, questionElements, entryValues, selectedId]);

  // Klick: CSS-Displaygröße → API-Koordinaten (Y invertieren)
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const apiNy = mouseYToApiY(e.clientY, rect.top, rect.height);
    const hit = entryValues.find(
      ({ x, y, width, height, representationType }) =>
        representationType === 'CHECK' &&
        nx >= x && nx <= x + width &&
        apiNy >= y && apiNy <= y + height,
    );
    onEntryClick(hit?.id ?? null);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!imgEl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileImageOutlined style={{ fontSize: 48, color: '#bbb' }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
      {/* width:100% → CSS skaliert den nativ-aufgelösten Canvas herunter */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer' }}
      />
    </div>
  );
}
