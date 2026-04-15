import { useCallback, useEffect, useState } from 'react';
import { App as AntApp, Button, Space, Spin, Tabs, Tag, Typography } from 'antd';
import { portfolioApi } from '../api/portfolioApi';
import { Portfolio } from '../types/portfolio';
import { Exam } from '../types/exam';
import { Examinee } from '../types/examinee';
import { ExamsTab } from './ExamsTab';
import { ExamineesTab } from './ExamineesTab';
import { ExportTab } from './ExportTab';
import { ImportExamineesDialog } from './ImportExamineesDialog';
import { PositionValidationPanel } from './PositionValidationPanel';
import { ScanChecksTab } from './ScanChecksTab';
import { ScanUploadTab } from './ScanUploadTab';
import { ScanValidationTab } from './ScanValidationTab';
import { SheetSettingsTab } from './SheetSettingsTab';

const { Title } = Typography;

interface PortfolioDetailViewProps {
  portfolio: Portfolio;
  onBack: () => void;
}

export function PortfolioDetailView({ portfolio, onBack }: PortfolioDetailViewProps) {
  const { notification } = AntApp.useApp();

  const [exams, setExams] = useState<Exam[]>([]);
  const [examinees, setExaminees] = useState<Examinee[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [importExamineesOpen, setImportExamineesOpen] = useState(false);

  const loadData = useCallback(async () => {
    setTabLoading(true);
    try {
      const [examList, examineePage] = await Promise.all([
        portfolioApi.getExams(portfolio.id),
        portfolioApi.getExaminees(portfolio.id, { size: 100 }),
      ]);
      setExams(examList);
      setExaminees(examineePage.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden', description: msg });
    } finally {
      setTabLoading(false);
    }
  }, [portfolio.id, notification]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={onBack}>← Zurück</Button>
        <Title level={4} style={{ margin: 0 }}>{portfolio.name}</Title>
        <Tag>{portfolio.state}</Tag>
      </Space>

      <Spin spinning={tabLoading}>
        <Tabs
          items={[
            {
              key: 'exams',
              label: `Examen (${exams.length})`,
              children: <ExamsTab portfolioId={portfolio.id} exams={exams} />,
            },
            {
              key: 'examinees',
              label: `Prüflinge (${examinees.length})`,
              children: (
                <ExamineesTab
                  portfolioId={portfolio.id}
                  exams={exams}
                  examinees={examinees}
                  onExamineesChange={setExaminees}
                  onImportOpen={() => setImportExamineesOpen(true)}
                />
              ),
            },
            {
              key: 'sheets',
              label: 'Bögen',
              children: (
                <SheetSettingsTab
                  portfolioId={portfolio.id}
                  totalQuestionSheets={portfolio.totalQuestionSheets}
                />
              ),
            },
            {
              key: 'scans',
              label: 'Scan-Upload',
              children: <ScanUploadTab portfolioId={portfolio.id} exams={exams} />,
            },
            {
              key: 'positions',
              label: 'Scan-Eckenerkennung',
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                  <PositionValidationPanel portfolioId={portfolio.id} />
                </div>
              ),
            },
            {
              key: 'checks',
              label: 'Scan-Prüfung',
              children: <ScanChecksTab portfolioId={portfolio.id} />,
            },
            {
              key: 'validations',
              label: 'Scan-Validierung',
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                  <ScanValidationTab portfolioId={portfolio.id} />
                </div>
              ),
            },
            {
              key: 'export',
              label: 'Export',
              children: <ExportTab portfolioId={portfolio.id} exams={exams} />,
            },
          ]}
        />
      </Spin>

      <ImportExamineesDialog
        open={importExamineesOpen}
        portfolioId={portfolio.id}
        onClose={() => setImportExamineesOpen(false)}
        onSuccess={async () => {
          const page = await portfolioApi.getExaminees(portfolio.id, { size: 100 });
          setExaminees(page.content);
        }}
      />
    </div>
  );
}
