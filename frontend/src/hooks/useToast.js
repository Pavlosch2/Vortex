import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const counter    = useRef(0);
  const timers     = useRef({});
  const startTimes = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    delete startTimes.current[id];
  }, []);

  const scheduleRemoval = useCallback((id, duration) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    delete startTimes.current[id];
    if (duration > 0) {
      startTimes.current[id] = { start: Date.now(), duration };
      timers.current[id] = setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const addToast = useCallback(({
    message, type = 'info', link, linkLabel,
    duration = 5000,
    cancelTaskId, onCancel,
    collapsible = false,
    finalOnly   = false,
  }) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, {
      id, message, type, link, linkLabel,
      cancelTaskId, onCancel,
      collapsible, finalOnly,
      collapsed: false,
    }]);
    scheduleRemoval(id, duration);
    return id;
  }, [scheduleRemoval]);

  const updateToast = useCallback((id, patch) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    if (patch.duration !== undefined) {
      scheduleRemoval(id, patch.duration);
    }
  }, [scheduleRemoval]);

  const collapseToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    delete startTimes.current[id];
    setToasts(prev => prev.map(t => t.id === id ? { ...t, collapsed: true } : t));
  }, []);

  const restoreToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, collapsed: false } : t));
  }, []);

  const getProgress = useCallback((id) => {
    const info = startTimes.current[id];
    if (!info) return null;
    return Math.max(0, 1 - (Date.now() - info.start) / info.duration);
  }, []);

  return { toasts, addToast, updateToast, removeToast, collapseToast, restoreToast, getProgress };
}