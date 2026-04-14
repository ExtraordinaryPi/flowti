import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Upload, Switch, Collapse, Spin, Tag, Space, Typography,
  App as AntApp, Tooltip, Empty, Card,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  UploadOutlined, DeleteOutlined, ThunderboltOutlined,
  WarningOutlined, FileImageOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { portfolioApi } from '../api/portfolioApi';
import { examApi } from '../api/examApi';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import type { Exam } from '../types/exam';
import type { Scan } from '../types/scan';

const { Text } = Typography;

// ─── Thumbnail-Karte ──────────────────────────────────────────────────────────

function ScanCard({ scan, onDeleted }: { scan: Scan; onDeleted: () => void }) {
  const { modal, notification } = AntApp.useApp();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    rawdataPaperbasedApi.getThumbnail(scan.id)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => setBlobUrl('error'));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [scan.id]);

  const handleDelete = () => {
    modal.confirm({
      title: 'Scan löschen?',
      okText: 'Löschen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await rawdataPaperbasedApi.delete(scan.id);
          onDeleted();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Fehler';
          notification.error({ message: msg });
        }
      },
    });
  };

  return (
    <div style={{
      width: 108, border: '1px solid #e8e8e8', borderRadius: 6,
      overflow: 'hidden', background: '#fafafa', flexShrink: 0,
    }}>
      <div style={{
        width: 108, height: 150,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f0f0f0',
      }}>
        {blobUrl && blobUrl !== 'error' ? (
          <img
            src={blobUrl}
            alt={`Scan ${scan.id}`}
            style={{ maxWidth: 108, maxHeight: 150, objectFit: 'contain', display: 'block' }}
          />
        ) : blobUrl === 'error' ? (
          <FileImageOutlined style={{ fontSize: 28, color: '#bbb' }} />
        ) : (
          <Spin size="small" />
        )}
      </div>
      <div style={{
        padding: '4px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid #f0f0f0',
      }}>
        <Text style={{ fontSize: 10 }} type="secondary">
          {scan.examinee ? `#${scan.examinee.id}` : '–'}
        </Text>
        <Tooltip title="Scan löschen">
          <Button danger size="small" icon={<DeleteOutlined />} onClick={handleDelete} />
        </Tooltip>
      </div>
    </div>
  );
}

// ─── Scan-Raster für ein Examen ───────────────────────────────────────────────

function ExamScansPanel({
  exam,
  onChanged,
}: {
  exam: Exam;
  onChanged: () => void;
}) {
  const { modal, notification } = AntApp.useApp();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await examApi.getScans(exam.id, { size: 200 });
      setScans(page.content);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [exam.id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteAll = () => {
    modal.confirm({
      title: `Alle Scans von „${exam.title ?? exam.name}" löschen?`,
      content: 'Dieser Vorgang kann nicht rückgängig gemacht werden.',
      okText: 'Alle löschen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await examApi.deleteAllScans(exam.id);
          setScans([]);
          onChanged();
          notification.success({ message: 'Alle Scans gelöscht' });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Fehler';
          notification.error({ message: msg });
        }
      },
    });
  };

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}><Spin size="small" /></div>;
  }

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" icon={<ReloadOutlined />} onClick={load}>
          Aktualisieren
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={scans.length === 0}
          onClick={handleDeleteAll}
        >
          Alle löschen
        </Button>
      </Space>
      {scans.length === 0 ? (
        <Empty description="Keine Scans" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '12px 0' }} />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {scans.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              onDeleted={() => {
                setScans((prev) => prev.filter((s) => s.id !== scan.id));
                onChanged();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ungültige Scans ──────────────────────────────────────────────────────────

function InvalidScansPanel({
  portfolioId,
  onChanged,
}: {
  portfolioId: number;
  onChanged: () => void;
}) {
  const { modal, notification } = AntApp.useApp();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await portfolioApi.getScansInvalid(portfolioId, { size: 200 });
      setScans(page.content);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteAll = () => {
    modal.confirm({
      title: 'Alle ungültigen Scans löschen?',
      okText: 'Alle löschen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await portfolioApi.deleteScansInvalid(portfolioId);
          setScans([]);
          onChanged();
          notification.success({ message: 'Ungültige Scans gelöscht' });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Fehler';
          notification.error({ message: msg });
        }
      },
    });
  };

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}><Spin size="small" /></div>;
  }

  if (scans.length === 0) return null;

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderColor: '#faad14' }}
      title={
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <Text>{scans.length} ungültige Scan{scans.length !== 1 ? 's' : ''}</Text>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={load} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteAll}>
            Alle löschen
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {scans.map((scan) => (
          <ScanCard
            key={scan.id}
            scan={scan}
            onDeleted={() => {
              setScans((prev) => prev.filter((s) => s.id !== scan.id));
              onChanged();
            }}
          />
        ))}
      </div>
    </Card>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

interface Props {
  portfolioId: number;
  exams: Exam[];
}

export function ScanUploadTab({ portfolioId, exams }: Props) {
  const { notification } = AntApp.useApp();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fastPdf, setFastPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleUpload = async () => {
    const files = fileList
      .map((f) => f.originFileObj as File)
      .filter(Boolean);
    if (files.length === 0) return;

    setUploading(true);
    try {
      await portfolioApi.uploadScans(portfolioId, files, fastPdf);
      notification.success({ message: `${files.length} Datei${files.length !== 1 ? 'en' : ''} hochgeladen` });
      setFileList([]);
      triggerRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: 'Upload fehlgeschlagen', description: msg });
    } finally {
      setUploading(false);
    }
  };

  const examPanels = exams.map((exam) => ({
    key: String(exam.id),
    label: (
      <Space>
        <Text strong>{exam.title ?? exam.name ?? `Exam #${exam.id}`}</Text>
        {exam.state && <Tag>{exam.state}</Tag>}
      </Space>
    ),
    children: (
      <ExamScansPanel
        key={`${exam.id}-${refreshKey}`}
        exam={exam}
        onChanged={triggerRefresh}
      />
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Upload-Bereich ── */}
      <Card size="small" title="Scans hochladen">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload
            multiple
            accept=".png,.jpg,.jpeg,.tif,.tiff,.pdf,.zip"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
          >
            <Button icon={<UploadOutlined />}>Dateien auswählen</Button>
          </Upload>
          <Space>
            <Tooltip title="Schnelleres Verarbeiten für große PDFs">
              <Space size={6}>
                <ThunderboltOutlined style={{ color: fastPdf ? '#faad14' : '#bbb' }} />
                <Text style={{ fontSize: 13 }}>Fast-PDF</Text>
                <Switch size="small" checked={fastPdf} onChange={setFastPdf} />
              </Space>
            </Tooltip>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={fileList.length === 0}
              onClick={handleUpload}
            >
              {uploading ? 'Wird hochgeladen…' : `${fileList.length > 0 ? fileList.length + ' ' : ''}Hochladen`}
            </Button>
          </Space>
        </Space>
      </Card>

      {/* ── Ungültige Scans ── */}
      <InvalidScansPanel
        key={`invalid-${refreshKey}`}
        portfolioId={portfolioId}
        onChanged={triggerRefresh}
      />

      {/* ── Scans pro Examen ── */}
      {exams.length === 0 ? (
        <Empty description="Keine Examen vorhanden" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse items={examPanels} />
      )}

    </div>
  );
}
