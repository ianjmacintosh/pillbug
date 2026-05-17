import "./Header.css";

async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.replace("/register");
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header className="header">
      <a href="/" className="header-brand">
        Pillbug
      </a>
      {isAuthenticated && (
        <nav className="header-nav">
          <a href="/prescriptions">Prescriptions</a>
          <a href="/fill-session">Fill Session</a>
          <a href="/settings">Settings</a>
          <button
            type="button"
            onClick={handleLogout}
            className="header-logout"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}

export default Header;
