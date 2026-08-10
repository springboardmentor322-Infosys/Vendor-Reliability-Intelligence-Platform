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
    description:
      'Centralize supplier data, onboarding, and lifecycle oversight in one trusted workspace.',
  },
  {
    title: 'Procurement Management',
    description:
      'Streamline intake, approvals, and sourcing workflows with real-time visibility.',
  },
  {
    title: 'Performance & Reliability',
    description:
      'Track delivery, quality, and response metrics to strengthen partner performance.',
  },
  {
    title: 'Contracts & Compliance',
    description:
      'Monitor agreements, documents, and regulatory obligations from a unified view.',
  },
  {
    title: 'Analytics & Reports',
    description:
      'Turn procurement data into executive insights with flexible reporting and dashboards.',
  },
]

const modules = [
  {
    icon: '🏢',
    title: 'Vendor Management',
    description:
      'Manage vendor profiles, onboarding, documents, and lifecycle information.',
  },
  {
    icon: '📋',
    title: 'Procurement',
    description:
      'Handle procurement requests, approvals, and sourcing workflows.',
  },
  {
    icon: '🛒',
    title: 'Purchase Orders',
    description:
      'Create, track, and manage purchase orders across vendor relationships.',
  },
  {
    icon: '📄',
    title: 'Contracts & Compliance',
    description:
      'Manage contracts, expiry tracking, compliance flags, and documents.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    description:
      'Monitor vendor performance and procurement data through dashboards.',
  },
  {
    icon: '🔔',
    title: 'Notifications',
    description:
      'Receive updates and alerts for important procurement and vendor events.',
  },
]

const benefits = [
  {
    icon: '🛡️',
    title: 'Reduce Risk',
    description:
      'Identify vendor and procurement risks earlier with centralized visibility.',
  },
  {
    icon: '📈',
    title: 'Improve Performance',
    description:
      'Track vendor delivery, quality, and operational performance.',
  },
  {
    icon: '✅',
    title: 'Ensure Compliance',
    description:
      'Maintain compliance visibility across vendors, contracts, and activities.',
  },
  {
    icon: '💰',
    title: 'Optimize Spend',
    description:
      'Use procurement data to support better purchasing decisions.',
  },
]

const securityPoints = [
  {
    icon: '🔐',
    title: 'JWT Authentication',
    description:
      'Authenticated users access protected resources through JWT-based authentication.',
  },
  {
    icon: '👥',
    title: 'Role-Based Access Control',
    description:
      'Permissions are enforced according to the user’s assigned role.',
  },
  {
    icon: '📝',
    title: 'Audit Logging',
    description:
      'Important system and business actions are recorded in audit logs.',
  },
  {
    icon: '✓',
    title: 'Data Validation',
    description:
      'API inputs are validated through structured schemas and validators.',
  },
]

export default function LandingPage() {
  return (
    <div className="landing-shell">
      {/* =========================
          NAVIGATION
          ========================= */}
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
        {/* =========================
            OVERVIEW / HERO
            ========================= */}
        <section className="hero-section" id="overview">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="hero-eyebrow">
                Enterprise procurement intelligence
              </p>

              <h1>Intelligent Procurement. Reliable Partnerships.</h1>

              <p className="hero-subheadline">
                Unify supplier oversight, procurement execution, and operational
                risk management with one secure platform.
              </p>

              <p className="hero-description">
                VendorIQ helps procurement teams improve collaboration, reduce
                exposure, and drive better outcomes across every vendor
                relationship.
              </p>

              <div className="hero-actions">
                <Link to="/register" className="primary-btn">
                  Get Started
                </Link>

                <Link to="/login" className="secondary-btn">
                  Sign In
                </Link>
              </div>

              <div
                className="hero-highlights"
                aria-label="Core capabilities"
              >
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

            {/* Dashboard preview */}
            <div className="hero-visual" aria-hidden="true">
              <div className="hero-preview">
                <div className="hero-preview__chrome">
                  <span className="hero-preview__dot" />
                  <span className="hero-preview__dot" />
                  <span className="hero-preview__dot" />

                  <span className="hero-preview__title">
                    VendorIQ Dashboard Preview
                  </span>
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
                        <div
                          key={stat.label}
                          className="hero-preview__stat"
                        >
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

        {/* =========================
            STATS
            ========================= */}
        <section className="stats-bar" aria-label="Platform metrics">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        {/* =========================
            PLATFORM
            ========================= */}
        <section className="platform-section" id="platform">
          <div className="section-heading">
            <p className="section-eyebrow">Unified Platform</p>

            <h2>
              One command center for supplier strategy and execution.
            </h2>
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

        {/* =========================
            MODULES
            ========================= */}
        <section className="landing-content-section" id="modules">
          <div className="section-heading">
            <p className="section-eyebrow">Modules</p>

            <h2>Core procurement and vendor management capabilities.</h2>
          </div>

          <div className="module-grid">
            {modules.map((module) => (
              <article key={module.title} className="module-card">
                <div className="module-icon" aria-hidden="true">
                  {module.icon}
                </div>

                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =========================
            BENEFITS
            ========================= */}
        <section className="landing-content-section" id="benefits">
          <div className="section-heading">
            <p className="section-eyebrow">Benefits</p>

            <h2>Practical outcomes from connected procurement data.</h2>
          </div>

          <div className="benefit-grid">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="benefit-card">
                <div className="benefit-icon" aria-hidden="true">
                  {benefit.icon}
                </div>

                <h3>{benefit.title}</h3>

                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* =========================
            SECURITY
            ========================= */}
        <section className="landing-content-section" id="security">
          <div className="section-heading">
            <p className="section-eyebrow">Security</p>

            <h2>Security controls implemented in VendorIQ.</h2>
          </div>

          <div className="security-grid">
            {securityPoints.map((point) => (
              <article key={point.title} className="security-card">
                <div className="security-icon" aria-hidden="true">
                  {point.icon}
                </div>

                <div>
                  <h3>{point.title}</h3>
                  <p>{point.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =========================
            ABOUT US
            ========================= */}
        <section
          className="landing-content-section about-section"
          id="about"
        >
          <div className="section-heading">
            <p className="section-eyebrow">About Us</p>

            <h2>About VendorIQ</h2>
          </div>

          <div className="about-card">
            <p>
              VendorIQ is a student and portfolio project focused on solving
              practical vendor reliability and procurement risk management
              challenges.
            </p>

            <p>
              It brings vendor management, procurement workflows, purchase
              orders, contracts, analytics, notifications, and security
              controls into one connected platform.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}