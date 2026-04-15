import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Typography, Space, App as AntApp,
  Tag, Spin, Tree, Modal, Input, Dropdown, theme,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import {
  ReloadOutlined, PlusOutlined, FolderOutlined,
  FolderOpenOutlined, DeleteOutlined, FolderAddOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { folderApi } from '../api/folderApi';
import { Portfolio } from '../types/portfolio';
import { Folder } from '../types/user';
import { AddPortfolioDialog } from '../components/AddPortfolioDialog';
import { PortfolioDetailView } from '../components/PortfolioDetailView';

const { Title, Text } = Typography;
const { DirectoryTree } = Tree;

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

interface FolderTreeNode extends DataNode {
  folderId: number;
  folderName: string;
  parentId?: number;
  children?: FolderTreeNode[];
}

function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const childrenMap = new Map<number, Folder[]>();
  const rootFolders: Folder[] = [];

  folders.forEach((f) => {
    const pid = f.parentId;
    if (pid && pid !== -1) {
      const list = childrenMap.get(pid) ?? [];
      list.push(f);
      childrenMap.set(pid, list);
    } else {
      rootFolders.push(f);
    }
  });

  function toNode(folder: Folder): FolderTreeNode {
    const children = childrenMap.get(folder.id) ?? [];
    return {
      key: folder.id,
      title: folder.name,
      folderId: folder.id,
      folderName: folder.name,
      parentId: folder.parentId,
      isLeaf: children.length === 0,
      children: children.length > 0 ? children.map(toNode) : undefined,
    };
  }

  return rootFolders.map(toNode);
}

// ─── Haupt-Komponente ────────────────────────────────────────────────────────

export function PortfoliosPage() {
  const { notification, modal } = AntApp.useApp();
  const { token } = theme.useToken();

  // Folder-State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // Add-Folder-Dialog
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [addFolderName, setAddFolderName] = useState('');
  const [addFolderParentId, setAddFolderParentId] = useState<number | undefined>();
  const [addFolderLoading, setAddFolderLoading] = useState(false);

  // Portfolio-State
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Portfolio | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // ── Folder laden ──

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const list = await folderApi.getAll();
      setFolders(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden der Ordner', description: msg });
    } finally {
      setFoldersLoading(false);
    }
  }, [notification]);

  // ── Portfolios laden ──

  const loadPortfolios = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedFolderId === null) {
        const page = await portfolioApi.getAll({ size: 200 });
        setPortfolios(page.content);
      } else {
        const page = await folderApi.getPortfolios(selectedFolderId, { size: 200 });
        setPortfolios(page.content);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden der Portfolios', description: msg });
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, notification]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadPortfolios(); }, [loadPortfolios]);

  // ── Folder hinzufügen ──

  const openAddFolder = (parentId?: number) => {
    setAddFolderParentId(parentId);
    setAddFolderName('');
    setAddFolderOpen(true);
  };

  const handleAddFolder = async () => {
    if (!addFolderName.trim()) return;
    setAddFolderLoading(true);
    try {
      await folderApi.create({
        name: addFolderName.trim(),
        parentFolder: { id: addFolderParentId ?? -1 },
      });
      setAddFolderOpen(false);
      if (addFolderParentId !== undefined) {
        setExpandedKeys((prev) =>
          prev.includes(addFolderParentId) ? prev : [...prev, addFolderParentId]
        );
      }
      await loadFolders();
      notification.success({ message: 'Ordner erstellt' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Erstellen', description: msg });
    } finally {
      setAddFolderLoading(false);
    }
  };

  // ── Folder löschen ──

  const handleDeleteFolder = (folder: FolderTreeNode) => {
    modal.confirm({
      title: `Ordner „${folder.folderName}" löschen?`,
      content: 'Alle enthaltenen Portfolios werden dem Root zugeordnet.',
      okText: 'Löschen',
      okButtonProps: { danger: true },
      cancelText: 'Abbrechen',
      onOk: async () => {
        try {
          await folderApi.delete(folder.folderId);
          if (selectedFolderId === folder.folderId) setSelectedFolderId(null);
          await loadFolders();
          notification.success({ message: 'Ordner gelöscht' });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
          notification.error({ message: 'Fehler beim Löschen', description: msg });
        }
      },
    });
  };

  // ── Tree: Kontext-Menü pro Folder ──

  const folderContextMenu = (node: FolderTreeNode): MenuProps => ({
    items: [
      {
        key: 'add-child',
        icon: <FolderAddOutlined />,
        label: 'Unterordner hinzufügen',
        onClick: () => openAddFolder(node.folderId),
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Ordner löschen',
        danger: true,
        onClick: () => handleDeleteFolder(node),
      },
    ],
  });

  const treeData = buildFolderTree(folders);
  const selectedFolder = selectedFolderId !== null
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const portfolioColumns: ColumnsType<Portfolio> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Ordner',
      dataIndex: ['folder', 'name'],
      key: 'folder',
      render: (name?: string) => name ? <Tag icon={<FolderOutlined />}>{name}</Tag> : <Text type="secondary">–</Text>,
    },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktion',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => setSelected(record)}>Öffnen</Button>
      ),
    },
  ];

  // ── Detail-Ansicht ──

  if (selected) {
    return (
      <PortfolioDetailView
        portfolio={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  // ── Haupt-Listenansicht ──

  return (
    <>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', height: '100%' }}>

        {/* ── Folder-Panel ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Text strong style={{ fontSize: 13 }}>Ordner</Text>
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined />}
              onClick={() => openAddFolder(selectedFolderId ?? undefined)}
              title="Neuer Ordner"
            />
          </div>

          <div
            onClick={() => setSelectedFolderId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 13,
              background: selectedFolderId === null ? token.colorPrimaryBg : 'transparent',
              color: selectedFolderId === null ? token.colorPrimary : token.colorText,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <AppstoreOutlined />
            <span>Alle Portfolios</span>
          </div>

          <Spin spinning={foldersLoading}>
            {treeData.length === 0 && !foldersLoading ? (
              <div style={{ padding: '16px 12px', color: token.colorTextQuaternary, fontSize: 12 }}>
                Noch keine Ordner
              </div>
            ) : (
              <DirectoryTree
                treeData={treeData}
                selectedKeys={selectedFolderId !== null ? [selectedFolderId] : []}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys)}
                onSelect={(keys) => {
                  setSelectedFolderId(keys[0] !== undefined ? Number(keys[0]) : null);
                }}
                titleRender={(node) => {
                  const folderNode = node as FolderTreeNode;
                  return (
                    <Dropdown
                      menu={folderContextMenu(folderNode)}
                      trigger={['contextMenu']}
                    >
                      <span style={{ userSelect: 'none' }}>{folderNode.folderName}</span>
                    </Dropdown>
                  );
                }}
                icon={({ expanded }) => expanded ? <FolderOpenOutlined /> : <FolderOutlined />}
                style={{ padding: '4px 0' }}
              />
            )}
          </Spin>
        </div>

        {/* ── Portfolio-Tabelle ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                {selectedFolder ? selectedFolder.name : 'Alle Portfolios'}
              </Title>
              <Button icon={<ReloadOutlined />} onClick={loadPortfolios} loading={loading}>
                Aktualisieren
              </Button>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddDialogOpen(true)}
            >
              Neu
            </Button>
          </Space>

          <Table
            columns={portfolioColumns}
            dataSource={portfolios}
            rowKey="id"
            loading={loading}
          />
        </div>
      </div>

      {/* ── Ordner hinzufügen Dialog ── */}
      <Modal
        title={addFolderParentId ? 'Unterordner hinzufügen' : 'Neuer Ordner'}
        open={addFolderOpen}
        onOk={handleAddFolder}
        onCancel={() => setAddFolderOpen(false)}
        okText="Erstellen"
        cancelText="Abbrechen"
        confirmLoading={addFolderLoading}
        destroyOnHidden
      >
        <Input
          placeholder="Ordnername"
          value={addFolderName}
          onChange={(e) => setAddFolderName(e.target.value)}
          onPressEnter={handleAddFolder}
          autoFocus
          maxLength={100}
        />
      </Modal>

      {/* ── Portfolio hinzufügen Dialog ── */}
      <AddPortfolioDialog
        open={addDialogOpen}
        folderId={selectedFolderId ?? undefined}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={(portfolio) => {
          setPortfolios((prev) => [portfolio, ...prev]);
        }}
      />
    </>
  );
}
