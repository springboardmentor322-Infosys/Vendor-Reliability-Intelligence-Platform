 import "../styles/hero.css";
import heroImage from "../assets/hero1.webp";

import {
FaShieldAlt,
FaChartLine,
FaFileContract,
FaDollarSign,
} from "react-icons/fa";

function Hero() {
return ( <section className="hero" id="overview"> <div className="hero-left"> <h1>
Intelligent Procurement. <br />
Reliable Partnerships. </h1>


    <h3>
      Smarter Vendor Management. Better Business Decisions.
    </h3>

    <p>
      VendorIQ helps organizations manage vendors, procurement,
      contracts and supplier performance through a centralized
      intelligent platform.
    </p>

    <div className="hero-features">
      <div className="feature">
        <FaShieldAlt className="feature-icon" />

        <div>
          <h4>Reduce Risk</h4>
          <p>
            Identify supplier risks before they become business problems.
          </p>
        </div>
      </div>

      <div className="feature">
        <FaChartLine className="feature-icon" />

        <div>
          <h4>Improve Performance</h4>
          <p>
            Monitor vendor performance using real-time analytics.
          </p>
        </div>
      </div>

      <div className="feature">
        <FaFileContract className="feature-icon" />

        <div>
          <h4>Ensure Compliance</h4>
          <p>
            Keep contracts and certifications up to date.
          </p>
        </div>
      </div>

      <div className="feature">
        <FaDollarSign className="feature-icon" />

        <div>
          <h4>Optimize Spend</h4>
          <p>
            Improve procurement efficiency and reduce operational costs.
          </p>
        </div>
      </div>
    </div>
  </div>

  <div className="hero-right">
    <img src={heroImage} alt="VendorIQ Dashboard" />
  </div>
</section>

);
}

export default Hero;