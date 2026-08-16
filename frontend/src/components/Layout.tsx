import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import logo from '../assets/logo.jpg';

const NAV = [
  { to: '/', label: 'Cave', icon: '⌂', end: true },
  { to: '/vins', label: 'Bouteilles', icon: '◍', end: false },
  { to: '/lieux', label: 'Lieux', icon: '▣', end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideFab = location.pathname.startsWith('/vins/nouveau') || location.pathname.includes('/modifier');

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img className="brand-mark" src={logo} alt="" />
          <div className="brand-text">
            <div className="brand-name">Goblin Cellar</div>
            <div className="brand-tag">Gestionnaire de cave</div>
          </div>
        </NavLink>
        <nav className="top-actions" aria-label="Navigation principale">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `top-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/reglages" className={({ isActive }) => `top-link${isActive ? ' active' : ''}`}>
            Réglages
          </NavLink>
          <NavLink to="/vins/nouveau" className="btn btn-primary">
            Ajouter un vin
          </NavLink>
        </nav>
        <NavLink to="/reglages" className="settings-link" aria-label="Réglages" title="Réglages">
          ⚙
        </NavLink>
      </header>

      <main className="page">{children}</main>

      {!hideFab && (
        <NavLink to="/vins/nouveau" className="btn btn-primary fab">
          + Ajouter
        </NavLink>
      )}

      <nav className="bottom-nav" aria-label="Navigation mobile">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-ico" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
