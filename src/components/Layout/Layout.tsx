import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import BottomNav from "../BottomNav";
import Footer from "../Footer";
import Header from "../Header";
import "./Layout.css";

function Layout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/v1/session")
      .then((res) => setIsAuthenticated(res.ok))
      .catch(() => {});
  }, []);

  return (
    <div className="layout">
      <Header isAuthenticated={isAuthenticated} />
      <Outlet />
      <Footer />
      {isAuthenticated && <BottomNav />}
    </div>
  );
}

export default Layout;
