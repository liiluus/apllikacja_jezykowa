import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/clients";
import { fetchProfile, updateProfile } from "../api/profile";
import { useNavigate, Link } from "react-router-dom";

const HELLO = {
  role: "assistant",
  content: "Cześć! Jestem Twoim asystentem językowym. Napisz, z czym pomóc 🙂",
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LS_CHAT_LEVEL = "chatLevel";

function hasLevel(text) {
  return /\b(A1|A2|B1|B2|C1|C2)\b/i.test(String(text || ""));
}

export default function AiChat() {
  const nav = useNavigate();

  const [messages, setMessages] = useState([HELLO]);
  const [text, setText] = useState("");

  const [level, setLevel] = useState(() => localStorage.getItem(LS_CHAT_LEVEL) || "A1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // przy wejściu: pobierz level z profilu
  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        const profLevel = String(p?.level || "").toUpperCase();
        if (LEVELS.includes(profLevel)) setLevel(profLevel);
      } catch {
        // fallback zostaje z localStorage
      }
    })();
  }, []);

  // zapisz level lokalnie
  useEffect(() => {
    localStorage.setItem(LS_CHAT_LEVEL, level);
  }, [level]);

  async function onChangeLevel(nextLevel) {
    setLevel(nextLevel);
    try {
      await updateProfile({ level: nextLevel });
    } catch (e) {
      setError(e.message || "Nie udało się zapisać poziomu w profilu.");
    }
  }

  // load history
  useEffect(() => {
    (async () => {
      try {
        const dto = await api.get("/api/ai/history?limit=20");
        if (dto?.messages?.length) {
          setMessages(
            dto.messages.map((m) => ({
              role: m.role,
              content: m.content,
              exerciseId: null,
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

  async function sendMessage(e, overrideText) {
    e?.preventDefault?.();
    setError("");

    const raw = (overrideText ?? text).trim();
    if (!raw || loading) return;

    // jeśli user chce ćwiczenie i nie podał poziomu → dopisz level
    const looksLikeExercise =
      /(\bcwiczenie\b|\bćwiczenie\b|\bexercise\b|\btranslate\b|\bfill_blank\b|\buzupełnij\b|\buzupelnij\b)/i.test(raw);

    const finalMsg = looksLikeExercise && !hasLevel(raw) ? `${raw} ${level}` : raw;

    setMessages((prev) => [...prev, { role: "user", content: finalMsg }]);
    setText("");
    setLoading(true);

    try {
      const dto = await api.post("/api/ai/chat", {
        message: finalMsg,
        history: historyForApi,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: dto.reply,
          exerciseId: dto.exerciseId || null,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openExerciseFromChat(exerciseId) {
    if (!exerciseId) return;
    localStorage.setItem("lastExerciseId", exerciseId);
    nav("/exercise");
  }

  const quick = [`Daj ćwiczenie travel ${level}`, `Ćwiczenie fill_blank grammar ${level}`, `Zróbmy konwersację o pracy ${level}`];

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>AI Asystent</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Poziom:</span>
          <select value={level} onChange={(e) => onChangeLevel(e.target.value)} disabled={loading}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={clearConversation} disabled={loading} style={{ marginLeft: "auto", padding: "8px 12px" }}>
          Nowa rozmowa
        </button>

        <Link to="/exercise" style={{ marginLeft: 8 }}>
          <button type="button" disabled={loading} style={{ padding: "8px 12px" }}>
            Ćwiczenia
          </button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {quick.map((q) => (
          <button key={q} type="button" disabled={loading} onClick={(e) => sendMessage(e, q)} style={{ padding: "6px 10px", fontSize: 12 }}>
            {q}
          </button>
        ))}
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

            {m.role === "assistant" && m.exerciseId && (
              <div style={{ marginTop: 10 }}>
                <button type="button" onClick={() => openExerciseFromChat(m.exerciseId)} style={{ padding: "8px 12px" }}>
                  Przejdź do ćwiczenia
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && <div style={{ alignSelf: "flex-start", opacity: 0.7 }}>Piszę odpowiedź...</div>}

        <div ref={bottomRef} />
      </div>

      {error && <p style={{ color: "crimson", marginTop: 8 }}>{error}</p>}

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)"
          style={{ flex: 1, padding: 10, resize: "none", height: 44 }}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
        />
        <button disabled={loading} style={{ padding: "10px 14px", height: 44 }}>
          Wyślij
        </button>
      </form>
    </div>
  );
}
