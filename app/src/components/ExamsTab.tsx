import { App as AntApp, Button, Badge, Collapse, Descriptions, Divider, Space, Tag, Typography, Upload, theme } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { examApi } from '../api/examApi';
import { portfolioApi } from '../api/portfolioApi';
import { Exam } from '../types/exam';
import { triggerDownload } from '../utils/downloadUtils';

const { Text } = Typography;

interface ExamsTabProps {
  portfolioId: number;
  exams: Exam[];
}

function examTypeColor(type?: string) {
  const t = type?.toUpperCase() ?? '';
  if (t.includes('PAPER')) return 'blue';
  if (t.includes('TEXAM')) return 'purple';
  if (t.includes('ONLINE')) return 'cyan';
  return 'default';
}

function examStateBadge(state?: string): 'success' | 'processing' | 'error' | 'warning' | 'default' {
  const s = state?.toUpperCase() ?? '';
  if (s.includes('DONE') || s.includes('FINISHED')) return 'success';
  if (s.includes('ACTIVE') || s.includes('RUNNING')) return 'processing';
  if (s.includes('ERROR') || s.includes('FAIL')) return 'error';
  if (s.includes('WAIT') || s.includes('PENDING')) return 'warning';
  return 'default';
}

function formatBool(val?: boolean) {
  return val === true
    ? <Tag color="green">Ja</Tag>
    : val === false
      ? <Tag>Nein</Tag>
      : <Text type="secondary">–</Text>;
}

function formatVal(val?: string | number | null) {
  return (val !== undefined && val !== null && val !== '') ? String(val) : '–';
}

export function ExamsTab({ portfolioId, exams }: ExamsTabProps) {
  const { notification } = AntApp.useApp();
  const { token } = theme.useToken();

  const examPanels = exams.map((exam) => {
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

          <Descriptions title="Grundinformationen" size="small" bordered column={2}>
            <Descriptions.Item label="Titel">{formatVal(exam.title ?? exam.name)}</Descriptions.Item>
            <Descriptions.Item label="Autor">{formatVal(exam.author)}</Descriptions.Item>
            <Descriptions.Item label="Überschrift">{formatVal(exam.headLine)}</Descriptions.Item>
            <Descriptions.Item label="Unterüberschrift">{formatVal(exam.subHeadLine)}</Descriptions.Item>
            <Descriptions.Item label="Prüfungsdatum">{formatVal(exam.examDate?.slice(0, 10))}</Descriptions.Item>
            <Descriptions.Item label="Dauer (min)">{formatVal(exam.duration)}</Descriptions.Item>
            <Descriptions.Item label="Varianten">{formatVal(exam.variants)}</Descriptions.Item>
            <Descriptions.Item label="Typ">{displayType ? <Tag color={examTypeColor(displayType)}>{displayType}</Tag> : '–'}</Descriptions.Item>
            <Descriptions.Item label="Suite-ID">{formatVal(exam.imsId)}</Descriptions.Item>
            <Descriptions.Item label="Suite Entity-ID">{formatVal(exam.imsEntityId)}</Descriptions.Item>
            <Descriptions.Item label="Exportiert">{formatBool(exam.exported)}</Descriptions.Item>
            <Descriptions.Item label="Antwort-Permutation">{formatBool(exam.answerPermutation)}</Descriptions.Item>
            <Descriptions.Item label="Zweistufige Nummerierung">{formatBool(exam.secondLevelNumbering)}</Descriptions.Item>
            <Descriptions.Item label="Antwortbögen gesamt">{formatVal(exam.totalExamAnswerSheets)}</Descriptions.Item>
          </Descriptions>

          <Descriptions title="Inhalt & Punkte" size="small" bordered column={3}>
            <Descriptions.Item label="Fragen gesamt">{formatVal(exam.totalQuestions)}</Descriptions.Item>
            <Descriptions.Item label="Items gesamt">{formatVal(exam.totalItems)}</Descriptions.Item>
            <Descriptions.Item label="Punkte gesamt">{formatVal(exam.totalPoints)}</Descriptions.Item>
          </Descriptions>

          {exam.introduction && (
            <div>
              <Text strong>Einleitung</Text>
              <div
                style={{ marginTop: 6, padding: '8px 12px', background: token.colorBgLayout, borderRadius: 6, fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: exam.introduction }}
              />
            </div>
          )}

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

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={async () => {
            try {
              const blob = await portfolioApi.downloadAnswerSheets(portfolioId);
              triggerDownload(blob, `answerSheets_${portfolioId}.pdf`);
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
          items={examPanels}
          bordered={false}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
}
