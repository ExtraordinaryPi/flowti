import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { rawdataApi } from '../api/rawdataApi';
import { Rawdata } from '../types/scan';

const { Title } = Typography;

export function ScansPage() {
  const { notification } = AntApp.useApp();
  const [rawdata, setRawdata] = useState<Rawdata[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await rawdataApi.getAll({ size: 100 });
      setRawdata(page.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnsType<Rawdata> = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Typ', dataIndex: 'type', key: 'type', render: (t) => <Tag>{t}</Tag> },
    { title: 'Exam', dataIndex: ['exam', 'name'], key: 'exam' },
    { title: 'Prüfling', dataIndex: ['examinee', 'name'], key: 'examinee' },
    {
      title: 'Aktionen', key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          danger
          onClick={async () => {
            try {
              await rawdataApi.delete(record.id);
              setRawdata((prev) => prev.filter((r) => r.id !== record.id));
              notification.success({ message: 'Gelöscht' });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
              notification.error({ message: msg });
            }
          }}
        >
          Löschen
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Scans & Rohdaten</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={rawdata} rowKey="id" loading={loading} />
    </div>
  );
}
