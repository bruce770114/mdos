import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Tabs,
  Tag,
  Tooltip,
  Badge,
  Button,
  Spin,
  Empty,
  Progress,
  Typography,
  Space,
  Alert,
  Drawer,
  Modal,
  Form,
  Input,
  InputNumber,
  Table,
  message,
  Descriptions,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined,
  HomeOutlined,
  BuildOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  UnorderedListOutlined,
  GlobalOutlined,
  MergeCellsOutlined,
  ScissorOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SelectOutlined,
  DragOutlined,
  CompressOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Group } from 'react-konva'
import type Konva from 'konva'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader'

// Fix default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const { Text, Title } = Typography

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnitPosition { x: number; y: number; width: number; height: number }

interface UnitSummary {
  total: number
  vacant: number
  rented: number
  reserved: number
  other: number
}

interface Project {
  id: string
  name: string
  city: string
  address: string
  totalArea: number
  lat: number | null
  lng: number | null
  units: UnitSummary
}

interface Building {
  id: string
  name: string
  projectId: string
  floorCount: number
  units: UnitSummary
  floors: Floor[]
}

interface Floor {
  id: string
  floorNo: number
  label: string
  floorPlanUrl: string | null
  units: UnitSummary
}

interface Unit {
  id: string
  unitNo: string
  floorId: string
  buildingId: string
  area: number
  status: 'vacant' | 'rented' | 'reserved' | 'renovating' | 'maintenance'
  unitType: string
  customerName?: string
  baseRent?: number
  contractId?: string
  position: UnitPosition | null
  row: number
  col: number
}

interface FloorPlanVersion {
  id: string
  versionNo: string
  notes: string | null
  createdAt: string
  snapshot: Unit[]
}

interface ChangeRecord {
  id: string
  changeType: string
  notes: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  vacant: '#52c41a',
  rented: '#1677ff',
  reserved: '#faad14',
  renovating: '#d4b106',
  maintenance: '#ff4d4f',
}

const STATUS_LABELS: Record<string, string> = {
  vacant: '空置',
  rented: '已租',
  reserved: '已预订',
  renovating: '装修中',
  maintenance: '维修中',
}

function occupancyPercent(units: UnitSummary): number {
  if (!units || units.total === 0) return 0
  return Math.round((units.rented / units.total) * 100)
}

// ---------------------------------------------------------------------------
// Canvas helpers (from leanunit)
// ---------------------------------------------------------------------------

const COLS = 8
const UNIT_W = 80
const UNIT_H = 55
const UNIT_GAP = 8
const CANVAS_H = 480

function getUnitRect(unit: Unit, hasPositions: boolean): UnitPosition {
  if (hasPositions && unit.position) return unit.position
  return {
    x: unit.col * (UNIT_W + UNIT_GAP) + UNIT_GAP,
    y: unit.row * (UNIT_H + UNIT_GAP) + UNIT_GAP,
    width: UNIT_W,
    height: UNIT_H,
  }
}

function calcFitTransform(
  units: Unit[],
  canvasW: number,
  canvasH: number,
  hasPositions: boolean,
): { scale: number; offsetX: number; offsetY: number } {
  if (!units.length || !canvasW) return { scale: 1, offsetX: 0, offsetY: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  units.forEach((u) => {
    const r = getUnitRect(u, hasPositions)
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  })
  if (!isFinite(minX)) return { scale: 1, offsetX: 0, offsetY: 0 }
  const padding = 24
  const bboxW = maxX - minX || 1
  const bboxH = maxY - minY || 1
  const newScale = Math.min((canvasW - padding * 2) / bboxW, (canvasH - padding * 2) / bboxH, 10)
  return { scale: newScale, offsetX: padding - minX * newScale, offsetY: padding - minY * newScale }
}

// ---------------------------------------------------------------------------
// StatBadges
// ---------------------------------------------------------------------------

const StatBadges: React.FC<{ units: UnitSummary; size?: 'small' | 'default' }> = ({
  units,
  size = 'default',
}) => {
  const fontSize = size === 'small' ? 11 : 12
  return (
    <Space size={4} wrap>
      <Tag color="default" style={{ fontSize, margin: 0 }}>共 {units.total} 间</Tag>
      <Tag color="success" style={{ fontSize, margin: 0 }}>空 {units.vacant}</Tag>
      <Tag color="processing" style={{ fontSize, margin: 0 }}>租 {units.rented}</Tag>
      {units.reserved > 0 && (
        <Tag color="warning" style={{ fontSize, margin: 0 }}>订 {units.reserved}</Tag>
      )}
    </Space>
  )
}

// ---------------------------------------------------------------------------
// Level 1 – Project cards
// ---------------------------------------------------------------------------

const ProjectList: React.FC<{ onSelect: (project: Project) => void }> = ({ onSelect }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  useEffect(() => {
    setLoading(true)
    request
      .get<any[]>('/asset-map/projects')
      .then((res) => {
        const mapped: Project[] = (res.data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          city: p.city ?? '',
          address: p.address ?? '',
          totalArea: p.totalArea ?? 0,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          units: {
            total: p.totalUnits ?? 0,
            vacant: p.vacantUnits ?? 0,
            rented: p.rentedUnits ?? 0,
            reserved: 0,
            other: 0,
          },
        }))
        setProjects(mapped)
      })
      .catch(() => setError('加载项目列表失败，请刷新重试'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="加载中..." /></div>
  if (error) return <Alert type="error" message={error} showIcon />
  if (projects.length === 0) return <Empty description="暂无项目数据" />

  const geoProjects = projects.filter((p) => p.lat != null && p.lng != null)
  const defaultCenter: [number, number] =
    geoProjects.length > 0
      ? [geoProjects[0].lat as number, geoProjects[0].lng as number]
      : [39.9042, 116.4074]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <Button
          icon={<UnorderedListOutlined />}
          type={viewMode === 'list' ? 'primary' : 'default'}
          onClick={() => setViewMode('list')}
        >列表</Button>
        <Button
          icon={<GlobalOutlined />}
          type={viewMode === 'map' ? 'primary' : 'default'}
          onClick={() => setViewMode('map')}
        >地图</Button>
      </div>

      {viewMode === 'list' ? (
        <Row gutter={[20, 20]}>
          {projects.map((project) => {
            const pct = occupancyPercent(project.units)
            return (
              <Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => onSelect(project)}
                  styles={{ body: { padding: 16 } }}
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                      margin: '-16px -16px 12px',
                      padding: '14px 16px 10px',
                      color: '#fff',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      <EnvironmentOutlined style={{ marginRight: 4 }} />
                      {project.city || project.address || '—'}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>总建筑面积</Text>
                    <div style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.3 }}>
                      {project.totalArea ? project.totalArea.toLocaleString('zh-CN') : '—'}
                      {project.totalArea && <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>m²</Text>}
                    </div>
                  </div>
                  <StatBadges units={project.units} size="small" />
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <Text type="secondary">出租率</Text>
                      <Text strong style={{ color: pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f' }}>{pct}%</Text>
                    </div>
                    <Progress percent={pct} showInfo={false} strokeColor={pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f'} size="small" />
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      ) : (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
          <MapContainer center={defaultCenter} zoom={11} style={{ height: 520, width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geoProjects.map((project) => (
              <Marker key={project.id} position={[project.lat as number, project.lng as number]}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{project.city || project.address}</div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>出租率：{occupancyPercent(project.units)}%</div>
                    <Button size="small" type="primary" onClick={() => onSelect(project)}>查看详情</Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {projects.length > geoProjects.length && (
            <div style={{ padding: '10px 16px', background: '#fffbe6', borderTop: '1px solid #ffe58f', fontSize: 13 }}>
              <InfoCircleOutlined style={{ marginRight: 6, color: '#faad14' }} />
              {projects.length - geoProjects.length} 个项目暂无坐标信息，未在地图上显示
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Level 2 – Building view
// ---------------------------------------------------------------------------

const FloorBar: React.FC<{ floor: Floor }> = ({ floor }) => {
  const { units } = floor
  if (units.total === 0) return null
  const segments = [
    { status: 'rented', count: units.rented, color: STATUS_COLORS.rented },
    { status: 'vacant', count: units.vacant, color: STATUS_COLORS.vacant },
    { status: 'reserved', count: units.reserved, color: STATUS_COLORS.reserved },
    { status: 'other', count: units.other, color: STATUS_COLORS.maintenance },
  ].filter((s) => s.count > 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <Text style={{ fontSize: 11, color: '#888', width: 40, textAlign: 'right', flexShrink: 0 }}>
        {floor.label}
      </Text>
      <div style={{ flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', background: '#f0f0f0' }}>
        {segments.map((seg) => (
          <Tooltip key={seg.status} title={`${STATUS_LABELS[seg.status] ?? seg.status}: ${seg.count} 间`}>
            <div
              style={{
                width: `${(seg.count / units.total) * 100}%`,
                background: seg.color,
                transition: 'width 0.3s',
              }}
            />
          </Tooltip>
        ))}
      </div>
      <Text style={{ fontSize: 11, color: '#888', width: 30, flexShrink: 0 }}>{units.total}间</Text>
    </div>
  )
}

const BuildingView: React.FC<{
  project: Project
  onBack: () => void
  onSelectBuilding: (building: Building) => void
}> = ({ project, onBack, onSelectBuilding }) => {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    request
      .get<any[]>(`/asset-map/projects/${project.id}/buildings`)
      .then((res) => {
        const mapped: Building[] = (res.data ?? []).map((b: any) => {
          const floors: Floor[] = (b.floors ?? []).map((f: any) => ({
            id: f.floorId,
            floorNo: f.floorNo,
            label: `${f.floorNo}F`,
            floorPlanUrl: f.floorPlanUrl ?? null,
            units: {
              total: f.totalUnits ?? 0,
              vacant: f.vacantUnits ?? 0,
              rented: f.rentedUnits ?? 0,
              reserved: 0,
              other: 0,
            },
          }))
          const totalUnits = floors.reduce((s, f) => s + f.units.total, 0)
          const vacantUnits = floors.reduce((s, f) => s + f.units.vacant, 0)
          const rentedUnits = floors.reduce((s, f) => s + f.units.rented, 0)
          return {
            id: b.id,
            name: b.name,
            projectId: b.projectId,
            floorCount: floors.length,
            units: { total: totalUnits, vacant: vacantUnits, rented: rentedUnits, reserved: 0, other: 0 },
            floors,
          }
        })
        setBuildings(mapped)
      })
      .catch(() => setError('加载楼宇数据失败，请重试'))
      .finally(() => setLoading(false))
  }, [project.id])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="加载楼宇..." /></div>
  if (error) return <Alert type="error" message={error} showIcon />

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginRight: 12 }}>
          返回项目列表
        </Button>
        <Text strong style={{ fontSize: 16 }}>{project.name} — 楼宇视图</Text>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
          {project.city} · {project.address}
        </Text>
      </div>

      {buildings.length === 0 ? (
        <Empty description="暂无楼宇数据" />
      ) : (
        <Row gutter={[20, 20]}>
          {buildings.map((building) => {
            const pct = occupancyPercent(building.units)
            const previewFloors = [...(building.floors ?? [])]
              .sort((a, b) => b.floorNo - a.floorNo)
              .slice(0, 10)
            return (
              <Col key={building.id} xs={24} sm={12} xl={8}>
                <Card
                  hoverable
                  onClick={() => onSelectBuilding(building)}
                  styles={{ body: { padding: 16 } }}
                  style={{ borderRadius: 10 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        <BuildOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                        {building.name}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{building.floorCount} 层</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ fontSize: 22, color: pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f' }}>
                        {pct}%
                      </Text>
                      <div style={{ fontSize: 11, color: '#888' }}>出租率</div>
                    </div>
                  </div>
                  <StatBadges units={building.units} size="small" />
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>楼层状态（高层在上）</Text>
                    {previewFloors.map((floor) => <FloorBar key={floor.id} floor={floor} />)}
                    {building.floorCount > 10 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>… 共 {building.floorCount} 层，点击查看全部</Text>
                    )}
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Level 3 – Floor plan view  (canvas improved from leanunit)
// ---------------------------------------------------------------------------

type EditorTool = 'select' | 'pan'

const FloorPlanView: React.FC<{
  building: Building
  project: Project
  onBack: () => void
}> = ({ building, project, onBack }) => {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFloor, setActiveFloor] = useState<string>('')

  // Multi-selection for merge/split (vacant units only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Single selection for info panel
  const [infoUnit, setInfoUnit] = useState<Unit | null>(null)

  // Canvas state (from leanunit)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [currentTool, setCurrentTool] = useState<EditorTool>('select')
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)

  // Merge modal
  const [mergeModal, setMergeModal] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeForm] = Form.useForm()

  // Split modal
  const [splitModal, setSplitModal] = useState(false)
  const [splitLoading, setSplitLoading] = useState(false)
  const [splitForm] = Form.useForm()

  // Version history drawer
  const [versionDrawer, setVersionDrawer] = useState(false)
  const [versions, setVersions] = useState<FloorPlanVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  // Change records drawer
  const [changeDrawer, setChangeDrawer] = useState(false)
  const [changeRecords, setChangeRecords] = useState<ChangeRecord[]>([])
  const [changeLoading, setChangeLoading] = useState(false)

  const stageRef = useRef<Konva.Stage>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const sortedFloors = useMemo(
    () => [...(building.floors ?? [])].sort((a, b) => b.floorNo - a.floorNo),
    [building.floors],
  )

  // Init active floor
  useEffect(() => {
    if (sortedFloors.length > 0 && !activeFloor) {
      setActiveFloor(sortedFloors[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building.id])

  // Load units when floor changes
  useEffect(() => {
    if (!activeFloor) return
    setLoading(true)
    setSelectedIds(new Set())
    setInfoUnit(null)
    request
      .get<any[]>(`/asset-map/floors/${activeFloor}/units`)
      .then((res) => {
        const mapped: Unit[] = (res.data ?? []).map((u: any, idx: number) => ({
          id: u.id,
          unitNo: u.unitNo,
          floorId: u.floorId,
          buildingId: building.id,
          area: u.area ?? 0,
          status: u.status ?? 'vacant',
          unitType: u.unitType ?? 'office',
          customerName: u.customerName ?? undefined,
          baseRent: u.baseRent ?? undefined,
          contractId: u.contractId ?? undefined,
          position: u.position ?? null,
          row: Math.floor(idx / COLS),
          col: idx % COLS,
        }))
        setUnits(mapped)
      })
      .catch(() => setError('加载单元数据失败，请重试'))
      .finally(() => setLoading(false))
  }, [activeFloor, building.id])

  // Auto fit when units load
  useEffect(() => {
    if (units.length > 0 && canvasWidth > 0) {
      const hp = units.some((u) => u.position)
      const { scale: s, offsetX, offsetY } = calcFitTransform(units, canvasWidth, CANVAS_H, hp)
      setScale(s)
      setOffset({ x: offsetX, y: offsetY })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, activeFloor])

  // Measure canvas container width
  useEffect(() => {
    const measure = () => {
      if (canvasWrapRef.current) {
        setCanvasWidth(canvasWrapRef.current.getBoundingClientRect().width)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [infoUnit]) // re-measure when info panel opens/closes

  // Load floor plan background image
  useEffect(() => {
    const floor = sortedFloors.find((f) => f.id === activeFloor)
    if (!floor?.floorPlanUrl) { setBgImage(null); return }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = floor.floorPlanUrl
    img.onload = () => setBgImage(img)
    img.onerror = () => setBgImage(null)
  }, [activeFloor, sortedFloors])

  // ── Canvas handlers (from leanunit) ──────────────────────────────────────
  const hasPositions = useMemo(() => units.some((u) => u.position), [units])

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const factor = e.evt.deltaY < 0 ? 1.05 : 1 / 1.05
      const newScale = Math.min(Math.max(scale * factor, 0.05), 20)
      setScale(newScale)
      setOffset({
        x: pointer.x - (pointer.x - offset.x) * (newScale / scale),
        y: pointer.y - (pointer.y - offset.y) * (newScale / scale),
      })
    },
    [scale, offset],
  )

  const handleZoomButton = useCallback(
    (direction: 1 | -1) => {
      const factor = direction > 0 ? 1.2 : 1 / 1.2
      const newScale = Math.min(Math.max(scale * factor, 0.05), 20)
      const cx = canvasWidth / 2
      const cy = CANVAS_H / 2
      setScale(newScale)
      setOffset({
        x: cx - (cx - offset.x) * (newScale / scale),
        y: cy - (cy - offset.y) * (newScale / scale),
      })
    },
    [scale, offset, canvasWidth],
  )

  const fitToView = useCallback(() => {
    if (!units.length) return
    const { scale: s, offsetX, offsetY } = calcFitTransform(units, canvasWidth, CANVAS_H, hasPositions)
    setScale(s)
    setOffset({ x: offsetX, y: offsetY })
  }, [units, canvasWidth, hasPositions])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedIds(new Set())
        setInfoUnit(null)
      }
    },
    [],
  )

  // ── Merge / Split ─────────────────────────────────────────────────────────
  const selectedUnits = useMemo(() => units.filter((u) => selectedIds.has(u.id)), [units, selectedIds])
  const vacantSelected = useMemo(() => selectedUnits.filter((u) => u.status === 'vacant'), [selectedUnits])

  const refreshUnits = useCallback(() => {
    if (!activeFloor) return
    setLoading(true)
    request
      .get<any[]>(`/asset-map/floors/${activeFloor}/units`)
      .then((res) => {
        const mapped: Unit[] = (res.data ?? []).map((u: any, idx: number) => ({
          id: u.id, unitNo: u.unitNo, floorId: u.floorId, buildingId: building.id,
          area: u.area ?? 0, status: u.status ?? 'vacant', unitType: u.unitType ?? 'office',
          customerName: u.customerName, baseRent: u.baseRent, contractId: u.contractId,
          position: u.position ?? null, row: Math.floor(idx / COLS), col: idx % COLS,
        }))
        setUnits(mapped)
      })
      .finally(() => setLoading(false))
  }, [activeFloor, building.id])

  const handleMerge = async () => {
    const values = await mergeForm.validateFields()
    setMergeLoading(true)
    try {
      await request.post('/units/merge', { unitIds: Array.from(selectedIds), newUnitNo: values.newUnitNo })
      message.success('合并成功')
      setMergeModal(false)
      mergeForm.resetFields()
      setSelectedIds(new Set())
      setInfoUnit(null)
      refreshUnits()
    } finally {
      setMergeLoading(false)
    }
  }

  const handleSplit = async () => {
    if (selectedUnits.length !== 1) return
    const values = await splitForm.validateFields()
    setSplitLoading(true)
    try {
      await request.post(`/units/${selectedUnits[0].id}/split`, { parts: values.parts })
      message.success('切割成功')
      setSplitModal(false)
      splitForm.resetFields()
      setSelectedIds(new Set())
      setInfoUnit(null)
      refreshUnits()
    } finally {
      setSplitLoading(false)
    }
  }

  const fetchVersions = useCallback(() => {
    if (!activeFloor) return
    setVersionsLoading(true)
    request
      .get(`/floors/${activeFloor}/versions`)
      .then((res: any) => setVersions(res.data ?? []))
      .finally(() => setVersionsLoading(false))
  }, [activeFloor])

  const fetchChangeRecords = useCallback(() => {
    setChangeLoading(true)
    request
      .get('/units/change-records', { params: { floorId: activeFloor } })
      .then((res: any) => setChangeRecords(res.data?.list ?? []))
      .finally(() => setChangeLoading(false))
  }, [activeFloor])

  const floorTabItems = sortedFloors.map((floor) => ({
    key: floor.id,
    label: floor.label,
  }))

  // ── Floor stats ───────────────────────────────────────────────────────────
  const floorStats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    units.forEach((u) => { byStatus[u.status] = (byStatus[u.status] || 0) + 1 })
    const rented = byStatus.rented || 0
    const pct = units.length > 0 ? Math.round((rented / units.length) * 100) : 0
    return { byStatus, pct, total: units.length }
  }, [units])

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回楼宇视图</Button>
        <Text strong style={{ fontSize: 15 }}>
          {project.name} / {building.name} — 楼层平面图
        </Text>
        <div style={{ flex: 1 }} />
        <Button
          icon={<HistoryOutlined />}
          onClick={() => { setVersionDrawer(true); fetchVersions() }}
        >版本历史</Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => { setChangeDrawer(true); fetchChangeRecords() }}
        >变更台账</Button>
      </div>

      {/* Main content: canvas card + unit info panel */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Floor plan card */}
        <Card
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 10, overflow: 'hidden', flex: 1, minWidth: 0 }}
        >
          {/* Floor tabs */}
          <div style={{ borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
            <Tabs
              items={floorTabItems}
              activeKey={activeFloor}
              onChange={(key) => { setActiveFloor(key); setSelectedIds(new Set()); setInfoUnit(null) }}
              size="small"
            />
          </div>

          {/* Toolbar */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {/* Tool toggle */}
            <Space size={4}>
              <Tooltip title="选择单元">
                <Button
                  size="small"
                  type={currentTool === 'select' ? 'primary' : 'default'}
                  icon={<SelectOutlined />}
                  onClick={() => setCurrentTool('select')}
                >选择</Button>
              </Tooltip>
              <Tooltip title="拖拽平移画布">
                <Button
                  size="small"
                  type={currentTool === 'pan' ? 'primary' : 'default'}
                  icon={<DragOutlined />}
                  onClick={() => setCurrentTool('pan')}
                >平移</Button>
              </Tooltip>
            </Space>

            <Divider type="vertical" />

            {/* Zoom controls */}
            <Space size={2}>
              <Tooltip title="缩小 (滚轮)">
                <Button size="small" icon={<ZoomOutOutlined />} onClick={() => handleZoomButton(-1)} />
              </Tooltip>
              <Text style={{ fontSize: 11, minWidth: 38, textAlign: 'center', color: '#666' }}>
                {Math.round(scale * 100)}%
              </Text>
              <Tooltip title="放大 (滚轮)">
                <Button size="small" icon={<ZoomInOutlined />} onClick={() => handleZoomButton(1)} />
              </Tooltip>
            </Space>
            <Tooltip title="适配视图">
              <Button size="small" icon={<CompressOutlined />} onClick={fitToView} disabled={!units.length} />
            </Tooltip>

            <Divider type="vertical" />

            {/* Merge / split actions */}
            {selectedIds.size >= 2 && vacantSelected.length >= 2 && (
              <Button icon={<MergeCellsOutlined />} size="small" onClick={() => setMergeModal(true)}>
                合并 ({vacantSelected.length})
              </Button>
            )}
            {selectedIds.size === 1 && vacantSelected.length === 1 && (
              <Button icon={<ScissorOutlined />} size="small" onClick={() => setSplitModal(true)}>
                切割
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button size="small" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
            )}

            {currentTool === 'select' && selectedIds.size === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                点击空置单元可选中（支持多选合并/切割）
              </Text>
            )}
          </div>

          {/* Canvas */}
          <div
            ref={canvasWrapRef}
            style={{ background: '#f0f0f0', overflow: 'hidden', cursor: currentTool === 'pan' ? 'grab' : 'default' }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}><Spin tip="加载单元..." /></div>
            ) : error ? (
              <Alert type="error" message={error} showIcon style={{ margin: 16 }} />
            ) : units.length === 0 ? (
              <Empty description="该楼层暂无单元数据" style={{ padding: 40 }} />
            ) : (
              <Stage
                ref={stageRef}
                width={canvasWidth}
                height={CANVAS_H}
                scaleX={scale}
                scaleY={scale}
                x={offset.x}
                y={offset.y}
                draggable={currentTool === 'pan'}
                onWheel={handleWheel}
                onClick={handleStageClick}
                onDragEnd={(e) => setOffset({ x: e.target.x(), y: e.target.y() })}
              >
                {/* Floor plan background (only when position data available) */}
                {bgImage && hasPositions && (
                  <Layer listening={false}>
                    <KonvaImage image={bgImage} x={0} y={0} opacity={0.45} />
                  </Layer>
                )}

                {/* Units */}
                <Layer>
                  {units.map((unit) => {
                    const r = getUnitRect(unit, hasPositions)
                    const isSelected = selectedIds.has(unit.id)
                    const isInfo = infoUnit?.id === unit.id
                    const fill = STATUS_COLORS[unit.status] ?? '#d9d9d9'
                    return (
                      <Group
                        key={unit.id}
                        onClick={(e) => {
                          e.cancelBubble = true
                          // Info panel: click any unit
                          setInfoUnit(unit)
                          // Multi-select: only vacant units
                          if (unit.status === 'vacant') {
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(unit.id)) next.delete(unit.id)
                              else next.add(unit.id)
                              return next
                            })
                          }
                        }}
                        onMouseEnter={(e) => {
                          const c = e.target.getStage()?.container()
                          if (c) c.style.cursor = 'pointer'
                        }}
                        onMouseLeave={(e) => {
                          const c = e.target.getStage()?.container()
                          if (c) c.style.cursor = currentTool === 'pan' ? 'grab' : ''
                        }}
                      >
                        <Rect
                          x={r.x}
                          y={r.y}
                          width={r.width}
                          height={r.height}
                          fill={fill + (isSelected || isInfo ? '' : '99')}
                          stroke={isSelected ? '#FF6B00' : isInfo ? '#1677ff' : fill}
                          strokeWidth={isSelected || isInfo ? 3 : 1}
                          cornerRadius={4}
                          opacity={isSelected || isInfo ? 1 : 0.85}
                        />
                      </Group>
                    )
                  })}
                </Layer>

                {/* Labels */}
                <Layer listening={false}>
                  {units.map((unit) => {
                    const r = getUnitRect(unit, hasPositions)
                    const cy = r.y + r.height / 2
                    return (
                      <React.Fragment key={`lbl-${unit.id}`}>
                        <KonvaText
                          x={r.x}
                          y={cy - 10}
                          width={r.width}
                          text={unit.unitNo}
                          fontSize={10}
                          fontStyle="bold"
                          fill="#fff"
                          align="center"
                        />
                        {unit.area > 0 && (
                          <KonvaText
                            x={r.x}
                            y={cy + 4}
                            width={r.width}
                            text={`${Number(unit.area).toFixed(1)}m²`}
                            fontSize={9}
                            fill="rgba(255,255,255,0.85)"
                            align="center"
                          />
                        )}
                      </React.Fragment>
                    )
                  })}
                </Layer>
              </Stage>
            )}
          </div>

          {/* Legend */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <Space key={status} size={4}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                <Text style={{ fontSize: 12 }}>{STATUS_LABELS[status] ?? status}</Text>
              </Space>
            ))}
          </div>
        </Card>

        {/* Unit info + floor stats panel (from leanunit UnitInfoPanel pattern) */}
        {infoUnit && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <Card
              size="small"
              title={
                <Space size={6}>
                  <span>单元信息</span>
                  <Tag
                    color={STATUS_COLORS[infoUnit.status] ?? 'default'}
                    style={{ margin: 0 }}
                  >
                    {STATUS_LABELS[infoUnit.status] ?? infoUnit.status}
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => { setInfoUnit(null); setSelectedIds(new Set()) }}
                />
              }
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="单元号">{infoUnit.unitNo}</Descriptions.Item>
                <Descriptions.Item label="建筑面积">
                  {infoUnit.area ? `${Number(infoUnit.area).toLocaleString('zh-CN')} m²` : '—'}
                </Descriptions.Item>
                {infoUnit.customerName && (
                  <Descriptions.Item label="当前租户">{infoUnit.customerName}</Descriptions.Item>
                )}
                {infoUnit.baseRent != null && (
                  <Descriptions.Item label="月租金">
                    {Number(infoUnit.baseRent).toLocaleString('zh-CN')} 元
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card size="small" title="楼层统计" style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>出租率</Text>
                  <Text
                    strong
                    style={{
                      color: floorStats.pct >= 80 ? '#52c41a' : floorStats.pct >= 50 ? '#faad14' : '#ff4d4f',
                    }}
                  >
                    {floorStats.pct}%
                  </Text>
                </div>
                <Progress
                  percent={floorStats.pct}
                  showInfo={false}
                  size="small"
                  strokeColor={floorStats.pct >= 80 ? '#52c41a' : floorStats.pct >= 50 ? '#faad14' : '#ff4d4f'}
                />
              </div>
              {Object.entries(STATUS_LABELS).map(([status, label]) =>
                floorStats.byStatus[status] ? (
                  <div
                    key={status}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}
                  >
                    <Space size={5}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[status] }} />
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                    </Space>
                    <Text style={{ fontSize: 12 }}>{floorStats.byStatus[status]} 间</Text>
                  </div>
                ) : null,
              )}
              <Divider style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>合计</Text>
                <Text strong style={{ fontSize: 12 }}>{floorStats.total} 间</Text>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Merge Modal */}
      <Modal
        title={`合并 ${vacantSelected.length} 个单元`}
        open={mergeModal}
        onOk={handleMerge}
        onCancel={() => { setMergeModal(false); mergeForm.resetFields() }}
        confirmLoading={mergeLoading}
        destroyOnClose
      >
        <Form form={mergeForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="newUnitNo" label="新单元号" rules={[{ required: true }]}>
            <Input placeholder="例如 A101-102" />
          </Form.Item>
          <Text type="secondary">
            将合并: {vacantSelected.map((u) => u.unitNo).join(' + ')}，总面积:{' '}
            {vacantSelected.reduce((s, u) => s + Number(u.area ?? 0), 0)} m²
          </Text>
        </Form>
      </Modal>

      {/* Split Modal */}
      <Modal
        title={`切割单元 ${selectedUnits[0]?.unitNo ?? ''}`}
        open={splitModal}
        onOk={handleSplit}
        onCancel={() => { setSplitModal(false); splitForm.resetFields() }}
        confirmLoading={splitLoading}
        destroyOnClose
        width={480}
      >
        <Form form={splitForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.List name="parts" initialValue={[{}, {}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 8 }}
                    extra={
                      fields.length > 2 ? (
                        <Button type="link" size="small" danger onClick={() => remove(name)}>删除</Button>
                      ) : null
                    }
                  >
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item {...rest} name={[name, 'unitNo']} label="子单元号" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                          <Input placeholder="例如 A101-1" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...rest} name={[name, 'area']} label="面积(㎡)" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" block onClick={() => add()}>添加子单元</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Version History Drawer */}
      <Drawer
        title="楼层平面图版本历史"
        open={versionDrawer}
        onClose={() => setVersionDrawer(false)}
        width={560}
      >
        {versionsLoading ? (
          <Spin />
        ) : versions.length === 0 ? (
          <Empty description="暂无版本记录" />
        ) : (
          <Table
            dataSource={versions}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '版本号', dataIndex: 'versionNo', key: 'versionNo', width: 80 },
              { title: '备注', dataIndex: 'notes', key: 'notes' },
              {
                title: '时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 130,
                render: (v: string) => v?.slice(0, 16),
              },
              {
                title: '单元数',
                key: 'count',
                width: 80,
                render: (_: unknown, record: FloorPlanVersion) => record.snapshot?.length ?? 0,
              },
            ]}
          />
        )}
      </Drawer>

      {/* Change Records Drawer */}
      <Drawer
        title="单元变更台账"
        open={changeDrawer}
        onClose={() => setChangeDrawer(false)}
        width={520}
      >
        {changeLoading ? (
          <Spin />
        ) : changeRecords.length === 0 ? (
          <Empty description="暂无变更记录" />
        ) : (
          <Table
            dataSource={changeRecords}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '变更类型',
                dataIndex: 'changeType',
                key: 'changeType',
                width: 90,
                render: (v: string) => (
                  <Tag color={v === 'merge' ? 'blue' : v === 'split' ? 'orange' : 'default'}>
                    {v === 'merge' ? '合并' : v === 'split' ? '切割' : v}
                  </Tag>
                ),
              },
              { title: '说明', dataIndex: 'notes', key: 'notes' },
              {
                title: '时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 130,
                render: (v: string) => v?.slice(0, 16),
              },
            ]}
          />
        )}
      </Drawer>
    </>
  )
}

// ---------------------------------------------------------------------------
// Root AssetMap component
// ---------------------------------------------------------------------------

type DrillLevel = 'projects' | 'buildings' | 'floorplan'

const AssetMap: React.FC = () => {
  const [level, setLevel] = useState<DrillLevel>('projects')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project)
    setLevel('buildings')
  }, [])

  const handleSelectBuilding = useCallback((building: Building) => {
    setSelectedBuilding(building)
    setLevel('floorplan')
  }, [])

  const handleBackToProjects = useCallback(() => {
    setLevel('projects')
    setSelectedBuilding(null)
  }, [])

  const handleBackToBuildings = useCallback(() => {
    setLevel('buildings')
    setSelectedBuilding(null)
  }, [])

  const steps = [
    { key: 'projects', label: '项目地图', icon: <HomeOutlined /> },
    { key: 'buildings', label: '楼宇视图', icon: <BuildOutlined /> },
    { key: 'floorplan', label: '楼层平面图', icon: <AppstoreOutlined /> },
  ]
  const currentStepIndex = steps.findIndex((s) => s.key === level)

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <PageHeader
        title="资产地图"
        subtitle="可视化查看项目、楼宇及单元分布情况"
        breadcrumbs={[{ title: '资产管理' }, { title: '资产地图' }]}
      />

      {/* Step indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 24,
          background: '#fff',
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
        }}
      >
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: idx === currentStepIndex ? '#e6f4ff' : 'transparent',
                color: idx === currentStepIndex ? '#1677ff' : idx < currentStepIndex ? '#52c41a' : '#bfbfbf',
                fontWeight: idx === currentStepIndex ? 600 : 400,
                fontSize: 13,
                cursor: idx < currentStepIndex ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                if (idx === 0 && level !== 'projects') handleBackToProjects()
                if (idx === 1 && level === 'floorplan') handleBackToBuildings()
              }}
            >
              {step.icon}
              {step.label}
              {idx < currentStepIndex && (
                <Badge
                  count="✓"
                  style={{ backgroundColor: '#52c41a', fontSize: 10, boxShadow: 'none' }}
                />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: idx < currentStepIndex ? '#52c41a' : '#e8e8e8',
                  maxWidth: 40,
                  margin: '0 4px',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {level === 'projects' && <ProjectList onSelect={handleSelectProject} />}

      {level === 'buildings' && selectedProject && (
        <BuildingView
          project={selectedProject}
          onBack={handleBackToProjects}
          onSelectBuilding={handleSelectBuilding}
        />
      )}

      {level === 'floorplan' && selectedProject && selectedBuilding && (
        <FloorPlanView
          building={selectedBuilding}
          project={selectedProject}
          onBack={handleBackToBuildings}
        />
      )}
    </div>
  )
}

export default AssetMap
