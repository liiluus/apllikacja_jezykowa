import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
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

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

function PublicLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}

function PrivateLayout() {
  return (
    <>
      <Navbar />
      <PageShell>
        <Outlet />
      </PageShell>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* PUBLIC */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* PRIVATE */}
        <Route
          element={
            <RequireAuth>
              <PrivateLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exercise" element={<Exercise />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/ai" element={<AiChat />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="mx-auto max-w-6xl px-4 py-8">
              <div className="rounded-xl border border-slate-200 bg-white p-6">404</div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
