import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Menu, Sun, Moon } from 'lucide-react';

import Sidebar from './Sidebar';
import BuildCatalog from './Dashboard/BuildCatalog';
import AdminPanel from './Dashboard/AdminPanel';
import ProfilePanel from './Dashboard/ProfilePanel';
import Support from './Support';
import AIAnalyzer from './AIAnalyzer';
import PCSpecsForm from './PCSpecsForm';
import ToastContainer from './ToastContainer';
import NotificationPanel from './NotificationPanel';
import UserHeaderBadge from './UserHeaderBadge';
import UserProfilePage from './UserProfilePage';
import UpsellModal from './UpsellModal';
import PricingPage from './PricingPage';
import { useToast } from '../hooks/useToast';
import { useNotifications } from '../hooks/useNotifications';
import './styles/Dashboard.css';
import Workshop from './Workshop';

const API = "`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}`/api";
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const POLL_MS = 3000;

export default function Dashboard({ onLogout, dark, setDark }) {
  const [activeNav, setActiveNav] = useState('catalog');
  const [navExtra, setNavExtra] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const [specsExist, setSpecsExist] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [upsellReason, setUpsellReason] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [profileUsername, setProfileUsername] = useState(null);
  const [headerProfile, setHeaderProfile] = useState(null);
  const [profileCollapsed, setProfileCollapsed] = useState(false);

  const { toasts, addToast, updateToast, removeToast, collapseToast, restoreToast, getProgress } = useToast();
  const { notifications, unreadCount, markRead, markAllRead, deleteOne, deleteAll } = useNotifications();

  useEffect(() => {
    axios.get(`${API}/profile/`, { headers: auth() })
      .then(r => { setUserRole(r.data.role); setHeaderProfile(r.data); })
      .catch(() => {});
    axios.get(`${API}/specs/`, { headers: auth() })
      .then(r => setSpecsExist(r.data.length > 0))
      .catch(() => {});
  }, []);

  const cancelTask = useCallback(async (taskId, toastId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}/`, { headers: auth() });
    } catch {}
    removeToast(toastId);
  }, [removeToast]);

  const pollTask = useCallback((taskId, toastId, buildTitle) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/tasks/${taskId}/`, { headers: auth() });
        const task = res.data;
        if (task.status === 'done') {
          clearInterval(interval);
          setAnalysisResult(task.result);
          removeToast(toastId);
          addToast({
            type: 'success',
            message: `✅ Сумісність «${buildTitle}» перевірено`,
            link: 'ai',
            linkLabel: 'Переглянути результат →',
            duration: 10000,
            finalOnly: true,
            collapsible: false,
          });
        } else if (task.status === 'error') {
          clearInterval(interval);
          removeToast(toastId);
          addToast({
            type: 'error',
            message: `❌ Помилка аналізу: ${task.error_msg || 'невідома помилка'}`,
            duration: 8000,
            finalOnly: true,
          });
        } else if (task.status === 'cancelled') {
          clearInterval(interval);
          removeToast(toastId);
        }
      } catch {
        clearInterval(interval);
      }
    }, POLL_MS);
    return interval;
  }, [addToast, removeToast]);

  const handleAnalyzeRequest = useCallback(({ type, taskId, buildTitle, message }) => {
    if (type === 'no_specs') {
      addToast({ type: 'error', message: '⚠️ Спочатку збережіть характеристики ПК у Налаштуваннях', duration: 6000 });
      return;
    }
    if (type === 'error') {
      addToast({ type: 'error', message, duration: 6000 });
      return;
    }
    const toastId = addToast({
      type: 'info',
      message: `⏳ Аналіз запущено: ${buildTitle}`,
      duration: 5000,
      collapsible: true,
      cancelTaskId: taskId,
      onCancel: null,
    });
    updateToast(toastId, { onCancel: () => cancelTask(taskId, toastId) });
    pollTask(taskId, toastId, buildTitle);
  }, [addToast, pollTask, updateToast, cancelTask]);

  const handleNotifNavigate = useCallback((nav, extra) => {
    setNavExtra(extra || null);
    setActiveNav(nav);
  }, []);

  const NAV_LABELS = {
    catalog: 'Каталог',
    ai: 'Vortex AI',
    support: 'Підтримка',
    settings: 'Налаштування',
    admin: 'Панель керування',
    workshop: 'Майстерня',
    pricing: 'Тарифи',
  };

  const renderContent = () => {
    if (profileUsername) {
      return (
        <UserProfilePage
          username={profileUsername}
          dark={dark}
          onBack={() => setProfileUsername(null)}
        />
      );
    }

    if (showPricing || activeNav === 'pricing') {
      return (
        <PricingPage
          dark={dark}
          onBack={() => { setShowPricing(false); setActiveNav('catalog'); }}
        />
      );
    }

    switch (activeNav) {
      case 'catalog':
        return (
          <BuildCatalog
            dark={dark}
            onAnalyzeRequest={handleAnalyzeRequest}
            specsExist={specsExist}
            navExtra={navExtra}
            onOpenProfile={setProfileUsername}
            onUpsell={setUpsellReason}
          />
        );
      case 'ai':
        return (
          <div className="page-ai">
            <h2 className={`page-heading ${dark ? 'dark' : 'light'}`}>
              Vortex AI — Аналіз сумісності
            </h2>
            <AIAnalyzer
              dark={dark}
              preloadedResult={analysisResult}
              key={analysisResult ? JSON.stringify(analysisResult).slice(0, 40) : 'empty'}
            />
          </div>
        );
      case 'support':
        return <Support dark={dark} navExtra={navExtra} />;
      case 'settings':
        return (
          <div className="page-settings">
            <h2 className={`page-heading ${dark ? 'dark' : 'light'}`}>
              Налаштування
            </h2>
            <PCSpecsForm dark={dark} onSaved={() => setSpecsExist(true)} />
          </div>
        );
      case 'workshop':
        return <Workshop dark={dark} />;
      case 'admin':
        return <AdminPanel dark={dark} currentRole={userRole} addToast={addToast} removeToast={removeToast} navExtra={navExtra} />;
      default:
        return null;
    }
  };

  return (
    <div className={`dashboard-root ${dark ? 'dark' : 'light'}`}>
      <Sidebar
        active={activeNav}
        setActive={setActiveNav}
        dark={dark}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        userRole={userRole}
        onLogout={onLogout}
      />

      <div className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className={`dashboard-header ${dark ? 'dark' : 'light'}`}>
          <div className="header-left">
            <button
              className={`header-menu-btn ${dark ? 'dark' : 'light'}`}
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Menu size={22} />
            </button>
            <span className={`header-nav-label ${dark ? 'dark' : 'light'}`}>
              {NAV_LABELS[activeNav] || ''}
            </span>
          </div>
          <div className="header-right">
            <UserHeaderBadge
              dark={dark}
              profile={headerProfile}
              onOpenProfile={() => setProfileUsername(headerProfile?.username)}
            />
            <NotificationPanel
              dark={dark}
              notifications={notifications}
              unreadCount={unreadCount}
              markRead={markRead}
              markAllRead={markAllRead}
              deleteOne={deleteOne}
              deleteAll={deleteAll}
              onNavigate={handleNotifNavigate}
            />
          </div>
        </header>

        <main className="dashboard-main" key={activeNav}>
          {renderContent()}
        </main>
      </div>

      <ProfilePanel
        dark={dark}
        collapsed={profileCollapsed}
        setCollapsed={setProfileCollapsed}
        onOpenProfile={setProfileUsername}
      />

      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
        collapseToast={collapseToast}
        restoreToast={restoreToast}
        getProgress={getProgress}
        onNavigate={setActiveNav}
      />

      <UpsellModal
        reason={upsellReason}
        dark={dark}
        onClose={() => setUpsellReason(null)}
        onNavigatePricing={() => { setUpsellReason(null); setActiveNav('pricing'); }}
      />
    </div>
  );
}