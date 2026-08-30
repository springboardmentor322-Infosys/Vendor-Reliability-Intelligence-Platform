import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  fetchVendorPerformance,
  fetchVendorRanking,
  fetchVendorReliabilityScore,
  fetchVendorsPerformance,
} from '../api/performance'
import { fetchMyVendor, fetchVendors } from '../api/vendors'
import ReliabilityGauge from '../components/ReliabilityGauge'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

function formatPct(value) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)}%`
}

function formatHours(value) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)}h`
}

function riskClass(level) {
  if (level === 'Low') return 'status-pill--good'
  if (level === 'Medium') return 'status-pill--warn'
  return 'status-pill--danger'
}

export default function VendorPerformance() {
  const { user } = useAuth()
  const isVendor = user?.role === 'Vendor'

  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [performance, setPerformance] = useState(null)
  const [reliability, setReliability] = useState(null)
  const [allPerformance, setAllPerformance] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isVendor) {
        const myVendor = await fetchMyVendor()
        setVendors([myVendor])
        setSelectedVendorId(String(myVendor.id))
        const [perf, rel] = await Promise.all([
          fetchVendorPerformance(myVendor.id),
          fetchVendorReliabilityScore(myVendor.id),
        ])
        setPerformance(perf)
        setReliability(rel)
        setAllPerformance([perf])
        setRanking([])
        return
      }

      const [vendorList, perfList, rankList] = await Promise.all([
        fetchVendors(),
        fetchVendorsPerformance(),
        fetchVendorRanking(),
      ])
      setVendors(vendorList)
      setAllPerformance(perfList)
      setRanking(rankList)

      const activeId = selectedVendorId || String(vendorList[0]?.id || '')
      if (!activeId) {
        setPerformance(null)
        setReliability(null)
        return
      }

      if (!selectedVendorId) {
        setSelectedVendorId(activeId)
      }

      const [perf, rel] = await Promise.all([
        fetchVendorPerformance(Number(activeId)),
        fetchVendorReliabilityScore(Number(activeId)),
      ])
      setPerformance(perf)
      setReliability(rel)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load vendor performance data'))
    } finally {
      setLoading(false)
    }
  }, [isVendor, refreshKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleVendorChange = async (event) => {
    const vendorId = event.target.value
    setSelectedVendorId(vendorId)
    if (!vendorId) return

    setLoading(true)
    setError('')
    try {
      const [perf, rel] = await Promise.all([
        fetchVendorPerformance(Number(vendorId)),
        fetchVendorReliabilityScore(Number(vendorId)),
      ])
      setPerformance(perf)
      setReliability(rel)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load vendor metrics'))
    } finally {
      setLoading(false)
    }
  }

  const comparisonData = useMemo(
    () =>
      allPerformance.map((item) => ({
        name: item.vendor_name.length > 14 ? `${item.vendor_name.slice(0, 14)}…` : item.vendor_name,
        onTime: item.on_time_delivery_pct ?? 0,
        quality: item.average_quality_score ?? 0,
        completion: item.order_completion_rate ?? 0,
      })),
    [allPerformance],
  )

  const factorData = useMemo(
    () =>
      (reliability?.factors ?? []).map((factor) => ({
        name: factor.factor.replace(' / ', '\n'),
        score: factor.raw_score,
      })),
    [reliability],
  )

  const selectedVendor = vendors.find((vendor) => String(vendor.id) === String(selectedVendorId))

  const metricCards = [
    { label: 'On-Time Delivery', value: formatPct(performance?.on_time_delivery_pct) },
    { label: 'Quality Score', value: performance?.average_quality_score != null ? `${Number(performance.average_quality_score).toFixed(1)} / 100` : '—' },
    { label: 'Order Completion', value: formatPct(performance?.order_completion_rate) },
    { label: 'Avg Response Time', value: formatHours(performance?.average_response_time_hours) },
  ]

  return (
      <section className="dashboard-admin-main page-enter">
        <header className="dashboard-admin-header">
          <div>
          <h1>{isVendor ? 'My Performance' : 'Vendor Performance'}</h1>
          <p>Live supplier metrics computed from deliveries, inspections, orders, and communications.</p>
          </div>
          <div className="dashboard-admin-header__actions">
          {!isVendor ? (
            <select
              className="dashboard-select"
              value={selectedVendorId}
              onChange={handleVendorChange}
              disabled={loading || vendors.length === 0}
            >
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="dashboard-admin-btn dashboard-admin-btn--primary"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh Metrics'}
          </button>
          </div>
        </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}

        <div className="page-toolbar">
          <div className="filter-group">
          <div className="filter-pill">
            Vendor: {selectedVendor?.name ?? '—'}
          </div>
          <div className="filter-pill">Data source: Live database</div>
        </div>
      </div>

      <div className="dashboard-row dashboard-row--performance-top">
        <section className="chart-card performance-gauge-card">
          <div className="chart-card__header">
            <h3>Reliability Score</h3>
            <span className="chart-card__meta">Weighted composite (0–100)</span>
          </div>
          {loading && !reliability ? (
            <div className="chart-panel chart-panel--loading">Loading…</div>
          ) : (
            <>
              <ReliabilityGauge score={reliability?.overall_score ?? 0} riskLevel={reliability?.risk_level} />
              {reliability?.recommendation ? (
                <p className="reliability-recommendation">{reliability.recommendation}</p>
              ) : null}
            </>
          )}
        </section>

        <div className="dashboard-admin-grid dashboard-admin-grid--cards-4 performance-metrics-grid">
          {metricCards.map((item) => (
            <article key={item.label} className="dashboard-card">
              <div className="dashboard-card__label">{item.label}</div>
              <div className="dashboard-card__value">{item.value}</div>
            </article>
          ))}
        </div>
        </div>

        <div className="dashboard-row" style={{ marginTop: '1rem' }}>
        <section className="chart-card" style={{ minHeight: '360px' }}>
            <div className="chart-card__header">
            <h3>{isVendor ? 'Factor Breakdown' : 'Vendor Comparison'}</h3>
            <span className="chart-card__meta">
              {isVendor ? 'Reliability factor scores' : 'Cross-vendor performance metrics'}
            </span>
          </div>
          <div className="chart-panel chart-panel--live">
            {loading ? (
              <div className="chart-empty">Loading chart…</div>
            ) : isVendor ? (
              factorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={factorData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="score" name="Score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No factor data available.</div>
              )
            ) : comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" name="On-Time %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quality" name="Quality" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completion" name="Completion %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No comparison data available.</div>
            )}
          </div>
        </section>

        {!isVendor ? (
          <section className="list-card" style={{ minHeight: '360px' }}>
            <div className="list-card__header">
              <h3>Vendor Ranking</h3>
              <span className="list-card__meta">Sorted by reliability score</span>
            </div>
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Score</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="ranking-table__empty">No ranking data.</td>
                    </tr>
                  ) : (
                    ranking.map((entry) => (
                      <tr
                        key={entry.vendor_id}
                        className={String(entry.vendor_id) === String(selectedVendorId) ? 'is-selected' : ''}
                      >
                        <td>#{entry.rank}</td>
                        <td>{entry.vendor_name}</td>
                        <td>{Number(entry.overall_score).toFixed(1)}</td>
                        <td>
                          <span className={`status-pill ${riskClass(entry.risk_level)}`}>
                            {entry.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="list-card" style={{ minHeight: '360px' }}>
            <div className="list-card__header">
              <h3>Reliability Factors</h3>
              <span className="list-card__meta">Weighted contributions</span>
            </div>
            <div className="activity-list">
              {(reliability?.factors ?? []).map((factor) => (
                <div key={factor.factor} className="activity-item">
                  <span>{factor.factor}</span>
                  <strong>{Number(factor.weighted_score).toFixed(1)} pts</strong>
              </div>
              ))}
            </div>
          </section>
        )}
        </div>
      </section>
  )
}
