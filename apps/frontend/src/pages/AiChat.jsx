import { useState } from "react";
import { api } from "../api/clients";

export default function AiChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Cześć! Jestem Twoim asystentem językowym. Możesz zapytać mnie o gramatykę, słówka lub zasady językowe.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/ai/chat", {
        message: input,
        context: {
          language: "en",
          level: "A2",
        },
      });

      const aiMessage = {
        role: "assistant",
        content: res.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto" }}>
      <h2>Asystent AI</h2>

      <div
        style={{
          border: "1px solid #ddd",
          padding: 16,
          minHeight: 400,
          marginBottom: 16,
          overflowY: "auto",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 12,
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 10,
                borderRadius: 8,
                background:
                  m.role === "user" ? "#daf1ff" : "#f3f3f3",
                maxWidth: "80%",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && <p>AI pisze odpowiedź...</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zadaj pytanie..."
          style={{ flex: 1, padding: 8 }}
        />
        <button disabled={loading}>Wyślij</button>
      </form>
    </div>
  );
}
