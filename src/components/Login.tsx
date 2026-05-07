function Login() {
  return (
    <main>
      <h1>Log in</h1>
      <form>
        <label>
          Email
          <input type="email" name="email" />
        </label>
        <button type="submit">Send magic link</button>
      </form>
      <p>
        New here? <a href="/register">Create an account</a>
      </p>
    </main>
  );
}

export default Login;
