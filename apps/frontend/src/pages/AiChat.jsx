import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/clients";

const HELLO = { role: "assistant", content: "Cześć! Jestem Twoim asystentem językowym. Napisz, z czym pomóc 🙂" };

export default function AiChat() {
  const [messages, setMessages] = useState([HELLO]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // auto scroll na dół przy nowych wiadomościach
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // wczytaj historię z DB
  useEffect(() => {
    (async () => {
      try {
        const dto = await api.get("/api/ai/history?limit=20");
        if (dto?.messages?.length) {
          setMessages(
            dto.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          );
        } else {
          setMessages([HELLO]);
        }
      } catch (e) {
        console.log("history load failed:", e.message);
        setMessages([HELLO]);
      }
    })();
  }, []);

  const historyForApi = useMemo(() => {
    const h = messages.slice(-10);
    return h
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  async function clearConversation() {
    setError("");
    setLoading(true);
    try {
      await api.delete("/api/ai/history");
      setMessages([HELLO]);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    setError("");

    const msg = text.trim();
    if (!msg || loading) return;

    // dodaj user message do UI od razu
    const nextMessages = [...messages, { role: "user", content: msg }];
    setMessages(nextMessages);
    setText("");
    setLoading(true);

    try {
      const dto = await api.post("/api/ai/chat", {
        message: msg,
        history: historyForApi,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: dto.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>AI Asystent</h2>
        <button
          type="button"
          onClick={clearConversation}
          disabled={loading}
          style={{ marginLeft: "auto", padding: "8px 12px" }}
        >
          Nowa rozmowa
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          height: 420,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#fafafa",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
              padding: "10px 12px",
              borderRadius: 12,
              background: m.role === "user" ? "#e6f0ff" : "#fff",
              border: "1px solid #eee",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", opacity: 0.7 }}>
            Piszę odpowiedź...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p style={{ color: "crimson", marginTop: 8 }}>{error}</p>}

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość..."
          style={{ flex: 1, padding: 10 }}
          disabled={loading}
        />
        <button disabled={loading} style={{ padding: "10px 14px" }}>
          Wyślij
        </button>
      </form>
    </div>
  );
}
