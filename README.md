# 📚 LinguaAI – aplikacja do nauki języków z AI

LinguaAI to aplikacja webowa wspierająca naukę języków obcych poprzez **dynamicznie generowane ćwiczenia językowe z wykorzystaniem AI**.  
Aplikacja umożliwia użytkownikowi rozwiązywanie ćwiczeń dopasowanych do **poziomu, tematu i typu zadania**, a następnie otrzymywanie **inteligentnego feedbacku**.

Projekt został zrealizowany w architekturze **client–server** z wykorzystaniem nowoczesnych technologii frontendowych i backendowych.

---

## ✨ Funkcjonalności

### 👤 Użytkownik
- Rejestracja i logowanie (JWT)
- Profil użytkownika (poziom językowy, język docelowy)
- Zapamiętywanie preferencji (poziom, temat, typ ćwiczeń)

### 🧠 Ćwiczenia językowe (AI)
Aplikacja generuje ćwiczenia przy użyciu OpenAI API:

1. **Tłumaczenie PL → EN**
2. **Tłumaczenie EN → PL**
3. **Uzupełnianie luki (fill in the blank)**
4. **Test jednokrotnego wyboru (ABCD)**

Ćwiczenia są:
- generowane dynamicznie
- walidowane po stronie backendu
- zapisywane w bazie danych

---

### ✅ Sprawdzanie odpowiedzi (Strict & Lenient Mode)

System sprawdzania odpowiedzi obsługuje dwa tryby:

- **Strict mode** – dokładne dopasowanie odpowiedzi
- **Lenient mode** – toleruje:
  - brak kropki na końcu zdania
  - nadmiarowe spacje
  - różne apostrofy i cudzysłowy (`don’t` vs `don't`)

Użytkownik otrzymuje:
- informację, czy odpowiedź była poprawna
- punktację
- feedback tekstowy
- informację, czy odpowiedź została zaliczona w trybie lenient

---

### 🎨 Interfejs użytkownika
- Nowoczesny UI oparty o **Tailwind CSS**
- Skeleton loaders (ładowanie ćwiczeń)
- Drawer / hamburger menu
- Responsywność (mobile / desktop)
- Czytelny podział ćwiczeń (źródło → odpowiedź)

---

## 🧱 Architektura

apps/
├── frontend/ (React + Vite + Tailwind)
└── backend/ (Node.js + Express + Prisma)


---

## 🖥️ Frontend

**Technologie:**
- React
- Vite
- Tailwind CSS
- Axios
- Lucide Icons

**Główne elementy:**
- `ExercisePage` – generowanie i rozwiązywanie ćwiczeń
- `Feedback` – prezentacja wyniku i trybu sprawdzania
- Skeleton loader podczas ładowania
- Obsługa wielu typów ćwiczeń w jednym widoku

Frontend komunikuje się z backendem przez REST API.

---

## ⚙️ Backend

**Technologie:**
- Node.js
- Express
- Prisma ORM
- PostgreSQL (lub SQLite w dev)
- OpenAI API
- JWT Authentication

**Główne endpointy:**
- `POST /api/auth/*` – autoryzacja
- `POST /api/exercises/ai-generate` – generowanie ćwiczeń przez AI
- `GET /api/exercises/:id` – pobieranie ćwiczenia
- `POST /api/attempts` – sprawdzanie odpowiedzi
- `GET /api/profile` – profil użytkownika

---

## 🗄️ Baza danych (Prisma)

Przykładowe modele:
- `User`
- `Profile`
- `Exercise`
- `Attempt`

Każde podejście do ćwiczenia jest zapisywane, co umożliwia dalszą analizę postępów użytkownika.

---

## 🚀 Instalacja i uruchomienie

### 1️⃣ Klonowanie repozytorium
```bash
git clone https://github.com/liiluus/apllikacja_jezykowa.git
cd apllikacja_jezykowa
```
### 2️⃣ Backend
```bash
cd apps/backend
npm install
npx prisma migrate dev
npm run dev
```
### 3️⃣ Frontend
```bash
cd apps/frontend
npm install
npm run dev
```
## 🔐 Zmienne środowiskowe

### Backend (.env)

Aplikacja wymaga pliku `.env` w katalogu `apps/backend`. Zostanie on przekazany w załączniku w wiadomości e-mail.

## 🧪 Stan projektu

- `✅ Generowanie ćwiczeń AI`
- `✅ Sprawdzanie odpowiedzi (strict + lenient)`
- `✅ Obsługa wielu kierunków tłumaczeń`
- `✅ Nowoczesny UI`
- `✅ Gotowe do oddania / dalszego rozwoju`

## 📈 Możliwe rozszerzenia

- `Historia postępów użytkownika`
- `Edycja odpowiedzi po sprawdzeniu (Undo / Edit)`
- `Tryb nauki słówek`
- `Statystyki i wykresy postępu`
- `Wsparcie dla wielu języków`

## 👨‍💻 Autor

Projekt wykonany jako aplikacja edukacyjna z wykorzystaniem AI w ramach pracy inżynierskiej.
