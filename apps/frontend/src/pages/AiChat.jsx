import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/clients";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const LANGS = [
  { value: "en", label: "Angielski" },
  { value: "de", label: "Niemiecki" },
  { value: "es", label: "Hiszpański" },
  { value: "fr", label: "Francuski" },
];

function defaultIntro(languageLabel) {
  return {
    role: "assistant",
    content:
      `Cześć! Jestem Twoim asystentem językowym (${languageLabel}). ` +
      "Możesz zapytać mnie o gramatykę, słownictwo, przykłady zdań albo poprosić o wytłumaczenie błędów.",
  };
}

export default function AiChatPage() {
  const bottomRef = useRef(null);

  const [language, setLanguage] = useState("en");
  const [level, setLevel] = useState("A2");

  const languageLabel = useMemo(() => {
    return LANGS.find((l) => l.value === language)?.label || "Język";
  }, [language]);

  const [messages, setMessages] = useState([defaultIntro(languageLabel)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // gdy zmienisz język, odśwież intro (ale nie kasuj rozmowy automatycznie)
  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) return [defaultIntro(languageLabel)];
      // jeśli pierwsza wiadomość to intro, zaktualizuj ją
      const first = prev[0];
      if (first.role === "assistant") {
        return [defaultIntro(languageLabel), ...prev.slice(1)];
      }
      return prev;
    });
  }, [languageLabel]);

  // autoscroll na dół po każdej nowej wiadomości
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function resetChat() {
    setError("");
    setInput("");
    setLoading(false);
    setMessages([defaultIntro(languageLabel)]);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      // Wysyłamy CAŁĄ historię rozmowy, żeby backend mógł ją przekazać do OpenAI
      // (backend może też trzymać historię po stronie serwera — wtedy to jest opcjonalne)
      const payload = {
        message: userMessage.content,
        messages: [...messages, userMessage], // historia + nowa wiadomość
        context: {
          language,
          level,
        },
      };

      const res = await api.post("/api/ai/chat", payload);

      const aiMessage = {
        role: "assistant",
        content: res.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      setError(e.message || "Błąd połączenia z AI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Asystent AI</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={resetChat} disabled={loading}>
            Reset rozmowy
          </button>
        </div>
      </div>

      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Ustaw język i poziom, a AI będzie dopasowywać odpowiedzi do Twoich potrzeb.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Język:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={loading}
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Poziom:
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={loading}
          >
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          minHeight: 420,
          marginBottom: 12,
          overflowY: "auto",
          background: "#fff",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: m.role === "user" ? "#daf1ff" : "#f3f3f3",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                lineHeight: 1.35,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: "#f3f3f3",
                maxWidth: "80%",
                opacity: 0.85,
              }}
            >
              AI pisze odpowiedź…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: 0 }}>
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zadaj pytanie (np. wytłumacz Present Perfect)..."
          style={{ flex: 1, padding: 10 }}
          disabled={loading}
        />
        <button disabled={loading || !input.trim()}>
          Wyślij
        </button>
      </form>

      <p style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
        Wysyłamy wiadomości do endpointu <code>/api/ai/chat</code>. Backend może przekazać historię rozmowy do OpenAI,
        aby utrzymać kontekst odpowiedzi.
      </p>
    </div>
  );
}
