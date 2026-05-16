import "./Header.css";

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
          <a href="/logout" className="header-logout">
            Log out
          </a>
        </nav>
      )}
    </header>
  );
}

export default Header;
