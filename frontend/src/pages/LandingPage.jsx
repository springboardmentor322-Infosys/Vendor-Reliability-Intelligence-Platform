import { Link } from 'react-router-dom'
import '../landing.css'

const heroHighlights = [
  { title: 'Reduce Risk', icon: '🛡️' },
  { title: 'Improve Performance', icon: '📈' },
  { title: 'Ensure Compliance', icon: '✅' },
  { title: 'Optimize Spend', icon: '💰' },
]

const stats = [
  { value: '250+', label: 'Organizations' },
  { value: '12K+', label: 'Vendors Managed' },
  { value: '85K+', label: 'Purchase Orders Processed' },
  { value: '99.9%', label: 'Data Secure %' },
]

const platformCards = [
  {
    title: 'Vendor Management',
    description: 'Centralize supplier data, onboarding, and lifecycle oversight in one trusted workspace.',
  },
  {
    title: 'Procurement Management',
    description: 'Streamline intake, approvals, and sourcing workflows with real-time visibility.',
  },
  {
    title: 'Performance & Reliability',
    description: 'Track delivery, quality, and response metrics to strengthen partner performance.',
  },
  {
    title: 'Contracts & Compliance',
    description: 'Monitor agreements, documents, and regulatory obligations from a unified view.',
  },
  {
    title: 'Analytics & Reports',
    description: 'Turn procurement data into executive insights with flexible reporting and dashboards.',
  },
]

const trustPoints = [
  'Secure',
  'Role-Based Access',
  'Encryption',
  'Audit Trails',
  'High Availability',
  'Regulatory Compliant',
]

export default function LandingPage() {
  return (
    <div className="landing-shell">
      <header className="landing-navbar">
        <Link to="/" className="brand-mark">
          <span className="brand-mark__logo">VQ</span>
          <span className="brand-mark__name">VendorIQ</span>
        </Link>

        <nav className="landing-nav" aria-label="Primary navigation">
          <a href="#overview">Overview</a>
          <a href="#platform">Platform</a>
          <a href="#modules">Modules</a>
          <a href="#benefits">Benefits</a>
          <a href="#security">Security</a>
          <a href="#about">About Us</a>
        </nav>

        <Link to="/login" className="landing-login-btn">
          Login
        </Link>
      </header>

      <main>
        <section className="hero-section" id="overview">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="hero-eyebrow">Enterprise procurement intelligence</p>
              <h1>Intelligent Procurement. Reliable Partnerships.</h1>
              <p className="hero-subheadline">
                Unify supplier oversight, procurement execution, and operational risk management with one secure platform.
              </p>
              <p className="hero-description">
                VendorIQ helps procurement teams improve collaboration, reduce exposure, and drive better outcomes across every vendor relationship.
              </p>

              <div className="hero-actions">
                <Link to="/register" className="primary-btn">
                  Get Started
                </Link>
                <Link to="/login" className="secondary-btn">
                  Sign In
                </Link>
              </div>

              <div className="hero-highlights" aria-label="Core capabilities">
                {heroHighlights.map((item) => (
                  <div key={item.title} className="highlight-pill">
                    <span className="highlight-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-preview">
                <div className="hero-preview__chrome">
                  <span className="hero-preview__dot" />
                  <span className="hero-preview__dot" />
                  <span className="hero-preview__dot" />
                  <span className="hero-preview__title">VendorIQ Dashboard Preview</span>
                </div>
                <div className="hero-preview__body">
                  <div className="hero-preview__sidebar">
                    <span className="hero-preview__nav-item hero-preview__nav-item--active" />
                    <span className="hero-preview__nav-item" />
                    <span className="hero-preview__nav-item" />
                    <span className="hero-preview__nav-item" />
                    <span className="hero-preview__nav-item" />
                  </div>
                  <div className="hero-preview__content">
                    <div className="hero-preview__stats">
                      {stats.slice(0, 3).map((stat) => (
                        <div key={stat.label} className="hero-preview__stat">
                          <strong>{stat.value}</strong>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="hero-preview__panel">
                      <span className="hero-preview__bar hero-preview__bar--wide" />
                      <span className="hero-preview__bar hero-preview__bar--medium" />
                      <span className="hero-preview__bar hero-preview__bar--accent" />
                      <span className="hero-preview__bar hero-preview__bar--medium" />
                      <span className="hero-preview__bar hero-preview__bar--wide" />
                    </div>
                  </div>
                </div>
                <div className="hero-preview__badge">
                  <strong>92%</strong>
                  <span>Vendor compliance score</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-bar" aria-label="Platform metrics">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="platform-section" id="platform">
          <div className="section-heading">
            <p className="section-eyebrow">Unified Platform</p>
            <h2>One command center for supplier strategy and execution.</h2>
          </div>

          <div className="feature-grid">
            {platformCards.map((card) => (
              <article key={card.title} className="feature-card">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="trust-bar" id="security">
        {trustPoints.map((point) => (
          <span key={point} className="trust-pill">
            {point}
          </span>
        ))}
      </footer>
    </div>
  )
}
