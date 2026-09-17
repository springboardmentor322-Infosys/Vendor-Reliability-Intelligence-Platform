import {
FaLock,
FaUserShield,
FaKey,
FaDatabase,
} from "react-icons/fa";

import "../styles/security.css";

function Security() {
return ( <section className="security-section" id="security"> <div className="security-header"> <h2>Platform Security</h2>

    <p>
      VendorIQ is designed with secure access controls and
      role-based permissions to protect important procurement
      and vendor information.
    </p>
  </div>

  <div className="security-grid">
    <div className="security-card">
      <FaLock />

      <h3>Secure Authentication</h3>

      <p>
        Users authenticate securely before accessing the
        platform and protected business information.
      </p>
    </div>

    <div className="security-card">
      <FaUserShield />

      <h3>Role-Based Access</h3>

      <p>
        Administrators, procurement managers, vendors,
        finance officers and auditors receive access based
        on their assigned responsibilities.
      </p>
    </div>

    <div className="security-card">
      <FaKey />

      <h3>Protected Sessions</h3>

      <p>
        Authenticated sessions use secure tokens to control
        access to protected application resources.
      </p>
    </div>

    <div className="security-card">
      <FaDatabase />

      <h3>Data Protection</h3>

      <p>
        Vendor, procurement, contract and performance data
        is stored in a centralized PostgreSQL database with
        controlled application access.
      </p>
    </div>
  </div>
</section>

);
}

export default Security;
