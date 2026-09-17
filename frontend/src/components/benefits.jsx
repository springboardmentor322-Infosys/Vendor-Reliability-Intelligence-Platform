import "../styles/benefits.css";

function Benefits() {
  return (
    <section className="benefits">

      <h2>Why Choose VendorIQ?</h2>

      <p className="benefits-subtitle">
        A centralized platform designed to simplify vendor management,
        procurement, compliance, and business decision-making.
      </p>

      <div className="benefits-grid">

        <div className="benefit-card">
          <h3>🔒 Secure Platform</h3>
          <p>
            Role-based authentication and secure access for all users.
          </p>
        </div>

        <div className="benefit-card">
          <h3>📊 Real-Time Analytics</h3>
          <p>
            Track vendor performance and procurement activities instantly.
          </p>
        </div>

        <div className="benefit-card">
          <h3>⚡ Faster Procurement</h3>
          <p>
            Streamline purchase requests and approval workflows.
          </p>
        </div>

        <div className="benefit-card">
          <h3>📑 Contract Compliance</h3>
          <p>
            Monitor contracts, certifications, and renewal dates efficiently.
          </p>
        </div>

      </div>

    </section>
  );
}

export default Benefits;