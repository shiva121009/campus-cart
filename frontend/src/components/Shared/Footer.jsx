import { useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaUniversity,
  FaShieldAlt,
  FaSearch,
  FaUsers,
  FaHeart,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./Footer.css";

const MARKETPLACE_LINKS = [
  { label: "Dashboard", path: "/home" },
  { label: "Add Item", path: "/additem" },
  { label: "Your Items", path: "/youritems" },
  { label: "Your Cart", path: "/yourcart" },
  { label: "Your Orders", path: "/yourorders" },
];

const ACCOUNT_LINKS = [
  { label: "Profile", path: "/profile" },
  { label: "Messages", path: "/viewmessages" },
  { label: "Contact Us", path: "/contact" },
];

const TRUST_ITEMS = [
  { icon: FaShieldAlt, label: "Verified students only" },
  { icon: FaSearch, label: "Smart search & picks" },
  { icon: FaUsers, label: "Campus peer-to-peer" },
];

function Footer() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const year = new Date().getFullYear();

  const go = (path) => () => navigate(path);

  return (
    <footer className="app-footer">
      <div className="app-footer-main">
        <div className="app-footer-inner">
          <div className="footer-col footer-brand">
            <button
              type="button"
              className="footer-logo-btn"
              onClick={go("/home")}
            >
              CampusCart
            </button>
            <p className="footer-tagline">
              The trusted campus marketplace for students to buy, sell, and
              trade safely within your university community.
            </p>
            <div className="footer-made-with">
              <FaHeart className="footer-heart" aria-hidden />
              Built for CDLU students
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Marketplace</h4>
            <ul className="footer-nav">
              {MARKETPLACE_LINKS.map((link) => (
                <li key={link.path}>
                  <button type="button" onClick={go(link.path)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Account</h4>
            <ul className="footer-nav">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.path}>
                  <button type="button" onClick={go(link.path)}>
                    {link.label}
                  </button>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <button type="button" onClick={go("/admin")}>
                    Admin panel
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="footer-col footer-contact">
            <h4 className="footer-heading">Get in touch</h4>
            <ul className="footer-contact-list">
              <li>
                <FaUniversity className="footer-contact-icon" aria-hidden />
                <span>
                  Chaudhary Devi Lal University
                  <small>Sirsa, Haryana 125055</small>
                </span>
              </li>
              <li>
                <FaMapMarkerAlt className="footer-contact-icon" aria-hidden />
                <span>Barnala Road Campus, Sirsa</span>
              </li>
              <li>
                <FaEnvelope className="footer-contact-icon" aria-hidden />
                <a href="mailto:support@campuscart.edu">
                  support@campuscart.edu
                </a>
              </li>
            </ul>
            <button
              type="button"
              className="footer-cta"
              onClick={go("/contact")}
            >
              Contact support
            </button>
          </div>
        </div>

        <div className="footer-trust" role="list" aria-label="Platform highlights">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="footer-trust-item" role="listitem">
              <Icon aria-hidden />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="app-footer-bottom">
        <div className="app-footer-bottom-inner">
          <p className="footer-copy">
            © {year} CampusCart. All rights reserved. Major Project · CDLU.
          </p>
          <nav className="footer-legal" aria-label="Legal">
            <button type="button" onClick={go("/privacy")}>
              Privacy
            </button>
            <span className="footer-legal-dot" aria-hidden>
              ·
            </span>
            <button type="button" onClick={go("/terms")}>
              Terms
            </button>
            <span className="footer-legal-dot" aria-hidden>
              ·
            </span>
            <button type="button" onClick={go("/contact")}>
              Help
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
