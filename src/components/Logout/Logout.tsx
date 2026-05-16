import { useNavigate } from "@tanstack/react-router";

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
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}

export default Logout;
