import { prisma } from "../db/prisma.js";

/**
 * STRICT:
 * - trim, lower
 * - ujednolicenie apostrofów/cudzysłowów
 * - wiele spacji -> jedna
 */
function normalizeStrict(s) {
  let t = (s ?? "").toString().trim().toLowerCase();
  t = t.replace(/[’‘`]/g, "'").replace(/[“”]/g, '"');
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * LENIENT:
 * - wszystko ze strict
 * - usuń interpunkcję na końcu (.,!?;:)
 */
function normalizeLenient(s) {
  let t = normalizeStrict(s);
  t = t.replace(/[.,!?;:]+$/g, "").trim();
  return t;
}

function normalizeChoiceLetter(x) {
  const s = (x ?? "").toString().trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(s)) return s;
  const first = s[0];
  if (["A", "B", "C", "D"].includes(first)) return first;
  return "";
}

function pickSolutions(exercise) {
  const base = typeof exercise?.solution === "string" ? [exercise.solution] : [];

  const meta = exercise?.metadata;
  const extra = Array.isArray(meta?.solutions)
    ? meta.solutions.filter((x) => typeof x === "string" && x.trim())
    : [];

  const all = [...base, ...extra].map((x) => x.toString().trim()).filter(Boolean);
  return Array.from(new Set(all));
}

/**
 * Notki do UI – pokazujemy tylko “co odpuściliśmy”.
 * Ważne: wykrywamy na RAW inputach, nie na strict (bo strict już usuwa część różnic).
 */
function buildLenientNotes({ rawAnswer, rawSolution }) {
  const notes = [];

  const a0 = (rawAnswer ?? "").toString();
  const s0 = (rawSolution ?? "").toString();

  // końcowa interpunkcja
  const aHasEndPunct = /[.,!?;:]+\s*$/.test(a0);
  const sHasEndPunct = /[.,!?;:]+\s*$/.test(s0);
  if (aHasEndPunct || sHasEndPunct) {
    notes.push("Zignorowano interpunkcję na końcu (np. kropkę).");
  }

  // apostrofy/cudzysłowy
  const aAposChanged = /[’‘`“”]/.test(a0);
  const sAposChanged = /[’‘`“”]/.test(s0);
  if (aAposChanged || sAposChanged) {
    notes.push("Ujednolicono apostrofy/cudzysłowy (np. don’t vs don't).");
  }

  // spacje wielokrotne
  if (/\s{2,}/.test(a0) || /\s{2,}/.test(s0)) {
    notes.push("Znormalizowano spacje.");
  }

  return notes;
}

export async function createAttempt(req, res) {
  const userId = req.user.userId;
  const { exerciseId, answer } = req.body || {};

  if (!exerciseId || typeof exerciseId !== "string") {
    return res.status(400).json({ error: "exerciseId is required" });
  }
  if (typeof answer !== "string") {
    return res.status(400).json({ error: "answer must be a string" });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return res.status(404).json({ error: "exercise not found" });

  if (exercise.userId !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  let correct = false;

  // extra info dla UI
  let evaluation = {
    mode: "strict",        // strict | lenient
    matched: null,         // która odpowiedź została dopasowana (RAW)
    notes: [],             // co zignorowaliśmy
    acceptedAnswer: null,  // finalnie co porównywaliśmy (znormalizowane)
  };

  // do UI: pełna lista akceptowanych odpowiedzi dla tekstu
  const acceptedAnswers = exercise.type === "multiple_choice" ? null : pickSolutions(exercise);

  if (exercise.type === "multiple_choice") {
    const userPick = normalizeChoiceLetter(answer);
    const sol = normalizeChoiceLetter(exercise.solution);

    correct = Boolean(userPick && sol && userPick === sol);

    evaluation = {
      mode: "strict",
      matched: sol || null,
      notes: [],
      acceptedAnswer: userPick || null,
    };
  } else {
    const userStrict = normalizeStrict(answer);
    const userLen = normalizeLenient(answer);

    // 1) STRICT match
    let matched = acceptedAnswers.find((sol) => normalizeStrict(sol) === userStrict);

    if (matched) {
      correct = true;
      evaluation = {
        mode: "strict",
        matched, // RAW solution string
        notes: [],
        acceptedAnswer: userStrict,
      };
    } else {
      // 2) LENIENT match
      matched = acceptedAnswers.find((sol) => normalizeLenient(sol) === userLen);

      if (matched) {
        correct = true;
        evaluation = {
          mode: "lenient",
          matched,
          notes: buildLenientNotes({ rawAnswer: answer, rawSolution: matched }),
          acceptedAnswer: userLen,
        };
      } else {
        correct = false;
        evaluation = {
          mode: "strict",
          matched: null,
          notes: [],
          acceptedAnswer: userStrict || userLen || null,
        };
      }
    }
  }

  const score = correct ? 100 : 0;

  let feedback = "";
  if (exercise.type === "multiple_choice") {
    const sol = normalizeChoiceLetter(exercise.solution) || exercise.solution;
    feedback = correct ? "Poprawnie ✅" : `Nie do końca. Poprawna odpowiedź: "${sol}"`;
  } else {
    // jeśli masz matched (np. lenient) to pokaż dopasowaną, inaczej kanoniczną solution
    const showSol = evaluation?.matched || exercise.solution;
    feedback = correct ? "Poprawnie ✅" : `Nie do końca. Poprawna odpowiedź: "${showSol}"`;
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      exerciseId,
      answer,
      isCorrect: correct,
      score,
      feedback,
    },
    select: {
      id: true,
      exerciseId: true,
      answer: true,
      isCorrect: true,
      score: true,
      feedback: true,
      createdAt: true,
    },
  });

  return res.status(201).json({
    attempt,
    evaluation,
    // kanoniczna odpowiedź (to pokaż w UI jako "Poprawna odpowiedź")
    correctAnswer:
      exercise.type === "multiple_choice"
        ? (normalizeChoiceLetter(exercise.solution) || exercise.solution)
        : exercise.solution,
    // pełna lista (dla UI, debugowania, przyszłych “podpowiedzi”)
    ...(exercise.type !== "multiple_choice" ? { acceptedAnswers } : {}),
  });
}
