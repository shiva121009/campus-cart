import WelcomeNavbar from "../components/welcomenavbar";
import Footer from "../components/Shared/Footer";
import "./ContactUs.css";

function LegalPrivacy() {
  return (
    <div className="page-shell">
      <WelcomeNavbar homePath="/home" />
      <main
        className="page-content contact-page"
        style={{ maxWidth: 720, margin: "0 auto" }}
      >
        <h1>Privacy Policy</h1>
        <p>
          CampusCart collects your name, email, phone, and student verification
          documents to operate a campus-only marketplace. Listings, messages, and
          order details are stored securely on our servers for transaction purposes.
        </p>
        <p>
          We do not sell your data to third parties. Admins may review reports and
          verification materials to keep the platform safe. You may update profile
          details or request account deletion via support.
        </p>
        <p>Contact: support@campuscart.edu</p>
      </main>
      <Footer />
    </div>
  );
}

export default LegalPrivacy;
