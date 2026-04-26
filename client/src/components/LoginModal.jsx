import { LogIn } from 'lucide-react';

export function LoginModal({ credentials, authStatus, onCredentialsChange, onSubmit }) {
  return (
    <div className="login-backdrop" role="presentation">
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
        <div className="login-brand">
          <img src="/facepilot-logo.svg" alt="" aria-hidden="true" />
          <div>
            <p className="eyebrow">Leaderboard login</p>
            <h1 id="loginTitle">Enter FacePilot</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="loginUsername">Username</label>
          <input
            id="loginUsername"
            type="text"
            value={credentials.username}
            onChange={(event) => onCredentialsChange((current) => ({ ...current, username: event.target.value }))}
            placeholder="Choose or enter username"
            maxLength="18"
            autoComplete="username"
            autoFocus
          />

          <label htmlFor="loginPassword">Password</label>
          <input
            id="loginPassword"
            type="password"
            value={credentials.password}
            onChange={(event) => onCredentialsChange((current) => ({ ...current, password: event.target.value }))}
            placeholder="4+ characters"
            minLength="4"
            autoComplete="current-password"
          />

          {authStatus && <p className="form-status">{authStatus}</p>}

          <button type="submit" disabled={!credentials.username.trim() || credentials.password.length < 4}>
            <LogIn size={18} />
            Continue
          </button>
        </form>
      </section>
    </div>
  );
}
