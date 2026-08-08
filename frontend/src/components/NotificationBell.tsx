import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import type { AppNotification } from "../types";

const CATEGORY_LABELS: Record<AppNotification["category"], string> = {
  weather_alert: "Weather",
  booking_update: "Booking",
  listing_update: "Listing",
  payment_update: "Payment",
  crop_health_alert: "Crop Health",
};

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

/**
 * Bell icon + unread badge + dropdown panel in the top strip, shared by
 * every role's PortalShell. Backed by useNotifications, which talks to
 * the read-side API added in step 4.
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, notifications, isLoading, loadRecent, markRead, markAllRead } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) loadRecent();
  }, [isOpen, loadRecent]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    // ml-auto (not justify-between on the header) is what actually pins
    // this right — on desktop the hamburger button and its spacer sibling
    // are both md:hidden, leaving this as the only flex child, and
    // justify-between with a single child resolves to flex-start.
    <div className="relative ml-auto" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-full text-sidebar-text hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gold text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs font-medium text-brand-green hover:underline"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>
            )}
            {!isLoading && notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.is_read) markRead(n.id);
                  setIsOpen(false);
                  if (n.action_url) navigate(n.action_url);
                }}
                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                  n.is_read ? "" : "bg-brand-green/5"
                } ${n.action_url ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />}
                  <div className={n.is_read ? "pl-3.5" : ""}>
                    <p className="text-xs font-medium text-brand-green mb-0.5">
                      {CATEGORY_LABELS[n.category]}
                    </p>
                    <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
