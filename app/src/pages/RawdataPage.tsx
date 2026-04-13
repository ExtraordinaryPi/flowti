import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Select } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
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

const EXPORT_MODES = ['DEFAULT', 'CSV', 'ALL'];

export function RawdataPage() {
  const { notification } = AntApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportMode, setExportMode] = useState('DEFAULT');

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
    { title: 'Exam', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Export',
      key: 'export',
      render: (_, record) => (
        <Button
          icon={<DownloadOutlined />}
          size="small"
          onClick={async () => {
            try {
              const blob = await examApi.downloadRawData(record.id, exportMode);
              triggerDownload(blob, `rawdata_${record.name}_${exportMode}.zip`);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
              notification.error({ message: msg });
            }
          }}
        >
          Herunterladen
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Rohdaten-Export</Title>
        <Select value={exportMode} onChange={setExportMode} style={{ width: 140 }}>
          {EXPORT_MODES.map((m) => <Select.Option key={m} value={m}>{m}</Select.Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={exams} rowKey="id" loading={loading} />
    </div>
  );
}
