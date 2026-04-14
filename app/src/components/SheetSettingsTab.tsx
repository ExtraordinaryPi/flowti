import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Select, Switch, InputNumber, Input, Tabs, Upload,
  Space, Typography, Divider, App as AntApp, Spin, Tooltip, Row, Col,
} from 'antd';
import {
  DownloadOutlined, ReloadOutlined, UploadOutlined, DeleteOutlined,
  InfoCircleOutlined, FileOutlined, FilePdfOutlined, PictureOutlined,
} from '@ant-design/icons';
import { portfolioApi } from '../api/portfolioApi';
import type { PortfolioConfig } from '../types/portfolio';

const { Text } = Typography;

// ─── Typen ───────────────────────────────────────────────────────────────────

type PreviewTab = 'answer' | 'question' | 'cover';

interface Props {
  portfolioId: number;
  totalQuestionSheets?: number;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

const SORTING_OPTIONS = [
  { label: 'ID (eindeutig)', value: 'IDENTIFIER' },
  { label: 'Vorname', value: 'FIRST_NAME' },
  { label: 'Nachname', value: 'LAST_NAME' },
  { label: 'Variante', value: 'VARIANT' },
  { label: 'Variante alternierend', value: 'VARIANT_ALTERNATING' },
  { label: 'Exam-ID', value: 'EXAM_ID' },
  { label: 'Exam-Zeit', value: 'EXAM_TIME' },
];

const GROUPING_OPTIONS = [
  { label: 'Keine', value: 'NONE' },
  { label: 'Examen', value: 'EXAM' },
  { label: 'Prüflinge', value: 'EXAMINEE' },
];

const LANGUAGE_OPTIONS = [
  { label: 'Deutsch', value: 'de' },
  { label: 'Englisch', value: 'en' },
  { label: 'Französisch', value: 'fr' },
];

const FREE_TEXT_OPTIONS = [
  { label: 'Keine', value: 'NONE' },
  { label: 'Standard', value: 'DEFAULT' },
  { label: 'Klein', value: 'SMALL' },
  { label: '¼ Seite', value: 'QUARTER_PAGE' },
  { label: '½ Seite', value: 'HALF_PAGE' },
  { label: '¾ Seite', value: 'SEVENTY_FIVE_PAGE' },
  { label: 'Ganze Seite', value: 'FULL_PAGE' },
];

const NAME_SCHEME_VARS_ALL =
  '{portfolioId} {portfolioName} {examId} {examName} {examineeId} {examineeIdent} {examineeFirstname} {examineeLastname} {examineeVariant}';

// ─── Hilfs-Zeile: Label + Steuerelement ─────────────────────────────────────

function SettingRow({
  label, tooltip, children, disabled,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Row align="middle" style={{ marginBottom: 8, opacity: disabled ? 0.45 : 1 }}>
      <Col flex="1">
        <Space size={4}>
          <Text style={{ fontSize: 13 }}>{label}</Text>
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} />
            </Tooltip>
          )}
        </Space>
      </Col>
      <Col>{children}</Col>
    </Row>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function SheetSettingsTab({ portfolioId, totalQuestionSheets }: Props) {
  const { notification, modal } = AntApp.useApp();

  const [config, setConfig] = useState<PortfolioConfig>({});
  const [examineesCount, setExamineesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('answer');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Revoke alte Blob-URL beim Wechsel, um Memory-Leaks zu verhindern
  const prevBlobUrl = useRef<string | null>(null);

  // ── Portfolio laden ──

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [portfolio, examineePage] = await Promise.all([
        portfolioApi.getById(portfolioId),
        portfolioApi.getExaminees(portfolioId, { size: 1 }),
      ]);
      setConfig(portfolio.portfolioConfig ?? {});
      setExamineesCount(examineePage.totalElements);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: 'Konfiguration konnte nicht geladen werden', description: msg });
    } finally {
      setLoading(false);
    }
  }, [portfolioId, notification]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Preview laden (via API-Client mit Bearer-Token) ──

  const loadPreview = useCallback(async (tab: PreviewTab) => {
    setPreviewLoading(true);
    // Alte Blob-URL freigeben
    if (prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current);
      prevBlobUrl.current = null;
    }
    setPreviewBlobUrl(null);
    setPreviewError(null);
    try {
      let blob: Blob;
      if (tab === 'answer') {
        blob = await portfolioApi.downloadAnswerSheetPreview(portfolioId);
      } else if (tab === 'question') {
        blob = await portfolioApi.downloadQuestionSheetPreview(portfolioId);
      } else {
        blob = await portfolioApi.downloadCoverPagePreview(portfolioId);
      }
      const url = URL.createObjectURL(blob);
      prevBlobUrl.current = url;
      setPreviewBlobUrl(url);
    } catch {
      setPreviewError('Vorschau nicht verfügbar');
    } finally {
      setPreviewLoading(false);
    }
  }, [portfolioId]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  // Hilfsfunktion: Vorschau nach Speichern neu laden
  const refreshPreview = useCallback(() => loadPreview(previewTab), [loadPreview, previewTab]);

  // Vorschau laden wenn Tab wechselt
  useEffect(() => { loadPreview(previewTab); }, [previewTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Konfiguration speichern ──

  const save = useCallback(async (patch: Partial<PortfolioConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    try {
      const portfolio = await portfolioApi.getById(portfolioId);
      await portfolioApi.update(portfolioId, {
        id: portfolioId,
        name: portfolio.name,
        state: portfolio.state,
        portfolioConfig: next,
      });
      loadPreview(previewTab);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: 'Speichern fehlgeschlagen', description: msg });
    } finally {
      setSaving(false);
    }
  }, [config, portfolioId, notification, loadPreview, previewTab]);

  // ── Antwortbögen generieren ──

  const handleGenerate = useCallback(async () => {
    // Bei grouping = NONE (Default) läuft die inkrementelle Backend-Logik ins Leere
    // wenn seit dem letzten Download nichts geändert wurde → immer regenerieren.
    const needsFullRegenerate = forceRegenerate || !config.grouping || config.grouping === 'NONE';

    const doGenerate = async () => {
      try {
        const blob = needsFullRegenerate
          ? await portfolioApi.downloadRegeneratedAnswerSheets(portfolioId)
          : await portfolioApi.downloadAnswerSheets(portfolioId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AnswerSheet_${portfolioId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setForceRegenerate(false);
        refreshPreview();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Fehler';
        notification.error({ message: 'Generierung fehlgeschlagen', description: msg });
      }
    };

    if (needsFullRegenerate) {
      modal.confirm({
        title: 'Achtung!',
        content: 'Antwortbögen werden neu generiert. Bereits vorhandene Daten können überschrieben werden.',
        okText: 'Ja, neu generieren',
        cancelText: 'Abbrechen',
        okButtonProps: { danger: true },
        onOk: doGenerate,
      });
    } else {
      doGenerate();
    }
  }, [portfolioId, forceRegenerate, config.grouping, notification, modal]);

  // ── Logo-Upload ──

  const uploadLogo = (type: 'coverPage' | 'answerSheet') => async (file: File) => {
    try {
      if (type === 'coverPage') {
        await portfolioApi.uploadCoverPageLogo(portfolioId, file);
      } else {
        await portfolioApi.uploadAnswerSheetLogo(portfolioId, file);
      }
      notification.success({ message: 'Logo hochgeladen' });
      await loadConfig();
      refreshPreview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: msg });
    }
    return false;
  };

  const deleteLogo = async (type: 'coverPage' | 'answerSheet') => {
    try {
      if (type === 'coverPage') {
        await portfolioApi.deleteCoverPageLogo(portfolioId);
      } else {
        await portfolioApi.deleteAnswerSheetLogo(portfolioId);
      }
      notification.success({ message: 'Logo entfernt' });
      await loadConfig();
      refreshPreview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: msg });
    }
  };

  // ── Fragebögen neu laden ──

  const reloadQuestionSheets = async () => {
    try {
      await portfolioApi.reloadQuestionSheets(portfolioId);
      notification.success({ message: 'Fragebögen neu geladen' });
      refreshPreview();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler';
      notification.error({ message: msg });
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }

  const hasQuestionSheets = (totalQuestionSheets ?? 0) > 0;
  const groupingIsExamOrNoneNonIdent =
    config.grouping === 'EXAM' ||
    (config.grouping === 'NONE' && config.sortingPrimary !== 'IDENTIFIER');
  const canSplitSheets =
    hasQuestionSheets && !!config.withQuestionSheets && !config.intersperseQuestionAnswerSheets;
  const canIntersperse =
    hasQuestionSheets && !!config.withQuestionSheets;

  // ─── Linkes Panel: Generierungseinstellungen ─────────────────────────────

  const leftPanel = (
    <div style={{ width: 260, flexShrink: 0, overflowY: 'auto', paddingRight: 8 }}>
      <Spin spinning={saving} size="small">

        <Text strong style={{ display: 'block', marginBottom: 12 }}>Generierung</Text>

        {/* Fragebögen */}
        <SettingRow label="Fragebögen" disabled={!hasQuestionSheets}>
          <Switch
            size="small"
            checked={!!config.withQuestionSheets}
            disabled={!hasQuestionSheets}
            onChange={(v) => save({ withQuestionSheets: v })}
          />
        </SettingRow>

        {/* Deckblatt */}
        <SettingRow label="Deckblatt" disabled={groupingIsExamOrNoneNonIdent}>
          <Switch
            size="small"
            checked={!!config.coverPage}
            disabled={groupingIsExamOrNoneNonIdent}
            onChange={(v) => save({ coverPage: v })}
          />
        </SettingRow>

        {/* Musterlösung */}
        <SettingRow label="Musterlösung">
          <Switch size="small" checked={!!config.modelSolution} onChange={(v) => save({ modelSolution: v })} />
        </SettingRow>

        <Divider style={{ margin: '10px 0' }} />

        {/* Gruppierung */}
        <SettingRow label="Gruppierung">
          <Select
            size="small"
            value={config.grouping ?? 'NONE'}
            options={GROUPING_OPTIONS}
            style={{ width: 140 }}
            onChange={(v) => save({ grouping: v })}
          />
        </SettingRow>

        {/* Sortierung */}
        <SettingRow label="Sortierung 1.">
          <Select size="small" value={config.sortingPrimary} options={SORTING_OPTIONS} style={{ width: 140 }} onChange={(v) => save({ sortingPrimary: v })} />
        </SettingRow>
        <SettingRow label="Sortierung 2.">
          <Select size="small" value={config.sortingSecondary} options={SORTING_OPTIONS} style={{ width: 140 }} onChange={(v) => save({ sortingSecondary: v })} />
        </SettingRow>
        <SettingRow label="Sortierung 3.">
          <Select size="small" value={config.sortingTertiary} options={SORTING_OPTIONS} style={{ width: 140 }} onChange={(v) => save({ sortingTertiary: v })} />
        </SettingRow>

        <Divider style={{ margin: '10px 0' }} />

        {/* Anordnung */}
        <SettingRow label="Verflechten" disabled={!canIntersperse}>
          <Switch size="small" checked={!!config.intersperseQuestionAnswerSheets} disabled={!canIntersperse} onChange={(v) => save({ intersperseQuestionAnswerSheets: v })} />
        </SettingRow>
        <SettingRow label="Aufteilen" disabled={!canSplitSheets}>
          <Switch size="small" checked={!!config.splitQuestionAnswerSheet} disabled={!canSplitSheets} onChange={(v) => save({ splitQuestionAnswerSheet: v })} />
        </SettingRow>
        <SettingRow label="Fragebogen nach AB" disabled={!canSplitSheets || !!config.splitQuestionAnswerSheet}>
          <Switch size="small" checked={!!config.questionSheetAfterAnswerSheet} disabled={!canSplitSheets || !!config.splitQuestionAnswerSheet} onChange={(v) => save({ questionSheetAfterAnswerSheet: v })} />
        </SettingRow>
        <SettingRow label="Duplex">
          <Switch size="small" checked={!!config.duplex} onChange={(v) => save({ duplex: v })} />
        </SettingRow>

        <Divider style={{ margin: '10px 0' }} />

        {/* Seitennummerierung */}
        <SettingRow label="Getrennte Seitennr. (Q/A)">
          <Switch size="small" checked={!!config.questionAnswerSheetSeparatePageNumber} onChange={(v) => save({ questionAnswerSheetSeparatePageNumber: v })} />
        </SettingRow>
        <SettingRow label="Getrennte Seitennr. (Examen)">
          <Switch size="small" checked={!!config.examsSeparatePageNumber} onChange={(v) => save({ examsSeparatePageNumber: v })} />
        </SettingRow>

        <Divider style={{ margin: '10px 0' }} />

        {/* Namensschema */}
        <div style={{ marginBottom: 8 }}>
          <Space size={4}>
            <Text style={{ fontSize: 13 }}>Fragebogen-Schema</Text>
            <Tooltip title={NAME_SCHEME_VARS_ALL}><InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} /></Tooltip>
          </Space>
          <Input.TextArea
            size="small"
            rows={2}
            value={config.questionSheetNamingScheme ?? ''}
            style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}
            disabled={!config.splitQuestionAnswerSheet || config.grouping === 'NONE' || !config.withQuestionSheets}
            onBlur={(e) => save({ questionSheetNamingScheme: e.target.value })}
            onChange={(e) => setConfig((c) => ({ ...c, questionSheetNamingScheme: e.target.value }))}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <Space size={4}>
            <Text style={{ fontSize: 13 }}>Antwortbogen-Schema</Text>
            <Tooltip title={NAME_SCHEME_VARS_ALL}><InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} /></Tooltip>
          </Space>
          <Input.TextArea
            size="small"
            rows={2}
            value={config.answerSheetNamingScheme ?? ''}
            style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}
            disabled={config.grouping === 'NONE'}
            onBlur={(e) => save({ answerSheetNamingScheme: e.target.value })}
            onChange={(e) => setConfig((c) => ({ ...c, answerSheetNamingScheme: e.target.value }))}
          />
        </div>

        <Divider style={{ margin: '10px 0' }} />

        {/* Fragebögen neu laden */}
        <Button size="small" icon={<ReloadOutlined />} block style={{ marginBottom: 8 }} onClick={reloadQuestionSheets}>
          Fragebögen aus IMS neu laden
        </Button>

        {/* Antwortbögen generieren */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Space size={4} style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 12 }}>Neu generieren</Text>
            <Switch size="small" checked={forceRegenerate} onChange={setForceRegenerate} />
          </Space>
          <Tooltip title={examineesCount === 0 ? 'Keine Prüflinge vorhanden' : undefined}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              block
              disabled={examineesCount === null || examineesCount === 0}
              onClick={handleGenerate}
            >
              Antwortbögen herunterladen
            </Button>
          </Tooltip>
        </div>
      </Spin>
    </div>
  );

  // ─── Layout-Einstellungen (rechtes Panel) ────────────────────────────────

  const logoRow = (type: 'coverPage' | 'answerSheet', logoBase64?: string | null) => (
    <div style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13 }}>{type === 'coverPage' ? 'Deckblatt-Logo' : 'Antwortbogen-Logo'}</Text>
      <Space style={{ marginTop: 4 }}>
        <Upload accept=".png,.jpg,.jpeg,.tif,.tiff" showUploadList={false} beforeUpload={uploadLogo(type)}>
          <Button size="small" icon={<UploadOutlined />}>Upload</Button>
        </Upload>
        <Button
          size="small"
          icon={<DeleteOutlined />}
          disabled={!logoBase64}
          danger
          onClick={() => deleteLogo(type)}
        >
          Entfernen
        </Button>
      </Space>
      {logoBase64 && (
        <div style={{ marginTop: 6 }}>
          <img src={`data:image/png;base64,${logoBase64}`} alt="logo" style={{ maxHeight: 80, maxWidth: 120, border: '1px solid #eee', borderRadius: 4 }} />
        </div>
      )}
    </div>
  );

  const answerSheetSettings = (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', paddingRight: 4 }}>

      <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Allgemein</Text>

      <SettingRow label="Sprache">
        <Select size="small" value={config.language ?? 'de'} options={LANGUAGE_OPTIONS} style={{ width: 120 }} onChange={(v) => save({ language: v })} />
      </SettingRow>
      <SettingRow label="Skalierung (%)" tooltip="50–150">
        <InputNumber size="small" min={50} max={150} value={config.scale} style={{ width: 80 }} onBlur={(e) => save({ scale: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, scale: v ?? undefined }))} />
      </SettingRow>

      <Divider style={{ margin: '10px 0' }} />
      <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Logo</Text>
      {logoRow('answerSheet', config.answerSheetLogo)}

      <Divider style={{ margin: '10px 0' }} />
      <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Typografie</Text>

      <SettingRow label="Titelgröße">
        <InputNumber size="small" min={5} max={50} value={config.titleSize} style={{ width: 80 }} onBlur={(e) => save({ titleSize: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, titleSize: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Überschriftgröße">
        <InputNumber size="small" min={5} max={50} value={config.headingSize} style={{ width: 80 }} onBlur={(e) => save({ headingSize: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, headingSize: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Textgröße">
        <InputNumber size="small" min={5} max={50} value={config.textSize} style={{ width: 80 }} onBlur={(e) => save({ textSize: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, textSize: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Checkbox-Abstand">
        <Input size="small" value={config.checkboxSpacing ?? ''} style={{ width: 80 }} onBlur={(e) => save({ checkboxSpacing: e.target.value })} onChange={(e) => setConfig((c) => ({ ...c, checkboxSpacing: e.target.value }))} />
      </SettingRow>

      <Divider style={{ margin: '10px 0' }} />
      <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Struktur</Text>

      <SettingRow label="Spaltenanzahl" tooltip="1–4">
        <InputNumber size="small" min={1} max={4} value={config.columnCount} style={{ width: 80 }} onBlur={(e) => save({ columnCount: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, columnCount: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Einzelner Spalten-Header">
        <Switch size="small" checked={!!config.singleColumnHeader} onChange={(v) => save({ singleColumnHeader: v })} />
      </SettingRow>

      <div style={{ marginBottom: 8 }}>
        <Space size={4}>
          <Text style={{ fontSize: 13 }}>Linker Text</Text>
          <Tooltip title={NAME_SCHEME_VARS_ALL}><InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} /></Tooltip>
        </Space>
        <Input.TextArea size="small" rows={2} value={config.leftTextTemplate ?? ''} style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }} onBlur={(e) => save({ leftTextTemplate: e.target.value })} onChange={(e) => setConfig((c) => ({ ...c, leftTextTemplate: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <Space size={4}>
          <Text style={{ fontSize: 13 }}>Rechter Text</Text>
          <Tooltip title={NAME_SCHEME_VARS_ALL}><InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} /></Tooltip>
        </Space>
        <Input.TextArea size="small" rows={2} value={config.rightTextTemplate ?? ''} style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }} onBlur={(e) => save({ rightTextTemplate: e.target.value })} onChange={(e) => setConfig((c) => ({ ...c, rightTextTemplate: e.target.value }))} />
      </div>

      <SettingRow label="Freitexthöhe">
        <Select size="small" value={config.freeTextHeight ?? 'NONE'} options={FREE_TEXT_OPTIONS} style={{ width: 140 }} onChange={(v) => save({ freeTextHeight: v })} />
      </SettingRow>
      <SettingRow label="Fragen-Abstand-Interval">
        <InputNumber size="small" min={0} max={100} value={config.questionSpacerInterval} style={{ width: 80 }} onBlur={(e) => save({ questionSpacerInterval: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, questionSpacerInterval: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Marker-Offset">
        <InputNumber size="small" min={1} max={20} value={config.markerOffset} style={{ width: 80 }} onBlur={(e) => save({ markerOffset: Number(e.target.value) })} onChange={(v) => setConfig((c) => ({ ...c, markerOffset: v ?? undefined }))} />
      </SettingRow>
      <SettingRow label="Variante groß">
        <Switch size="small" checked={!!config.variantLarge} onChange={(v) => save({ variantLarge: v })} />
      </SettingRow>
      <SettingRow label="Variante farbig">
        <Switch size="small" checked={!!config.variantColour} onChange={(v) => save({ variantColour: v })} />
      </SettingRow>
      <SettingRow label="Kreuzbeispiel">
        <Switch size="small" checked={!!config.crossExample} onChange={(v) => save({ crossExample: v })} />
      </SettingRow>
    </div>
  );

  const coverPageSettings = (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', paddingRight: 4 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Logo</Text>
      {logoRow('coverPage', config.coverPageLogo)}
    </div>
  );

  const rightTabs = [
    { key: 'answer', label: <Space size={4}><FileOutlined />Antwortbögen</Space>, children: answerSheetSettings },
    { key: 'question', label: <Space size={4}><FilePdfOutlined />Fragebögen</Space>, children: <Text type="secondary">Keine zusätzlichen Einstellungen</Text> },
    { key: 'cover', label: <Space size={4}><PictureOutlined />Titelblatt</Space>, children: coverPageSettings },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)', overflow: 'hidden' }}>

      {/* Linkes Panel */}
      {leftPanel}

      {/* PDF-Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Space style={{ marginBottom: 8 }}>
          <Button.Group size="small">
            <Button
              type={previewTab === 'answer' ? 'primary' : 'default'}
              onClick={() => setPreviewTab('answer')}
            >
              Antwortbogen
            </Button>
            <Button
              type={previewTab === 'question' ? 'primary' : 'default'}
              disabled={!hasQuestionSheets}
              onClick={() => setPreviewTab('question')}
            >
              Fragebogen
            </Button>
            <Button
              type={previewTab === 'cover' ? 'primary' : 'default'}
              disabled={!config.coverPage}
              onClick={() => setPreviewTab('cover')}
            >
              Titelblatt
            </Button>
          </Button.Group>
          <Tooltip title="Vorschau neu laden">
            <Button size="small" icon={<ReloadOutlined />} loading={previewLoading} onClick={refreshPreview} />
          </Tooltip>
        </Space>
        <div style={{ flex: 1, position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#fff', minHeight: 0 }}>
          {previewLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
              <Spin tip="Vorschau wird geladen…" />
            </div>
          )}
          {previewBlobUrl ? (
            <iframe
              ref={iframeRef}
              src={previewBlobUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF-Vorschau"
            />
          ) : previewError && !previewLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, textAlign: 'center' }}>
              <FilePdfOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
              <Text type="secondary">Vorschau nicht verfügbar</Text>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                Dieser Portfolio-Typ unterstützt möglicherweise keine papierbasierte Vorschau.
              </Text>
            </div>
          ) : !previewLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 13 }}>
              Keine Vorschau verfügbar
            </div>
          ) : null}
        </div>
      </div>

      {/* Rechtes Panel */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
        <Tabs
          size="small"
          items={rightTabs}
          activeKey={previewTab}
          onChange={(k) => setPreviewTab(k as PreviewTab)}
        />
      </div>
    </div>
  );
}
