import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { PlusOutlined, UploadOutlined, SyncOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Bar } from '@ant-design/plots';
import dayjs from 'dayjs';
import request from '@/utils/request';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'online' | 'other';

interface Payment {
  id: string;
  paymentDate: string;
  tenantName: string;
  amount: number;
  method: PaymentMethod;
  referenceNo: string;
  billNo?: string;
}

interface Receivable {
  id: string;
  billNo: string;
  tenantName: string;
  receivableAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  status: string;
  dueDate: string;
}

interface ReceivableSummary {
  totalReceivable: number;
  totalReceived: number;
  overdueAmount: number;
  newThisMonth: number;
}

interface MonthlyIncome {
  month: string;
  amount: number;
  category: string;
}

interface AgingBucket {
  tenantName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  total: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank_transfer: '银行转账',
  cash: '现金',
  check: '支票',
  online: '线上支付',
  other: '其他',
};

const PAYMENT_METHODS = Object.entries(paymentMethodLabels).map(([k, v]) => ({
  value: k,
  label: v,
}));

const formatAmount = (v: number) =>
  `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

// ─── Register Payment Modal ───────────────────────────────────────────────────

interface RegisterPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [receivablesLoading, setReceivablesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setReceivablesLoading(true);
    request
      .get<PaginatedResponse<Receivable>>('/finance/receivables', {
        params: { status: 'outstanding,partial,overdue', pageSize: 200 },
      })
      .then((res) => setReceivables(res.data.items ?? []))
      .finally(() => setReceivablesLoading(false));
  }, [open, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await request.post('/finance/payments', {
        ...values,
        paymentDate: values.paymentDate?.format('YYYY-MM-DD'),
      });
      message.success('收款登记成功');
      onClose();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="登记收款"
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="receivableId"
          label="选择应收项目"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            loading={receivablesLoading}
            placeholder="搜索账单号 / 租户"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={receivables.map((r) => ({
              value: r.id,
              label: `${r.billNo} - ${r.tenantName} (余额: ${formatAmount(r.balanceAmount)})`,
            }))}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="收款金额"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                style={{ width: '100%' }}
                prefix="¥"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="paymentDate"
              label="收款日期"
              rules={[{ required: true }]}
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="method"
              label="收款方式"
              rules={[{ required: true }]}
            >
              <Select options={PAYMENT_METHODS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="referenceNo" label="参考号">
              <Form.Item name="referenceNo" noStyle>
                <input
                  style={{
                    width: '100%',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    padding: '4px 11px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                  placeholder="流水号/支票号"
                />
              </Form.Item>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ─── Payment Registration Tab ─────────────────────────────────────────────────

const PaymentRegistrationTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    request
      .get<PaginatedResponse<Payment>>('/finance/payments', {
        params: { page, pageSize },
      })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<Payment> = [
    {
      title: '收款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: (v: string) => v?.slice(0, 10),
    },
    { title: '租户', dataIndex: 'tenantName', key: 'tenantName' },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (v: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatAmount(v)}
        </Text>
      ),
    },
    {
      title: '收款方式',
      dataIndex: 'method',
      key: 'method',
      width: 120,
      render: (v: PaymentMethod) => paymentMethodLabels[v] ?? v,
    },
    {
      title: '参考号',
      dataIndex: 'referenceNo',
      key: 'referenceNo',
      width: 160,
    },
    {
      title: '关联账单',
      dataIndex: 'billNo',
      key: 'billNo',
      width: 150,
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16,
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          登记收款
        </Button>
      </div>
      <Table<Payment>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 700 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
      <RegisterPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />
    </>
  );
};

// ─── Receivable Summary Tab ───────────────────────────────────────────────────

const ReceivableSummaryTab: React.FC = () => {
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [summary, setSummary] = useState<ReceivableSummary | null>(null);
  const [data, setData] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    request
      .get<ReceivableSummary>('/finance/receivables/summary')
      .then((res) => setSummary(res.data))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setTableLoading(true);
    request
      .get<PaginatedResponse<Receivable>>('/finance/receivables', {
        params: { page, pageSize },
      })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setTableLoading(false));
  }, [page, pageSize]);

  const receivableStatusConfig: Record<
    string,
    { color: string; label: string }
  > = {
    outstanding: { color: 'processing', label: '待收款' },
    partial: { color: 'warning', label: '部分收款' },
    paid: { color: 'success', label: '已收清' },
    overdue: { color: 'error', label: '逾期' },
  };

  const columns: ColumnsType<Receivable> = [
    { title: '账单号', dataIndex: 'billNo', key: 'billNo', width: 150 },
    { title: '租户', dataIndex: 'tenantName', key: 'tenantName' },
    {
      title: '应收金额',
      dataIndex: 'receivableAmount',
      key: 'receivableAmount',
      align: 'right',
      width: 130,
      render: (v: number) => formatAmount(v),
    },
    {
      title: '已收金额',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      align: 'right',
      width: 130,
      render: (v: number) => formatAmount(v),
    },
    {
      title: '余额',
      dataIndex: 'balanceAmount',
      key: 'balanceAmount',
      align: 'right',
      width: 130,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          {formatAmount(v)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const cfg = receivableStatusConfig[v];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (v: string) => v?.slice(0, 10),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statsLoading ? (
          [0, 1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} xl={6}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))
        ) : (
          <>
            <Col xs={24} sm={12} xl={6}>
              <Card bordered={false} style={{ background: '#f0f5ff' }}>
                <Statistic
                  title="应收总额"
                  value={summary?.totalReceivable ?? 0}
                  prefix="¥"
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#2f54eb', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card bordered={false} style={{ background: '#f6ffed' }}>
                <Statistic
                  title="已收款"
                  value={summary?.totalReceived ?? 0}
                  prefix="¥"
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card bordered={false} style={{ background: '#fff1f0' }}>
                <Statistic
                  title="逾期金额"
                  value={summary?.overdueAmount ?? 0}
                  prefix="¥"
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card bordered={false} style={{ background: '#fff7e6' }}>
                <Statistic
                  title="本月新增应收"
                  value={summary?.newThisMonth ?? 0}
                  prefix="¥"
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Table<Receivable>
        columns={columns}
        dataSource={data}
        loading={tableLoading}
        rowKey="id"
        size="middle"
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />
    </>
  );
};

// ─── Income Report Tab ────────────────────────────────────────────────────────

const IncomeReportTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthlyIncome[]>([]);
  const [year, setYear] = useState<dayjs.Dayjs>(dayjs());

  useEffect(() => {
    setLoading(true);
    request
      .get<MonthlyIncome[]>('/finance/income/report', {
        params: { year: year.year() },
      })
      .then((res) => setData(res.data ?? []))
      .finally(() => setLoading(false));
  }, [year]);

  const barConfig = {
    data,
    xField: 'month',
    yField: 'amount',
    colorField: 'category',
    group: true,
    label: false,
    yAxis: {
      label: {
        formatter: (v: string) =>
          `¥${Number(v).toLocaleString('zh-CN')}`,
      },
    },
    tooltip: {
      formatter: (datum: MonthlyIncome) => ({
        name: datum.category,
        value: formatAmount(datum.amount),
      }),
    },
    height: 360,
  };

  const tableColumns: ColumnsType<MonthlyIncome> = [
    { title: '月份', dataIndex: 'month', key: 'month', width: 100 },
    { title: '类别', dataIndex: 'category', key: 'category' },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v: number) => formatAmount(v),
    },
  ];

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Typography.Text>选择年份：</Typography.Text>
        </Col>
        <Col>
          <DatePicker
            picker="year"
            value={year}
            onChange={(v) => v && setYear(v)}
          />
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Button
            icon={<DownloadOutlined />}
            href={`/api/v1/finance/reports/income-pdf?year=${year.year()}`}
            target="_blank"
          >
            下载收入报表 PDF
          </Button>
        </Col>
      </Row>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card bordered={false} title="月度收入图表">
              <Bar {...barConfig} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card bordered={false} title="收入明细">
              <Table<MonthlyIncome>
                columns={tableColumns}
                dataSource={data}
                rowKey={(r) => `${r.month}-${r.category}`}
                size="small"
                pagination={false}
                scroll={{ y: 360 }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

// ─── Aging Analysis Tab ───────────────────────────────────────────────────────

const AgingAnalysisTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AgingBucket[]>([]);

  useEffect(() => {
    setLoading(true);
    request
      .get<AgingBucket[]>('/finance/aging')
      .then((res) => setData(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const amountRender = (v: number) =>
    v > 0 ? (
      <Typography.Text style={{ color: v > 50000 ? '#ff4d4f' : 'inherit' }}>
        {formatAmount(v)}
      </Typography.Text>
    ) : (
      <Typography.Text type="secondary">-</Typography.Text>
    );

  const columns: ColumnsType<AgingBucket> = [
    {
      title: '租户',
      dataIndex: 'tenantName',
      key: 'tenantName',
      fixed: 'left',
      width: 180,
    },
    {
      title: '当前',
      dataIndex: 'current',
      key: 'current',
      align: 'right',
      width: 130,
      render: amountRender,
    },
    {
      title: '1-30天',
      dataIndex: 'days1to30',
      key: 'days1to30',
      align: 'right',
      width: 130,
      render: amountRender,
    },
    {
      title: '31-60天',
      dataIndex: 'days31to60',
      key: 'days31to60',
      align: 'right',
      width: 130,
      render: amountRender,
    },
    {
      title: '61-90天',
      dataIndex: 'days61to90',
      key: 'days61to90',
      align: 'right',
      width: 130,
      render: amountRender,
    },
    {
      title: '90天以上',
      dataIndex: 'daysOver90',
      key: 'daysOver90',
      align: 'right',
      width: 130,
      render: (v: number) =>
        v > 0 ? (
          <Typography.Text strong style={{ color: '#ff4d4f' }}>
            {formatAmount(v)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: '合计',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      width: 130,
      fixed: 'right',
      render: (v: number) => (
        <Typography.Text strong>{formatAmount(v)}</Typography.Text>
      ),
    },
  ];

  const summaryData = data.length > 0
    ? {
        current: data.reduce((s, r) => s + (r.current ?? 0), 0),
        days1to30: data.reduce((s, r) => s + (r.days1to30 ?? 0), 0),
        days31to60: data.reduce((s, r) => s + (r.days31to60 ?? 0), 0),
        days61to90: data.reduce((s, r) => s + (r.days61to90 ?? 0), 0),
        daysOver90: data.reduce((s, r) => s + (r.daysOver90 ?? 0), 0),
        total: data.reduce((s, r) => s + (r.total ?? 0), 0),
      }
    : null;

  return (
    <>
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <Button
          icon={<DownloadOutlined />}
          href="/api/v1/finance/reports/aging-pdf"
          target="_blank"
        >
          下载账龄报表 PDF
        </Button>
      </div>
      <Table<AgingBucket>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="tenantName"
        size="middle"
        scroll={{ x: 900, y: 450 }}
        pagination={false}
        summary={() =>
          summaryData ? (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0}>
                  <Typography.Text strong>合计</Typography.Text>
                </Table.Summary.Cell>
                {[
                  summaryData.current,
                  summaryData.days1to30,
                  summaryData.days31to60,
                  summaryData.days61to90,
                  summaryData.daysOver90,
                  summaryData.total,
                ].map((v, i) => (
                  <Table.Summary.Cell key={i} index={i + 1} align="right">
                    <Typography.Text strong>{formatAmount(v)}</Typography.Text>
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </>
  );
};

// ─── Bank Reconciliation Tab ──────────────────────────────────────────────────

interface BankStatementItem {
  id: string;
  transactionDate: string;
  amount: number;
  reference: string | null;
  description: string | null;
  matchStatus: 'unmatched' | 'matched' | 'manual';
  matchedReceivableId: string | null;
}

const BankReconciliationTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BankStatementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [matchFilter, setMatchFilter] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: any = { page, pageSize: 20 };
    if (matchFilter) params.matchStatus = matchFilter;
    request.get('/reconciliation/statements', { params })
      .then((res: any) => {
        setData(res.data.list ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, matchFilter]);

  const fetchSummary = useCallback(() => {
    request.get('/reconciliation/summary').then((res: any) => setSummary(res.data));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await request.post('/reconciliation/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(`导入成功 ${(res.data as any).imported} 条`);
      fetchData();
      fetchSummary();
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleAutoMatch = async () => {
    setAutoMatchLoading(true);
    try {
      const res = await request.post('/reconciliation/auto-match');
      message.success(`自动匹配成功 ${(res.data as any).matched} 条`);
      fetchData();
      fetchSummary();
    } finally {
      setAutoMatchLoading(false);
    }
  };

  const matchStatusConfig: Record<string, { color: string; label: string }> = {
    unmatched: { color: 'error', label: '未匹配' },
    matched: { color: 'success', label: '已匹配' },
    manual: { color: 'processing', label: '手动匹配' },
  };

  const columns: ColumnsType<BankStatementItem> = [
    { title: '交易日期', dataIndex: 'transactionDate', key: 'date', width: 120, render: (v: string) => v?.slice(0, 10) },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (v: number) => <Typography.Text strong style={{ color: '#1677ff' }}>{formatAmount(v)}</Typography.Text>,
    },
    { title: '参考号', dataIndex: 'reference', key: 'reference', width: 160 },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '匹配状态',
      dataIndex: 'matchStatus',
      key: 'matchStatus',
      width: 110,
      render: (v: string) => {
        const cfg = matchStatusConfig[v];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: '关联应收款',
      dataIndex: 'matchedReceivableId',
      key: 'matchedReceivableId',
      render: (v: string | null) => v ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>{v.slice(0, 8)}...</Typography.Text> : '-',
    },
  ];

  return (
    <>
      {summary && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          <Col xs={8}><Card size="small"><Statistic title="总流水" value={summary.total} /></Card></Col>
          <Col xs={8}><Card size="small"><Statistic title="已匹配" value={summary.matched} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col xs={8}><Card size="small"><Statistic title="未匹配" value={summary.unmatched} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        </Row>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Upload accept=".csv,.xlsx,.xls" showUploadList={false} beforeUpload={(f) => { handleUpload(f); return false; }}>
          <Button icon={<UploadOutlined />} loading={uploading}>导入流水（CSV/Excel）</Button>
        </Upload>
        <Button icon={<SyncOutlined />} loading={autoMatchLoading} onClick={handleAutoMatch}>
          自动匹配
        </Button>
        <Select
          placeholder="匹配状态筛选"
          allowClear
          style={{ width: 140 }}
          value={matchFilter || undefined}
          onChange={(v) => { setMatchFilter(v ?? ''); setPage(1); }}
          options={[
            { value: 'unmatched', label: '未匹配' },
            { value: 'matched', label: '已匹配' },
            { value: 'manual', label: '手动匹配' },
          ]}
        />
      </div>

      <Table<BankStatementItem>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />
    </>
  );
};

// ─── Collection Management Tab ────────────────────────────────────────────────

interface OverdueReceivable {
  id: string;
  billNo?: string;
  customerId: string;
  amount: number;
  balance: number;
  dueDate: string;
  overdueDays: number;
}

interface CollectionRecordItem {
  id: string;
  method: string;
  level: number;
  notes: string | null;
  createdAt: string;
}

const levelColors: Record<number, string> = { 1: 'warning', 2: 'orange', 3: 'error' };
const methodLabels: Record<string, string> = {
  system: '系统', phone: '电话', email: '邮件', visit: '上门',
};

const CollectionManagementTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState<{ L1: OverdueReceivable[]; L2: OverdueReceivable[]; L3: OverdueReceivable[] }>({ L1: [], L2: [], L3: [] });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<OverdueReceivable | null>(null);
  const [records, setRecords] = useState<CollectionRecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchLevels = useCallback(() => {
    setLoading(true);
    request.get('/finance/receivables/overdue-by-level')
      .then((res: any) => setLevels(res.data ?? { L1: [], L2: [], L3: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const fetchRecords = (receivableId: string) => {
    setRecordsLoading(true);
    request.get('/finance/collection-records', { params: { receivableId } })
      .then((res: any) => setRecords(res.data.list ?? []))
      .finally(() => setRecordsLoading(false));
  };

  const handleAdd = async () => {
    if (!selectedReceivable) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await request.post('/finance/collection-records', {
        receivableId: selectedReceivable.id,
        customerId: selectedReceivable.customerId,
        level: values.level,
        method: values.method,
        notes: values.notes,
      });
      message.success('跟进记录已添加');
      setAddModalOpen(false);
      form.resetFields();
      fetchLevels();
    } finally {
      setSaving(false);
    }
  };

  const overdueColumns: ColumnsType<OverdueReceivable> = [
    {
      title: '应收余额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (v: number) => <Typography.Text strong style={{ color: '#ff4d4f' }}>{formatAmount(v)}</Typography.Text>,
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '逾期天数',
      dataIndex: 'overdueDays',
      key: 'overdueDays',
      width: 90,
      render: (v: number) => <Tag color={v > 30 ? 'error' : 'warning'}>{v} 天</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: OverdueReceivable) => (
        <Button
          type="link"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedReceivable(record);
            fetchRecords(record.id);
            setAddModalOpen(true);
          }}
        >
          添加跟进
        </Button>
      ),
    },
  ];

  const renderLevelTable = (levelKey: 'L1' | 'L2' | 'L3', label: string) => {
    const levelNum = parseInt(levelKey.slice(1), 10);
    return (
      <Card
        title={<><Tag color={levelColors[levelNum]}>{label}</Tag> {levelKey === 'L1' ? '逾期 1-7 天' : levelKey === 'L2' ? '逾期 8-30 天' : '逾期 30 天以上'}</>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Table<OverdueReceivable>
          columns={overdueColumns}
          dataSource={levels[levelKey]}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    );
  };

  return (
    <>
      {renderLevelTable('L1', 'L1')}
      {renderLevelTable('L2', 'L2')}
      {renderLevelTable('L3', 'L3')}

      <Modal
        title="添加催收跟进记录"
        open={addModalOpen}
        onOk={handleAdd}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        destroyOnClose
        width={520}
      >
        {records.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>历史跟进记录：</Typography.Text>
            <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
              {records.map((r) => (
                <div key={r.id} style={{ fontSize: 12, padding: '2px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Tag color="blue">{methodLabels[r.method] ?? r.method}</Tag>
                  <Typography.Text type="secondary">{r.createdAt?.slice(0, 10)}</Typography.Text>
                  {r.notes && <Typography.Text style={{ marginLeft: 8 }}>{r.notes}</Typography.Text>}
                </div>
              ))}
            </div>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method" label="跟进方式" rules={[{ required: true }]}>
                <Select options={Object.entries(methodLabels).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="催收等级" rules={[{ required: true }]}>
                <Select options={[{ value: 1, label: 'L1' }, { value: 2, label: 'L2' }, { value: 3, label: 'L3' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="跟进内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Financial: React.FC = () => {
  const tabItems = [
    {
      key: 'payments',
      label: '收款登记',
      children: <PaymentRegistrationTab />,
    },
    {
      key: 'summary',
      label: '应收汇总',
      children: <ReceivableSummaryTab />,
    },
    {
      key: 'report',
      label: '收入报表',
      children: <IncomeReportTab />,
    },
    {
      key: 'aging',
      label: '账龄分析',
      children: <AgingAnalysisTab />,
    },
    {
      key: 'reconciliation',
      label: '银行对账',
      children: <BankReconciliationTab />,
    },
    {
      key: 'collection',
      label: '催收管理',
      children: <CollectionManagementTab />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>
          财务管理
        </Typography.Title>
        <Tabs defaultActiveKey="payments" items={tabItems} size="large" />
      </Card>
    </div>
  );
};

export default Financial;
