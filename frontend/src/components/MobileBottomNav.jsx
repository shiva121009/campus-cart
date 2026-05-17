import { NavLink } from "react-router-dom";
import { FaHome, FaHeart, FaPlus, FaShoppingCart, FaUser } from "react-icons/fa";
import "./MobileBottomNav.css";

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      <NavLink to="/home" className="mbn-link">
        <FaHome aria-hidden />
        <span>Home</span>
      </NavLink>
      <NavLink to="/wishlist" className="mbn-link">
        <FaHeart aria-hidden />
        <span>Wishlist</span>
      </NavLink>
      <NavLink to="/additem" className="mbn-link mbn-link--accent">
        <FaPlus aria-hidden />
        <span>Sell</span>
      </NavLink>
      <NavLink to="/yourcart" className="mbn-link">
        <FaShoppingCart aria-hidden />
        <span>Cart</span>
      </NavLink>
      <NavLink to="/profile" className="mbn-link">
        <FaUser aria-hidden />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

export default MobileBottomNav;
