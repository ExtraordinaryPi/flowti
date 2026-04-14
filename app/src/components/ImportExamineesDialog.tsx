import { useState, useCallback, useMemo } from 'react';
import {
  Modal, Upload, Segmented, Table, Select, Space, Button,
  Typography, Alert, App as AntApp, Steps, Tag,
} from 'antd';
import { InboxOutlined, CheckOutlined, SwapOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { ApiError } from '../api/client';

const { Text } = Typography;

// ─── Typen ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'conflicts';
type FieldMapping = 'id' | 'firstName' | 'lastName' | 'attr' | 'ignore';
type Encoding = 'AUTO' | 'UTF_8' | 'ISO_8859_1';

interface ColumnMap {
  csvKey: string;
  field: FieldMapping;
}

interface ExamineePayload {
  id: number;
  identifier: string;
  firstName: string;
  lastName: string;
  attributes: Record<string, string>;
  variants: Record<string, never>;
  behaviour: 'NEW' | 'KEEP' | 'OVERWRITE';
}

interface ConflictEntry {
  identifier: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string>;
}

interface ConflictRow extends ConflictEntry {
  key: string;
  behaviour: 'KEEP' | 'OVERWRITE';
}

interface Props {
  open: boolean;
  portfolioId: number;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

/** Automatische Spaltenzuordnung anhand des Spaltennamens */
function guessField(key: string): FieldMapping {
  const k = key.toLowerCase();
  if (/id|matrikel|identifier|kennung|nummer/.test(k)) return 'id';
  if (/first|vor|given|fname|name1/.test(k)) return 'firstName';
  if (/last|nach|family|lname|name2|surname/.test(k)) return 'lastName';
  return 'attr';
}

const ENCODING_OPTIONS: { label: string; value: Encoding }[] = [
  { label: 'AUTO', value: 'AUTO' },
  { label: 'UTF-8', value: 'UTF_8' },
  { label: 'ISO 8859-1', value: 'ISO_8859_1' },
];

const FIELD_OPTIONS = [
  { label: 'ID (Pflicht)', value: 'id' },
  { label: 'Vorname', value: 'firstName' },
  { label: 'Nachname', value: 'lastName' },
  { label: 'Als Attribut', value: 'attr' },
  { label: 'Ignorieren', value: 'ignore' },
];

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export function ImportExamineesDialog({ open, portfolioId, onClose, onSuccess }: Props) {
  const { notification } = AntApp.useApp();

  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);

  // Upload-Step
  const [file, setFile] = useState<UploadFile | null>(null);
  const [encoding, setEncoding] = useState<Encoding>('AUTO');

  // Mapping-Step
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [columnMaps, setColumnMaps] = useState<ColumnMap[]>([]);

  // Conflict-Step
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);

  // ── Reset ──

  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setEncoding('AUTO');
    setCsvData([]);
    setColumnMaps([]);
    setConflicts([]);
    onClose();
  }, [onClose]);

  // ── Step 1: Datei hochladen → importTable ──

  const handleUpload = useCallback(async () => {
    if (!file?.originFileObj) {
      notification.warning({ message: 'Bitte eine Datei auswählen' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file.originFileObj);
      formData.append('filename', file.name);
      formData.append('encoding', encoding);

      const rows = await portfolioApi.importTable(formData);

      if (!rows.length) {
        notification.warning({ message: 'Die Datei enthält keine Daten' });
        return;
      }

      // Spalten aus dem ersten Datensatz ableiten
      const keys = Object.keys(rows[0]);
      setCsvData(rows);
      setColumnMaps(keys.map((k) => ({ csvKey: k, field: guessField(k) })));
      setStep('mapping');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Verarbeiten der Datei', description: msg });
    } finally {
      setLoading(false);
    }
  }, [file, encoding, notification]);

  // ── Step 2: Spalten zuordnen → importCsv ──

  const idColumn = useMemo(
    () => columnMaps.find((m) => m.field === 'id'),
    [columnMaps],
  );

  const handleImport = useCallback(async (payload: ExamineePayload[]) => {
    setLoading(true);
    try {
      await portfolioApi.importCsv(portfolioId, payload);
      handleClose();
      onSuccess();
      notification.success({ message: `${payload.length} Prüflinge importiert` });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        const errorData = e.data as { data?: { conflicts?: ConflictEntry[] } } | undefined;
        const conflictList = errorData?.data?.conflicts;
        if (conflictList?.length) {
          setConflicts(
            conflictList.map((c) => ({ ...c, key: c.identifier, behaviour: 'KEEP' as const })),
          );
          setStep('conflicts');
          setLoading(false);
          return;
        }
      }
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Import fehlgeschlagen', description: msg });
    } finally {
      setLoading(false);
    }
  }, [portfolioId, handleClose, onSuccess, notification]);

  const buildPayload = useCallback(
    (behaviourOverrides?: Map<string, 'KEEP' | 'OVERWRITE'>): ExamineePayload[] => {
      const idKey = columnMaps.find((m) => m.field === 'id')?.csvKey;
      const firstNameKey = columnMaps.find((m) => m.field === 'firstName')?.csvKey;
      const lastNameKey = columnMaps.find((m) => m.field === 'lastName')?.csvKey;
      const attrMaps = columnMaps.filter((m) => m.field === 'attr');

      return csvData.map((row, idx) => {
        const identifier = idKey ? row[idKey] ?? '' : '';
        const attributes: Record<string, string> = {};
        attrMaps.forEach(({ csvKey }) => {
          if (row[csvKey] !== undefined) attributes[csvKey] = row[csvKey];
        });

        const defaultBehaviour: 'NEW' | 'KEEP' | 'OVERWRITE' = 'NEW';
        const behaviour = behaviourOverrides?.get(identifier) ?? defaultBehaviour;

        return {
          id: -(idx + 1),
          identifier,
          firstName: firstNameKey ? row[firstNameKey] ?? '' : '',
          lastName: lastNameKey ? row[lastNameKey] ?? '' : '',
          attributes,
          variants: {},
          behaviour,
        };
      });
    },
    [csvData, columnMaps],
  );

  const handleMappingImport = useCallback(async () => {
    if (!idColumn) {
      notification.warning({ message: 'Bitte eine Spalte als ID zuordnen' });
      return;
    }
    await handleImport(buildPayload());
  }, [idColumn, handleImport, buildPayload, notification]);

  // ── Step 3: Konflikte lösen ──

  const handleConflictImport = useCallback(async () => {
    const overrides = new Map<string, 'KEEP' | 'OVERWRITE'>();
    conflicts.forEach((c) => overrides.set(c.identifier, c.behaviour));
    await handleImport(buildPayload(overrides));
  }, [conflicts, handleImport, buildPayload]);

  const setBulkBehaviour = (behaviour: 'KEEP' | 'OVERWRITE') => {
    setConflicts((prev) => prev.map((c) => ({ ...c, behaviour })));
  };

  // ─── Mapping-Tabelle ────────────────────────────────────────────────────

  const mappingColumns: ColumnsType<ColumnMap> = [
    {
      title: 'CSV-Spalte',
      dataIndex: 'csvKey',
      key: 'csvKey',
      width: 200,
      render: (key: string) => <Text code>{key}</Text>,
    },
    {
      title: 'Zuordnung',
      key: 'field',
      render: (_, record, idx) => (
        <Select
          value={record.field}
          options={FIELD_OPTIONS}
          style={{ width: 180 }}
          onChange={(val: FieldMapping) =>
            setColumnMaps((prev) =>
              prev.map((m, i) => (i === idx ? { ...m, field: val } : m)),
            )
          }
        />
      ),
    },
    {
      title: 'Vorschau (1. Zeile)',
      key: 'preview',
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {csvData[0]?.[record.csvKey] ?? '–'}
        </Text>
      ),
    },
  ];

  // ─── Konflikt-Tabelle ───────────────────────────────────────────────────

  const conflictColumns: ColumnsType<ConflictRow> = [
    { title: 'ID', dataIndex: 'identifier', key: 'identifier' },
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName', render: (v) => v ?? '–' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName', render: (v) => v ?? '–' },
    {
      title: 'Aktion',
      key: 'behaviour',
      width: 200,
      render: (_, record) => (
        <Segmented
          size="small"
          value={record.behaviour}
          options={[
            { label: 'Behalten', value: 'KEEP' },
            { label: 'Überschreiben', value: 'OVERWRITE' },
          ]}
          onChange={(val) =>
            setConflicts((prev) =>
              prev.map((c) =>
                c.key === record.key ? { ...c, behaviour: val as 'KEEP' | 'OVERWRITE' } : c,
              ),
            )
          }
        />
      ),
    },
  ];

  // ─── Footer je Step ──────────────────────────────────────────────────────

  const footer = useMemo(() => {
    if (step === 'upload') {
      return [
        <Button key="cancel" onClick={handleClose}>Abbrechen</Button>,
        <Button key="next" type="primary" loading={loading} onClick={handleUpload}>
          Weiter →
        </Button>,
      ];
    }
    if (step === 'mapping') {
      return [
        <Button key="back" onClick={() => setStep('upload')}>← Zurück</Button>,
        <Button key="cancel" onClick={handleClose}>Abbrechen</Button>,
        <Button
          key="import"
          type="primary"
          icon={<CheckOutlined />}
          loading={loading}
          disabled={!idColumn}
          onClick={handleMappingImport}
        >
          Importieren ({csvData.length} Zeilen)
        </Button>,
      ];
    }
    // conflicts
    return [
      <Button key="cancel" onClick={handleClose}>Abbrechen</Button>,
      <Button key="import" type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleConflictImport}>
        Mit Auswahl importieren
      </Button>,
    ];
  }, [step, loading, handleClose, handleUpload, handleMappingImport, handleConflictImport, idColumn, csvData.length]);

  // ─── Render ──────────────────────────────────────────────────────────────

  const stepItems = [
    { title: 'Datei hochladen' },
    { title: 'Spalten zuordnen' },
    ...(conflicts.length ? [{ title: 'Konflikte lösen' }] : []),
  ];

  const stepIndex = step === 'upload' ? 0 : step === 'mapping' ? 1 : 2;

  return (
    <Modal
      title="Prüflinge importieren (CSV / XLSX)"
      open={open}
      onCancel={handleClose}
      footer={footer}
      width={700}
      destroyOnHidden
    >
      <Steps
        current={stepIndex}
        size="small"
        items={stepItems}
        style={{ marginBottom: 24 }}
      />

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Upload.Dragger
            accept=".csv,.xlsx"
            maxCount={1}
            beforeUpload={() => false}
            fileList={file ? [file] : []}
            onChange={({ fileList }) => setFile(fileList[fileList.length - 1] ?? null)}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">CSV oder XLSX Datei hier ablegen</p>
            <p className="ant-upload-hint">Maximal eine Datei · .csv oder .xlsx</p>
          </Upload.Dragger>

          <div>
            <Text type="secondary" style={{ marginRight: 12 }}>Encoding:</Text>
            <Segmented
              value={encoding}
              options={ENCODING_OPTIONS}
              onChange={(v) => setEncoding(v as Encoding)}
            />
          </div>
        </Space>
      )}

      {/* ── Step 2: Spalten-Zuordnung ── */}
      {step === 'mapping' && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {!idColumn && (
            <Alert
              type="warning"
              showIcon
              message="Bitte mindestens eine Spalte als ID zuordnen"
            />
          )}
          <Table<ColumnMap>
            dataSource={columnMaps}
            columns={mappingColumns}
            rowKey="csvKey"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
          <Text type="secondary">
            <Tag color="blue">{csvData.length}</Tag> Zeilen werden importiert
          </Text>
        </Space>
      )}

      {/* ── Step 3: Konflikte ── */}
      {step === 'conflicts' && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="warning"
            showIcon
            message={`${conflicts.length} Konflikt${conflicts.length !== 1 ? 'e' : ''} gefunden`}
            description="Diese Prüflinge existieren bereits. Bitte wähle für jeden, ob der bestehende Eintrag behalten oder überschrieben werden soll."
          />
          <Space>
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => setBulkBehaviour('KEEP')}
            >
              Alle behalten
            </Button>
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => setBulkBehaviour('OVERWRITE')}
            >
              Alle überschreiben
            </Button>
          </Space>
          <Table<ConflictRow>
            dataSource={conflicts}
            columns={conflictColumns}
            rowKey="key"
            size="small"
            pagination={false}
            scroll={{ y: 280 }}
          />
        </Space>
      )}
    </Modal>
  );
}
