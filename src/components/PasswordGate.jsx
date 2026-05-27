import { useState } from 'react';
import { adminConfig } from '../constants/config.js';

export default function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (password === adminConfig.password) {
      localStorage.setItem(adminConfig.storageKey, 'true');
      setError('');
      onAuthenticated();
      return;
    }

    setError('Invalid password.');
  }

  return (
    <section className="admin-card password-gate">
      <h2>Admin Access</h2>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Password
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" type="submit">
          Enter Admin
        </button>
      </form>
    </section>
  );
}
