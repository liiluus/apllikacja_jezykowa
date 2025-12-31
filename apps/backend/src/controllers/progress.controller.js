import { prisma } from "../db/prisma.js";

// helper: zwraca YYYY-MM-DD w strefie Europe/Warsaw
function dayKeyWarsaw(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // np. "2025-12-31"
}

// streak "do dziś" (jeśli dziś brak aktywności -> 0)
function calcCurrentStreakFromDates(dateKeysDesc) {
  if (!Array.isArray(dateKeysDesc) || dateKeysDesc.length === 0) return 0;

  const set = new Set(dateKeysDesc);
  const today = dayKeyWarsaw(new Date());
  if (!set.has(today)) return 0;

  let streak = 0;
  let cursor = new Date();

  while (true) {
    const key = dayKeyWarsaw(cursor);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// rekord streaka w historii (niezależnie od tego, czy dziś była aktywność)
function calcBestStreakFromDates(dateKeysDesc) {
  if (!Array.isArray(dateKeysDesc) || dateKeysDesc.length === 0) return 0;

  // unique dni mamy w desc, zamieniamy na asc
  const keysAsc = [...dateKeysDesc].reverse();

  // dateKey "YYYY-MM-DD" -> liczba dni (UTC) bez zabawy w strefy
  const toDayNumber = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };

  let best = 1;
  let run = 1;

  for (let i = 1; i < keysAsc.length; i++) {
    const prev = toDayNumber(keysAsc[i - 1]);
    const curr = toDayNumber(keysAsc[i]);

    if (curr === prev + 1) {
      run += 1;
    } else {
      run = 1;
    }

    if (run > best) best = run;
  }

  return best;
}

export async function getProgress(req, res) {
  const userId = req.user.userId;

  const total = await prisma.attempt.count({ where: { userId } });
  const correct = await prisma.attempt.count({
    where: { userId, isCorrect: true },
  });

  const accuracy = total === 0 ? 0 : correct / total;

  const recentAttempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      exerciseId: true,
      answer: true,
      isCorrect: true,
      score: true,
      feedback: true,
      createdAt: true,
      exercise: {
        select: { type: true, prompt: true },
      },
    },
  });

  // bierzemy więcej prób dla streaków
  const streakAttempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 365,
    select: { createdAt: true },
  });

  // unikalne dni (Warsaw)
  const uniqueDaysDesc = [];
  const seen = new Set();
  for (const a of streakAttempts) {
    const k = dayKeyWarsaw(a.createdAt);
    if (!seen.has(k)) {
      seen.add(k);
      uniqueDaysDesc.push(k);
    }
  }

  const streakDays = calcCurrentStreakFromDates(uniqueDaysDesc);
  const bestStreakDays = calcBestStreakFromDates(uniqueDaysDesc);

  const lastAttempt = recentAttempts[0] || null;

  res.json({
    stats: { total, correct, accuracy, streakDays, bestStreakDays },
    recentAttempts,
    lastAttempt,
  });
}

export async function getWeeklyProgress(req, res) {
  const userId = req.user.userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 7 dni wstecz
  const start = new Date(today);
  start.setDate(start.getDate() - 6);

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      createdAt: {
        gte: start,
      },
    },
    select: {
      createdAt: true,
      isCorrect: true,
    },
  });

  // inicjalizacja dni
  const days = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days[key] = { total: 0, correct: 0 };
  }

  // zliczanie
  attempts.forEach((a) => {
    const key = a.createdAt.toISOString().slice(0, 10);
    if (days[key]) {
      days[key].total += 1;
      if (a.isCorrect) days[key].correct += 1;
    }
  });

  const result = Object.entries(days).map(([date, v]) => ({
    date,
    total: v.total,
    correct: v.correct,
  }));

  res.json({ days: result });
}
