import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000/api';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });
const POLL_MS = 30000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notifications/`, { headers: auth() });
      setNotifications(res.data.results);
      setUnreadCount(res.data.unread_count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await axios.post(`${API}/notifications/${id}/read/`, {}, { headers: auth() });
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await axios.post(`${API}/notifications/mark-all-read/`, {}, { headers: auth() });
    } catch {}
  }, []);

  const deleteOne = useCallback(async (id) => {
    const n = notifications.find(x => x.id === id);
    setNotifications(prev => prev.filter(x => x.id !== id));
    if (n && !n.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await axios.delete(`${API}/notifications/${id}/delete/`, { headers: auth() });
    } catch {}
  }, [notifications]);

  const deleteAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await axios.delete(`${API}/notifications/clear-all/`, { headers: auth() });
    } catch {}
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, deleteOne, deleteAll, refetch: fetchNotifications };
}