import { App as AntApp, Button, Dropdown, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined, SyncOutlined, UploadOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { Exam } from '../types/exam';
import { Examinee } from '../types/examinee';
import { triggerDownload } from '../utils/downloadUtils';

const { Text } = Typography;

interface ExamineesTabProps {
  portfolioId: number;
  exams: Exam[];
  examinees: Examinee[];
  onExamineesChange: (examinees: Examinee[]) => void;
  onImportOpen: () => void;
}

export function ExamineesTab({ portfolioId, exams, examinees, onExamineesChange, onImportOpen }: ExamineesTabProps) {
  const { notification } = AntApp.useApp();

  const reloadExaminees = async () => {
    const page = await portfolioApi.getExaminees(portfolioId, { size: 100 });
    onExamineesChange(page.content);
  };

  const columns: ColumnsType<Examinee> = [
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

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<UserAddOutlined />}
          onClick={async () => {
            try {
              await portfolioApi.generateExaminees(portfolioId, 1);
              await reloadExaminees();
              notification.success({ message: 'Prüfling generiert' });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
              notification.error({ message: msg });
            }
          }}
        >
          Prüfling generieren
        </Button>
        <Button icon={<UploadOutlined />} onClick={onImportOpen}>
          CSV / XLSX Import
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={async () => {
            try {
              const blob = await portfolioApi.downloadExamineesExcel(portfolioId);
              triggerDownload(blob, `examinees_${portfolioId}.csv`);
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
                    await portfolioApi.shuffle(portfolioId);
                    await reloadExaminees();
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
                    await portfolioApi.shuffleUnassigned(portfolioId);
                    await reloadExaminees();
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
                    await portfolioApi.reshuffleSameVariant(portfolioId);
                    await reloadExaminees();
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
      <Table columns={columns} dataSource={examinees} rowKey="id" size="small" />
    </div>
  );
}
