import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Minimal shape for the Web Speech API — not in the standard TS lib, and
// only webkit-prefixed in Chrome/Edge/Safari, so this is typed loosely on
// purpose rather than pulling in a @types package for a browser-only API.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Floating AI Assistant widget — available in every role's portal (rendered
 * once inside PortalShell, so it's shared rather than reimplemented per
 * role). Talks to POST /api/assistant/chat/, which has broad read access to
 * platform data but never touches user PII or transaction/payment records
 * (see backend apps/assistant/tools.py) — that boundary lives server-side,
 * not here, so it holds regardless of what this component sends.
 */
export default function AIAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = user?.first_name || user?.username || "there";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string) {
    if (!ttsSupported || !speakReplies) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleListening() {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function handleSend() {
    const message = input.trim();
    if (!message || isSending) return;
    setInput("");
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsSending(true);
    try {
      const { data } = await apiClient.post<{ reply: string }>("/assistant/chat/", {
        message,
        history,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch {
      const fallback = "Sorry, I couldn't respond just now — please try again in a moment.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setIsSending(false);
    }
  }

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-brand-green text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Sparkles size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-brand-green text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bot size={18} className="shrink-0" />
              <p className="font-semibold text-sm truncate">Hi {firstName}, need a hand?</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ttsSupported && (
                <button
                  onClick={() => setSpeakReplies((v) => !v)}
                  title={speakReplies ? "Turn off read-aloud" : "Read replies aloud"}
                  className="p-1.5 rounded hover:bg-white/15"
                >
                  {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <button onClick={() => setIsOpen(false)} title="Close" className="p-1.5 rounded hover:bg-white/15">
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            <div className="flex">
              <div className="bg-white border border-gray-100 rounded-lg rounded-tl-sm px-3 py-2 text-sm text-gray-700 max-w-[85%] shadow-sm">
                Hi {firstName}! How can I help you today?
              </div>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[85%] shadow-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-brand-green text-white rounded-tr-sm"
                      : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-lg rounded-tl-sm px-3 py-2 text-sm text-gray-400 shadow-sm">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-3 flex items-end gap-2 shrink-0">
            {speechSupported && (
              <button
                onClick={toggleListening}
                title={isListening ? "Stop listening" : "Speak your question"}
                className={`shrink-0 p-2 rounded-full transition-colors ${
                  isListening ? "bg-status-danger text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening…" : "Ask me anything…"}
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="shrink-0 p-2 rounded-full bg-brand-green text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
