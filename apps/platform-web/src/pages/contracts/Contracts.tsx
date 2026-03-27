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
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, EyeOutlined, StopOutlined, RobotOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/utils/request';

const { RangePicker } = DatePicker;
const { Title } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated';

type BillingType = 'fixed' | 'stepped' | 'guarantee_plus_share' | 'pure_share';

interface Contract {
  id: string;
  contractNo: string;
  tenantId: string;
  tenantName: string;
  unitId: string;
  unitNo: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  propertyFee: number;
  billingType: BillingType;
  freeDays: number;
  status: ContractStatus;
  description?: string;
}

interface Tenant {
  id: string;
  companyName: string;
}

interface Unit {
  id: string;
  unitNo: string;
  area: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const contractStatusConfig: Record<
  ContractStatus,
  { color: string; label: string }
> = {
  draft: { color: 'default', label: '草稿' },
  pending_approval: { color: 'processing', label: '审批中' },
  active: { color: 'success', label: '生效中' },
  expiring_soon: { color: 'warning', label: '即将到期' },
  expired: { color: 'default', label: '已到期' },
  terminated: { color: 'error', label: '已终止' },
};

const billingTypeLabels: Record<BillingType, string> = {
  fixed: '固定租金',
  stepped: '阶梯租金',
  guarantee_plus_share: '保底+抽成',
  pure_share: '纯抽成',
};

const CONTRACT_STATUSES = Object.entries(contractStatusConfig).map(
  ([k, v]) => ({ value: k, label: v.label })
);

const BILLING_TYPES = Object.entries(billingTypeLabels).map(([k, v]) => ({
  value: k,
  label: v,
}));

// ─── AI Parse Drawer ──────────────────────────────────────────────────────────

interface ParsedResult {
  partyA?: string;
  partyB?: string;
  startDate?: string;
  endDate?: string;
  baseRent?: number;
  propertyFee?: number;
  billingType?: string;
  rentFreeDays?: number;
  guaranteeAmount?: number;
  revenueShareRate?: number;
  notes?: string;
  raw?: string;
}

interface AiParseDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AiParseDrawer: React.FC<AiParseDrawerProps> = ({ open, onClose, onSuccess }) => {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);

  const handleUpload = async (file: File) => {
    setParsing(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await request.post('/contract-ai/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data as ParsedResult);
    } catch {
      message.error('AI 解析失败，请检查 ANTHROPIC_API_KEY 配置');
    } finally {
      setParsing(false);
    }
    return false;
  };

  const fieldLabels: Record<string, string> = {
    partyA: '甲方（出租方）',
    partyB: '乙方（承租方）',
    startDate: '起租日期',
    endDate: '到期日期',
    baseRent: '基础租金（元/月）',
    propertyFee: '物业费（元/月）',
    billingType: '计租类型',
    rentFreeDays: '免租天数',
    guaranteeAmount: '保底金额',
    revenueShareRate: '抽成比例（%）',
    notes: '备注',
  };

  return (
    <Drawer
      title="AI 合同解析"
      open={open}
      onClose={() => { onClose(); setResult(null); }}
      width={560}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        上传合同文本文件（.txt / .pdf），AI 将自动提取关键字段供参考。
      </Typography.Paragraph>

      <Upload
        accept=".txt,.pdf,.doc,.docx"
        showUploadList={false}
        beforeUpload={(f) => { handleUpload(f); return false; }}
      >
        <Button icon={<UploadOutlined />} loading={parsing} type="primary">
          {parsing ? 'AI 解析中...' : '选择合同文件并解析'}
        </Button>
      </Upload>

      {result && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>解析结果</Typography.Title>
          <Descriptions bordered column={1} size="small">
            {Object.entries(fieldLabels).map(([key, label]) => {
              const val = (result as any)[key];
              if (val == null) return null;
              return (
                <Descriptions.Item key={key} label={label}>
                  {String(val)}
                </Descriptions.Item>
              );
            })}
          </Descriptions>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 12, fontSize: 12 }}
          >
            以上为 AI 提取结果，请核实后手动创建或编辑合同。
          </Typography.Paragraph>
        </div>
      )}
    </Drawer>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  contractId: string | null;
  onClose: () => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ contractId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (!contractId) return;
    setLoading(true);
    request
      .get<Contract>(`/contracts/${contractId}`)
      .then((res) => setContract(res.data))
      .finally(() => setLoading(false));
  }, [contractId]);

  return (
    <Drawer
      title="合同详情"
      open={!!contractId}
      onClose={onClose}
      width={640}
      loading={loading}
    >
      {contract && (
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="合同编号" span={2}>
            {contract.contractNo}
          </Descriptions.Item>
          <Descriptions.Item label="租户">{contract.tenantName}</Descriptions.Item>
          <Descriptions.Item label="铺位号">{contract.unitNo}</Descriptions.Item>
          <Descriptions.Item label="起租日期">
            {contract.startDate?.slice(0, 10)}
          </Descriptions.Item>
          <Descriptions.Item label="到期日期">
            {contract.endDate?.slice(0, 10)}
          </Descriptions.Item>
          <Descriptions.Item label="基础租金/月">
            ¥{(contract.monthlyRent ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="物业费/月">
            ¥{(contract.propertyFee ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="计租类型">
            {billingTypeLabels[contract.billingType] ?? contract.billingType}
          </Descriptions.Item>
          <Descriptions.Item label="免租天数">
            {contract.freeDays ?? 0} 天
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {(() => {
              const cfg = contractStatusConfig[contract.status];
              return cfg ? (
                <Tag color={cfg.color}>{cfg.label}</Tag>
              ) : (
                <Tag>{contract.status}</Tag>
              );
            })()}
          </Descriptions.Item>
          {contract.description && (
            <Descriptions.Item label="备注" span={2}>
              {contract.description}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Drawer>
  );
};

// ─── New Contract Drawer ──────────────────────────────────────────────────────

interface NewContractDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewContractDrawer: React.FC<NewContractDrawerProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setTenantsLoading(true);
    request
      .get<{ items: Tenant[] }>('/customers')
      .then((res) => setTenants(res.data.items ?? []))
      .finally(() => setTenantsLoading(false));

    setUnitsLoading(true);
    request
      .get<{ items: Unit[] }>('/units', { params: { status: 'vacant' } })
      .then((res) => setUnits(res.data.items ?? []))
      .finally(() => setUnitsLoading(false));
  }, [open, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    const [startDate, endDate] = values.dateRange ?? [];
    setSaving(true);
    try {
      await request.post('/contracts', {
        ...values,
        startDate: startDate?.format('YYYY-MM-DD'),
        endDate: endDate?.format('YYYY-MM-DD'),
        dateRange: undefined,
      });
      message.success('合同创建成功');
      onClose();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="新建合同"
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
          name="tenantId"
          label="选择租户"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            loading={tenantsLoading}
            placeholder="搜索租户"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={tenants.map((t) => ({
              value: t.id,
              label: t.companyName,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="unitId"
          label="选择铺位"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            loading={unitsLoading}
            placeholder="搜索铺位"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={units.map((u) => ({
              value: u.id,
              label: `${u.unitNo} (${u.area}㎡)`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="dateRange"
          label="起止日期"
          rules={[{ required: true }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="monthlyRent"
              label="基础租金(元/月)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="propertyFee" label="物业费(元/月)">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="freeDays" label="免租天数">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="billingType"
              label="计租类型"
              rules={[{ required: true }]}
            >
              <Select options={BILLING_TYPES} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="备注">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

// ─── Contract Table ───────────────────────────────────────────────────────────

interface ContractTableProps {
  expiringOnly?: boolean;
}

const ContractTable: React.FC<ContractTableProps> = ({
  expiringOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [search, setSearch] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [newDrawerOpen, setNewDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean> = {
      page,
      pageSize,
    };
    if (expiringOnly) params.expiringSoon = true;
    if (statusFilter) params.status = statusFilter;
    if (tenantFilter) params.tenantId = tenantFilter;
    if (search) params.search = search;

    request
      .get<PaginatedResponse<Contract>>('/contracts', { params })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, expiringOnly, statusFilter, tenantFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTerminate = async (id: string) => {
    await request.post(`/contracts/${id}/terminate`);
    message.success('合同已终止');
    fetchData();
  };

  const columns: ColumnsType<Contract> = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 150,
    },
    {
      title: '租户名称',
      dataIndex: 'tenantName',
      key: 'tenantName',
    },
    {
      title: '铺位号',
      dataIndex: 'unitNo',
      key: 'unitNo',
      width: 100,
    },
    {
      title: '租期',
      key: 'period',
      width: 220,
      render: (_: unknown, r: Contract) =>
        `${r.startDate?.slice(0, 10)} ~ ${r.endDate?.slice(0, 10)}`,
    },
    {
      title: '基础租金/月',
      dataIndex: 'monthlyRent',
      key: 'monthlyRent',
      align: 'right',
      width: 130,
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '计租类型',
      dataIndex: 'billingType',
      key: 'billingType',
      width: 130,
      render: (v: BillingType) => billingTypeLabels[v] ?? v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: ContractStatus) => {
        const cfg = contractStatusConfig[v];
        return cfg ? (
          <Tag color={cfg.color}>{cfg.label}</Tag>
        ) : (
          <Tag>{v}</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Contract) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailId(record.id)}
          >
            查看
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确认终止合同？"
              description="终止后不可恢复，请谨慎操作。"
              onConfirm={() => handleTerminate(record.id)}
              okText="确认终止"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
              >
                终止
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {!expiringOnly && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 16,
            gap: 8,
          }}
        >
          <Button
            icon={<RobotOutlined />}
            onClick={() => setAiDrawerOpen(true)}
          >
            AI 解析合同
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewDrawerOpen(true)}
          >
            新建合同
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="260px">
          <Input
            placeholder="搜索合同编号 / 租户"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        {!expiringOnly && (
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
              options={CONTRACT_STATUSES}
            />
          </Col>
        )}
      </Row>

      <Table<Contract>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 1000 }}
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

      <DetailDrawer
        contractId={detailId}
        onClose={() => setDetailId(null)}
      />
      <NewContractDrawer
        open={newDrawerOpen}
        onClose={() => setNewDrawerOpen(false)}
        onSuccess={fetchData}
      />
      <AiParseDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        onSuccess={fetchData}
      />
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Contracts: React.FC = () => {
  const tabItems = [
    {
      key: 'all',
      label: '全部合同',
      children: <ContractTable />,
    },
    {
      key: 'expiring',
      label: '即将到期(30天)',
      children: <ContractTable expiringOnly />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <Title level={5} style={{ marginBottom: 16 }}>
          合同管理
        </Title>
        <Tabs defaultActiveKey="all" items={tabItems} size="large" />
      </Card>
    </div>
  );
};

export default Contracts;
