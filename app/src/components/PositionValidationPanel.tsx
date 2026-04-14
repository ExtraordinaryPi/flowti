import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Spin, Tag, Space, Typography, App as AntApp,
  Tooltip, Empty, Table, InputNumber, Slider, Tabs, Dropdown, Segmented, Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  ReloadOutlined, DeleteOutlined, SyncOutlined, RotateRightOutlined,
  FileImageOutlined, CheckCircleFilled, CloseCircleFilled,
  WarningFilled, ClockCircleOutlined, CopyOutlined, DownOutlined,
} from '@ant-design/icons';
import { portfolioApi } from '../api/portfolioApi';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import type {
  PortfolioScan, MarkerBarcodeEntry, ScanQuestionElement, MarkerThresholds,
} from '../types/scan';

const { Text } = Typography;

// ─── State-Metadaten ──────────────────────────────────────────────────────────

type StateCategory = 'valid' | 'error' | 'warning' | 'neutral';

const STATE_META: Record<string, { label: string; category: StateCategory }> = {
  VALID:                                  { label: 'Gültig',              category: 'valid'    },
  UNPROCESSED:                            { label: 'Unverarbeitet',        category: 'neutral'  },
  RESET:                                  { label: 'Zurückgesetzt',        category: 'neutral'  },
  MARKER_NOT_FOUND:                       { label: 'Marker fehlt',         category: 'error'    },
  BARCODE_NOT_FOUND:                      { label: 'Barcode fehlt',        category: 'error'    },
  MARKER_MISMATCH:                        { label: 'Marker-Abweichung',    category: 'warning'  },
  BARCODE_FORMAT_MISMATCH:                { label: 'Barcode-Format',       category: 'warning'  },
  BARCODE_EXAM_ID_MISMATCH:               { label: 'Examen-ID falsch',     category: 'warning'  },
  BARCODE_EXAM_VARIANT_MISMATCH:          { label: 'Variante falsch',      category: 'warning'  },
  BARCODE_EXAMINEE_EXAM_ASSOCIATION_MISSING: { label: 'Zuweisung fehlt',   category: 'warning'  },
  BARCODE_EXAMINEE_ID_MISMATCH:           { label: 'Prüfling-ID falsch',   category: 'warning'  },
  BARCODE_EXAMINEE_PAGE_MISMATCH:         { label: 'Seite falsch',         category: 'warning'  },
  DUPLICATE:                              { label: 'Duplikat',             category: 'warning'  },
};

function stateCategory(state: string): StateCategory {
  return STATE_META[state]?.category ?? 'neutral';
}

function StateIcon({ state, style }: { state: string; style?: React.CSSProperties }) {
  const cat = stateCategory(state);
  if (cat === 'valid')   return <CheckCircleFilled  style={{ color: '#52c41a', ...style }} />;
  if (cat === 'error')   return <CloseCircleFilled  style={{ color: '#ff4d4f', ...style }} />;
  if (cat === 'warning') return <WarningFilled      style={{ color: '#faad14', ...style }} />;
  if (state === 'DUPLICATE') return <CopyOutlined   style={{ color: '#d48806', ...style }} />;
  return                        <ClockCircleOutlined style={{ color: '#bfbfbf', ...style }} />;
}

const STATE_ORDER = [
  'MARKER_NOT_FOUND', 'BARCODE_NOT_FOUND', 'MARKER_MISMATCH',
  'BARCODE_FORMAT_MISMATCH', 'BARCODE_EXAM_ID_MISMATCH',
  'BARCODE_EXAM_VARIANT_MISMATCH', 'BARCODE_EXAMINEE_EXAM_ASSOCIATION_MISSING',
  'BARCODE_EXAMINEE_ID_MISMATCH', 'BARCODE_EXAMINEE_PAGE_MISMATCH',
  'DUPLICATE', 'UNPROCESSED', 'RESET', 'VALID',
];

// ─── Canvas-Zeichnung ──────────────────────────────────────────────────────────

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

  const CORNER_TYPES = ['UPPER_LEFT', 'UPPER_RIGHT', 'LOWER_LEFT', 'LOWER_RIGHT'];

  markerEntries.forEach(({ x, y, type }) => {
    const px = x * w;
    const py = y * h;
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
    ctx.strokeRect(x * w, y * h, width * w, height * h);
  });
}

// ─── Bild-Viewer mit Canvas-Overlay ───────────────────────────────────────────

function ScanImageViewer({
  scanId,
  markerEntries,
  questionElements,
}: {
  scanId: number;
  markerEntries: MarkerBarcodeEntry[];
  questionElements: ScanQuestionElement[];
}) {
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
  // blobUrl als Dependency: erst wenn das <img> im DOM ist (blobUrl gesetzt),
  // ist imgRef.current verfügbar und der Observer kann angehängt werden.
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

// ─── Schwellenwert-Standardwerte ───────────────────────────────────────────────

const DEFAULT_THRESHOLDS: MarkerThresholds = {
  markerOffsetThreshold: 0.02,
  markerRatioThresholdLow: 0.8,
  markerRatioThresholdHigh: 1.2,
  markerAreaThresholdLow: 0.75,
  markerRectanglenessThreshold: 0.2,
};

const THRESHOLD_LABELS: Record<keyof MarkerThresholds, string> = {
  markerOffsetThreshold: 'Offset',
  markerRatioThresholdLow: 'Ratio min',
  markerRatioThresholdHigh: 'Ratio max',
  markerAreaThresholdLow: 'Fläche min',
  markerRectanglenessThreshold: 'Rechteckigkeit',
};

// ─── Hauptkomponente ───────────────────────────────────────────────────────────

interface Props {
  portfolioId: number;
}

export function PositionValidationPanel({ portfolioId }: Props) {
  const { modal, notification } = AntApp.useApp();

  const [scans, setScans] = useState<PortfolioScan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<PortfolioScan | null>(null);
  const [scanRefreshKey, setScanRefreshKey] = useState(0);
  const [markerEntries, setMarkerEntries] = useState<MarkerBarcodeEntry[]>([]);
  const [questionElements, setQuestionElements] = useState<ScanQuestionElement[]>([]);
  const [thresholds, setThresholds] = useState<MarkerThresholds>(DEFAULT_THRESHOLDS);
  const [warpX, setWarpX] = useState(0);
  const [warpY, setWarpY] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'invalid' | 'valid'>('all');

  // ── Scans laden ──

  const loadScans = useCallback(async () => {
    setScansLoading(true);
    try {
      const page = await portfolioApi.getAllScans(portfolioId, { size: 500 });
      setScans(page.content ?? []);
    } catch {
      setScans([]);
    } finally {
      setScansLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { loadScans(); }, [loadScans]);

  // ── Scan auswählen ──

  const selectScan = useCallback(async (scan: PortfolioScan) => {
    setSelectedScan(scan);
    setScanRefreshKey((k) => k + 1);
    setMarkerEntries([]);
    setQuestionElements([]);
    try {
      const [entries, elements] = await Promise.all([
        rawdataPaperbasedApi.getMarkerBarcodeEntries(scan.id),
        rawdataPaperbasedApi.getBoundElements(scan.id),
      ]);
      setMarkerEntries(entries);
      setQuestionElements(elements);
    } catch { /* Overlay-Daten optional */ }
  }, []);

  // ── Einzelne Scan-Aktionen ──

  const flipScan = async () => {
    if (!selectedScan) return;
    setActionLoading(true);
    try {
      await rawdataPaperbasedApi.flip(selectedScan.id);
      setScanRefreshKey((k) => k + 1);
      notification.success({ message: 'Scan gedreht' });
    } catch (e: unknown) {
      notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setActionLoading(false);
    }
  };

  const reprocessScan = async () => {
    if (!selectedScan) return;
    setActionLoading(true);
    try {
      await rawdataPaperbasedApi.reprocess(selectedScan.id, 'NONE');
      notification.success({ message: 'Scan wird verarbeitet' });
      await loadScans();
    } catch (e: unknown) {
      notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteScan = () => {
    if (!selectedScan) return;
    modal.confirm({
      title: 'Scan löschen?',
      okText: 'Löschen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await rawdataPaperbasedApi.delete(selectedScan.id);
          setSelectedScan(null);
          setMarkerEntries([]);
          setQuestionElements([]);
          await loadScans();
          notification.success({ message: 'Scan gelöscht' });
        } catch (e: unknown) {
          notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
        }
      },
    });
  };

  // ── Portfolio-Aktionen ──

  const reprocessInvalid = (mode: string) => {
    const labels: Record<string, string> = {
      NONE: 'Ungültige Scans neu verarbeiten?',
      OVERWRITE_VARIANT: 'Ungültige verarbeiten (Variante überschreiben)?',
      IGNORE_MARKER_MISMATCH: 'Ungültige verarbeiten (Marker-Mismatch ignorieren)?',
    };
    modal.confirm({
      title: labels[mode] ?? 'Verarbeiten?',
      okText: 'Verarbeiten',
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await portfolioApi.reprocessInvalid(portfolioId, mode);
          notification.success({ message: 'Scans werden verarbeitet' });
          await loadScans();
        } catch (e: unknown) {
          notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
        }
      },
    });
  };

  const applyThresholds = async (target: 'scan' | 'all' | 'invalid') => {
    setActionLoading(true);
    try {
      if (target === 'scan' && selectedScan) {
        await rawdataPaperbasedApi.updateMarkerThresholds(selectedScan.id, thresholds);
      } else if (target === 'all') {
        await portfolioApi.applyThresholdsAll(portfolioId, thresholds);
      } else if (target === 'invalid') {
        await portfolioApi.applyThresholdsInvalid(portfolioId, thresholds);
      }
      notification.success({ message: 'Schwellenwerte angewendet' });
    } catch (e: unknown) {
      notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setActionLoading(false);
    }
  };

  const applyWarp = async (target: 'scan' | 'all') => {
    setActionLoading(true);
    try {
      const params = { warpX, warpY };
      if (target === 'scan' && selectedScan) {
        await rawdataPaperbasedApi.applyWarp(selectedScan.id, params);
      } else if (target === 'all') {
        await portfolioApi.applyWarpAll(portfolioId, params);
      }
      notification.success({ message: 'Warp angewendet' });
    } catch (e: unknown) {
      notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Listendaten ──

  const validCount   = scans.filter((s) => s.state === 'VALID').length;
  const invalidCount = scans.filter((s) => s.state !== 'VALID').length;

  const filteredScans = scans
    .filter((s) => {
      if (listFilter === 'valid')   return s.state === 'VALID';
      if (listFilter === 'invalid') return s.state !== 'VALID';
      return true;
    })
    .sort((a, b) => {
      const ia = STATE_ORDER.indexOf(a.state ?? '');
      const ib = STATE_ORDER.indexOf(b.state ?? '');
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // ── Reprocess-Dropdown ──

  const reprocessMenuItems: MenuProps['items'] = [
    {
      key: 'OVERWRITE_VARIANT',
      label: 'Variante überschreiben',
      onClick: () => reprocessInvalid('OVERWRITE_VARIANT'),
    },
    {
      key: 'IGNORE_MARKER_MISMATCH',
      label: 'Marker-Mismatch ignorieren',
      onClick: () => reprocessInvalid('IGNORE_MARKER_MISMATCH'),
    },
  ];

  // ── Marker-Einträge-Spalten ──

  const entryColumns: ColumnsType<MarkerBarcodeEntry> = [
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (t: string) => <Text style={{ fontSize: 10 }}>{t}</Text>,
    },
    {
      title: 'Wert',
      dataIndex: 'value',
      key: 'value',
      render: (v: string) => <Text style={{ fontSize: 10 }}>{v ?? '–'}</Text>,
    },
  ];

  // ── Steuer-Tabs ──

  const controlTabs = [
    {
      key: 'entries',
      label: 'Einträge',
      children: (
        <Table<MarkerBarcodeEntry>
          size="small"
          dataSource={markerEntries}
          columns={entryColumns}
          rowKey={(r) => r.type}
          pagination={false}
          locale={{ emptyText: selectedScan ? 'Keine Einträge' : 'Scan auswählen' }}
        />
      ),
    },
    {
      key: 'thresholds',
      label: 'Schwellenwerte',
      children: (
        <div style={{ paddingTop: 4 }}>
          {(Object.keys(DEFAULT_THRESHOLDS) as (keyof MarkerThresholds)[]).map((key) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <Text style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 2 }}>
                {THRESHOLD_LABELS[key]}
              </Text>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                step={0.01}
                min={0}
                value={thresholds[key]}
                onChange={(v) => setThresholds((t) => ({ ...t, [key]: v ?? t[key] }))}
              />
            </div>
          ))}
          <Space wrap style={{ marginTop: 8 }}>
            <Button size="small" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>Reset</Button>
            <Button size="small" disabled={!selectedScan} loading={actionLoading} onClick={() => applyThresholds('scan')}>Scan</Button>
            <Button size="small" loading={actionLoading} onClick={() => applyThresholds('all')}>Alle</Button>
            <Button size="small" loading={actionLoading} onClick={() => applyThresholds('invalid')}>Ungültige</Button>
          </Space>
        </div>
      ),
    },
    {
      key: 'warp',
      label: 'Warp',
      children: (
        <div style={{ paddingTop: 4 }}>
          <Text style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Warp X: {warpX}</Text>
          <Slider min={-100} max={100} value={warpX} onChange={setWarpX} style={{ marginBottom: 16 }} />
          <Text style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Warp Y: {warpY}</Text>
          <Slider min={-100} max={100} value={warpY} onChange={setWarpY} style={{ marginBottom: 16 }} />
          <Space wrap>
            <Button size="small" onClick={() => { setWarpX(0); setWarpY(0); }}>Reset</Button>
            <Button size="small" disabled={!selectedScan} loading={actionLoading} onClick={() => applyWarp('scan')}>Scan</Button>
            <Button size="small" loading={actionLoading} onClick={() => applyWarp('all')}>Alle</Button>
          </Space>
        </div>
      ),
    },
  ];

  // ── Render ──

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <Space style={{ marginBottom: 8, flexShrink: 0 }} wrap>
        <Button size="small" icon={<ReloadOutlined />} onClick={loadScans} loading={scansLoading}>
          Aktualisieren
        </Button>
        <Dropdown.Button
          size="small"
          icon={<DownOutlined />}
          menu={{ items: reprocessMenuItems }}
          onClick={() => reprocessInvalid('NONE')}
        >
          <SyncOutlined /> Ungültige verarbeiten
        </Dropdown.Button>
      </Space>

      {/* Inhalt */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 8 }}>

        {/* Scan-Liste */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden',
        }}>
          {/* Zähler-Leiste */}
          <div style={{
            display: 'flex', gap: 6, padding: '6px 8px',
            borderBottom: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0,
          }}>
            <Badge count={validCount} showZero color="#52c41a" overflowCount={9999}>
              <Tag style={{ margin: 0, fontSize: 10, cursor: 'default' }}>Gültig</Tag>
            </Badge>
            <Badge count={invalidCount} showZero color="#ff4d4f" overflowCount={9999}>
              <Tag style={{ margin: 0, fontSize: 10, cursor: 'default' }}>Ungültig</Tag>
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
                { label: 'Ungültig', value: 'invalid' },
                { label: 'Gültig', value: 'valid' },
              ]}
            />
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
                  const label = STATE_META[scan.state ?? '']?.label ?? scan.state ?? '?';
                  return (
                    <Tooltip key={scan.id} title={label} placement="right" mouseEnterDelay={0.5}>
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
                        <StateIcon state={scan.state ?? ''} style={{ fontSize: 12, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {scan.name ?? `#${scan.id}`}
                        </span>
                        {scan.page !== undefined && (
                          <Text type="secondary" style={{ fontSize: 10, flexShrink: 0 }}>S.{scan.page}</Text>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bild + Steuerung */}
        {selectedScan ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Scan-Aktionen */}
            <Space style={{ marginBottom: 6, flexShrink: 0 }} wrap>
              <Space size={4}>
                <StateIcon state={selectedScan.state ?? ''} style={{ fontSize: 14 }} />
                <Text style={{ fontSize: 12 }}>
                  {STATE_META[selectedScan.state ?? '']?.label ?? selectedScan.state}
                </Text>
              </Space>
              {selectedScan.name && (
                <Text type="secondary" style={{ fontSize: 11 }}>{selectedScan.name}</Text>
              )}
              <Tooltip title="180° drehen">
                <Button size="small" icon={<RotateRightOutlined />} loading={actionLoading} onClick={flipScan}>
                  Drehen
                </Button>
              </Tooltip>
              <Tooltip title="Neu verarbeiten">
                <Button size="small" icon={<SyncOutlined />} loading={actionLoading} onClick={reprocessScan}>
                  Verarbeiten
                </Button>
              </Tooltip>
              <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoading} onClick={deleteScan}>
                Löschen
              </Button>
            </Space>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 8 }}>
              {/* Bild-Viewer */}
              <ScanImageViewer
                key={`${selectedScan.id}-${scanRefreshKey}`}
                scanId={selectedScan.id}
                markerEntries={markerEntries}
                questionElements={questionElements}
              />

              {/* Steuer-Panel */}
              <div style={{
                width: 220, flexShrink: 0, overflowY: 'auto',
                borderLeft: '1px solid #f0f0f0', paddingLeft: 8,
              }}>
                <Tabs size="small" items={controlTabs} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center">
              <FileImageOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>Scan aus der Liste auswählen</Text>
            </Space>
          </div>
        )}
      </div>
    </div>
  );
}
