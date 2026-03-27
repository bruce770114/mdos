import React, { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Skeleton,
  Space,
} from 'antd';
import {
  HomeOutlined,
  PercentageOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Area, Pie } from '@ant-design/plots';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import request from '@/utils/request';

const { Title } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitStatistics {
  totalUnits: number;
  vacancyRate: number;
  monthlyReceivable: number;
  overdueAmount: number;
}

interface OccupancyTrend {
  month: string;
  rate: number;
}

interface IncomeComposition {
  type: string;
  amount: number;
}

interface ExpiringContract {
  contractNo: string;
  tenant: string;
  unit: string;
  expiryDate: string;
  status: string;
}

interface OverdueBill {
  billNo: string;
  tenant: string;
  amount: number;
  overdueDays: number;
}

interface ReceivablesSummary {
  occupancyTrend: OccupancyTrend[];
  incomeComposition: IncomeComposition[];
}

// ─── Dashboard component ──────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const [statsLoading, setStatsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(true);

  const [unitStats, setUnitStats] = useState<UnitStatistics | null>(null);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyTrend[]>([]);
  const [incomeComposition, setIncomeComposition] = useState<IncomeComposition[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [overdueBills, setOverdueBills] = useState<OverdueBill[]>([]);

  useEffect(() => {
    request
      .get<UnitStatistics>('/units/statistics')
      .then((res) => setUnitStats(res.data))
      .finally(() => setStatsLoading(false));

    request
      .get<ReceivablesSummary>('/finance/receivables/summary')
      .then((res) => {
        setOccupancyTrend(res.data.occupancyTrend ?? []);
        setIncomeComposition(res.data.incomeComposition ?? []);
      })
      .finally(() => setChartsLoading(false));

    Promise.all([
      request.get<ExpiringContract[]>('/contracts/expiring'),
      request.get<{ items: OverdueBill[] }>('/finance/receivables/summary'),
    ])
      .then(([contractsRes, billsRes]) => {
        setExpiringContracts(contractsRes.data ?? []);
        setOverdueBills((billsRes.data as any)?.overdueBills ?? []);
      })
      .finally(() => setTablesLoading(false));
  }, []);

  // ─── Column definitions (inside component to react to language changes) ──
  const expiringContractColumns: ColumnsType<ExpiringContract> = [
    { title: t('dashboard.contractNo'), dataIndex: 'contractNo', key: 'contractNo', width: 140 },
    { title: t('dashboard.tenant'), dataIndex: 'tenant', key: 'tenant' },
    { title: t('dashboard.unit'), dataIndex: 'unit', key: 'unit', width: 100 },
    {
      title: t('dashboard.expiryDate'),
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const statusColorMap: Record<string, string> = {
          active: 'success',
          expiring_soon: 'warning',
          expired: 'default',
          terminated: 'error',
          draft: 'default',
          pending_approval: 'processing',
        };
        const color = statusColorMap[v] ?? 'default';
        const label = t(`dashboard.contractStatus.${v}`, { defaultValue: v });
        return <Tag color={color}>{label}</Tag>;
      },
    },
  ];

  const overdueBillColumns: ColumnsType<OverdueBill> = [
    { title: t('dashboard.billNo'), dataIndex: 'billNo', key: 'billNo', width: 140 },
    { title: t('dashboard.tenant'), dataIndex: 'tenant', key: 'tenant' },
    {
      title: t('dashboard.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) =>
        `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: t('dashboard.overdueDays'),
      dataIndex: 'overdueDays',
      key: 'overdueDays',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <Tag color={v > 60 ? 'error' : v > 30 ? 'warning' : 'processing'}>
          {v} {t('common.days')}
        </Tag>
      ),
    },
  ];

  // ─── Area chart config ──────────────────────────────────────────────────
  const areaConfig = {
    data: occupancyTrend,
    xField: 'month',
    yField: 'rate',
    smooth: true,
    areaStyle: { fillOpacity: 0.3 },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`,
      },
      min: 0,
      max: 100,
    },
    tooltip: {
      formatter: (datum: OccupancyTrend) => ({
        name: t('dashboard.occupancyRate'),
        value: `${datum.rate}%`,
      }),
    },
    color: '#1677ff',
    height: 260,
  };

  // ─── Pie chart config ───────────────────────────────────────────────────
  const pieConfig = {
    data: incomeComposition,
    angleField: 'amount',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      type: 'inner',
      offset: '-30%',
      content: '{percentage}',
      style: { fontSize: 14, textAlign: 'center' },
    },
    legend: { position: 'bottom' as const },
    tooltip: {
      formatter: (datum: IncomeComposition) => ({
        name: datum.type,
        value: `¥${(datum.amount ?? 0).toLocaleString('zh-CN')}`,
      }),
    },
    height: 260,
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={4} style={{ marginBottom: 24, color: '#262626' }}>
        {t('dashboard.overview')}
      </Title>

      {/* ── Stat Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statsLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Col key={i} xs={24} sm={12} xl={6}>
                <Card>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </>
        ) : (
          <>
            <Col xs={24} sm={12} xl={6}>
              <Card
                bordered={false}
                style={{ background: 'linear-gradient(135deg,#e6f7ff,#fff)' }}
              >
                <Statistic
                  title={t('dashboard.totalUnits')}
                  value={unitStats?.totalUnits ?? 0}
                  suffix={t('dashboard.unitSuffix')}
                  prefix={<HomeOutlined style={{ color: '#1677ff' }} />}
                  valueStyle={{ color: '#1677ff', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card
                bordered={false}
                style={{ background: 'linear-gradient(135deg,#f6ffed,#fff)' }}
              >
                <Statistic
                  title={t('dashboard.vacancyRate')}
                  value={((unitStats?.vacancyRate ?? 0) * 100).toFixed(1)}
                  suffix="%"
                  prefix={<PercentageOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card
                bordered={false}
                style={{ background: 'linear-gradient(135deg,#fff7e6,#fff)' }}
              >
                <Statistic
                  title={t('dashboard.monthlyReceivable')}
                  value={unitStats?.monthlyReceivable ?? 0}
                  prefix={
                    <Space>
                      <DollarOutlined style={{ color: '#fa8c16' }} />
                      ¥
                    </Space>
                  }
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card
                bordered={false}
                style={{ background: 'linear-gradient(135deg,#fff1f0,#fff)' }}
              >
                <Statistic
                  title={t('dashboard.overdueAmount')}
                  value={unitStats?.overdueAmount ?? 0}
                  prefix={
                    <Space>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      ¥
                    </Space>
                  }
                  precision={2}
                  groupSeparator=","
                  valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* ── Charts Row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title={t('dashboard.occupancyTrend')} bordered={false} bodyStyle={{ padding: '16px 24px' }}>
            {chartsLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              <Area {...areaConfig} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={t('dashboard.incomeComposition')} bordered={false} bodyStyle={{ padding: '16px 24px' }}>
            {chartsLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : (
              <Pie {...pieConfig} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Bottom Tables ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.expiringContracts')} bordered={false}>
            <Table<ExpiringContract>
              columns={expiringContractColumns}
              dataSource={expiringContracts}
              loading={tablesLoading}
              rowKey="contractNo"
              pagination={{ pageSize: 5, size: 'small' }}
              size="small"
              scroll={{ x: 480 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.overdueBills')} bordered={false}>
            <Table<OverdueBill>
              columns={overdueBillColumns}
              dataSource={overdueBills}
              loading={tablesLoading}
              rowKey="billNo"
              pagination={{ pageSize: 5, size: 'small' }}
              size="small"
              scroll={{ x: 400 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
