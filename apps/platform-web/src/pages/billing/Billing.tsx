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
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, SendOutlined, CheckOutlined, DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import request from '@/utils/request';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = 'draft' | 'pending' | 'sent' | 'partial' | 'paid' | 'overdue';
type ReceivableStatus = 'outstanding' | 'partial' | 'paid' | 'overdue';

interface BillItem {
  id: string;
  feeType: string;
  amount: number;
  description?: string;
}

interface Bill {
  id: string;
  billNo: string;
  tenantId: string;
  tenantName: string;
  unitNo: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: BillStatus;
  dueDate: string;
  items?: BillItem[];
}

interface Receivable {
  id: string;
  billNo: string;
  tenantName: string;
  receivableAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  status: ReceivableStatus;
  dueDate: string;
  overdueDays: number;
}

interface Contract {
  id: string;
  contractNo: string;
  tenantName: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const billStatusConfig: Record<BillStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '待审核' },
  sent: { color: 'blue', label: '已发送' },
  partial: { color: 'warning', label: '部分付款' },
  paid: { color: 'success', label: '已付清' },
  overdue: { color: 'error', label: '逾期' },
};

const receivableStatusConfig: Record<
  ReceivableStatus,
  { color: string; label: string }
> = {
  outstanding: { color: 'processing', label: '待收款' },
  partial: { color: 'warning', label: '部分收款' },
  paid: { color: 'success', label: '已收清' },
  overdue: { color: 'error', label: '逾期' },
};

const BILL_STATUSES = Object.entries(billStatusConfig).map(([k, v]) => ({
  value: k,
  label: v.label,
}));

const FEE_TYPES = [
  '基础租金',
  '物业费',
  '水费',
  '电费',
  '停车费',
  '装修保证金',
  '其他',
].map((v) => ({ value: v, label: v }));

// ─── Bill Detail Modal ────────────────────────────────────────────────────────

interface BillDetailModalProps {
  billId: string | null;
  onClose: () => void;
}

const BillDetailModal: React.FC<BillDetailModalProps> = ({
  billId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!billId) return;
    setLoading(true);
    request
      .get<Bill>(`/bills/${billId}`)
      .then((res) => setBill(res.data))
      .finally(() => setLoading(false));
  }, [billId]);

  const itemColumns: ColumnsType<BillItem> = [
    { title: '费用类型', dataIndex: 'feeType', key: 'feeType' },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    { title: '说明', dataIndex: 'description', key: 'description' },
  ];

  return (
    <Modal
      title="账单详情"
      open={!!billId}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={680}
      loading={loading}
    >
      {bill && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="账单号" span={2}>
              {bill.billNo}
            </Descriptions.Item>
            <Descriptions.Item label="租户">{bill.tenantName}</Descriptions.Item>
            <Descriptions.Item label="铺位">{bill.unitNo}</Descriptions.Item>
            <Descriptions.Item label="账期">
              {bill.periodStart?.slice(0, 10)} ~ {bill.periodEnd?.slice(0, 10)}
            </Descriptions.Item>
            <Descriptions.Item label="到期日">
              {bill.dueDate?.slice(0, 10)}
            </Descriptions.Item>
            <Descriptions.Item label="合计金额">
              <Text strong style={{ color: '#1677ff' }}>
                ¥
                {(bill.totalAmount ?? 0).toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                const cfg = billStatusConfig[bill.status];
                return cfg ? (
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                ) : (
                  <Tag>{bill.status}</Tag>
                );
              })()}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Title level={5} style={{ marginBottom: 8 }}>
              费用明细
            </Title>
            <Table<BillItem>
              columns={itemColumns}
              dataSource={bill.items ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              summary={(rows) => {
                const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>合计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>
                        ¥
                        {total.toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                  </Table.Summary.Row>
                );
              }}
            />
          </div>
        </Space>
      )}
    </Modal>
  );
};

// ─── New Bill Drawer ──────────────────────────────────────────────────────────

interface NewBillDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewBillDrawer: React.FC<NewBillDrawerProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setContractsLoading(true);
    request
      .get<{ items: Contract[] }>('/contracts', {
        params: { status: 'active', pageSize: 200 },
      })
      .then((res) => setContracts(res.data.items ?? []))
      .finally(() => setContractsLoading(false));
  }, [open, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    const [periodStart, periodEnd] = values.period ?? [];
    setSaving(true);
    try {
      await request.post('/bills', {
        ...values,
        periodStart: periodStart?.format('YYYY-MM-DD'),
        periodEnd: periodEnd?.format('YYYY-MM-DD'),
        period: undefined,
      });
      message.success('账单创建成功');
      onClose();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="新建账单"
      open={open}
      onClose={onClose}
      width={600}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="contractId"
          label="选择合同"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            loading={contractsLoading}
            placeholder="搜索合同"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={contracts.map((c) => ({
              value: c.id,
              label: `${c.contractNo} - ${c.tenantName}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="period" label="账期起止" rules={[{ required: true }]}>
          <RangePicker style={{ width: '100%' }} picker="month" />
        </Form.Item>
        <Form.Item name="dueDate" label="账单到期日" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Title level={5} style={{ marginBottom: 12 }}>
          费用项
        </Title>
        <Form.List name="items" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ marginBottom: 12, background: '#fafafa' }}
                  extra={
                    fields.length > 1 ? (
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    ) : null
                  }
                >
                  <Row gutter={12}>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'feeType']}
                        label="费用类型"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select options={FEE_TYPES} />
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        name={[name, 'amount']}
                        label="金额"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: '100%' }}
                          prefix="¥"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    {...restField}
                    name={[name, 'description']}
                    label="说明"
                    style={{ marginTop: 8, marginBottom: 0 }}
                  >
                    <Input placeholder="可选" />
                  </Form.Item>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                添加费用项
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
};

// ─── Bill Management Tab ──────────────────────────────────────────────────────

const BillManagementTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [periodMonth, setPeriodMonth] = useState<dayjs.Dayjs | null>(null);

  const [detailBillId, setDetailBillId] = useState<string | null>(null);
  const [newDrawerOpen, setNewDrawerOpen] = useState(false);
  const [autoGenModal, setAutoGenModal] = useState(false);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenPeriod, setAutoGenPeriod] = useState<dayjs.Dayjs | null>(dayjs().subtract(1, 'month'));

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, pageSize };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    if (periodMonth) params.period = periodMonth.format('YYYY-MM');

    request
      .get<PaginatedResponse<Bill>>('/bills', { params })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, statusFilter, search, periodMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    await request.post(`/bills/${id}/approve`);
    message.success('审核通过');
    fetchData();
  };

  const handleSend = async (id: string) => {
    await request.post(`/bills/${id}/send`);
    message.success('账单已发送');
    fetchData();
  };

  const handleAutoGenerate = async () => {
    if (!autoGenPeriod) return;
    setAutoGenLoading(true);
    try {
      const res = await request.post('/billing/auto-generate', {
        year: autoGenPeriod.year(),
        month: autoGenPeriod.month() + 1,
      });
      const { generated, skipped, errors } = res.data as any;
      message.success(`生成成功：${generated} 张，跳过：${skipped} 张，失败：${errors} 张`);
      setAutoGenModal(false);
      fetchData();
    } finally {
      setAutoGenLoading(false);
    }
  };

  const columns: ColumnsType<Bill> = [
    { title: '账单号', dataIndex: 'billNo', key: 'billNo', width: 150 },
    { title: '租户', dataIndex: 'tenantName', key: 'tenantName' },
    { title: '铺位', dataIndex: 'unitNo', key: 'unitNo', width: 100 },
    {
      title: '账期',
      key: 'period',
      width: 200,
      render: (_: unknown, r: Bill) =>
        `${r.periodStart?.slice(0, 10)} ~ ${r.periodEnd?.slice(0, 10)}`,
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 130,
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: BillStatus) => {
        const cfg = billStatusConfig[v];
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
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: Bill) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailBillId(record.id)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record.id)}
            >
              审核
            </Button>
          )}
          {(record.status === 'draft' || record.status === 'pending') && (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleSend(record.id)}
            >
              发送
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            href={`/api/v1/bills/${record.id}/pdf`}
            target="_blank"
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16,
          gap: 8,
        }}
      >
        <Button
          icon={<ThunderboltOutlined />}
          onClick={() => setAutoGenModal(true)}
        >
          自动生成账单
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewDrawerOpen(true)}
        >
          新建账单
        </Button>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="260px">
          <Input
            placeholder="搜索账单号 / 租户"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col flex="160px">
          <Select
            style={{ width: '100%' }}
            placeholder="状态筛选"
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v ?? '');
              setPage(1);
            }}
            options={BILL_STATUSES}
          />
        </Col>
        <Col flex="180px">
          <DatePicker
            style={{ width: '100%' }}
            picker="month"
            placeholder="账期月份"
            value={periodMonth}
            onChange={(v) => {
              setPeriodMonth(v);
              setPage(1);
            }}
          />
        </Col>
      </Row>

      <Table<Bill>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 1100 }}
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

      <BillDetailModal
        billId={detailBillId}
        onClose={() => setDetailBillId(null)}
      />
      <NewBillDrawer
        open={newDrawerOpen}
        onClose={() => setNewDrawerOpen(false)}
        onSuccess={fetchData}
      />

      <Modal
        title="自动生成账单"
        open={autoGenModal}
        onOk={handleAutoGenerate}
        onCancel={() => setAutoGenModal(false)}
        confirmLoading={autoGenLoading}
        okText="生成"
      >
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="选择账期月份" required>
            <DatePicker
              picker="month"
              style={{ width: '100%' }}
              value={autoGenPeriod}
              onChange={(v) => setAutoGenPeriod(v)}
            />
          </Form.Item>
          <Typography.Text type="secondary">
            系统将为所有生效中合同自动生成该月账单（已存在账单的合同将跳过）。
          </Typography.Text>
        </Form>
      </Modal>
    </>
  );
};

// ─── Receivables Tab ──────────────────────────────────────────────────────────

const ReceivablesTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, pageSize };
    if (statusFilter) params.status = statusFilter;

    request
      .get<PaginatedResponse<Receivable>>('/finance/receivables', { params })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<Receivable> = [
    { title: '账单号', dataIndex: 'billNo', key: 'billNo', width: 150 },
    { title: '租户', dataIndex: 'tenantName', key: 'tenantName' },
    {
      title: '应收金额',
      dataIndex: 'receivableAmount',
      key: 'receivableAmount',
      align: 'right',
      width: 130,
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '已收金额',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      align: 'right',
      width: 130,
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '欠款余额',
      dataIndex: 'balanceAmount',
      key: 'balanceAmount',
      align: 'right',
      width: 130,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          ¥{(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: ReceivableStatus) => {
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
    {
      title: '逾期天数',
      dataIndex: 'overdueDays',
      key: 'overdueDays',
      width: 100,
      align: 'right',
      render: (v: number) =>
        v > 0 ? (
          <Tag color={v > 60 ? 'error' : v > 30 ? 'warning' : 'processing'}>
            {v} 天
          </Tag>
        ) : (
          '-'
        ),
    },
  ];

  const receivableStatusOptions = Object.entries(receivableStatusConfig).map(
    ([k, v]) => ({ value: k, label: v.label })
  );

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="160px">
          <Select
            style={{ width: '100%' }}
            placeholder="状态筛选"
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v ?? '');
              setPage(1);
            }}
            options={receivableStatusOptions}
          />
        </Col>
      </Row>

      <Table<Receivable>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 900 }}
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
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Billing: React.FC = () => {
  const tabItems = [
    {
      key: 'bills',
      label: '账单管理',
      children: <BillManagementTab />,
    },
    {
      key: 'receivables',
      label: '应收账款',
      children: <ReceivablesTab />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <Title level={5} style={{ marginBottom: 16 }}>
          账单管理
        </Title>
        <Tabs defaultActiveKey="bills" items={tabItems} size="large" />
      </Card>
    </div>
  );
};

export default Billing;
