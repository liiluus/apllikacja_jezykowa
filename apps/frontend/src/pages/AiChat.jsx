import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/clients";

const HELLO = {
  role: "assistant",
  content: "Cześć! Jestem Twoim asystentem językowym. Napisz, z czym pomóc.",
};

export default function AiChat() {
  const [messages, setMessages] = useState([HELLO]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // 👇 blokuje scroll do dołu przy pierwszym ustawieniu historii
  const skipNextScrollRef = useRef(true);

  // ✅ HARD reset scrolla strony (czasem 1x nie wystarcza w SPA)
  useEffect(() => {
    const forceTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    forceTop(); // od razu
    const rafId = requestAnimationFrame(forceTop); // po renderze
    const tId = setTimeout(forceTop, 0); // po event-loop

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(tId);
    };
  }, []);

  // scroll ONLY after initial hydration is done
  useEffect(() => {
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, loading]);

  // load history
  useEffect(() => {
    (async () => {
      try {
        const dto = await api.get("/api/ai/history?limit=20");
        if (dto?.messages?.length) {
          // 👇 to jest "pierwsze ustawienie" — nie scrollujemy wtedy
          skipNextScrollRef.current = true;

          setMessages(
            dto.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          );
        } else {
          skipNextScrollRef.current = true;
          setMessages([HELLO]);
        }
      } catch (e) {
        console.log("history load failed:", e.message);
        skipNextScrollRef.current = true;
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
      skipNextScrollRef.current = true;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              AI Asystent
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Rozmowa i historia czatu
            </p>
          </div>

          <button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            Nowa rozmowa
          </button>
        </div>

        {/* Chat */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-[480px] overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={idx}
                    className={isUser ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={[
                        "max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-sm whitespace-pre-wrap",
                        isUser
                          ? "bg-indigo-50 border-indigo-100"
                          : "bg-slate-50 border-slate-200",
                      ].join(" ")}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Piszę odpowiedź...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border-t border-slate-200 px-4 py-3">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Napisz wiadomość..."
                disabled={loading}
                className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
              />

              <button
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                Wyślij
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Tip: enter wysyła wiadomość. Kliknij „Nowa rozmowa”, aby wyczyścić historię.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
