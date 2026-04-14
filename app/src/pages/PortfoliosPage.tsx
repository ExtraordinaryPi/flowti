import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Typography, Space, App as AntApp,
  Tabs, Upload, Tag, Spin, Tree, Modal, Input, Dropdown, theme,
  Collapse, Descriptions, Badge, Divider, Card, Select, Tooltip,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import {
  ReloadOutlined, UploadOutlined, DownloadOutlined,
  UserAddOutlined, PlusOutlined, FolderOutlined,
  FolderOpenOutlined, DeleteOutlined, FolderAddOutlined,
  AppstoreOutlined, ExportOutlined, FileZipOutlined, CloudUploadOutlined,
  CheckCircleOutlined, InfoCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { folderApi } from '../api/folderApi';
import { examApi } from '../api/examApi';
import { Portfolio } from '../types/portfolio';
import { Folder } from '../types/user';
import { Exam } from '../types/exam';
import { Examinee } from '../types/examinee';
import { AddPortfolioDialog } from '../components/AddPortfolioDialog';
import { ImportExamineesDialog } from '../components/ImportExamineesDialog';
import { SheetSettingsTab } from '../components/SheetSettingsTab';
import { ScanUploadTab } from '../components/ScanUploadTab';
import { PositionValidationPanel } from '../components/PositionValidationPanel';
import { ScanChecksTab } from '../components/ScanChecksTab';

const { Title, Text } = Typography;
const { DirectoryTree } = Tree;

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

type ScanExportMode = 'NONE' | 'SCAN_REFERENCE' | 'SCAN';

const TEMPLATE_DEFAULTS: Record<string, string> = {
  SCAN_REFERENCE: '{scanName}',
  SCAN: 'examinee_{examineeId}_page_{pageNumber}_scan_{scanId}',
};

const loadTemplates = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem('scan-export-name-templates') ?? '{}'); }
  catch { return {}; }
};

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
  const [importExamineesOpen, setImportExamineesOpen] = useState(false);

  // Detail-State
  const [exams, setExams] = useState<Exam[]>([]);
  const [examinees, setExaminees] = useState<Examinee[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Export-State (localStorage-persistent)
  const [scanExportMode, setScanExportMode] = useState<ScanExportMode>('NONE');
  const [scanNameTemplate, setScanNameTemplate] = useState('');
  const [exportedExamIds, setExportedExamIds] = useState<Set<number>>(new Set());

  const handleScanModeChange = (mode: ScanExportMode) => {
    setScanExportMode(mode);
    if (mode === 'NONE') {
      setScanNameTemplate('');
    } else {
      const templates = loadTemplates();
      setScanNameTemplate(templates[mode] ?? TEMPLATE_DEFAULTS[mode] ?? '');
    }
  };

  const handleTemplateChange = (value: string) => {
    setScanNameTemplate(value);
    const templates = loadTemplates();
    templates[scanExportMode] = value;
    localStorage.setItem('scan-export-name-templates', JSON.stringify(templates));
  };

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
      // Parent-Knoten aufklappen damit der neue Unterordner sichtbar ist
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

  // ── Portfolio-Detail öffnen ──

  const selectPortfolio = async (p: Portfolio) => {
    setSelected(p);
    setTabLoading(true);
    try {
      const [examList, examineePage] = await Promise.all([
        portfolioApi.getExams(p.id),
        portfolioApi.getExaminees(p.id, { size: 100 }),
      ]);
      setExams(examList);
      setExaminees(examineePage.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden', description: msg });
    } finally {
      setTabLoading(false);
    }
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

  // ── Tree-Daten ──

  const treeData = buildFolderTree(folders);

  const selectedFolder = selectedFolderId !== null
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  // ── Spalten ──

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
        <Button type="link" onClick={() => selectPortfolio(record)}>Öffnen</Button>
      ),
    },
  ];

  const examTypeColor = (type?: string) => {
    const t = type?.toUpperCase() ?? '';
    if (t.includes('PAPER')) return 'blue';
    if (t.includes('TEXAM')) return 'purple';
    if (t.includes('ONLINE')) return 'cyan';
    return 'default';
  };

  const examStateBadge = (state?: string): 'success' | 'processing' | 'error' | 'warning' | 'default' => {
    const s = state?.toUpperCase() ?? '';
    if (s.includes('DONE') || s.includes('FINISHED')) return 'success';
    if (s.includes('ACTIVE') || s.includes('RUNNING')) return 'processing';
    if (s.includes('ERROR') || s.includes('FAIL')) return 'error';
    if (s.includes('WAIT') || s.includes('PENDING')) return 'warning';
    return 'default';
  };

  const formatBool = (val?: boolean) =>
    val === true ? <Tag color="green">Ja</Tag> : val === false ? <Tag>Nein</Tag> : <Text type="secondary">–</Text>;

  const formatVal = (val?: string | number | null) =>
    (val !== undefined && val !== null && val !== '') ? String(val) : '–';

  const buildExamPanels = () =>
    exams.map((exam) => {
      const displayTitle = exam.title ?? exam.name ?? `Exam #${exam.id}`;
      const displayType = exam.examType ?? exam.type;
      const variantCount = exam.variants ?? 1;
      const variants = Array.from({ length: variantCount }, (_, i) => ({
        letter: String.fromCharCode(65 + i),
        number: i + 1,
      }));

      const header = (
        <Space size="middle" wrap>
          <Text strong>{displayTitle}</Text>
          {displayType && <Tag color={examTypeColor(displayType)}>{displayType}</Tag>}
          {exam.state && <Badge status={examStateBadge(exam.state)} text={exam.state} />}
          {exam.totalPoints !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {exam.totalPoints} Pkt · {exam.totalQuestions ?? '?'} Fragen
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>ID: {exam.id}</Text>
        </Space>
      );

      return {
        key: String(exam.id),
        label: header,
        children: (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>

            {/* ── Grundinformationen ── */}
            <Descriptions title="Grundinformationen" size="small" bordered column={2}>
              <Descriptions.Item label="Titel">{formatVal(exam.title ?? exam.name)}</Descriptions.Item>
              <Descriptions.Item label="Autor">{formatVal(exam.author)}</Descriptions.Item>
              <Descriptions.Item label="Überschrift">{formatVal(exam.headLine)}</Descriptions.Item>
              <Descriptions.Item label="Unterüberschrift">{formatVal(exam.subHeadLine)}</Descriptions.Item>
              <Descriptions.Item label="Prüfungsdatum">{formatVal(exam.examDate?.slice(0, 10))}</Descriptions.Item>
              <Descriptions.Item label="Dauer (min)">{formatVal(exam.duration)}</Descriptions.Item>
              <Descriptions.Item label="Varianten">{formatVal(exam.variants)}</Descriptions.Item>
              <Descriptions.Item label="Typ">{displayType ? <Tag color={examTypeColor(displayType)}>{displayType}</Tag> : '–'}</Descriptions.Item>
              <Descriptions.Item label="IMS-ID">{formatVal(exam.imsId)}</Descriptions.Item>
              <Descriptions.Item label="IMS Entity-ID">{formatVal(exam.imsEntityId)}</Descriptions.Item>
              <Descriptions.Item label="Exportiert">{formatBool(exam.exported)}</Descriptions.Item>
              <Descriptions.Item label="Antwort-Permutation">{formatBool(exam.answerPermutation)}</Descriptions.Item>
              <Descriptions.Item label="Zweistufige Nummerierung">{formatBool(exam.secondLevelNumbering)}</Descriptions.Item>
              <Descriptions.Item label="Antwortbögen gesamt">{formatVal(exam.totalExamAnswerSheets)}</Descriptions.Item>
            </Descriptions>

            {/* ── Statistik ── */}
            <Descriptions title="Inhalt & Punkte" size="small" bordered column={3}>
              <Descriptions.Item label="Fragen gesamt">{formatVal(exam.totalQuestions)}</Descriptions.Item>
              <Descriptions.Item label="Items gesamt">{formatVal(exam.totalItems)}</Descriptions.Item>
              <Descriptions.Item label="Punkte gesamt">{formatVal(exam.totalPoints)}</Descriptions.Item>
            </Descriptions>

            {/* ── Einleitung ── */}
            {exam.introduction && (
              <div>
                <Text strong>Einleitung</Text>
                <div
                  style={{ marginTop: 6, padding: '8px 12px', background: token.colorBgLayout, borderRadius: 6, fontSize: 13 }}
                  dangerouslySetInnerHTML={{ __html: exam.introduction }}
                />
              </div>
            )}

            {/* ── Konfiguration ── */}
            {exam.examConfig && (
              <Descriptions title="Konfiguration" size="small" bordered column={2}>
                <Descriptions.Item label="Sprache">{formatVal(exam.examConfig.language)}</Descriptions.Item>
                <Descriptions.Item label="Antwortauswahl">{formatVal(exam.examConfig.answerSelection)}</Descriptions.Item>
                <Descriptions.Item label="Fragen mischen">{formatBool(exam.examConfig.shuffleQuestions)}</Descriptions.Item>
                <Descriptions.Item label="Punkte in Liste">{formatBool(exam.examConfig.pointsInList)}</Descriptions.Item>
                <Descriptions.Item label="PIN aktiv">{formatBool(exam.examConfig.hasPin)}</Descriptions.Item>
                <Descriptions.Item label="Master-PIN aktiv">{formatBool(exam.examConfig.hasMasterPin)}</Descriptions.Item>
                <Descriptions.Item label="PIN">{formatVal(exam.examConfig.pin)}</Descriptions.Item>
                <Descriptions.Item label="Master-PIN">{formatVal(exam.examConfig.masterPin)}</Descriptions.Item>
                <Descriptions.Item label="Einschreibung erlaubt">{formatBool(exam.examConfig.allowEnroll)}</Descriptions.Item>
                <Descriptions.Item label="Einschreibschlüssel">{formatVal(exam.examConfig.enrollKey)}</Descriptions.Item>
                <Descriptions.Item label="Startbar ab (Datum)">{formatVal(exam.examConfig.startableAtDate)}</Descriptions.Item>
                <Descriptions.Item label="Startbar ab (Zeit)">{formatVal(exam.examConfig.startableAtTime)}</Descriptions.Item>
                <Descriptions.Item label="Enddatum">{formatVal(exam.examConfig.endDate)}</Descriptions.Item>
                <Descriptions.Item label="Endzeit">{formatVal(exam.examConfig.endTime)}</Descriptions.Item>
                <Descriptions.Item label="Zustimmungsbestätigung">{formatVal(exam.examConfig.agreementConfirmation)}</Descriptions.Item>
                <Descriptions.Item label="AAC/ASAM">{formatVal(exam.examConfig.aacAsam)}</Descriptions.Item>
                <Descriptions.Item label="LM Min. Zeichen">{formatVal(exam.examConfig.lmMinChars)}</Descriptions.Item>
                <Descriptions.Item label="Screenshot-Upload">{formatVal(exam.examConfig.screenshotUpload)}</Descriptions.Item>
                {exam.examConfig.color && (
                  <Descriptions.Item label="Farbe">
                    <Space>
                      <div style={{ width: 16, height: 16, borderRadius: 3, background: `#${exam.examConfig.color}`, display: 'inline-block' }} />
                      <Text code>#{exam.examConfig.color}</Text>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}

            <Divider style={{ margin: '4px 0' }} />

            {/* ── Fragebögen ── */}
            <div>
              <Text strong>Fragebögen</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {variants.map(({ letter, number }) => (
                  <Space key={letter} size="small">
                    <Tag>Variante {letter}</Tag>
                    <Upload
                      accept=".pdf"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        examApi.uploadQuestionSheet(exam.id, number, file)
                          .then(() => notification.success({ message: `Fragebogen Variante ${letter} hochgeladen` }))
                          .catch((e: unknown) => {
                            const msg = e instanceof Error ? e.message : 'Fehler';
                            notification.error({ message: msg });
                          });
                        return false;
                      }}
                    >
                      <Button size="small" icon={<UploadOutlined />}>Upload</Button>
                    </Upload>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          const blob = await examApi.downloadQuestionSheet(exam.id, number);
                          triggerDownload(blob, `fragebogen_${exam.id}_${letter}.pdf`);
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : 'Fehler';
                          notification.error({ message: msg });
                        }
                      }}
                    >
                      Download
                    </Button>
                  </Space>
                ))}
                {variantCount > 1 && (
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={async () => {
                      try {
                        const blob = await examApi.downloadAllQuestionSheets(exam.id);
                        triggerDownload(blob, `fragebögen_${exam.id}.zip`);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : 'Fehler';
                        notification.error({ message: msg });
                      }
                    }}
                  >
                    Alle herunterladen
                  </Button>
                )}
              </Space>
            </div>

            {/* ── Rohdaten ── */}
            <Space>
              <Text strong>Rohdaten:</Text>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={async () => {
                  try {
                    const blob = await examApi.downloadRawData(exam.id, 'DEFAULT');
                    triggerDownload(blob, `rawdata_${exam.id}.zip`);
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Fehler';
                    notification.error({ message: msg });
                  }
                }}
              >
                Export (DEFAULT)
              </Button>
            </Space>

          </Space>
        ),
      };
    });

  const examineeColumns: ColumnsType<Examinee> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    ...exams.map((exam) => ({
      title: exam.title ?? exam.name ?? `Exam ${exam.id}`,
      key: `exam_${exam.id}`,
      width: 90,
      render: (_: unknown, record: Examinee) => {
        const variant = record.examVariants?.[exam.id];
        if (variant == null) return <Text type="secondary">–</Text>;
        return <Tag>{String.fromCharCode(64 + variant)}</Tag>;
      },
    })),
  ];


  // ── Detail-Ansicht ──

  if (selected) {
    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => setSelected(null)}>← Zurück</Button>
          <Title level={4} style={{ margin: 0 }}>{selected.name}</Title>
          <Tag>{selected.state}</Tag>
        </Space>

        <Spin spinning={tabLoading}>
          <Tabs
            items={[
              {
                key: 'exams',
                label: `Examen (${exams.length})`,
                children: (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            const blob = await portfolioApi.downloadAnswerSheets(selected.id);
                            triggerDownload(blob, `answerSheets_${selected.id}.pdf`);
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                            notification.error({ message: msg });
                          }
                        }}
                      >
                        Antwortbögen herunterladen
                      </Button>
                    </Space>
                    {exams.length === 0 ? (
                      <Text type="secondary">Keine Examen vorhanden</Text>
                    ) : (
                      <Collapse
                        items={buildExamPanels()}
                        bordered={false}
                        style={{ background: 'transparent' }}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'examinees',
                label: `Prüflinge (${examinees.length})`,
                children: (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        icon={<UserAddOutlined />}
                        onClick={async () => {
                          try {
                            await portfolioApi.generateExaminees(selected.id, 1);
                            const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
                            setExaminees(page.content);
                            notification.success({ message: 'Prüfling generiert' });
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                            notification.error({ message: msg });
                          }
                        }}
                      >
                        Prüfling generieren
                      </Button>
                      <Button
                        icon={<UploadOutlined />}
                        onClick={() => setImportExamineesOpen(true)}
                      >
                        CSV / XLSX Import
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            const blob = await portfolioApi.downloadExamineesExcel(selected.id);
                            triggerDownload(blob, `examinees_${selected.id}.csv`);
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                            notification.error({ message: msg });
                          }
                        }}
                      >
                        CSV Export
                      </Button>
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'shuffle',
                              icon: <SyncOutlined />,
                              label: 'Gleichmäßig zuweisen',
                              onClick: async () => {
                                try {
                                  await portfolioApi.shuffle(selected.id);
                                  const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
                                  setExaminees(page.content);
                                  notification.success({ message: 'Prüflinge gleichmäßig zugewiesen' });
                                } catch (e: unknown) {
                                  const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                                  notification.error({ message: msg });
                                }
                              },
                            },
                            {
                              key: 'shuffleUnassigned',
                              icon: <SyncOutlined />,
                              label: 'Nicht zugewiesene zuweisen',
                              onClick: async () => {
                                try {
                                  await portfolioApi.shuffleUnassigned(selected.id);
                                  const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
                                  setExaminees(page.content);
                                  notification.success({ message: 'Nicht zugewiesene Prüflinge zugewiesen' });
                                } catch (e: unknown) {
                                  const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                                  notification.error({ message: msg });
                                }
                              },
                            },
                            {
                              key: 'reshuffle',
                              icon: <SyncOutlined />,
                              label: 'Neu mischen (gleiche Variante)',
                              onClick: async () => {
                                try {
                                  await portfolioApi.reshuffleSameVariant(selected.id);
                                  const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
                                  setExaminees(page.content);
                                  notification.success({ message: 'Prüflinge neu gemischt' });
                                } catch (e: unknown) {
                                  const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                                  notification.error({ message: msg });
                                }
                              },
                            },
                          ],
                        }}
                      >
                        <Button icon={<SyncOutlined />}>Varianten zuweisen</Button>
                      </Dropdown>
                    </Space>
                    <Table columns={examineeColumns} dataSource={examinees} rowKey="id" size="small" />
                  </div>
                ),
              },
              {
                key: 'sheets',
                label: 'Bögen',
                children: (
                  <SheetSettingsTab
                    portfolioId={selected.id}
                    totalQuestionSheets={selected.totalQuestionSheets}
                  />
                ),
              },
              {
                key: 'scans',
                label: 'Scan-Upload',
                children: (
                  <ScanUploadTab portfolioId={selected.id} exams={exams} />
                ),
              },
              {
                key: 'positions',
                label: 'Scan-Eckenerkennung',
                children: (
                  <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                    <PositionValidationPanel portfolioId={selected.id} />
                  </div>
                ),
              },
              {
                key: 'checks',
                label: 'Scan-Prüfung',
                children: (
                  <ScanChecksTab portfolioId={selected.id} />
                ),
              },
              {
                key: 'export',
                label: 'Export',
                children: (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>

                    {/* ── Portfolio-Aktionen ── */}
                    <Card size="small" title="Portfolio">
                      <Space size="large" wrap>
                        {/* Trainingsdaten exportieren */}
                        <div style={{ textAlign: 'center', minWidth: 90 }}>
                          <Button
                            type="dashed"
                            icon={<ExportOutlined style={{ fontSize: 28 }} />}
                            style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
                            onClick={async () => {
                              try {
                                const blob = await portfolioApi.downloadTrainingData(selected.id);
                                triggerDownload(blob, `training_${selected.id}.zip`);
                              } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : 'Fehler';
                                notification.error({ message: msg });
                              }
                            }}
                          />
                          <Text style={{ fontSize: 12 }}>Trainingsdaten<br />exportieren</Text>
                        </div>

                        {/* Trainingsdaten hochladen */}
                        <div style={{ textAlign: 'center', minWidth: 90 }}>
                          <Button
                            type="dashed"
                            icon={<CloudUploadOutlined style={{ fontSize: 28 }} />}
                            style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
                            onClick={async () => {
                              try {
                                await portfolioApi.uploadTrainingData(selected.id);
                                notification.success({ message: 'Trainingsdaten hochgeladen' });
                              } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : 'Fehler';
                                notification.error({ message: msg });
                              }
                            }}
                          />
                          <Text style={{ fontSize: 12 }}>Trainingsdaten<br />hochladen</Text>
                        </div>

                        {/* Portfolio-Archiv */}
                        <div style={{ textAlign: 'center', minWidth: 90 }}>
                          <Button
                            type="dashed"
                            icon={<FileZipOutlined style={{ fontSize: 28 }} />}
                            style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
                            onClick={async () => {
                              try {
                                const blob = await portfolioApi.downloadArchive(selected.id);
                                triggerDownload(blob, `portfolio_${selected.id}.zip`);
                              } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : 'Fehler';
                                notification.error({ message: msg });
                              }
                            }}
                          />
                          <Text style={{ fontSize: 12 }}>Portfolio-Archiv<br />(ZIP)</Text>
                        </div>
                      </Space>
                    </Card>

                    {/* ── Scan-Export-Einstellungen ── */}
                    <Card size="small" title="Scan-Export-Einstellungen">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Space align="start" wrap>
                          <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Scans im Export</Text>
                            <Select<ScanExportMode>
                              value={scanExportMode}
                              onChange={handleScanModeChange}
                              style={{ width: 200 }}
                              options={[
                                { label: 'Nein', value: 'NONE' },
                                { label: 'Scan-Referenz', value: 'SCAN_REFERENCE' },
                                { label: 'Scan', value: 'SCAN' },
                              ]}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 240 }}>
                            <Space align="center" style={{ marginBottom: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Dateiname-Schema</Text>
                              <Tooltip title={
                                <div>
                                  Verfügbare Variablen:<br />
                                  <code>{'{'+'scanId{'+'}'}</code>, <code>{'{'+'scanName{'+'}'}</code>, <code>{'{'+'pageNumber{'+'}'}</code>,<br />
                                  <code>{'{'+'examineeId{'+'}'}</code>, <code>{'{'+'examineeIdent{'+'}'}</code>,<br />
                                  <code>{'{'+'examineeFirstname{'+'}'}</code>, <code>{'{'+'examineeLastname{'+'}'}</code>,<br />
                                  <code>{'{'+'examId{'+'}'}</code>, <code>{'{'+'examName{'+'}'}</code>
                                </div>
                              }>
                                <InfoCircleOutlined style={{ fontSize: 12, color: token.colorTextQuaternary }} />
                              </Tooltip>
                            </Space>
                            <Input.TextArea
                              value={scanNameTemplate}
                              disabled={scanExportMode === 'NONE'}
                              onChange={(e) => handleTemplateChange(e.target.value)}
                              rows={2}
                              style={{ fontFamily: 'monospace', fontSize: 12 }}
                              placeholder={scanExportMode !== 'NONE' ? TEMPLATE_DEFAULTS[scanExportMode] : '–'}
                            />
                          </div>
                        </Space>
                      </Space>
                    </Card>

                    {/* ── Examen exportieren ── */}
                    <Card size="small" title={`Examen exportieren (${exams.length})`}>
                      {exams.length === 0 ? (
                        <Text type="secondary">Keine Examen vorhanden</Text>
                      ) : (
                        <Collapse
                          bordered={false}
                          style={{ background: 'transparent' }}
                          items={exams.map((exam) => {
                            const displayTitle = exam.title ?? exam.name ?? `Exam #${exam.id}`;
                            const displayType = exam.examType ?? exam.type;
                            const isExported = exportedExamIds.has(exam.id);
                            return {
                              key: String(exam.id),
                              label: (
                                <Space>
                                  <Text strong>{displayTitle}</Text>
                                  {exam.imsId && <Text type="secondary" style={{ fontSize: 12 }}>IMS-ID: {exam.imsId}</Text>}
                                  {displayType && <Tag color={examTypeColor(displayType)}>{displayType}</Tag>}
                                  {isExported && <Tag icon={<CheckCircleOutlined />} color="success">Exportiert</Tag>}
                                </Space>
                              ),
                              children: (
                                <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                                  {/* Exam-Details */}
                                  <Descriptions size="small" column={2} style={{ flex: 1 }}>
                                    <Descriptions.Item label="ID">{exam.id}</Descriptions.Item>
                                    <Descriptions.Item label="Autor">{exam.author ?? '–'}</Descriptions.Item>
                                    <Descriptions.Item label="Fragen">{exam.totalQuestions ?? '–'}</Descriptions.Item>
                                    <Descriptions.Item label="Punkte">{exam.totalPoints ?? '–'}</Descriptions.Item>
                                    <Descriptions.Item label="Varianten">{exam.variants ?? 1}</Descriptions.Item>
                                    <Descriptions.Item label="Datum">{exam.examDate?.slice(0, 10) ?? '–'}</Descriptions.Item>
                                    {exam.imsId && <Descriptions.Item label="IMS-ID">{exam.imsId}</Descriptions.Item>}
                                    {exam.imsEntityId && <Descriptions.Item label="IMS Entity">{exam.imsEntityId}</Descriptions.Item>}
                                  </Descriptions>

                                  {/* Export-Button */}
                                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                    <Button
                                      type="primary"
                                      size="large"
                                      icon={<ExportOutlined />}
                                      style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                      onClick={async () => {
                                        try {
                                          const template = scanExportMode !== 'NONE' && scanNameTemplate ? scanNameTemplate : undefined;
                                          const blob = await examApi.downloadRawData(exam.id, scanExportMode, template);
                                          triggerDownload(blob, `rawdata_${exam.id}_${scanExportMode}.zip`);
                                          setExportedExamIds((prev) => new Set([...prev, exam.id]));
                                        } catch (e: unknown) {
                                          const msg = e instanceof Error ? e.message : 'Fehler';
                                          notification.error({ message: msg });
                                        }
                                      }}
                                    />
                                    <Text style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                      EX3 Export<br />ID: {exam.id}
                                    </Text>
                                  </div>
                                </Space>
                              ),
                            };
                          })}
                        />
                      )}
                    </Card>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>

        <ImportExamineesDialog
          open={importExamineesOpen}
          portfolioId={selected.id}
          onClose={() => setImportExamineesOpen(false)}
          onSuccess={async () => {
            const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
            setExaminees(page.content);
          }}
        />
      </div>
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
          {/* Header */}
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

          {/* "Alle" Eintrag */}
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

          {/* Folder-Baum */}
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
