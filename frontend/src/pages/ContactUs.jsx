import WelcomeNavbar from '../components/welcomenavbar';
import './ContactUs.css'; // Import the new CSS file

function ContactUs() {
  return (
    <div className="contact-page">
      <WelcomeNavbar />

      <div className="center-container">
        <div className="contact-card">
          <h2>Major Project</h2>
          <p>Chaudhary Devi Lal University</p>
          <p>Barnala Rd, Chaudhary Devi Lal University, Sirsa, Haryana 125055, India</p>
          <p>Phone: +91-120-2441900</p>
          <p>
            Website:{" "}
            <a href="https://www.amity.edu" target="_blank" rel="noreferrer">
              www.cdlu.edu
            </a>
          </p>
          <h3>THANK YOU FOR VISITING!</h3>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;