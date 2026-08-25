export function reliabilityGaugeColor(score) {
  if (score == null || Number.isNaN(score)) return 'neutral'
  if (score < 40) return 'red'
  if (score <= 70) return 'amber'
  return 'green'
}

export default function ReliabilityGauge({ score, riskLevel, size = 180 }) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0))
  const colorClass = reliabilityGaugeColor(normalized)
  const radius = (size - 24) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (normalized / 100) * circumference

  return (
    <div className={`reliability-gauge reliability-gauge--${colorClass}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="reliability-gauge__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="14"
        />
        <circle
          className="reliability-gauge__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="reliability-gauge__label">
        <strong>{normalized.toFixed(1)}</strong>
        <span>Reliability Score</span>
        {riskLevel ? <em>{riskLevel} Risk</em> : null}
      </div>
    </div>
  )
}
