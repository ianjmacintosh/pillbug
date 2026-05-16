async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.href = "/register";
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header>
      <a href="/">Pillbug</a>
      {isAuthenticated && (
        <nav>
          <a href="/prescriptions">Prescriptions</a>
          <a href="/fill-session">Fill Session</a>
          <a href="/settings">Settings</a>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}

export default Header;
