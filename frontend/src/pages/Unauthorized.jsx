import { Link } from "react-router-dom";
import "../styles/unauthorized.css";

function Unauthorized() {
  return (
    <div className="unauthorized-container">

      <div className="unauthorized-card">

        <h1>Access Restricted</h1>

        <p>
          You do not have permission to access this dashboard.
        </p>

        <p>
          Your account role does not have Administrator access.
        </p>

        <Link to="/profile">
          Go to Profile
        </Link>

      </div>

    </div>
  );
}

export default Unauthorized;