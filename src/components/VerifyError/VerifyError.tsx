function VerifyError() {
  return (
    <main>
      <h1>This link is invalid or expired</h1>
      <p>
        Verification links expire after 7 days. If your link has expired,{" "}
        <a href="/register">register again</a> to get a new one. If you've
        already verified your account, <a href="/login">log in</a> instead. For
        your privacy, we can't tell you which applies.
      </p>
    </main>
  );
}

export default VerifyError;
