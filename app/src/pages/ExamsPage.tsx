import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Upload, InputNumber } from 'antd';
import { ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examApi } from '../api/examApi';
import { Exam } from '../types/exam';

const { Title } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  // Kein Ant Design-Äquivalent für programmatische Blob-Downloads
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExamsPage() {
  const { notification } = AntApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [variantForUpload, setVariantForUpload] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await examApi.getAll({ size: 100 });
      setExams(page.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: msg });
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<Exam> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Varianten', dataIndex: 'variants', key: 'variants' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await examApi.downloadAllQuestionSheets(record.id);
                triggerDownload(blob, `questionsheets_${record.id}.zip`);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                notification.error({ message: msg });
              }
            }}
          >
            Fragebögen
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await examApi.downloadRawData(record.id, 'DEFAULT');
                triggerDownload(blob, `rawdata_${record.id}.zip`);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                notification.error({ message: msg });
              }
            }}
          >
            Rohdaten
          </Button>
          <Space size="small">
            <InputNumber
              min={1}
              value={variantForUpload}
              onChange={(v) => setVariantForUpload(v ?? 1)}
              style={{ width: 60 }}
              addonBefore="V"
            />
            <Upload
              accept=".pdf"
              showUploadList={false}
              beforeUpload={(file) => {
                examApi.uploadQuestionSheet(record.id, variantForUpload, file)
                  .then(() => notification.success({ message: 'Fragenbogen hochgeladen' }))
                  .catch((e: unknown) => {
                    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                    notification.error({ message: msg });
                  });
                return false;
              }}
            >
              <Button size="small" icon={<UploadOutlined />}>Fragenbogen hochladen</Button>
            </Upload>
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Examen</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={exams} rowKey="id" loading={loading} />
    </div>
  );
}
