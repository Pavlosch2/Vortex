import React from 'react';
import { LogOut, LayoutGrid, HeadphonesIcon, Settings, ShieldCheck, Bot } from 'lucide-react';
import logo from '../assets/vortexLogo.png';
import './styles/Sidebar.css';

const Sidebar = ({ active, setActive, dark, open, setOpen, userRole, onLogout }) => {
  const navItems = [
    { id: 'catalog', label: 'Каталог', icon: LayoutGrid },
    { id: 'ai', label: 'Vortex AI', icon: Bot },
    { id: 'support', label: 'Підтримка', icon: HeadphonesIcon },
    { id: 'settings', label: 'Налаштування', icon: Settings },
    ...(userRole === 'manager' || userRole === 'admin'
      ? [{ id: 'admin', label: 'Панель керування', icon: ShieldCheck }]
      : []),
  ];

  const theme = dark ? 'dark' : 'light';

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'} ${theme}`}>
      <div className="sidebar-logo">
        <img src={logo} alt="Vortex" />
        <span className={`sidebar-logo-text ${theme}`}>
          Vortex
        </span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const isAdmin = id === 'admin';
          return (
            <button
              key={id}
              onClick={() => { setActive(id); if (window.innerWidth < 1024) setOpen(false); }}
              className={[
                'nav-btn',
                isActive ? 'active' : 'inactive',
                isAdmin ? 'admin-item' : '',
                theme,
              ].join(' ')}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`nav-btn-label ${isActive ? 'active' : 'inactive'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <button className="sidebar-logout" onClick={onLogout}>
        <LogOut size={19} />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;