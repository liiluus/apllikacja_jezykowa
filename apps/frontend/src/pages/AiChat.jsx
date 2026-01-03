import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/clients";
import { fetchProfile, updateProfile } from "../api/profile";
import { useNavigate, Link } from "react-router-dom";
import {
  MessageSquare,
  Trash2,
  Sparkles,
  GraduationCap,
  Send,
  Dumbbell,
  ArrowUpRight,
  Wand2,
} from "lucide-react";

const HELLO = {
  role: "assistant",
  content: "Cześć! Jestem Twoim asystentem językowym. Napisz, z czym pomóc 🙂",
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LS_CHAT_LEVEL = "chatLevel";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function hasLevel(text) {
  return /\b(A1|A2|B1|B2|C1|C2)\b/i.test(String(text || ""));
}

function Card({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
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
        // fallback
      }
    })();
  }, []);

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
      } catch {
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

    const looksLikeExercise =
      /(\bcwiczenie\b|\bćwiczenie\b|\bexercise\b|\btranslate\b|\bfill_blank\b|\buzupełnij\b|\buzupelnij\b|\bquiz\b|\bmultiple_choice\b)/i.test(
        raw
      );

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

  const quick = useMemo(
    () => [
      `Daj ćwiczenie travel ${level}`,
      `Ćwiczenie fill_blank grammar ${level}`,
      `Quiz food ${level}`,
      `Zróbmy konwersację o pracy ${level}`,
    ],
    [level]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px]">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                AI Asystent
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Pisz swobodnie. Jeśli poprosisz o <span className="font-semibold">quiz</span>, wygeneruje ABCD i zapisze do ćwiczeń.
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-white">
                <GraduationCap className="h-4 w-4" />
                <select
                  value={level}
                  onChange={(e) => onChangeLevel(e.target.value)}
                  disabled={loading}
                  className="bg-transparent text-sm font-semibold text-white outline-none"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l} className="text-slate-900">
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={clearConversation}
                disabled={loading}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                  loading ? "bg-white/20 text-white/60 cursor-not-allowed" : "bg-white/30 text-white hover:bg-white/40"
                )}
              >
                <Trash2 className="h-4 w-4" />
                Nowa rozmowa
              </button>

              <Link
                to="/exercise"
                className="inline-flex items-center gap-2 rounded-xl bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                <Dumbbell className="h-4 w-4" />
                Ćwiczenia
              </Link>
            </div>
          </div>

          {error ? <div className="mt-4 text-sm text-rose-100">{error}</div> : null}
        </div>
      </div>

      {/* Quick prompts */}
      <Card title="Szybkie akcje" icon={Sparkles}>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={(e) => sendMessage(e, q)}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
                loading ? "cursor-not-allowed opacity-70" : ""
              )}
            >
              <Wand2 className="h-4 w-4" />
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* Chat */}
      <Card title="Rozmowa" icon={MessageSquare}>
        <div className="h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={cx("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cx(
                      "max-w-[78%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm",
                      isUser
                        ? "border-indigo-200 bg-indigo-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-900"
                    )}
                  >
                    {m.content}

                    {!isUser && m.exerciseId ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openExerciseFromChat(m.exerciseId)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          Przejdź do ćwiczenia
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="text-sm text-slate-600">Piszę odpowiedź...</div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)"
            disabled={loading}
            className="h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button
            disabled={loading || !text.trim()}
            className={cx(
              "inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition",
              loading || !text.trim()
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Send className="h-4 w-4" />
            Wyślij
          </button>
        </form>
      </Card>
    </div>
  );
}
