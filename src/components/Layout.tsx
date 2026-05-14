import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import Footer from "./Footer";
import Header from "./Header";

function Layout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => setIsAuthenticated(res.ok))
      .catch(() => {});
  }, []);

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />
      <Outlet />
      <Footer />
    </>
  );
}

export default Layout;
