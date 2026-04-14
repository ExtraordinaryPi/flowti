import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Spin, Tag, Space, Typography, App as AntApp,
  Tooltip, Empty, Badge, Segmented,
} from 'antd';
import {
  ReloadOutlined, CheckCircleFilled, ClockCircleOutlined,
  ExclamationCircleFilled, FileImageOutlined, CheckOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import { portfolioApi } from '../api/portfolioApi';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import type { PortfolioScan, ScanQuestionElement, ScanEntryValue } from '../types/scan';

const { Text } = Typography;

// ─── Review-State-Metadaten ───────────────────────────────────────────────────

const REVIEW_STATE_ORDER = ['NEEDS_REVIEW', 'EMPTY', 'EMPTY_WITH_MATRICULATION', 'REVIEWED'];

const REVIEW_META: Record<string, { label: string; color: string }> = {
  NEEDS_REVIEW:              { label: 'Prüfbedarf',          color: '#ff4d4f' },
  EMPTY:                     { label: 'Nicht geprüft',       color: '#faad14' },
  EMPTY_WITH_MATRICULATION:  { label: 'Nicht geprüft (Mtr)', color: '#fa8c16' },
  REVIEWED:                  { label: 'Geprüft',             color: '#52c41a' },
};

function ReviewIcon({ state, style }: { state?: string; style?: React.CSSProperties }) {
  if (state === 'REVIEWED')
    return <CheckCircleFilled style={{ color: '#52c41a', ...style }} />;
  if (state === 'NEEDS_REVIEW')
    return <ExclamationCircleFilled style={{ color: '#ff4d4f', ...style }} />;
  return <ClockCircleOutlined style={{ color: '#faad14', ...style }} />;
}

// ─── Entry-Value-Farben ───────────────────────────────────────────────────────

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

// ─── Bild-Viewer (natives Canvas, CSS-Skalierung) ────────────────────────────
//
// Strategie: Canvas wird in nativer Bildauflösung gezeichnet (canvas.width =
// img.naturalWidth). CSS übernimmt das Runterskalieren via width:100%.
// Dadurch passt das Overlay immer exakt, unabhängig vom Layout-Timing.

function ScanValidationViewer({
  scanId,
  questionElements,
  entryValues,
  selectedId,
  onEntryClick,
}: {
  scanId: number;
  questionElements: ScanQuestionElement[];
  entryValues: ScanEntryValue[];
  selectedId: number | null;
  onEntryClick: (id: number | null) => void;
}) {
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

  // Zeichnen in nativer Auflösung — kein Größen-Timing-Problem
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

    // Y-Achse ist invertiert: API liefert y=0 unten, y=1 oben (math. KS).
    // Canvas hat y=0 oben → Umrechnung: canvasY = H - (y * H) - (height * H)
    const canvasY = (y: number, h: number) => H - y * H - h * H;

    // Fragen — dünner gelber Rahmen
    questionElements.forEach(({ x, y, width, height }) => {
      ctx.strokeStyle = 'rgba(250,173,20,0.55)';
      ctx.lineWidth = Math.max(1, W * 0.001);
      ctx.strokeRect(x * W, canvasY(y, height), width * W, height * H);
    });

    // Antwort-Boxen
    entryValues.filter((e) => e.representationType === 'CHECK').forEach((ev) => {
      const { id, x, y, width, height, value } = ev;
      const isSelected = id === selectedId;
      ctx.fillStyle = isSelected ? 'rgba(22,119,255,0.2)' : (ENTRY_FILL[value] ?? ENTRY_FILL.UNCHECKED);
      ctx.fillRect(x * W, canvasY(y, height), width * W, height * H);
      ctx.strokeStyle = isSelected ? '#1677ff' : (ENTRY_STROKE[value] ?? '#d9d9d9');
      ctx.lineWidth = isSelected ? Math.max(3, W * 0.0015) : Math.max(2, W * 0.001);
      ctx.strokeRect(x * W, canvasY(y, height), width * W, height * H);
    });
  }, [imgEl, questionElements, entryValues, selectedId]);

  // Klick: CSS-Displaygröße → normalisierte Koordinaten (Y invertieren!)
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    // ny in Canvas-KS (0=oben) → in API-KS umrechnen (0=unten): apiNy = 1 - ny
    const apiNy = 1 - (e.clientY - rect.top) / rect.height;
    const hit = entryValues.find(
      ({ x, y, width, height, representationType }) =>
        representationType === 'CHECK' &&
        nx >= x && nx <= x + width &&
        apiNy >= y && apiNy <= y + height,
    );
    onEntryClick(hit?.id ?? null);
  };

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }
  if (!imgEl) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileImageOutlined style={{ fontSize: 48, color: '#bbb' }} /></div>;
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

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

interface Props {
  portfolioId: number;
}

export function ScanValidationTab({ portfolioId }: Props) {
  const { modal, notification } = AntApp.useApp();

  const [scans, setScans] = useState<PortfolioScan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<PortfolioScan | null>(null);
  const [questionElements, setQuestionElements] = useState<ScanQuestionElement[]>([]);
  const [entryValues, setEntryValues] = useState<ScanEntryValue[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'open' | 'reviewed'>('all');

  // ── Laden ──

  const loadScans = useCallback(async () => {
    setScansLoading(true);
    try {
      const result = await portfolioApi.getValidScans(portfolioId) as unknown;
      setScans(Array.isArray(result) ? result : (result as { content?: PortfolioScan[] })?.content ?? []);
    } catch {
      setScans([]);
    } finally {
      setScansLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { loadScans(); }, [loadScans]);

  const selectScan = useCallback(async (scan: PortfolioScan) => {
    setSelectedScan(scan);
    setSelectedEntryId(null);
    setQuestionElements([]);
    setEntryValues([]);
    setDetailLoading(true);
    try {
      const [qe, ev] = await Promise.all([
        rawdataPaperbasedApi.getBoundElements(scan.id),
        rawdataPaperbasedApi.getEntryValues(scan.id),
      ]);
      const toArray = <T,>(v: unknown): T[] =>
        Array.isArray(v) ? v : (v as { content?: T[] })?.content ?? [];
      setQuestionElements(toArray(qe));
      setEntryValues(toArray(ev));
    } catch { /* overlay optional */ } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Antwort-Wert ändern ──

  const updateEntry = async (value: string) => {
    if (!selectedScan || selectedEntryId === null) return;
    setActionLoading(true);
    try {
      await rawdataPaperbasedApi.updateEntryValue(selectedScan.id, selectedEntryId, { value });
      setEntryValues((prev) => prev.map((e) => e.id === selectedEntryId ? { ...e, value } : e));
    } catch (e: unknown) {
      notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Scan annehmen (→ REVIEWED) ──

  const acceptScan = () => {
    if (!selectedScan) return;
    modal.confirm({
      title: `Scan „${selectedScan.name ?? selectedScan.id}" als geprüft markieren?`,
      okText: 'Annehmen',
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          const updated = await portfolioApi.updateValidScan(portfolioId, selectedScan.id, { scanReviewState: 'REVIEWED' });
          setSelectedScan(updated);
          setScans((prev) => prev.map((s) => s.id === selectedScan.id ? { ...s, scanReviewState: 'REVIEWED' } : s));
          notification.success({ message: 'Scan als geprüft markiert' });
        } catch (e: unknown) {
          notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
        }
      },
    });
  };

  // ── Fehler-Navigation ──

  const checkEntries = entryValues.filter((e) => e.representationType === 'CHECK');
  const problemEntries = checkEntries.filter((e) => e.value !== e.computedValue && e.computedValue !== undefined);

  const navigateProblem = (dir: 'prev' | 'next') => {
    const pool = problemEntries.length > 0 ? problemEntries : checkEntries;
    if (pool.length === 0) return;
    const idx = pool.findIndex((e) => e.id === selectedEntryId);
    const next = dir === 'next'
      ? (idx + 1) % pool.length
      : (idx - 1 + pool.length) % pool.length;
    setSelectedEntryId(pool[next].id);
  };

  // ── Listen-Daten ──

  const needsReviewCount = scans.filter((s) => s.scanReviewState === 'NEEDS_REVIEW').length;
  const openCount = scans.filter((s) => s.scanReviewState !== 'REVIEWED').length;
  const reviewedCount = scans.filter((s) => s.scanReviewState === 'REVIEWED').length;

  const filteredScans = scans
    .filter((s) => {
      if (listFilter === 'open')     return s.scanReviewState !== 'REVIEWED';
      if (listFilter === 'reviewed') return s.scanReviewState === 'REVIEWED';
      return true;
    })
    .sort((a, b) => {
      const ia = REVIEW_STATE_ORDER.indexOf(a.scanReviewState ?? '');
      const ib = REVIEW_STATE_ORDER.indexOf(b.scanReviewState ?? '');
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // ── Gewählte Entry ──

  const selectedEntry = entryValues.find((e) => e.id === selectedEntryId) ?? null;

  // ── Render ──

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 8 }}>

      {/* ── Scan-Liste ── */}
      <div style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden',
      }}>
        {/* Zähler */}
        <div style={{
          display: 'flex', gap: 6, padding: '6px 8px', flexShrink: 0,
          borderBottom: '1px solid #f0f0f0', background: '#fafafa', flexWrap: 'wrap',
        }}>
          <Badge count={needsReviewCount} showZero color="#ff4d4f" overflowCount={9999}>
            <Tag style={{ margin: 0, fontSize: 10, cursor: 'default' }}>Prüfbedarf</Tag>
          </Badge>
          <Badge count={openCount} showZero color="#faad14" overflowCount={9999}>
            <Tag style={{ margin: 0, fontSize: 10, cursor: 'default' }}>Offen</Tag>
          </Badge>
          <Badge count={reviewedCount} showZero color="#52c41a" overflowCount={9999}>
            <Tag style={{ margin: 0, fontSize: 10, cursor: 'default' }}>Geprüft</Tag>
          </Badge>
        </div>

        {/* Filter */}
        <div style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <Segmented
            size="small"
            block
            value={listFilter}
            onChange={(v) => setListFilter(v as typeof listFilter)}
            options={[
              { label: 'Alle', value: 'all' },
              { label: 'Offen', value: 'open' },
              { label: 'Geprüft', value: 'reviewed' },
            ]}
          />
        </div>

        {/* Toolbar */}
        <div style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadScans} loading={scansLoading} block>
            Aktualisieren
          </Button>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
          {scansLoading ? (
            <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
          ) : filteredScans.length === 0 ? (
            <Empty description="Keine Scans" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: 16 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredScans.map((scan) => {
                const isSelected = selectedScan?.id === scan.id;
                const meta = REVIEW_META[scan.scanReviewState ?? ''];
                return (
                  <Tooltip
                    key={scan.id}
                    title={
                      <div>
                        <div>{meta?.label ?? scan.scanReviewState}</div>
                        {scan.examineeFirstName && (
                          <div style={{ opacity: 0.85 }}>{scan.examineeFirstName} {scan.examineeLastName}</div>
                        )}
                        {scan.problemCount !== undefined && scan.problemCount > 0 && (
                          <div style={{ color: '#ff7875' }}>{scan.problemCount} Problem{scan.problemCount !== 1 ? 'e' : ''}</div>
                        )}
                      </div>
                    }
                    placement="right"
                    mouseEnterDelay={0.4}
                  >
                    <div
                      onClick={() => selectScan(scan)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 6px', borderRadius: 4,
                        cursor: 'pointer', userSelect: 'none',
                        background: isSelected ? '#e6f4ff' : undefined,
                        borderLeft: isSelected ? '2px solid #1677ff' : '2px solid transparent',
                      }}
                    >
                      <ReviewIcon state={scan.scanReviewState} style={{ fontSize: 12, flexShrink: 0 }} />
                      <span style={{
                        fontSize: 11, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {scan.nameReduced ?? scan.name ?? `#${scan.id}`}
                      </span>
                      {(scan.problemCount ?? 0) > 0 && (
                        <Badge count={scan.problemCount} color="#ff4d4f" size="small" overflowCount={99} />
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bild-Viewer ── */}
      {selectedScan ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Scan-Aktionsleiste */}
          <Space style={{ marginBottom: 6, flexShrink: 0 }} wrap>
            <Space size={4}>
              <ReviewIcon state={selectedScan.scanReviewState} style={{ fontSize: 14 }} />
              <Text style={{ fontSize: 12 }}>
                {REVIEW_META[selectedScan.scanReviewState ?? '']?.label ?? selectedScan.scanReviewState ?? '–'}
              </Text>
            </Space>
            {selectedScan.examineeFirstName && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {selectedScan.examineeFirstName} {selectedScan.examineeLastName}
              </Text>
            )}
            <Tooltip title="Vorheriges Problem">
              <Button size="small" icon={<LeftOutlined />} onClick={() => navigateProblem('prev')} disabled={checkEntries.length === 0} />
            </Tooltip>
            <Tooltip title="Nächstes Problem">
              <Button size="small" icon={<RightOutlined />} onClick={() => navigateProblem('next')} disabled={checkEntries.length === 0} />
            </Tooltip>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={acceptScan}
              disabled={selectedScan.scanReviewState === 'REVIEWED'}
            >
              Scan annehmen
            </Button>
          </Space>

          {detailLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            <ScanValidationViewer
              key={selectedScan.id}
              scanId={selectedScan.id}
              questionElements={questionElements}
              entryValues={entryValues}
              selectedId={selectedEntryId}
              onEntryClick={setSelectedEntryId}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Space direction="vertical" align="center">
            <FileImageOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Scan aus der Liste auswählen</Text>
          </Space>
        </div>
      )}

      {/* ── Rechtes Panel: Legende + Aktion ── */}
      <div style={{
        width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
        padding: '8px 10px', borderLeft: '1px solid #f0f0f0',
      }}>

        {/* Legende */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Legende</Text>
          {[
            { value: 'UNCHECKED', label: 'Ungeprüft',  color: '#d9d9d9' },
            { value: 'CHECKED',   label: 'Angekreuzt', color: '#52c41a' },
            { value: 'CORRECTED', label: 'Korrigiert', color: '#fa8c16' },
          ].map(({ value, label, color }) => (
            <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
              <Text style={{ fontSize: 11 }}>{label}</Text>
            </div>
          ))}
        </div>

        {/* Antwort-Aktion */}
        {selectedEntry && (
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Markierung setzen</Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(['UNCHECKED', 'CHECKED', 'CORRECTED'] as const).map((v) => (
                <Button
                  key={v}
                  size="small"
                  block
                  loading={actionLoading}
                  type={selectedEntry.value === v ? 'primary' : 'default'}
                  style={selectedEntry.value === v ? undefined : { borderColor: ENTRY_STROKE[v], color: ENTRY_STROKE[v] }}
                  onClick={() => updateEntry(v)}
                >
                  {v === 'UNCHECKED' ? 'Ungeprüft' : v === 'CHECKED' ? 'Angekreuzt' : 'Korrigiert'}
                </Button>
              ))}
            </Space>
            {selectedEntry.computedValue && selectedEntry.computedValue !== selectedEntry.value && (
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 6 }}>
                KI: {selectedEntry.computedValue === 'CHECKED' ? 'Angekreuzt' : selectedEntry.computedValue === 'CORRECTED' ? 'Korrigiert' : 'Ungeprüft'}
              </Text>
            )}
          </div>
        )}

        {/* Hinweis wenn kein Kreuzchen gewählt */}
        {selectedScan && !selectedEntry && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            Kreuzchen im Bild anklicken zum Bearbeiten.
          </Text>
        )}
      </div>
    </div>
  );
}
