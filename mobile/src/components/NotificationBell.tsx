import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNotifications } from "../hooks/useNotifications";
import type { AppNotification } from "../types";

const CATEGORY_LABELS: Record<AppNotification["category"], string> = {
  weather_alert: "Weather",
  booking_update: "Booking",
  listing_update: "Listing",
  payment_update: "Payment",
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
 * Bell icon + unread badge in the header, plus a modal panel listing
 * recent notifications. Backed by useNotifications, mirroring web's
 * NotificationBell — same read-side API from step 4.
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, notifications, isLoading, loadRecent, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (isOpen) loadRecent();
  }, [isOpen, loadRecent]);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.button}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.icon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => markAllRead()}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading && notifications.length === 0 ? (
              <ActivityIndicator style={styles.emptyState} color="#2F6B3C" />
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                style={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.item, !item.is_read && styles.itemUnread]}
                    onPress={() => !item.is_read && markRead(item.id)}
                  >
                    <View style={styles.itemRow}>
                      {!item.is_read && <View style={styles.dot} />}
                      <View style={item.is_read ? styles.itemBodyRead : styles.itemBody}>
                        <Text style={styles.category}>{CATEGORY_LABELS[item.category]}</Text>
                        <Text style={styles.message}>{item.message}</Text>
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setIsOpen(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
    padding: 4,
  },
  icon: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D9A441",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 12,
  },
  panel: {
    width: 320,
    maxHeight: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2F6B3C",
  },
  list: {
    maxHeight: 320,
  },
  emptyState: {
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    color: "#999",
    fontSize: 13,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  itemUnread: {
    backgroundColor: "rgba(47,107,60,0.05)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D9A441",
    marginTop: 6,
    marginRight: 8,
  },
  itemBody: {
    flex: 1,
  },
  itemBodyRead: {
    flex: 1,
    marginLeft: 14,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2F6B3C",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
});
