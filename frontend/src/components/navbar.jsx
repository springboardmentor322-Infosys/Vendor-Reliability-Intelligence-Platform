 import { Link } from "react-router-dom";
import "../styles/navbar.css";

function Navbar() {
return ( <nav className="navbar"> <div className="logo"> <h2>VendorIQ</h2> <p>Vendor Reliability Platform</p> </div>

```
  <ul className="nav-links">
    <li>
      <a href="#overview">Overview</a>
    </li>

    <li>
      <a href="#platform">Platform</a>
    </li>

    <li>
      <a href="#benefits">Benefits</a>
    </li>

    <li>
      <a href="#security">Security</a>
    </li>

    <li>
      <a href="#about">About Us</a>
    </li>
  </ul>

  <div className="nav-buttons">
    <Link to="/login">
      <button className="login-btn">
        Login
      </button>
    </Link>
  </div>
</nav>


);
}

export default Navbar;