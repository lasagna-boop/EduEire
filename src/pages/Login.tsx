type Props = {
  user: { name: string } | null;
  onLogin: () => void;
};

export default function Login({ user, onLogin }: Props) {
  return (
    <div style={{ padding: 32 }}>
      <h2>Login</h2>

      {user ? (
        <p>You are already logged in as @{user.name}.</p>
      ) : (
        <>
          <p>This is a placeholder login page (Firebase later).</p>
          <button onClick={onLogin}>Sign in (mock)</button>
        </>
      )}
    </div>
  );
}