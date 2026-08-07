import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Floating AI Assistant widget — mounted once in RootNavigator so it floats
 * over every role's tab navigator, mirroring web's AIAssistantWidget mounted
 * once in PortalShell. Same backend endpoint (POST /assistant/chat/), same
 * boundary: broad read access to platform data, never user PII or
 * transaction/payment details (enforced server-side, see backend
 * apps/assistant/tools.py — nothing here needs to know about that boundary).
 *
 * expo-speech-recognition is a native module — this requires a dev build
 * (`npx expo run:ios` / `run:android` or an EAS build), it will not work in
 * Expo Go. The mic button is simply hidden if recognition isn't available
 * on the current build so this degrades gracefully rather than crashing.
 */
export default function AIAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const firstName = user?.first_name || user?.username || "there";

  useEffect(() => {
    try {
      setRecognitionAvailable(ExpoSpeechRecognitionModule.isRecognitionAvailable());
    } catch {
      setRecognitionAvailable(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (isListening) ExpoSpeechRecognitionModule.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript;
    if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  function speak(text: string) {
    if (!speakReplies) return;
    Speech.stop();
    Speech.speak(text, { rate: 1 });
  }

  async function toggleListening() {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, continuous: false });
  }

  async function handleSend() {
    const message = input.trim();
    if (!message || isSending) return;
    setInput("");
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsSending(true);
    try {
      const { data } = await apiClient.post<{ reply: string }>("/assistant/chat/", { message, history });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch {
      const fallback = "Sorry, I couldn't respond just now — please try again in a moment.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open AI Assistant"
          style={styles.fab}
          onPress={() => setIsOpen(true)}
        >
          <Text style={styles.fabIcon}>✨</Text>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Hi {firstName}, need a hand?
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setSpeakReplies((v) => !v)} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>{speakReplies ? "🔊" : "🔇"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
            <View style={styles.bubbleRow}>
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <Text style={styles.bubbleTextAssistant}>Hi {firstName}! How can I help you today?</Text>
              </View>
            </View>
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubbleRow, m.role === "user" && styles.bubbleRowUser]}>
                <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
                  <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))}
            {isSending && (
              <View style={styles.bubbleRow}>
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <ActivityIndicator size="small" color="#2F6B3C" />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            {recognitionAvailable && (
              <TouchableOpacity
                onPress={toggleListening}
                style={[styles.micButton, isListening && styles.micButtonActive]}
              >
                <Text style={styles.micIcon}>{isListening ? "⏹" : "🎤"}</Text>
              </TouchableOpacity>
            )}
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={isListening ? "Listening…" : "Ask me anything…"}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || isSending}
              style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </Pressable>
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
    backgroundColor: "#2F6B3C",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 50,
  },
  fabIcon: {
    fontSize: 24,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#2F6B3C",
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  headerButton: {
    padding: 6,
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  messages: {
    flex: 1,
    backgroundColor: "#F7F7F5",
  },
  messagesContent: {
    padding: 16,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderTopLeftRadius: 3,
  },
  bubbleUser: {
    backgroundColor: "#2F6B3C",
    borderTopRightRadius: 3,
  },
  bubbleTextAssistant: {
    color: "#333",
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0F0EE",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: "#B3403A",
  },
  micIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2F6B3C",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: "#fff",
    fontSize: 15,
  },
});
