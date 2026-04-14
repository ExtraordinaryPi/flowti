import { useState, useEffect, useCallback } from 'react';
import {
  Modal, Segmented, Form, Input, Upload, Table, Spin, App as AntApp,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import type { Portfolio } from '../types/portfolio';

type Tab = 'qti' | 'ims' | 'imslist';

interface ImsExam {
  id: number;
  name: string;
  date: string;
}

interface Props {
  open: boolean;
  folderId?: number;
  onClose: () => void;
  onSuccess: (portfolio: Portfolio) => void;
}

const IMS_IDS_PATTERN = /^\d+(,\d+)*$/;

const IMS_EXAM_COLUMNS: ColumnsType<ImsExam> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Datum', dataIndex: 'date', key: 'date', width: 120 },
];

export function AddPortfolioDialog({ open, folderId, onClose, onSuccess }: Props) {
  const { notification } = AntApp.useApp();
  const [form] = Form.useForm();
  const [tab, setTab] = useState<Tab>('qti');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [imsExams, setImsExams] = useState<ImsExam[]>([]);
  const [imsExamsLoading, setImsExamsLoading] = useState(false);
  const [selectedImsIds, setSelectedImsIds] = useState<number[]>([]);

  const loadImsExamList = useCallback(async () => {
    setImsExamsLoading(true);
    try {
      const list = await portfolioApi.getImsExamList();
      setImsExams(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Fehler beim Laden der Exam-Liste', description: msg });
    } finally {
      setImsExamsLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    if (tab === 'imslist' && open) {
      loadImsExamList();
    }
  }, [tab, open, loadImsExamList]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setFiles([]);
    setSelectedImsIds([]);
    setTab('qti');
  }, [form]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleImport = useCallback(async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    if (tab === 'qti' && files.length === 0) {
      notification.warning({ message: 'Bitte mindestens eine ZIP-Datei auswählen' });
      return;
    }
    if (tab === 'imslist' && selectedImsIds.length === 0) {
      notification.warning({ message: 'Bitte mindestens einen Eintrag auswählen' });
      return;
    }

    setLoading(true);
    try {
      const portfolioName = form.getFieldValue('portfolioName') as string;
      let portfolio: Portfolio;

      if (tab === 'qti') {
        const formData = new FormData();
        files.forEach((f) => { if (f.originFileObj) formData.append('files', f.originFileObj); });
        formData.append('portfolioName', portfolioName);
        if (folderId !== undefined) formData.append('folderId', String(folderId));
        portfolio = await portfolioApi.importQti(formData);
      } else {
        const formData = new FormData();
        if (tab === 'ims') {
          formData.append('ids', form.getFieldValue('imsIds') as string);
        } else {
          formData.append('ids', selectedImsIds.join(','));
        }
        formData.append('portfolioName', portfolioName);
        if (folderId !== undefined) formData.append('folderId', String(folderId));
        portfolio = await portfolioApi.importIms(formData);
      }

      handleClose();
      onSuccess(portfolio);
      notification.success({ message: `Portfolio „${portfolio.name}" wurde erstellt` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      notification.error({ message: 'Import fehlgeschlagen', description: msg });
    } finally {
      setLoading(false);
    }
  }, [tab, files, selectedImsIds, form, handleClose, onSuccess, notification]);

  // Enter-Taste löst Import aus
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) handleImport();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleImport]);

  const uploadProps: UploadProps = {
    multiple: true,
    accept: '.zip',
    fileList: files,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      setFiles(fileList);
      if (fileList.length === 1) {
        // Dateiname ohne Extension als Portfolio-Name vorausfüllen
        const name = fileList[0].name.replace(/\.zip$/i, '');
        form.setFieldValue('portfolioName', name);
        form.validateFields(['portfolioName']).catch(() => {});
      }
    },
  };

  const tabSegments = [
    { label: 'QTI Import', value: 'qti' },
    { label: 'IMS QTI', value: 'ims' },
    { label: 'IMS Exam-Liste', value: 'imslist' },
  ];

  return (
    <Modal
      title="Portfolio hinzufügen"
      open={open}
      onCancel={handleClose}
      onOk={handleImport}
      okText="Importieren"
      cancelText="Abbrechen"
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      {/* Tab-Auswahl */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Segmented
          options={tabSegments}
          value={tab}
          onChange={(v) => {
            setTab(v as Tab);
            form.resetFields(['imsIds']);
            setFiles([]);
            setSelectedImsIds([]);
          }}
        />
      </div>

      <Form form={form} layout="vertical" requiredMark="optional">
        {/* Tab 1: QTI-Datei hochladen */}
        {tab === 'qti' && (
          <Form.Item label="QTI-Dateien (ZIP)">
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Dateien hier ablegen oder klicken</p>
              <p className="ant-upload-hint">Nur .zip-Dateien · Mehrfachauswahl möglich</p>
            </Upload.Dragger>
          </Form.Item>
        )}

        {/* Tab 2: IMS QTI IDs */}
        {tab === 'ims' && (
          <Form.Item
            name="imsIds"
            label="IMS QTI IDs"
            rules={[
              { required: true, message: 'Bitte IDs eingeben' },
              {
                pattern: IMS_IDS_PATTERN,
                message: 'Kommagetrennte Zahlen, z. B. 1,2,3',
              },
            ]}
          >
            <Input placeholder="z. B. 101,102,103" />
          </Form.Item>
        )}

        {/* Tab 3: IMS Exam-Liste */}
        {tab === 'imslist' && (
          <Form.Item label="Prüfungen auswählen">
            <Spin spinning={imsExamsLoading}>
              <Table<ImsExam>
                columns={IMS_EXAM_COLUMNS}
                dataSource={imsExams}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 240 }}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedImsIds,
                  onChange: (keys) => setSelectedImsIds(keys as number[]),
                }}
              />
            </Spin>
          </Form.Item>
        )}

        {/* Portfolio-Name (immer sichtbar) */}
        <Form.Item
          name="portfolioName"
          label="Portfolio-Name"
          rules={[
            { required: tab !== 'qti' || files.length !== 1, message: 'Bitte einen Namen eingeben' },
            { max: 50, message: 'Maximal 50 Zeichen' },
          ]}
        >
          <Input
            placeholder="Neues Portfolio"
            maxLength={50}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
