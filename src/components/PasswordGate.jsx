import { useRef, useState } from 'react';
import { adminConfig } from '../constants/config.js';

export default function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const errorId = 'password-gate-error';
  const inputRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();

    if (password === adminConfig.password) {
      localStorage.setItem(adminConfig.storageKey, 'true');
      setError('');
      onAuthenticated();
      return;
    }

    setError('Invalid password.');
    setPassword('');
    inputRef.current?.focus();
  }

  return (
    <section className="admin-card password-gate">
      <h2>Admin Access</h2>
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label>
          Password
          <input
            ref={inputRef}
            type="password"
            value={password}
            autoComplete="current-password"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? 'true' : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <div id={errorId} className="form-error" role="alert">
            {error}
          </div>
        ) : null}
        <button className="primary-button" type="submit">
          Enter Admin
        </button>
      </form>
    </section>
  );
}
