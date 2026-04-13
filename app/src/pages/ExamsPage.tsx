import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Upload } from 'antd';
import { ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examApi } from '../api/examApi';
import { Exam } from '../types/exam';

const { Title } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ExamsPage() {
  const { notification } = AntApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
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
  };

  useEffect(() => { load(); }, []);

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
          <Upload
            accept=".pdf"
            showUploadList={false}
            beforeUpload={(file) => {
              examApi.uploadQuestionSheet(record.id, 1, file)
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
