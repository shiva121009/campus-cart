import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WelcomePage from "./pages/WelcomePage";
import Home from "./pages/Home";
import AddItem from "./pages/AddItem";
import YourItems from "./pages/YourItems";
import View from "./pages/View";
import YourCart from "./pages/YourCart";
import ContactUs from "./pages/ContactUs";
import Checkout from "./pages/Checkout";
import YourOrders from "./pages/YourOrders";
import ViewMessages from "./pages/ViewMessages";
import Profile from "./pages/Profile";
import PendingVerification from "./pages/PendingVerification";
import AccountRestricted from "./pages/AccountRestricted";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminGuard from "./components/admin/AdminGuard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminRegister from "./pages/admin/AdminRegister";
import Wishlist from "./pages/Wishlist";
import LegalPrivacy from "./pages/LegalPrivacy";
import LegalTerms from "./pages/LegalTerms";
import SellerProfile from "./pages/SellerProfile";
import ForgotPassword from "./pages/ForgotPassword";
import AdminReports from "./pages/admin/AdminReports";

function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<LegalPrivacy />} />
      <Route path="/terms" element={<LegalTerms />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/pending-verification" element={<PendingVerification />} />
      <Route path="/account-restricted" element={<AccountRestricted />} />
      <Route path="/logout" element={<WelcomePage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<Home />} />
        <Route path="/additem" element={<AddItem />} />
        <Route path="/youritems" element={<YourItems />} />
        <Route path="/additem/:id" element={<AddItem />} />
        <Route path="/listing/:id" element={<View />} />
        <Route path="/yourcart" element={<YourCart />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/yourorders" element={<YourOrders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/viewmessages" element={<ViewMessages />} />
        <Route path="/viewmessages/:postId" element={<ViewMessages />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/seller/:id" element={<SellerProfile />} />
      </Route>

      <Route path="/admin" element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="verifications" element={<AdminVerifications />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
