import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiClient } from "../api/client";

/**
 * Requests notification permission and registers the device's Expo push
 * token with the backend (PATCH /accounts/me/). Fails silently on simulators,
 * denied permissions, or any other error — push is a nice-to-have, not
 * something that should ever block login or break the app.
 */
export async function registerPushNotifications(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await apiClient.patch("/accounts/me/", { expo_push_token: token });
  } catch {
    // Push registration is best-effort — never let this break the login flow.
  }
}
