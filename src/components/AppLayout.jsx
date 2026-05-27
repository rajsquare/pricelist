import { NavLink, Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pricelist</h1>
        </div>
        <nav className="app-nav" aria-label="Primary navigation">
          <NavLink to="/">Catalog</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
