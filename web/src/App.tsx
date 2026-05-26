import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Capabilities from "@/pages/Capabilities";
import Selection from "@/pages/Selection";
import Listing from "@/pages/Listing";
import Pricing from "@/pages/Pricing";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Returns from "@/pages/Returns";
import Finance from "@/pages/Finance";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/capabilities" element={<Capabilities />} />
        <Route path="/selection" element={<Selection />} />
        <Route path="/listing" element={<Listing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:postingNumber" element={<OrderDetail />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
