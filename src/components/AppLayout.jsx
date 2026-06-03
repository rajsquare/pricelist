import { NavLink, Outlet } from 'react-router-dom';

const BILLING_URL = 'https://rajsquare.github.io/billing-app/billingappfiles/bill.html';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>
            <a
              className="app-switcher"
              href={BILLING_URL}
              title="Switch to Billing App"
              aria-label="Pricelist — click to switch to Billing App"
            >
              Pricelist
              <span className="app-switcher-icon" aria-hidden="true">⇄</span>
            </a>
          </h1>
        </div>
        <nav className="app-nav" aria-label="Primary navigation">
          <NavLink to="/" end>Catalog</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
