import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tabs } from 'antd';
import { Popconfirm } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examinerApi } from '../api/examinerApi';
import { actorApi } from '../api/actorApi';
import { Examiner, Actor } from '../types/examinee';

const { Title } = Typography;

export function ExamineesPage() {
  const { notification } = AntApp.useApp();
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exPage, acPage] = await Promise.all([
        examinerApi.getAll({ size: 100 }),
        actorApi.getAll({ size: 100 }),
      ]);
      setExaminers(exPage.content);
      setActors(acPage.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: msg });
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => { load(); }, [load]);

  const examinerColumns: ColumnsType<Examiner> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Wirklich löschen?"
          onConfirm={async () => {
            try {
              await examinerApi.delete(record.id);
              setExaminers((prev) => prev.filter((e) => e.id !== record.id));
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
              notification.error({ message: msg });
            }
          }}
          okText="Ja"
          cancelText="Nein"
        >
          <Button size="small" danger>Löschen</Button>
        </Popconfirm>
      ),
    },
  ];

  const actorColumns: ColumnsType<Actor> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Wirklich löschen?"
          onConfirm={async () => {
            try {
              await actorApi.delete(record.id);
              setActors((prev) => prev.filter((a) => a.id !== record.id));
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
              notification.error({ message: msg });
            }
          }}
          okText="Ja"
          cancelText="Nein"
        >
          <Button size="small" danger>Löschen</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Prüfer & Akteure</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Tabs items={[
        {
          key: 'examiners',
          label: `Prüfer (${examiners.length})`,
          children: <Table columns={examinerColumns} dataSource={examiners} rowKey="id" loading={loading} size="small" />,
        },
        {
          key: 'actors',
          label: `Akteure (${actors.length})`,
          children: <Table columns={actorColumns} dataSource={actors} rowKey="id" loading={loading} size="small" />,
        },
      ]} />
    </div>
  );
}
