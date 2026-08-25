import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  fetchDeliveryPerformanceSummary,
  fetchProcurementCostTrends,
  fetchSpendOverTime,
  fetchVendorCategoryDistribution,
} from '../api/analytics'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

const PIE_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value ?? 0)
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(1)}%`
}

function formatMonth(period) {
  if (!period) return ''
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function AnalyticsDashboard() {
  const [spendData, setSpendData] = useState(null)
  const [categoryData, setCategoryData] = useState(null)
  const [costTrends, setCostTrends] = useState(null)
  const [deliverySummary, setDeliverySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [spend, categories, trends, delivery] = await Promise.all([
        fetchSpendOverTime(),
        fetchVendorCategoryDistribution(),
        fetchProcurementCostTrends(),
        fetchDeliveryPerformanceSummary(),
      ])
      setSpendData(spend)
      setCategoryData(categories)
      setCostTrends(trends)
      setDeliverySummary(delivery)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load analytics data'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const spendChartData = useMemo(
    () =>
      (spendData?.points ?? []).map((point) => ({
        period: formatMonth(point.period),
        spend: point.total_spend,
        orders: point.order_count,
      })),
    [spendData],
  )

  const categoryChartData = useMemo(
    () =>
      (categoryData?.categories ?? [])
        .filter((item) => item.total_spend > 0 || item.vendor_count > 0)
        .map((item) => ({
          name: item.category_name,
          value: item.total_spend,
          vendors: item.vendor_count,
        })),
    [categoryData],
  )

  const costTrendChartData = useMemo(
    () =>
      (costTrends?.points ?? []).map((point) => ({
        period: formatMonth(point.period),
        avgOrder: point.average_order_value,
        total: point.total_spend,
      })),
    [costTrends],
  )

  const deliveryModeData = useMemo(
    () =>
      (deliverySummary?.by_shipping_mode ?? []).map((item) => ({
        mode: item.mode,
        count: item.count,
        onTime: item.on_time_pct ?? 0,
      })),
    [deliverySummary],
  )

  const qoqLabel =
    costTrends?.quarter_over_quarter_change_pct == null
      ? '—'
      : `${costTrends.quarter_over_quarter_change_pct > 0 ? '+' : ''}${costTrends.quarter_over_quarter_change_pct}% QoQ`

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Procurement spend, category mix, cost trends, and delivery performance from live data.</p>
        </div>
        <div className="dashboard-admin-header__actions">
          <button
            type="button"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

      <div className="dashboard-admin-grid dashboard-admin-grid--cards-4">
        <article className="dashboard-card">
          <div className="dashboard-card__label">Total Spend</div>
          <div className="dashboard-card__value">{formatCurrency(spendData?.total_spend ?? 0)}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Vendor Categories</div>
          <div className="dashboard-card__value">{categoryData?.categories?.length ?? 0}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">Cost Trend</div>
          <div className="dashboard-card__value">{qoqLabel}</div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card__label">On-Time Delivery</div>
          <div className="dashboard-card__value">{formatPct(deliverySummary?.on_time_pct)}</div>
        </article>
      </div>

      <div className="dashboard-row dashboard-row--analytics" style={{ marginTop: '1rem' }}>
        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Spend Over Time</h3>
            <span className="chart-card__meta">Monthly purchase order totals</span>
          </div>
          <div className="chart-panel chart-panel--live">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : spendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendChartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={72} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No spend data available.</div>
            )}
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Vendor Category Distribution</h3>
            <span className="chart-card__meta">Spend by vendor category</span>
          </div>
          <div className="chart-panel chart-panel--live">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No category data available.</div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-row dashboard-row--analytics" style={{ marginTop: '1rem' }}>
        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Procurement Cost Trends</h3>
            <span className="chart-card__meta">Average order value over time</span>
          </div>
          <div className="chart-panel chart-panel--live">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : costTrendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrendChartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={72} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="avgOrder" name="Avg Order Value" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No cost trend data available.</div>
            )}
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <h3>Delivery Performance Summary</h3>
            <span className="chart-card__meta">On-time rate by shipping mode</span>
          </div>
          <div className="chart-panel chart-panel--live">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : deliveryModeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryModeData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" name="On-Time %" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No delivery data available.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
