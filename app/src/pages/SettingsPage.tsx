import { useEffect, useState, useCallback } from 'react';
import { Tabs, Table, Button, Typography, Space, App as AntApp, Tag, Descriptions } from 'antd';
import { Popconfirm } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '../api/userApi';
import { clientApi } from '../api/clientApi';
import { folderApi } from '../api/folderApi';
import { settingsApi } from '../api/settingsApi';
import { User, Client, Folder, CurrentUser } from '../types/user';

const { Title } = Typography;

export function SettingsPage() {
  const { notification } = AntApp.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uPage, cPage, fList, cu] = await Promise.all([
        userApi.getAll({ size: 100 }),
        clientApi.getAll({ size: 100 }),
        folderApi.getAll(),
        settingsApi.getCurrentUser(),
      ]);
      setUsers(uPage.content);
      setClients(cPage.content);
      setFolders(fList);
      setCurrentUser(cu);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: msg });
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => { load(); }, [load]);

  const userColumns: ColumnsType<User> = [
    { title: 'Benutzername', dataIndex: 'username', key: 'username' },
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'E-Mail', dataIndex: 'email', key: 'email' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Wirklich löschen?"
          onConfirm={async () => {
            try {
              await userApi.delete(record.id);
              setUsers((p) => p.filter((u) => u.id !== record.id));
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

  const clientColumns: ColumnsType<Client> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Alias', dataIndex: 'alias', key: 'alias' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Wirklich löschen?"
          onConfirm={async () => {
            try {
              await clientApi.delete(record.id);
              setClients((p) => p.filter((c) => c.id !== record.id));
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

  const folderColumns: ColumnsType<Folder> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Übergeordnet', dataIndex: ['parent', 'name'], key: 'parent' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Wirklich löschen?"
          onConfirm={async () => {
            try {
              await folderApi.delete(record.id);
              setFolders((p) => p.filter((f) => f.id !== record.id));
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
        <Title level={4} style={{ margin: 0 }}>Einstellungen</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>

      {currentUser && (
        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Angemeldet als">
            {currentUser.firstName} {currentUser.lastName} ({currentUser.username})
          </Descriptions.Item>
          <Descriptions.Item label="Rollen">{currentUser.roles?.join(', ')}</Descriptions.Item>
        </Descriptions>
      )}

      <Tabs items={[
        {
          key: 'users',
          label: `Benutzer (${users.length})`,
          children: (
            <div>
              <Space style={{ marginBottom: 12 }}>
                <Button icon={<PlusOutlined />} onClick={async () => {
                  try {
                    const u = await userApi.create();
                    setUsers((p) => [...p, u]);
                    notification.success({ message: 'Benutzer erstellt' });
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                    notification.error({ message: msg });
                  }
                }}>Erstellen</Button>
              </Space>
              <Table columns={userColumns} dataSource={users} rowKey="id" size="small" loading={loading} />
            </div>
          ),
        },
        {
          key: 'clients',
          label: `Clients (${clients.length})`,
          children: (
            <div>
              <Space style={{ marginBottom: 12 }}>
                <Button icon={<PlusOutlined />} onClick={async () => {
                  try {
                    const list = await clientApi.generate(1);
                    setClients((p) => [...p, ...list]);
                    notification.success({ message: 'Client generiert' });
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                    notification.error({ message: msg });
                  }
                }}>Generieren</Button>
              </Space>
              <Table columns={clientColumns} dataSource={clients} rowKey="id" size="small" loading={loading} />
            </div>
          ),
        },
        {
          key: 'folders',
          label: `Ordner (${folders.length})`,
          children: <Table columns={folderColumns} dataSource={folders} rowKey="id" size="small" loading={loading} />,
        },
      ]} />
    </div>
  );
}
