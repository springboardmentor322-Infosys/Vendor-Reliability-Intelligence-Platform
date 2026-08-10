const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'discussion', label: 'Discussion' },
]

export default function DetailTabBar({ activeTab, onChange }) {
  return (
    <div className="detail-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`detail-tab ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
