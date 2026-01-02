// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Exercise from "./pages/Exercise";
import Progress from "./pages/Progress";
import AiChat from "./pages/AiChat";

import Navbar from "./components/Navbar";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function AppShell({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Start */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell>
              <Dashboard />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route
        path="/exercise"
        element={
          <RequireAuth>
            <AppShell>
              <Exercise />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route
        path="/progress"
        element={
          <RequireAuth>
            <AppShell>
              <Progress />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route
        path="/ai"
        element={
          <RequireAuth>
            <AppShell>
              <AiChat />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
