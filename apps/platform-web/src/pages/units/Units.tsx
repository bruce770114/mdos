import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  InputNumber,
  MenuProps,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/utils/request';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  address: string;
  totalArea: number;
  buildingCount: number;
  description?: string;
}

interface Building {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  floorCount: number;
  description?: string;
}

interface Floor {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  floorNumber: number;
  unitCount: number;
}

type UnitStatus =
  | 'vacant'
  | 'rented'
  | 'reserved'
  | 'renovating'
  | 'maintenance';

interface Unit {
  id: string;
  unitNo: string;
  area: number;
  type: string;
  status: UnitStatus;
  floorName: string;
  buildingName: string;
  projectName: string;
  projectId: string;
  description?: string;
}

interface UnitStats {
  totalUnits: number;
  vacantUnits: number;
  vacancyRate: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const unitStatusConfig: Record<
  UnitStatus,
  { color: string; label: string; antStatus: string }
> = {
  vacant: { color: 'success', label: '空置', antStatus: 'success' },
  rented: { color: 'processing', label: '已租', antStatus: 'processing' },
  reserved: { color: 'warning', label: '预租', antStatus: 'warning' },
  renovating: { color: 'gold', label: '装修中', antStatus: 'gold' },
  maintenance: { color: 'error', label: '维修中', antStatus: 'error' },
};

const UNIT_STATUSES = Object.entries(unitStatusConfig).map(([k, v]) => ({
  value: k,
  label: v.label,
}));

// ─── Project Tab ─────────────────────────────────────────────────────────────

const ProjectTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    request
      .get<{ items: Project[] }>('/projects')
      .then((res) => setData(res.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Project) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editRecord) {
        await request.put(`/projects/${editRecord.id}`, values);
        message.success('项目更新成功');
      } else {
        await request.post('/projects', values);
        message.success('项目创建成功');
      }
      setModalOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Project> = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '地址', dataIndex: 'address', key: 'address' },
    {
      title: '总面积(㎡)',
      dataIndex: 'totalArea',
      key: 'totalArea',
      align: 'right',
      render: (v: number) => v?.toLocaleString(),
    },
    {
      title: '楼宇数量',
      dataIndex: 'buildingCount',
      key: 'buildingCount',
      align: 'right',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Project) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增项目
        </Button>
      </div>
      <Table<Project>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editRecord ? '编辑项目' : '新增项目'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="totalArea" label="总面积(㎡)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── Building Tab ─────────────────────────────────────────────────────────────

const BuildingTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Building[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Building | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      request.get<{ items: Building[] }>('/buildings'),
      request.get<{ items: Project[] }>('/projects'),
    ])
      .then(([bRes, pRes]) => {
        setData(bRes.data.items ?? []);
        setProjects(pRes.data.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Building) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editRecord) {
        await request.put(`/buildings/${editRecord.id}`, values);
        message.success('楼宇更新成功');
      } else {
        await request.post('/buildings', values);
        message.success('楼宇创建成功');
      }
      setModalOpen(false);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Building> = [
    { title: '楼宇名称', dataIndex: 'name', key: 'name' },
    { title: '所属项目', dataIndex: 'projectName', key: 'projectName' },
    {
      title: '楼层数',
      dataIndex: 'floorCount',
      key: 'floorCount',
      align: 'right',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Building) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增楼宇
        </Button>
      </div>
      <Table<Building>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editRecord ? '编辑楼宇' : '新增楼宇'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="楼宇名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="projectId"
            label="所属项目"
            rules={[{ required: true }]}
          >
            <Select
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="floorCount" label="楼层数">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── Floor Tab ────────────────────────────────────────────────────────────────

const FloorTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Floor[]>([]);

  useEffect(() => {
    setLoading(true);
    request
      .get<{ items: Floor[] }>('/floors')
      .then((res) => setData(res.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const columns: ColumnsType<Floor> = [
    { title: '楼层名称', dataIndex: 'name', key: 'name' },
    { title: '所属楼宇', dataIndex: 'buildingName', key: 'buildingName' },
    {
      title: '楼层号',
      dataIndex: 'floorNumber',
      key: 'floorNumber',
      align: 'right',
    },
    {
      title: '单元数量',
      dataIndex: 'unitCount',
      key: 'unitCount',
      align: 'right',
    },
  ];

  return (
    <Table<Floor>
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      size="middle"
      pagination={{ pageSize: 10 }}
    />
  );
};

// ─── Unit Tab ─────────────────────────────────────────────────────────────────

const UnitTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UnitStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Unit | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState<{
    search: string;
    status: string;
    projectId: string;
  }>({ search: '', status: '', projectId: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.projectId) params.projectId = filters.projectId;

    Promise.all([
      request.get<{ items: Unit[] }>('/units', { params }),
      request.get<UnitStats>('/units/statistics'),
      request.get<{ items: Project[] }>('/projects'),
    ])
      .then(([uRes, sRes, pRes]) => {
        setData(uRes.data.items ?? []);
        setStats(sRes.data);
        setProjects(pRes.data.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Unit) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editRecord) {
        await request.put(`/units/${editRecord.id}`, values);
        message.success('单元更新成功');
      } else {
        await request.post('/units', values);
        message.success('单元创建成功');
      }
      setModalOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: UnitStatus) => {
    await request.patch(`/units/${id}/status`, { status });
    message.success('状态已更新');
    fetchData();
  };

  const statusMenuItems = (record: Unit): MenuProps['items'] =>
    UNIT_STATUSES.filter((s) => s.value !== record.status).map((s) => ({
      key: s.value,
      label: s.label,
      onClick: () => handleStatusChange(record.id, s.value as UnitStatus),
    }));

  const columns: ColumnsType<Unit> = [
    { title: '单元编号', dataIndex: 'unitNo', key: 'unitNo', width: 120 },
    {
      title: '面积(㎡)',
      dataIndex: 'area',
      key: 'area',
      align: 'right',
      width: 100,
      render: (v: number) => v?.toLocaleString(),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: UnitStatus) => {
        const cfg = unitStatusConfig[v];
        return cfg ? (
          <Tag color={cfg.color}>{cfg.label}</Tag>
        ) : (
          <Tag>{v}</Tag>
        );
      },
    },
    {
      title: '所在楼层',
      dataIndex: 'floorName',
      key: 'floorName',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Unit) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Dropdown menu={{ items: statusMenuItems(record) }} trigger={['click']}>
            <Button type="link" size="small">
              状态变更 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Stats card */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
              <Statistic title="总单元数" value={stats.totalUnits} suffix="个" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
              <Statistic title="空置单元" value={stats.vacantUnits} suffix="个" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
              <Statistic
                title="空置率"
                value={((stats.vacancyRate ?? 0) * 100).toFixed(1)}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter bar */}
      <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
        <Col flex="240px">
          <Input
            placeholder="搜索单元编号"
            prefix={<SearchOutlined />}
            allowClear
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </Col>
        <Col flex="160px">
          <Select
            style={{ width: '100%' }}
            placeholder="状态筛选"
            allowClear
            value={filters.status || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, status: v ?? '' }))}
            options={UNIT_STATUSES}
          />
        </Col>
        <Col flex="200px">
          <Select
            style={{ width: '100%' }}
            placeholder="项目筛选"
            allowClear
            value={filters.projectId || undefined}
            onChange={(v) =>
              setFilters((f) => ({ ...f, projectId: v ?? '' }))
            }
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增单元
          </Button>
        </Col>
      </Row>

      <Table<Unit>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 700 }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editRecord ? '编辑单元' : '新增单元'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unitNo"
                label="单元编号"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label="面积(㎡)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="类型">
                <Select
                  options={[
                    { value: '商铺', label: '商铺' },
                    { value: '办公室', label: '办公室' },
                    { value: '仓库', label: '仓库' },
                    { value: '其他', label: '其他' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select options={UNIT_STATUSES} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Units: React.FC = () => {
  const tabItems = [
    {
      key: 'projects',
      label: '项目管理',
      children: <ProjectTab />,
    },
    {
      key: 'buildings',
      label: '楼宇管理',
      children: <BuildingTab />,
    },
    {
      key: 'floors',
      label: '楼层管理',
      children: <FloorTab />,
    },
    {
      key: 'units',
      label: '单元管理',
      children: <UnitTab />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <Tabs defaultActiveKey="units" items={tabItems} size="large" />
      </Card>
    </div>
  );
};

export default Units;
