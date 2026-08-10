import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import * as Speech from "expo-speech";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

// expo-speech-recognition is a native module — its native code isn't part
// of the generic Expo Go binary, only a custom dev-client build. A plain
// top-level `import` throws the instant this file loads, which crashes the
// WHOLE app on startup under Expo Go (not just voice input). require()
// wrapped in try/catch defers that lookup to runtime and safely catches the
// failure — voice input then just quietly stays unavailable (same UX as
// before), while the rest of the app, including this widget's text chat,
// keeps working normally.
let ExpoSpeechRecognitionModule: {
  isRecognitionAvailable: () => boolean;
  start: (options: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
} | null = null;
let useSpeechRecognitionEvent: (type: string, handler: (event: any) => void) => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const speechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
} catch {
  // Native module isn't present in this binary — recognitionAvailable
  // below resolves to false and the mic button hides itself, as designed.
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Helmeted-body avatar for the trigger button — built from plain Views
 * (no icon library in this project) since no stock glyph matches "a body
 * frame with a helmet." A ring for the helmet with a visor bar, sitting on
 * a rounded shoulder shape underneath. */
function AssistantAvatarIcon() {
  return (
    <View style={avatarStyles.wrap}>
      <View style={avatarStyles.helmet}>
        <View style={avatarStyles.visor} />
      </View>
      <View style={avatarStyles.body} />
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: { width: 26, height: 26, alignItems: "center" },
  helmet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  visor: { width: 9, height: 2, backgroundColor: "#fff", borderRadius: 1 },
  body: {
    width: 22,
    height: 10,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "#fff",
    marginTop: 2,
  },
});

/**
 * Floating chat button + modal, mounted once in RootNavigator so it's
 * available across every role's tab group. Voice input needs a native
 * build (expo-speech-recognition doesn't run inside Expo Go) — the mic
 * button quietly hides itself when the native module isn't there, and
 * text chat + spoken replies (expo-speech, pure JS) still work everywhere.
 */
export default function AIAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [error, setError] = useState("");
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setRecognitionAvailable(ExpoSpeechRecognitionModule?.isRecognitionAvailable() ?? false);
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript;
    if (transcript && event.isFinal) {
      setIsListening(false);
      sendMessage(transcript);
    }
  });
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  const firstName = user?.first_name || user?.username || "there";
  const roleTitle = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Assistant` : "Assistant";

  function speak(text: string) {
    if (!voiceOn) return;
    Speech.stop();
    Speech.speak(text, { rate: 1 });
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;
      setError("");
      setMessages((prev) => {
        const next: ChatMessage[] = [...prev, { role: "user", content }];
        postToAssistant(next);
        return next;
      });
      setDraft("");
    },
    [voiceOn]
  );

  async function postToAssistant(nextMessages: ChatMessage[]) {
    setIsSending(true);
    try {
      const { data } = await apiClient.post("/assistant/chat/", { messages: nextMessages });
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function toggleListening() {
    if (!recognitionAvailable || !ExpoSpeechRecognitionModule) return;
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError("Microphone permission is needed for voice input.");
      return;
    }
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, continuous: false });
  }

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
        <AssistantAvatarIcon />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Image source={require("../../assets/icon.png")} style={styles.headerLogo} />
                <Text style={styles.headerTitle}>{roleTitle}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <TouchableOpacity onPress={() => setVoiceOn((v) => !v)} style={styles.headerIconBtn}>
                  <Text style={styles.headerIcon}>{voiceOn ? "🔊" : "🔇"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.headerIconBtn}>
                  <Text style={styles.headerIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={{ padding: 14, gap: 10 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={styles.bubbleAssistant}>
                <Text style={styles.bubbleTextAssistant}>Hi {firstName}! How can I help you today?</Text>
              </View>
              {messages.map((m, i) => (
                <View key={i} style={m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant}>
                  <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                    {m.content}
                  </Text>
                </View>
              ))}
              {isSending && (
                <View style={styles.bubbleAssistant}>
                  <ActivityIndicator size="small" color="#B3543A" />
                </View>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.inputRow}>
              {recognitionAvailable && (
                <TouchableOpacity
                  onPress={toggleListening}
                  style={[styles.micBtn, isListening && styles.micBtnActive]}
                >
                  <Text style={styles.micIcon}>{isListening ? "■" : "🎤"}</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={isListening ? "Listening…" : "Ask me anything…"}
                multiline
              />
              <TouchableOpacity
                onPress={() => sendMessage(draft)}
                disabled={isSending || !draft.trim()}
                style={[styles.sendBtn, (isSending || !draft.trim()) && { opacity: 0.4 }]}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#B3543A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 50,
  },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  panel: { height: "75%", backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  header: {
    backgroundColor: "#B3543A",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: { width: 20, height: 20, borderRadius: 10 },
  headerIcon: { fontSize: 16, color: "#fff" },
  micIcon: { fontSize: 15 },
  sendIcon: { fontSize: 14, color: "#fff" },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  headerIconBtn: { padding: 6 },
  messages: { flex: 1, backgroundColor: "#FBF8F2" },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "85%",
    alignSelf: "flex-start",
  },
  bubbleUser: {
    backgroundColor: "#B3543A",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  bubbleTextAssistant: { color: "#374151", fontSize: 14 },
  bubbleTextUser: { color: "#fff", fontSize: 14 },
  error: { color: "#B3403A", fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: { backgroundColor: "#B3403A" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B3543A",
    alignItems: "center",
    justifyContent: "center",
  },
});
