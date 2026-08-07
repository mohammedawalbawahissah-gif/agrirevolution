import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AppNotification, Paginated } from "../types";

const POLL_INTERVAL_MS = 30_000;

/**
 * Backs the notification bell: polls the unread count in the background
 * (so the badge stays current even with the dropdown closed) and loads
 * the recent-notifications list on demand when the dropdown opens.
 * Talks to the read-side API added in step 4 — list, unread_count,
 * mark_read, mark_all_read, all scoped server-side to the logged-in user.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await apiClient.get<{ unread_count: number }>(
        "/notifications/notifications/unread_count/"
      );
      setUnreadCount(data.unread_count);
    } catch {
      // silent — the badge just won't update this tick, next poll retries
    }
  }, [user]);

  const loadRecent = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<Paginated<AppNotification>>("/notifications/notifications/");
      setNotifications(data.results);
    } catch {
      // leave whatever list we already had rather than clearing it on a blip
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markRead = useCallback(async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiClient.post(`/notifications/notifications/${id}/mark_read/`);
    } catch {
      // best-effort optimistic update; next poll reconciles if this failed
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiClient.post("/notifications/notifications/mark_all_read/");
    } catch {
      // best-effort optimistic update; next poll reconciles if this failed
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnreadCount();
    pollRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, refreshUnreadCount]);

  return { unreadCount, notifications, isLoading, loadRecent, markRead, markAllRead };
}
