import React from 'react';
import { LogOut, LayoutGrid, HeadphonesIcon, Settings, ShieldCheck, Bot, Zap } from 'lucide-react';
import logo from '../assets/vortexLogo.png';
import './styles/Sidebar.css';

const Sidebar = ({ active, setActive, dark, open, setOpen, userRole, onLogout }) => {
  const navItems = [
    { id: 'catalog', label: 'Каталог', icon: LayoutGrid },
    { id: 'ai', label: 'Vortex AI', icon: Bot },
    { id: 'support', label: 'Підтримка', icon: HeadphonesIcon },
    { id: 'settings', label: 'Налаштування', icon: Settings },
    { id: 'pricing', label: 'Тарифи', icon: Zap },
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
          const isPricing = id === 'pricing';
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
              style={isPricing && !isActive ? { color: '#f7d060' } : {}}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.5 : 2}
                color={isPricing ? '#f7d060' : undefined}
              />
              <span className={`nav-btn-label ${isActive ? 'active' : 'inactive'}`}
                style={isPricing ? { color: '#f7d060' } : {}}>
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