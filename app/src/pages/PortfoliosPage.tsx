import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Space, App as AntApp,
  Tabs, Upload, Tag, Spin,
} from 'antd';
import {
  ReloadOutlined, UploadOutlined, DownloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { examApi } from '../api/examApi';
import { Portfolio } from '../types/portfolio';
import { Exam } from '../types/exam';
import { Examinee } from '../types/examinee';
import { Scan } from '../types/scan';

const { Title, Text } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PortfoliosPage() {
  const { notification } = AntApp.useApp();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Portfolio | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examinees, setExaminees] = useState<Examinee[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const page = await portfolioApi.getAll({ size: 100 });
      setPortfolios(page.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden der Portfolios', description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortfolios(); }, []);

  const selectPortfolio = async (p: Portfolio) => {
    setSelected(p);
    setTabLoading(true);
    try {
      const [examList, examineePage, scanPage] = await Promise.all([
        portfolioApi.getExams(p.id),
        portfolioApi.getExaminees(p.id, { size: 100 }),
        portfolioApi.getScansInvalid(p.id, { size: 100 }),
      ]);
      setExams(examList);
      setExaminees(examineePage.content);
      setScans(scanPage.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden', description: msg });
    } finally {
      setTabLoading(false);
    }
  };

  const portfolioColumns: ColumnsType<Portfolio> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktion',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => selectPortfolio(record)}>Öffnen</Button>
      ),
    },
  ];

  const examColumns: ColumnsType<Exam> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Varianten', dataIndex: 'variants', key: 'variants' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Rohdaten',
      key: 'rawdata',
      render: (_, record) => (
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
          Export
        </Button>
      ),
    },
  ];

  const examineeColumns: ColumnsType<Examinee> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
  ];

  const scanColumns: ColumnsType<Scan> = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    { title: 'Review', dataIndex: 'reviewState', key: 'reviewState' },
  ];

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
                label: 'Examen',
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
                    <Table columns={examColumns} dataSource={exams} rowKey="id" size="small" />
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
                    </Space>
                    <Table columns={examineeColumns} dataSource={examinees} rowKey="id" size="small" />
                  </div>
                ),
              },
              {
                key: 'scans',
                label: 'Scan-Upload',
                children: (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Upload
                        multiple
                        accept=".pdf,.png,.jpg"
                        beforeUpload={() => false}
                        onChange={async ({ fileList }) => {
                          if (fileList.every((f) => f.status !== 'uploading')) {
                            const files = fileList
                              .map((f) => f.originFileObj as File)
                              .filter(Boolean);
                            if (files.length === 0) return;
                            try {
                              await portfolioApi.uploadScans(selected.id, files);
                              notification.success({ message: `${files.length} Scan(s) hochgeladen` });
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                              notification.error({ message: msg });
                            }
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />}>Scans hochladen (PDF/Bild)</Button>
                      </Upload>
                      <Text type="secondary">Ungültige Scans:</Text>
                      <Table columns={scanColumns} dataSource={scans} rowKey="id" size="small" />
                    </Space>
                  </div>
                ),
              },
              {
                key: 'export',
                label: 'Export',
                children: (
                  <Space direction="vertical">
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          const blob = await portfolioApi.downloadArchive(selected.id);
                          triggerDownload(blob, `portfolio_${selected.id}.zip`);
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                          notification.error({ message: msg });
                        }
                      }}
                    >
                      Portfolio-Archiv (ZIP)
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          const blob = await portfolioApi.downloadTrainingData(selected.id);
                          triggerDownload(blob, `training_${selected.id}.zip`);
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
                          notification.error({ message: msg });
                        }
                      }}
                    >
                      Trainingsdaten (ZIP)
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Portfolios</Title>
        <Button icon={<ReloadOutlined />} onClick={loadPortfolios} loading={loading}>
          Aktualisieren
        </Button>
      </Space>
      <Table
        columns={portfolioColumns}
        dataSource={portfolios}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
}
