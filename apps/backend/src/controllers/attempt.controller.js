import { prisma } from "../db/prisma.js";

function normalizeStrict(s) {
  let t = (s ?? "").toString().trim().toLowerCase();
  t = t.replace(/[’‘`]/g, "'").replace(/[“”]/g, '"');
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function normalizeLenient(s) {
  let t = normalizeStrict(s);
  t = t.replace(/[.,!?;:]+$/g, "").trim();
  return t;
}

function normalizeLenientNoApos(s) {
  return normalizeLenient(s).replace(/'/g, "").trim();
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

  const all = [...base, ...extra]
    .map((x) => x.toString().trim())
    .filter(Boolean);

  return Array.from(new Set(all));
}

function buildLenientNotes({ rawAnswer, rawSolution }) {
  const notes = [];

  const a0 = (rawAnswer ?? "").toString();
  const s0 = (rawSolution ?? "").toString();

  const aHasEndPunct = /[.,!?;:]+\s*$/.test(a0);
  const sHasEndPunct = /[.,!?;:]+\s*$/.test(s0);
  if (aHasEndPunct || sHasEndPunct) {
    notes.push("Zignorowano interpunkcję na końcu (np. kropkę).");
  }

  const aAposChanged = /[’‘`“”]/.test(a0);
  const sAposChanged = /[’‘`“”]/.test(s0);
  if (aAposChanged || sAposChanged) {
    notes.push("Ujednolicono apostrofy/cudzysłowy (np. don’t vs don't).");
  }

  if (/\s{2,}/.test(a0) || /\s{2,}/.test(s0)) {
    notes.push("Znormalizowano spacje.");
  }

  return notes;
}
function buildAposOmittedNote({ rawAnswer, rawSolution }) {
  // sprawdzamy już na znormalizowanych lenient (z jednorodnym apostrofem)
  const aLen = normalizeLenient(rawAnswer);
  const sLen = normalizeLenient(rawSolution);

  const aHas = aLen.includes("'");
  const sHas = sLen.includes("'");

  if (aHas !== sHas) {
    return "Zignorowano brak apostrofu w skrótach (np. don't = dont).";
  }

  const aCount = (aLen.match(/'/g) || []).length;
  const sCount = (sLen.match(/'/g) || []).length;
  if (aCount !== sCount) {
    return "Zignorowano różnice w apostrofach (np. don't = dont).";
  }

  return null;
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

  let evaluation = {
    mode: "strict",
    matched: null,
    notes: [],
    acceptedAnswer: null,
  };

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
    const userLenNoApos = normalizeLenientNoApos(answer);

    let matched = acceptedAnswers.find((sol) => normalizeStrict(sol) === userStrict);

    if (matched) {
      correct = true;
      evaluation = {
        mode: "strict",
        matched,
        notes: [],
        acceptedAnswer: userStrict,
      };
    } else {
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
        matched = acceptedAnswers.find((sol) => normalizeLenientNoApos(sol) === userLenNoApos);

        if (matched) {
          correct = true;

          const notes = buildLenientNotes({ rawAnswer: answer, rawSolution: matched });
          const aposNote = buildAposOmittedNote({ rawAnswer: answer, rawSolution: matched });
          if (aposNote) notes.push(aposNote);

          evaluation = {
            mode: "lenient",
            matched,
            notes,
            acceptedAnswer: userLenNoApos,
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
  }

  const score = correct ? 100 : 0;

  let feedback = "";
  if (exercise.type === "multiple_choice") {
    const sol = normalizeChoiceLetter(exercise.solution) || exercise.solution;
    feedback = correct ? "Poprawnie ✅" : `Nie do końca. Poprawna odpowiedź: "${sol}"`;
  } else {
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
    correctAnswer:
      exercise.type === "multiple_choice"
        ? (normalizeChoiceLetter(exercise.solution) || exercise.solution)
        : exercise.solution,
    ...(exercise.type !== "multiple_choice" ? { acceptedAnswers } : {}),
  });
}
