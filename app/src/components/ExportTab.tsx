import { useState } from 'react';
import {
  App as AntApp, Button, Card, Collapse, Descriptions, Input, Select,
  Space, Tag, Tooltip, Typography, theme,
} from 'antd';
import {
  CheckCircleOutlined, CloudUploadOutlined, ExportOutlined,
  FileZipOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { examApi } from '../api/examApi';
import { portfolioApi } from '../api/portfolioApi';
import { Exam } from '../types/exam';
import { triggerDownload } from '../utils/downloadUtils';

const { Text } = Typography;

type ScanExportMode = 'NONE' | 'SCAN_REFERENCE' | 'SCAN';

const TEMPLATE_DEFAULTS: Record<string, string> = {
  SCAN_REFERENCE: '{scanName}',
  SCAN: 'examinee_{examineeId}_page_{pageNumber}_scan_{scanId}',
};

const loadTemplates = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem('scan-export-name-templates') ?? '{}'); }
  catch { return {}; }
};

function examTypeColor(type?: string) {
  const t = type?.toUpperCase() ?? '';
  if (t.includes('PAPER')) return 'blue';
  if (t.includes('TEXAM')) return 'purple';
  if (t.includes('ONLINE')) return 'cyan';
  return 'default';
}

interface ExportTabProps {
  portfolioId: number;
  exams: Exam[];
}

export function ExportTab({ portfolioId, exams }: ExportTabProps) {
  const { notification } = AntApp.useApp();
  const { token } = theme.useToken();

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

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>

      {/* ── Portfolio-Aktionen ── */}
      <Card size="small" title="Portfolio">
        <Space size="large" wrap>
          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <Button
              type="dashed"
              icon={<ExportOutlined style={{ fontSize: 28 }} />}
              style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
              onClick={async () => {
                try {
                  const blob = await portfolioApi.downloadTrainingData(portfolioId);
                  triggerDownload(blob, `training_${portfolioId}.zip`);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Fehler';
                  notification.error({ message: msg });
                }
              }}
            />
            <Text style={{ fontSize: 12 }}>Trainingsdaten<br />exportieren</Text>
          </div>

          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <Button
              type="dashed"
              icon={<CloudUploadOutlined style={{ fontSize: 28 }} />}
              style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
              onClick={async () => {
                try {
                  await portfolioApi.uploadTrainingData(portfolioId);
                  notification.success({ message: 'Trainingsdaten hochgeladen' });
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Fehler';
                  notification.error({ message: msg });
                }
              }}
            />
            <Text style={{ fontSize: 12 }}>Trainingsdaten<br />hochladen</Text>
          </div>

          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <Button
              type="dashed"
              icon={<FileZipOutlined style={{ fontSize: 28 }} />}
              style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}
              onClick={async () => {
                try {
                  const blob = await portfolioApi.downloadArchive(portfolioId);
                  triggerDownload(blob, `portfolio_${portfolioId}.zip`);
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
                    {exam.imsId && <Text type="secondary" style={{ fontSize: 12 }}>Suite-ID: {exam.imsId}</Text>}
                    {displayType && <Tag color={examTypeColor(displayType)}>{displayType}</Tag>}
                    {isExported && <Tag icon={<CheckCircleOutlined />} color="success">Exportiert</Tag>}
                  </Space>
                ),
                children: (
                  <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <Descriptions size="small" column={2} style={{ flex: 1 }}>
                      <Descriptions.Item label="ID">{exam.id}</Descriptions.Item>
                      <Descriptions.Item label="Autor">{exam.author ?? '–'}</Descriptions.Item>
                      <Descriptions.Item label="Fragen">{exam.totalQuestions ?? '–'}</Descriptions.Item>
                      <Descriptions.Item label="Punkte">{exam.totalPoints ?? '–'}</Descriptions.Item>
                      <Descriptions.Item label="Varianten">{exam.variants ?? 1}</Descriptions.Item>
                      <Descriptions.Item label="Datum">{exam.examDate?.slice(0, 10) ?? '–'}</Descriptions.Item>
                      {exam.imsId && <Descriptions.Item label="Suite-ID">{exam.imsId}</Descriptions.Item>}
                      {exam.imsEntityId && <Descriptions.Item label="IMS Entity">{exam.imsEntityId}</Descriptions.Item>}
                    </Descriptions>

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
  );
}
