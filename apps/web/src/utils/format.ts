/**
 * Formatting utilities for the mdos real estate SaaS platform.
 */

/**
 * Format a number as Chinese Yuan currency string.
 * @example formatCurrency(1234.56) // "¥1,234.56"
 */
export function formatCurrency(amount: number): string {
  if (amount == null || isNaN(amount)) return '¥0.00'
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format an ISO date string as YYYY-MM-DD.
 * @example formatDate("2024-01-15T14:30:00Z") // "2024-01-15"
 */
export function formatDate(date: string): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return '-'
  }
}

/**
 * Format an ISO date string as YYYY-MM-DD HH:mm.
 * @example formatDateTime("2024-01-15T14:30:00Z") // "2024-01-15 14:30"
 */
export function formatDateTime(date: string): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return '-'
  }
}

/**
 * Format an ISO date string as a relative time string in Chinese.
 * @example formatRelativeTime("...") // "2小时前" / "3天前" / "刚刚"
 */
export function formatRelativeTime(date: string): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)

    if (diffSeconds < 60) return '刚刚'
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60)
      return `${mins}分钟前`
    }
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600)
      return `${hours}小时前`
    }
    if (diffSeconds < 2592000) {
      const days = Math.floor(diffSeconds / 86400)
      return `${days}天前`
    }
    if (diffSeconds < 31536000) {
      const months = Math.floor(diffSeconds / 2592000)
      return `${months}个月前`
    }
    const years = Math.floor(diffSeconds / 31536000)
    return `${years}年前`
  } catch {
    return '-'
  }
}

/**
 * Map a status code to an Ant Design Tag color prop value.
 *
 * Unit / property statuses:
 *   vacant       -> success (green)
 *   rented       -> processing (blue)
 *   reserved     -> warning (yellow)
 *   renovating   -> gold
 *   maintenance  -> error (red)
 *
 * Contract statuses:
 *   draft        -> default (grey)
 *   active       -> success
 *   expired      -> default
 *   terminated   -> error
 *
 * Billing / invoice statuses:
 *   outstanding  -> processing
 *   paid         -> success
 *   overdue      -> error
 *
 * Approval / workflow statuses:
 *   pending_review -> default
 *   reviewed       -> processing
 *   sent           -> blue
 */
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    // Unit
    vacant: 'success',
    rented: 'processing',
    reserved: 'warning',
    renovating: 'gold',
    maintenance: 'error',
    // Contract
    draft: 'default',
    active: 'success',
    expired: 'default',
    terminated: 'error',
    // Billing
    outstanding: 'processing',
    paid: 'success',
    overdue: 'error',
    // Workflow
    pending_review: 'default',
    reviewed: 'processing',
    sent: 'blue',
  }
  return map[status] ?? 'default'
}

/**
 * Translate a status code to a human-readable Chinese label.
 */
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    vacant: '空置',
    rented: '已租',
    reserved: '已预订',
    renovating: '装修中',
    maintenance: '维修中',
    draft: '草稿',
    active: '生效中',
    expired: '已到期',
    terminated: '已终止',
    outstanding: '待收款',
    paid: '已付款',
    overdue: '已逾期',
    pending_review: '待审核',
    reviewed: '已审核',
    sent: '已发送',
  }
  return map[status] ?? status
}
