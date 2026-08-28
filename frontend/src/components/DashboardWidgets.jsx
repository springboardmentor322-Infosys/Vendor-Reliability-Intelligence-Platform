export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value ?? 0)
}

export function statusPillClass(status) {
  const value = String(status || '').toLowerCase()
  if (['approved', 'completed', 'delivered', 'paid', 'healthy', 'active', 'low', 'excellent', 'clear', 'compliant'].some((item) => value.includes(item))) {
    return 'status-pill--good'
  }
  if (['pending', 'review', 'warn', 'medium', 'expir', 'in progress', 'shipped', 'partial'].some((item) => value.includes(item))) {
    return 'status-pill--warn'
  }
  if (['cancel', 'overdue', 'high', 'urgent', 'rejected', 'non-compliant'].some((item) => value.includes(item))) {
    return 'status-pill--danger'
  }
  return 'status-pill--warn'
}

export function MetricCards({ cards = [], columns = 'cards' }) {
  return (
    <div className={`dashboard-admin-grid dashboard-admin-grid--${columns}`}>
      {cards.map((card) => (
        <article key={card.label} className="dashboard-card">
          <div className="dashboard-card__label">{card.label}</div>
          <div className="dashboard-card__value">{card.value}</div>
          {card.hint ? <div className="dashboard-card__hint">{card.hint}</div> : null}
        </article>
      ))}
    </div>
  )
}

export function EmptyState({ message = 'No records yet.' }) {
  return <p className="chart-empty">{message}</p>
}
