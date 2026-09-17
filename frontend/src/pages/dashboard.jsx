import Sidebar from "../components/sidebar";
import "../styles/dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-container">

      <Sidebar />

      <div className="dashboard-content">

        <div className="dashboard-header">
          <h1>Dashboard</h1>

          <input
            type="text"
            placeholder="Search vendors..."
          />
        </div>

        <div className="cards">

          <div className="card">
            <h3>Total Vendors</h3>
            <h1>156</h1>
          </div>

          <div className="card">
            <h3>Purchase Orders</h3>
            <h1>1248</h1>
          </div>

          <div className="card">
            <h3>Active Contracts</h3>
            <h1>112</h1>
          </div>

          <div className="card">
            <h3>Reliability Score</h3>
            <h1>92%</h1>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;