import { useEffect, useMemo, useState } from "react";
import { api } from "../api/clients";
import { fetchProfile, updateProfile } from "../api/profile";
import Feedback from "../components/Feedback";
import { mapExercise, mapAttemptResult } from "../api/types";
import {
  Dumbbell,
  Sparkles,
  Wand2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ListChecks,
  Languages,
  GraduationCap,
  Tag,
  Quote,
  Lightbulb,
} from "lucide-react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LS_EXERCISE_PREFS = "exercisePrefs";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function pickOptions(exercise) {
  const opts = exercise?.metadata?.options;

  if (Array.isArray(opts)) return opts;

  if (opts && typeof opts === "object") {
    const A = opts.A ?? opts.a;
    const B = opts.B ?? opts.b;
    const C = opts.C ?? opts.c;
    const D = opts.D ?? opts.d;

    if ([A, B, C, D].every((x) => typeof x === "string" && x.trim())) {
      return [`A) ${A}`, `B) ${B}`, `C) ${C}`, `D) ${D}`];
    }
  }

  return [];
}

function optionLetter(optionText, idx) {
  const s = String(optionText || "").trim();
  const m = s.match(/^([ABCD])[\)\.\:\-]\s*/i);
  if (m?.[1]) return m[1].toUpperCase();
  return ["A", "B", "C", "D"][idx] || "";
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

function Label({ icon: Icon, children }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      {children}
    </div>
  );
}

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      {children}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-xl bg-slate-200/70",
        className
      )}
    />
  );
}

function ExerciseSkeleton() {
  return (
    <div className="space-y-4">
      {/* badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 w-28 rounded-xl" />
        <Skeleton className="h-7 w-24 rounded-xl" />
        <Skeleton className="h-7 w-28 rounded-xl" />
      </div>

      {/* prompt area */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Skeleton className="h-4 w-28" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-[110px] w-full rounded-2xl" />
        </div>
      </div>

      {/* buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}


/** Fallback: wyciągnij tekst z „...” albo "..." z promptu */
function extractQuoted(prompt) {
  const p = String(prompt || "");
  // polskie cudzysłowy „...”
  let m = p.match(/„([^”]+)”/);
  if (m?.[1]) return m[1].trim();
  // zwykłe "..."
  m = p.match(/"([^"]+)"/);
  if (m?.[1]) return m[1].trim();
  // apostrofowe ‘...’ (awaryjnie)
  m = p.match(/‘([^’]+)’/);
  if (m?.[1]) return m[1].trim();
  return "";
}

/** Fallback dla fill_blank: "Uzupełnij lukę: ..." + "Podpowiedź (PL): ..." */
function extractFillBlankFromPrompt(prompt) {
  const p = String(prompt || "");
  const sent = (p.match(/Uzupełnij lukę:\s*([^\n]+)/i)?.[1] || "").trim();
  const hint = (p.match(/Podpowiedź\s*\(PL\)\s*:\s*([^\n]+)/i)?.[1] || "").trim();
  return { sentence: sent, hint };
}

export default function ExercisePage() {
  const [exercise, setExercise] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditingAfterResult, setIsEditingAfterResult] = useState(false);


  const [type, setType] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").type || "translate";
    } catch {
      return "translate";
    }
  });

  const [topic, setTopic] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").topic || "daily";
    } catch {
      return "daily";
    }
  });

  const [level, setLevel] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_EXERCISE_PREFS) || "{}").level || "A1";
    } catch {
      return "A1";
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        const profLevel = String(p?.level || "").toUpperCase();
        if (LEVELS.includes(profLevel)) setLevel(profLevel);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_EXERCISE_PREFS, JSON.stringify({ type, topic, level }));
  }, [type, topic, level]);

  async function onChangeLevel(nextLevel) {
    setLevel(nextLevel);
    try {
      await updateProfile({ level: nextLevel });
    } catch (e) {
      setError(e.message || "Nie udało się zapisać poziomu w profilu.");
    }
  }

  async function loadExercise(opts = {}) {
    setLoading(true);
    setIsEditingAfterResult(false);
    setError("");
    setResult(null);
    setAnswer("");

    try {
      const lastId = localStorage.getItem("lastExerciseId");
      if (lastId) {
        try {
          const dto = await api.get(`/api/exercises/${lastId}`);
          localStorage.removeItem("lastExerciseId");

          const ex = dto?.exercise ?? dto;
          if (!ex?.id || !ex?.prompt) throw new Error("Brak id/prompt");

          if (ex.type) setType(ex.type);
          if (ex?.metadata?.topic) setTopic(ex.metadata.topic);
          if (ex?.metadata?.level) {
            const exLevel = String(ex.metadata.level).toUpperCase();
            if (LEVELS.includes(exLevel)) setLevel(exLevel);
          }

          setExercise(mapExercise(ex));
          return;
        } catch {
          localStorage.removeItem("lastExerciseId");
        }
      }

      const dto = await api.post("/api/exercises/ai-generate", {
        type: opts.type ?? type,
        topic: (opts.topic ?? topic).trim() || "daily",
        level: (opts.level ?? level) || "A1",
      });

      const ex = dto?.exercise ?? dto;
      if (!ex?.id || !ex?.prompt) throw new Error("Nieprawidłowa odpowiedź API (brak id/prompt).");

      setExercise(mapExercise(ex));
    } catch (e) {
      setError(e.message || "Błąd podczas generowania ćwiczenia");
      setExercise(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!exercise?.id) return;

    if (exercise.type === "multiple_choice") {
      if (!answer) return;
    } else {
      if (!answer.trim()) return;
    }

    setLoading(true);
    setError("");
    setIsEditingAfterResult(false);

    try {
      const dto = await api.post("/api/attempts", {
        exerciseId: exercise.id,
        answer: exercise.type === "multiple_choice" ? answer : answer.trim(),
      });
      setResult(mapAttemptResult(dto));
    } catch (e) {
      setError(e.message || "Błąd podczas sprawdzania odpowiedzi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => pickOptions(exercise), [exercise]);

  // ---- METADATA + FALLBACKI ----
  const meta = exercise?.metadata || {};

  const isTranslate = String(exercise?.type || "").startsWith("translate");
  const direction =
    (typeof meta.direction === "string" && meta.direction) ||
    (exercise?.type === "translate_en_pl" ? "en_pl" : "pl_en");

  const fromLabel = direction === "en_pl" ? "EN" : "PL";
  const toLabel = direction === "en_pl" ? "PL" : "EN";

  // sourceText: metadata.sourceText albo wyciągnięte z promptu
  const sourceText =
    (typeof meta.sourceText === "string" && meta.sourceText.trim()) ||
    extractQuoted(exercise?.prompt);

  // fill_blank: sentence/hint z metadata albo z promptu
  const promptFill = extractFillBlankFromPrompt(exercise?.prompt);
  const sentence =
    (typeof meta.sentence === "string" && meta.sentence.trim()) || promptFill.sentence;
  const hint = (typeof meta.hint === "string" && meta.hint.trim()) || promptFill.hint;

  const showTranslateMeta = isTranslate && Boolean(sourceText);
  const showFillBlankMeta = exercise?.type === "fill_blank" && Boolean(sentence);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[220px]">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ćwiczenia
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Generuj zadania dopasowane do tematu i poziomu. Quiz (ABCD) ma przyciski wyboru.
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadExercise({ type, topic, level })}
                disabled={loading}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                  loading
                    ? "bg-white/30 text-white/70 cursor-not-allowed"
                    : "bg-white/85 text-slate-900 hover:bg-white"
                )}
              >
                <Wand2 className="h-4 w-4" />
                {loading ? "..." : "Generuj"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setExercise(null);
                  setResult(null);
                  setAnswer("");
                  setError("");
                  localStorage.removeItem("lastExerciseId");
                }}
                disabled={loading}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                  loading
                    ? "bg-white/20 text-white/60 cursor-not-allowed"
                    : "bg-white/30 text-white hover:bg-white/40"
                )}
              >
                <Trash2 className="h-4 w-4" />
                Wyczyść
              </button>
            </div>
          </div>

          {error ? <div className="mt-4 text-sm text-rose-100">{error}</div> : null}
        </div>
      </div>

      {/* Controls */}
      <Card title="Ustawienia generowania" icon={Sparkles}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label icon={ListChecks}>Typ</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="translate">Tłumaczenie (PL→EN)</option>
              <option value="translate_en_pl">Tłumaczenie (EN→PL)</option>
              <option value="fill_blank">Uzupełnij lukę</option>
              <option value="multiple_choice">Test ABCD</option>
            </select>
          </div>

          <div>
            <Label icon={GraduationCap}>Poziom</Label>
            <select
              value={level}
              onChange={(e) => onChangeLevel(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label icon={Tag}>Temat</Label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="np. travel / work / daily / food"
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <Languages className="h-4 w-4 text-slate-500" />
          <span>
            Tip: quiz korzysta z <code>metadata.options</code>. Dla translate/fill_blank UI bierze też{" "}
            <code>metadata.sourceText / sentence / hint</code>, a jak nie ma — robi fallback z promptu.
          </span>
        </div>
      </Card>

      {/* Content */}
      <Card title="Ćwiczenie" icon={Dumbbell}>
      <div className="relative">

        {loading && !exercise ? <ExerciseSkeleton /> : null}
        {loading ? (
  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/60 backdrop-blur-[1px]" />
) : null}
        {!exercise && !loading ? (
          <div className="text-sm text-slate-600">
            Kliknij <span className="font-semibold">Generuj</span>, aby dostać ćwiczenie.
          </div>
        ) : null}

        {exercise ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                typ: <span className="font-semibold text-slate-900">{exercise.type}</span>
              </Badge>
              <Badge>
                poziom: <span className="font-semibold text-slate-900">{level}</span>
              </Badge>
              {topic ? (
                <Badge>
                  temat: <span className="font-semibold text-slate-900">{topic}</span>
                </Badge>
              ) : null}

              {exercise.type === "fill_blank" && hint ? (
                <Badge icon={Lightbulb}>
                  podpowiedź (PL): <span className="font-semibold text-slate-900">{hint}</span>
                </Badge>
              ) : null}
            </div>

            {/* Translate UI (PL->EN i EN->PL identyczny layout) */}
            {showTranslateMeta ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Quote className="h-4 w-4 text-slate-500" />
                    Źródło ({fromLabel})
                  </div>
                  <div className="whitespace-pre-wrap text-sm font-medium text-slate-900">
                    {sourceText}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-xs font-semibold text-slate-600">
                    Twoje tłumaczenie ({toLabel})
                  </div>

                  {!result ? (
                    <textarea
                      rows={4}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={`Napisz tłumaczenie (${toLabel})...`}
                      disabled={loading}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  ) : (
                    <div className="text-sm text-slate-700">
                      Odpowiedź wysłana ✅ (możesz kliknąć “Następne”)
                    </div>
                  )}
                </div>
              </div>
            ) : showFillBlankMeta ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-semibold text-slate-600">Uzupełnij lukę</div>
                <div className="whitespace-pre-wrap text-sm font-medium text-slate-900">{sentence}</div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-semibold text-slate-600">Polecenie</div>
                <div className="whitespace-pre-wrap text-sm font-medium text-slate-900">
                  {exercise.prompt}
                </div>
              </div>
            )}

            {/* Input / Quiz */}
            {!result ? (
              <>
                {exercise.type === "multiple_choice" ? (
                  <div className="space-y-3">
                    {options.length === 4 ? (
                      <div className="grid gap-2">
                        {options.map((opt, idx) => {
                          const letter = optionLetter(opt, idx);
                          const checked = answer === letter;

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={loading}
                              onClick={() => setAnswer(letter)}
                              className={cx(
                                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
                                checked
                                  ? "border-indigo-300 bg-indigo-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                                loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                              )}
                            >
                              <span
                                className={cx(
                                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-extrabold",
                                  checked ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"
                                )}
                              >
                                {letter}
                              </span>
                              <span className="whitespace-pre-wrap text-slate-900">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">
                        Brak opcji do quizu (metadata.options puste). Wygeneruj “Następne”.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={submitAnswer}
                        disabled={loading || !answer}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                          loading || !answer
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Sprawdź
                      </button>

                      <button
                        type="button"
                        onClick={() => loadExercise({ type, topic, level })}
                        disabled={loading}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
                          loading ? "cursor-not-allowed opacity-70" : ""
                        )}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Następne
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* jeśli to translate i pokazujemy dwie kolumny, textarea już jest wyżej */}
                    {!showTranslateMeta ? (
                      <textarea
                        rows={4}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Twoja odpowiedź..."
                        disabled={loading}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={submitAnswer}
                        disabled={loading || !answer.trim()}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                          loading || !answer.trim()
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Sprawdź
                      </button>

                      <button
                        type="button"
                        onClick={() => loadExercise({ type, topic, level })}
                        disabled={loading}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
                          loading ? "cursor-not-allowed opacity-70" : ""
                        )}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Następne
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
  <div>
    <Feedback result={result} onNext={() => loadExercise({ type, topic, level })} />

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setIsEditingAfterResult((v) => !v)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {isEditingAfterResult ? "Anuluj edycję" : "Edytuj odpowiedź"}
      </button>

      <button
        type="button"
        onClick={submitAnswer}
        disabled={loading || !answer.trim()}
        className={cx(
          "rounded-xl px-4 py-2 text-sm font-semibold transition",
          loading || !answer.trim()
            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
            : "bg-slate-900 text-white hover:bg-slate-800"
        )}
      >
        Wyślij ponownie
      </button>

      <button
        type="button"
        onClick={() => loadExercise({ type, topic, level })}
        disabled={loading}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Następne
      </button>
    </div>

    {/* ✅ EDIT MODE: pokazujemy input jeszcze raz */}
    {isEditingAfterResult ? (
      <div className="mt-4">
        {exercise.type === "multiple_choice" ? (
          <div className="grid gap-2">
            {options.map((opt, idx) => {
              const letter = optionLetter(opt, idx);
              const checked = answer === letter;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => setAnswer(letter)}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
                    checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50",
                    loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-extrabold",
                      checked ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"
                    )}
                  >
                    {letter}
                  </span>
                  <span className="whitespace-pre-wrap text-slate-900">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Popraw odpowiedź..."
            disabled={loading}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        )}
      </div>
    ) : null}
  </div>
)}

          </div>
        ) : null}
          </div>
      </Card>
    </div>
  );
}
