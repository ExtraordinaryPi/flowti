import { useState, useEffect, useCallback } from 'react';
import {
  Button, Segmented, Space, Typography, App as AntApp,
  Spin, Empty, Pagination, Tooltip,
} from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { portfolioApi } from '../api/portfolioApi';
import type { ExamChecked, CheckValue } from '../types/examChecked';

const { Text } = Typography;

// ─── Konstanten ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 200;

const VALUE_NEXT: Record<CheckValue, CheckValue> = {
  UNCHECKED: 'CHECKED',
  CHECKED: 'CORRECTED',
  CORRECTED: 'UNCHECKED',
};

const VALUE_LABEL: Record<CheckValue, string> = {
  UNCHECKED: 'Ungeprüft',
  CHECKED: 'Angekreuzt',
  CORRECTED: 'Korrigiert',
};

const VALUE_STYLE: Record<CheckValue, React.CSSProperties> = {
  UNCHECKED: { border: '2px solid #d9d9d9' },
  CHECKED: { border: '2px solid #52c41a', boxShadow: '0 0 0 2px rgba(82,196,26,0.15)' },
  CORRECTED: { border: '2px solid #fa8c16', boxShadow: '0 0 0 2px rgba(250,140,22,0.15)' },
};

// ─── Undo-History (localStorage) ─────────────────────────────────────────────

type UndoAction =
  | { type: 'single'; id: number; previousValue: CheckValue }
  | { type: 'multi'; entries: { id: number; previousValue: CheckValue }[] };

function historyKey(portfolioId: number) {
  return `scan-checks-history-${portfolioId}`;
}

function readHistory(portfolioId: number): UndoAction[] {
  try { return JSON.parse(localStorage.getItem(historyKey(portfolioId)) ?? '[]'); }
  catch { return []; }
}

function writeHistory(portfolioId: number, history: UndoAction[]) {
  localStorage.setItem(historyKey(portfolioId), JSON.stringify(history.slice(-50)));
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

interface Props {
  portfolioId: number;
}

export function ScanChecksTab({ portfolioId }: Props) {
  const { modal, notification } = AntApp.useApp();

  const [items, setItems] = useState<ExamChecked[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CheckValue>('UNCHECKED');
  const [page, setPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [historyCount, setHistoryCount] = useState(() => readHistory(portfolioId).length);

  // ── Laden ──

  const load = useCallback(async (p = page, f = filter) => {
    setLoading(true);
    try {
      const result = await portfolioApi.getChecked(portfolioId, {
        value: f,
        page: p,
        limit: PAGE_SIZE,
      });
      setItems(result.content ?? []);
      setTotalElements(result.totalElements);
    } catch {
      setItems([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, page, filter]);

  useEffect(() => { load(); }, [load]);

  // ── History ──

  const pushHistory = useCallback((action: UndoAction) => {
    const h = readHistory(portfolioId);
    h.push(action);
    writeHistory(portfolioId, h);
    setHistoryCount(h.length);
  }, [portfolioId]);

  const popHistory = useCallback((): UndoAction | undefined => {
    const h = readHistory(portfolioId);
    const action = h.pop();
    writeHistory(portfolioId, h);
    setHistoryCount(h.length);
    return action;
  }, [portfolioId]);

  // ── Einzelklick: Wert weiterschalten ──

  const handleClick = async (item: ExamChecked) => {
    if (updatingIds.has(item.id)) return;
    const newValue = VALUE_NEXT[item.value];

    // Optimistisches Update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, value: newValue } : i));
    setUpdatingIds((prev) => new Set(prev).add(item.id));

    try {
      await portfolioApi.updateChecked(portfolioId, item.id, { value: newValue });
      pushHistory({ type: 'single', id: item.id, previousValue: item.value });
    } catch (e: unknown) {
      // Zurücksetzen bei Fehler
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, value: item.value } : i));
      notification.error({ message: e instanceof Error ? e.message : 'Fehler beim Speichern' });
    } finally {
      setUpdatingIds((prev) => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  // ── Seitenwert ändern (Bulk) ──

  const handleBulkChange = (newValue: CheckValue) => {
    if (items.length === 0) return;
    modal.confirm({
      title: `Alle ${items.length} Einträge auf „${VALUE_LABEL[newValue]}" setzen?`,
      okText: 'Ja',
      cancelText: 'Abbrechen',
      onOk: async () => {
        const entries = items.map((i) => ({ id: i.id, previousValue: i.value }));
        const ids = items.map((i) => i.id);
        try {
          await portfolioApi.changeCheckMarkPage(portfolioId, newValue, ids);
          pushHistory({ type: 'multi', entries });
          await load();
        } catch (e: unknown) {
          notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
        }
      },
    });
  };

  // ── Rückgängig ──

  const handleUndo = async () => {
    const action = popHistory();
    if (!action) {
      notification.info({ message: 'Kein Vorgang zum Rückgängigmachen' });
      return;
    }
    try {
      if (action.type === 'single') {
        await portfolioApi.updateChecked(portfolioId, action.id, { value: action.previousValue });
      } else {
        // Gruppenweise nach previousValue zurücksetzen
        const grouped = action.entries.reduce<Record<string, number[]>>((acc, e) => {
          (acc[e.previousValue] ??= []).push(e.id);
          return acc;
        }, {});
        await Promise.all(
          Object.entries(grouped).map(([val, ids]) =>
            portfolioApi.changeCheckMarkPage(portfolioId, val as CheckValue, ids)
          )
        );
      }
      await load();
      notification.success({ message: 'Rückgängig gemacht' });
    } catch (e: unknown) {
      // Bei Fehler Action wieder reinlegen
      pushHistory(action);
      notification.error({ message: e instanceof Error ? e.message : 'Fehler beim Rückgängigmachen' });
    }
  };

  // ── Filter / Pagination ──

  const handleFilterChange = (value: string | number) => {
    const f = value as CheckValue;
    setFilter(f);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  // ── Render ──

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Toolbar */}
      <Space wrap align="center">
        <Text style={{ fontSize: 13 }}>Filter:</Text>
        <Segmented
          options={[
            { label: VALUE_LABEL.UNCHECKED, value: 'UNCHECKED' },
            { label: VALUE_LABEL.CHECKED, value: 'CHECKED' },
            { label: VALUE_LABEL.CORRECTED, value: 'CORRECTED' },
          ]}
          value={filter}
          onChange={handleFilterChange}
        />
        <Tooltip title="Letzten Vorgang rückgängig machen">
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={historyCount === 0}
            onClick={handleUndo}
          >
            Rückgängig
          </Button>
        </Tooltip>

        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>Seitenwert:</Text>
        <Button.Group size="small">
          {(['UNCHECKED', 'CHECKED', 'CORRECTED'] as CheckValue[]).map((v) => (
            <Button
              key={v}
              disabled={items.length === 0}
              onClick={() => handleBulkChange(v)}
            >
              {VALUE_LABEL[v]}
            </Button>
          ))}
        </Button.Group>
      </Space>

      {/* Kachel-Raster */}
      <Spin spinning={loading}>
        {!loading && items.length === 0 ? (
          <Empty
            description={`Keine Einträge mit Status „${VALUE_LABEL[filter]}"`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: 8,
            background: '#fafafa',
            borderRadius: 6,
            border: '1px solid #f0f0f0',
            minHeight: 80,
          }}>
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                style={{
                  cursor: updatingIds.has(item.id) ? 'wait' : 'pointer',
                  borderRadius: 3,
                  overflow: 'hidden',
                  opacity: updatingIds.has(item.id) ? 0.5 : 1,
                  transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
                  ...VALUE_STYLE[item.value],
                }}
                title={VALUE_LABEL[item.value]}
              >
                <img
                  src={`data:image/png;base64,${item.image}`}
                  height={50}
                  style={{ display: 'block', verticalAlign: 'middle' }}
                  alt=""
                  draggable={false}
                />
              </div>
            ))}
          </div>
        )}
      </Spin>

      {/* Pagination */}
      {totalElements > 0 && (
        <Pagination
          current={page}
          pageSize={PAGE_SIZE}
          total={totalElements}
          onChange={handlePageChange}
          showSizeChanger={false}
          showTotal={(total, range) => `${range[0]}–${range[1]} von ${total}`}
          simple
        />
      )}
    </div>
  );
}
