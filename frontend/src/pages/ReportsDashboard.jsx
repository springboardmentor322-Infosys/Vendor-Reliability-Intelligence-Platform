import { useState } from 'react'
import { downloadReport } from '../api/reports'
import { getErrorMessage } from '../utils/auth'
import '../dashboard-admin.css'

const reports = [
  {
    type: 'vendor-performance',
    title: 'Vendor Performance',
    description: 'Review supplier delivery, quality, and risk metrics.',
  },
  {
    type: 'procurement-summary',
    title: 'Procurement',
    description: 'Analyze spend, PO pipeline, and approval velocity.',
  },
  {
    type: 'compliance',
    title: 'Compliance',
    description: 'Track audit, contract, and regulatory status.',
  },
]

export default function ReportsDashboard() {
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleDownload = async (reportType, format) => {
    const key = `${reportType}:${format}`
    setBusyKey(key)
    setError('')
    setNotice('')
    try {
      const filename = await downloadReport(reportType, format)
      setNotice(`Downloaded ${filename}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate report'))
    } finally {
      setBusyKey('')
    }
  }

  return (
    <section className="dashboard-admin-main page-enter">
      <header className="dashboard-admin-header">
        <div>
          <h1>Reports Dashboard</h1>
          <p>Prepare recurring and ad hoc reports for procurement, risk, and vendor performance.</p>
        </div>
      </header>

      {error ? <div className="page-alert page-alert--error">{error}</div> : null}
      {notice ? <div className="page-alert page-alert--success">{notice}</div> : null}

      <section className="dashboard-admin-grid dashboard-admin-grid--cards-3">
        {reports.map((report) => {
          const generating = busyKey.startsWith(`${report.type}:`)
          return (
            <article key={report.type} className="dashboard-card report-card">
              <div className="dashboard-card__label">{report.title}</div>
              <p className="report-card__desc">{report.description}</p>
              <div className="report-card__actions">
                <button
                  type="button"
                  className="dashboard-admin-btn dashboard-admin-btn--ghost"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleDownload(report.type, 'pdf')}
                >
                  {busyKey === `${report.type}:pdf` ? 'Generating…' : 'Generate'}
                </button>
                <button
                  type="button"
                  className="dashboard-admin-btn dashboard-admin-btn--primary"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleDownload(report.type, 'pdf')}
                >
                  {busyKey === `${report.type}:pdf` ? 'Exporting…' : 'Export PDF'}
                </button>
                <button
                  type="button"
                  className="dashboard-admin-btn dashboard-admin-btn--ghost"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleDownload(report.type, 'xlsx')}
                >
                  {busyKey === `${report.type}:xlsx` ? 'Exporting…' : 'Export Excel'}
                </button>
              </div>
              {generating ? <p className="report-card__hint">Building from live database data…</p> : null}
            </article>
          )
        })}
      </section>
    </section>
  )
}
