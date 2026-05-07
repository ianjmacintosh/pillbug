function Register() {
  return (
    <main>
      <h1>Create your account</h1>
      <form>
        <label>
          Email
          <input type="email" name="email" />
        </label>
        <label>
          <input type="checkbox" name="terms" />I agree to the Terms of Service
        </label>
        <button type="submit">Send magic link</button>
      </form>
      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}

export default Register;
