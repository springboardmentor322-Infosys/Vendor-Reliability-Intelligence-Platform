const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'discussion', label: 'Discussion' },
]

export default function DetailTabBar({ activeTab, onChange, tabs = TABS }) {
  return (
    <div className="detail-tabs" role="tablist">
      {tabs.map((tab) => (
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
