import WelcomeNavbar from "../components/welcomenavbar";
import Footer from "../components/Shared/Footer";
import "./ContactUs.css";

function LegalTerms() {
  return (
    <div className="page-shell">
      <WelcomeNavbar homePath="/home" />
      <main
        className="page-content contact-page"
        style={{ maxWidth: 720, margin: "0 auto" }}
      >
        <h1>Terms of Service</h1>
        <p>
          By using CampusCart you agree to trade only with verified students, provide
          accurate listing information, and meet safely on campus for exchanges.
        </p>
        <p>
          Prohibited: fraudulent listings, harassment, off-platform scams, and resale
          of stolen goods. Violations may lead to suspension. CampusCart is a
          student project and not liable for disputes between buyers and sellers.
        </p>
        <p>Contact: support@campuscart.edu</p>
      </main>
      <Footer />
    </div>
  );
}

export default LegalTerms;
