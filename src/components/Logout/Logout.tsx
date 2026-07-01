import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "../Button/Button";

function Logout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await fetch("/api/v1/logout", { method: "POST" });
    await navigate({ to: "/register" });
  }

  return (
    <main>
      <h1>Log out</h1>
      <p>You're logged in — log out?</p>
      <Button
        type="button"
        className="button-secondary button-leading-icon"
        onClick={handleLogout}
      >
        <LogOut size={18} aria-hidden="true" />
        Log out
      </Button>
    </main>
  );
}

export default Logout;
