import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
const templates = [
    {
    language: "en",
    level: "A1",
    type: "translate",
    prompt: "Przetłumacz na angielski: „Mam samochód.”",
    solution: "I have a car.",
    metadata: { topic: "daily" },
    },
    {
    language: "en",
    level: "A1",
    type: "translate",
    prompt: "Przetłumacz na angielski: „Lubię kawę.”",
    solution: "I like coffee.",
    metadata: { topic: "daily" },
    },
    {
    language: "en",
    level: "A1",
    type: "translate",
    prompt: "Przetłumacz na angielski: „To jest mój dom.”",
    solution: "This is my house.",
    metadata: { topic: "daily" },
    },
    {
    language: "en",
    level: "A2",
    type: "translate",
    prompt: "Przetłumacz na angielski: „Wczoraj poszedłem do sklepu.”",
    solution: "Yesterday I went to the shop.",
    metadata: { topic: "past" },
    }
];

  // Prosto: wrzucamy kilka rekordów (na MVP duplikaty nie bolą)
await prisma.exerciseTemplate.createMany({
    data: templates,
    skipDuplicates: true,
});

console.log("Seed: ExerciseTemplate done");
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});
