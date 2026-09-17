 import Navbar from "../components/navbar";
import Hero from "../components/hero";
import Stats from "../components/stats";
import Features from "../components/features";
import Benefits from "../components/benefits";
import Security from "../components/Security";
import Footer from "../components/footer";

function Home() {
return (
<> <Navbar />


  <Hero />

  <div id="platform">
    <Stats />
  </div>

  <Features />

  <div id="benefits">
    <Benefits />
  </div>

  <Security />

  <div id="about">
    <Footer />
  </div>
</>

);
}

export default Home;
