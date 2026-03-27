import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/utils/request';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerGrade = 'A' | 'B' | 'C';

interface ContactPerson {
  id: string;
  name: string;
  title: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

interface ContractHistory {
  id: string;
  contractNo: string;
  unit: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
}

interface Customer {
  id: string;
  companyName: string;
  creditCode: string;
  contactName: string;
  contactPhone: string;
  industry: string;
  grade: CustomerGrade;
  email?: string;
  address?: string;
  description?: string;
  contacts?: ContactPerson[];
  contractHistory?: ContractHistory[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gradeConfig: Record<CustomerGrade, { color: string; label: string }> = {
  A: { color: 'gold', label: 'A级' },
  B: { color: 'blue', label: 'B级' },
  C: { color: 'default', label: 'C级' },
};

const contractStatusMap: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: '生效中' },
  expiring_soon: { color: 'warning', label: '即将到期' },
  expired: { color: 'default', label: '已到期' },
  terminated: { color: 'error', label: '已终止' },
};

const industryOptions = [
  '零售', '餐饮', '服务', '教育', '医疗', '金融', '科技', '制造', '物流', '其他',
].map((v) => ({ value: v, label: v }));

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ customerId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    request
      .get<Customer>(`/customers/${customerId}`)
      .then((res) => setCustomer(res.data))
      .finally(() => setLoading(false));
  }, [customerId]);

  const contactColumns: ColumnsType<ContactPerson> = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '职位', dataIndex: 'title', key: 'title' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '主要联系人',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      render: (v: boolean) =>
        v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
    },
  ];

  const contractColumns: ColumnsType<ContractHistory> = [
    { title: '合同号', dataIndex: 'contractNo', key: 'contractNo' },
    { title: '铺位', dataIndex: 'unit', key: 'unit' },
    {
      title: '租期',
      key: 'period',
      render: (_: unknown, r: ContractHistory) =>
        `${r.startDate?.slice(0, 10)} ~ ${r.endDate?.slice(0, 10)}`,
    },
    {
      title: '月租金',
      dataIndex: 'monthlyRent',
      key: 'monthlyRent',
      align: 'right',
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const cfg = contractStatusMap[v] ?? { color: 'default', label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <Drawer
      title="客户详情"
      open={!!customerId}
      onClose={onClose}
      width={720}
      loading={loading}
    >
      {customer && (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Descriptions
            title="基本信息"
            bordered
            column={2}
            size="small"
          >
            <Descriptions.Item label="公司名称" span={2}>
              {customer.companyName}
            </Descriptions.Item>
            <Descriptions.Item label="统一社会信用代码">
              {customer.creditCode}
            </Descriptions.Item>
            <Descriptions.Item label="评级">
              <Tag color={gradeConfig[customer.grade]?.color}>
                {gradeConfig[customer.grade]?.label ?? customer.grade}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="主要联系人">
              {customer.contactName}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {customer.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label="行业">{customer.industry}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{customer.email}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {customer.address}
            </Descriptions.Item>
            {customer.description && (
              <Descriptions.Item label="备注" span={2}>
                {customer.description}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              联系人列表
            </Title>
            <Table<ContactPerson>
              columns={contactColumns}
              dataSource={customer.contacts ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 520 }}
            />
          </div>

          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              合同历史
            </Title>
            <Table<ContractHistory>
              columns={contractColumns}
              dataSource={customer.contractHistory ?? []}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 520 }}
            />
          </div>
        </Space>
      )}
    </Drawer>
  );
};

// ─── Add / Edit Drawer ────────────────────────────────────────────────────────

interface EditDrawerProps {
  open: boolean;
  editRecord: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditDrawer: React.FC<EditDrawerProps> = ({
  open,
  editRecord,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editRecord) {
        form.setFieldsValue(editRecord);
      } else {
        form.resetFields();
      }
    }
  }, [open, editRecord, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editRecord) {
        await request.put(`/customers/${editRecord.id}`, values);
        message.success('客户信息更新成功');
      } else {
        await request.post('/customers', values);
        message.success('客户创建成功');
      }
      onClose();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={editRecord ? '编辑客户' : '新增客户'}
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
          name="companyName"
          label="公司名称"
          rules={[{ required: true, message: '请输入公司名称' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="creditCode"
          label="统一社会信用代码"
          rules={[
            { required: true, message: '请输入统一社会信用代码' },
            { len: 18, message: '统一社会信用代码为18位' },
          ]}
        >
          <Input maxLength={18} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contactName"
              label="主要联系人"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contactPhone"
              label="联系电话"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="industry" label="行业">
              <Select options={industryOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="grade" label="评级">
              <Select
                options={[
                  { value: 'A', label: 'A级' },
                  { value: 'B', label: 'B级' },
                  { value: 'C', label: 'C级' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="email" label="邮箱">
          <Input type="email" />
        </Form.Item>
        <Form.Item name="address" label="地址">
          <Input />
        </Form.Item>
        <Form.Item name="description" label="备注">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Customers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | ''>('');

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Customer | null>(null);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, pageSize };
    if (search) params.search = search;
    if (gradeFilter) params.grade = gradeFilter;

    request
      .get<PaginatedResponse<Customer>>('/customers', { params })
      .then((res) => {
        setData(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, gradeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditRecord(null);
    setEditDrawerOpen(true);
  };

  const openEdit = (record: Customer) => {
    setEditRecord(record);
    setEditDrawerOpen(true);
  };

  const columns: ColumnsType<Customer> = [
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (v: string, record: Customer) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => setDetailCustomerId(record.id)}
        >
          {v}
        </Button>
      ),
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'creditCode',
      key: 'creditCode',
      width: 190,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 100,
    },
    {
      title: '电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 130,
    },
    { title: '行业', dataIndex: 'industry', key: 'industry', width: 100 },
    {
      title: '评级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (v: CustomerGrade) => {
        const cfg = gradeConfig[v];
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
      width: 120,
      render: (_: unknown, record: Customer) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailCustomerId(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            客户管理
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增客户
          </Button>
        </div>

        {/* Filter Bar */}
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col flex="280px">
            <Input
              placeholder="搜索公司名称 / 联系人 / 信用代码"
              prefix={<SearchOutlined />}
              allowClear
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col flex="140px">
            <Select
              style={{ width: '100%' }}
              placeholder="评级筛选"
              allowClear
              value={gradeFilter || undefined}
              onChange={(v) => {
                setGradeFilter((v as CustomerGrade) ?? '');
                setPage(1);
              }}
              options={[
                { value: 'A', label: 'A级' },
                { value: 'B', label: 'B级' },
                { value: 'C', label: 'C级' },
              ]}
            />
          </Col>
        </Row>

        <Table<Customer>
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
          onRow={(record) => ({
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* Edit / Add Drawer */}
      <EditDrawer
        open={editDrawerOpen}
        editRecord={editRecord}
        onClose={() => setEditDrawerOpen(false)}
        onSuccess={fetchData}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        customerId={detailCustomerId}
        onClose={() => setDetailCustomerId(null)}
      />
    </div>
  );
};

export default Customers;
