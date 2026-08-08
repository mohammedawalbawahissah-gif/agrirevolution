import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Web Speech API isn't in the standard TS lib yet — narrow, local typing
// just for the bits we use, feature-detected at runtime.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const speechSupported = typeof window !== "undefined" && !!getSpeechRecognition();
const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Floating chat widget, mounted once in PortalShell so every role gets it.
 * Stateless on the backend — this component owns the conversation history
 * and resends it each turn (see apps/assistant on the backend).
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const firstName = user?.first_name || user?.username || "there";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  function speak(text: string) {
    if (!ttsSupported || !voiceOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || isSending) return;
    setError("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
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

  function toggleListening() {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) sendMessage(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand-green text-white shadow-lg flex items-center justify-center hover:opacity-90 transition"
        aria-label="Open AI Assistant"
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-brand-green text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={16} />
              <p className="text-sm font-semibold truncate">AI Assistant</p>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <button
                  onClick={() => setVoiceOn((v) => !v)}
                  className="p-1.5 rounded-md hover:bg-white/10"
                  title={voiceOn ? "Voice replies on" : "Voice replies off"}
                >
                  {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-white/10">
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-brand-cream/40">
            <div className="bg-white rounded-xl border border-gray-100 px-3.5 py-2.5 text-sm text-gray-700 shadow-sm max-w-[85%]">
              Hi {firstName}! How can I help you today?
            </div>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`px-3.5 py-2.5 rounded-xl text-sm shadow-sm max-w-[85%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-brand-green text-white ml-auto"
                    : "bg-white text-gray-700 border border-gray-100"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isSending && (
              <div className="bg-white rounded-xl border border-gray-100 px-3.5 py-2.5 text-sm text-gray-400 shadow-sm max-w-[85%]">
                Thinking…
              </div>
            )}
            {error && <p className="text-xs text-status-danger">{error}</p>}
          </div>

          <div className="border-t border-gray-100 p-3 flex items-end gap-2 shrink-0">
            {speechSupported && (
              <button
                onClick={toggleListening}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${
                  isListening ? "bg-status-danger text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={isListening ? "Stop listening" : "Speak your question"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(draft);
                }
              }}
              placeholder={isListening ? "Listening…" : "Ask me anything…"}
              rows={1}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm max-h-24"
            />
            <button
              onClick={() => sendMessage(draft)}
              disabled={isSending || !draft.trim()}
              className="shrink-0 w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
