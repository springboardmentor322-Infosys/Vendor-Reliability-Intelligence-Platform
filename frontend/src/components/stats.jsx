import "../styles/stats.css";

function Stats() {
  return (
    <section className="stats">

      <div className="stat-card">
        <h2>500+</h2>
        <p>Organizations</p>
      </div>

      <div className="stat-card">
        <h2>10K+</h2>
        <p>Registered Vendors</p>
      </div>

      <div className="stat-card">
        <h2>50K+</h2>
        <p>Purchase Orders</p>
      </div>

      <div className="stat-card">
        <h2>99.9%</h2>
        <p>System Uptime</p>
      </div>

    </section>
  );
}

export default Stats;