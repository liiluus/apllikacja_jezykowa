import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../utils/auth";
import {
  LayoutDashboard,
  Dumbbell,
  BarChart3,
  MessageSquare,
  LogOut,
  LogIn,
} from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Tab({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-slate-100"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const user = getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white font-black">
            L
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">Language App</div>
            <div className="text-xs text-slate-500">AI • ćwiczenia • postęp</div>
          </div>
        </div>

        {/* Tabs desktop */}
        <div className="mx-auto hidden items-center gap-1 md:flex">
          <Tab to="/dashboard" icon={LayoutDashboard}>Dashboard</Tab>
          <Tab to="/exercise" icon={Dumbbell}>Ćwiczenia</Tab>
          <Tab to="/progress" icon={BarChart3}>Postęp</Tab>
          <Tab to="/ai" icon={MessageSquare}>AI</Tab>
        </div>

        {/* Auth */}
        <div className="ml-auto flex items-center gap-3">
          {token ? (
            <>
              <span className="hidden text-sm text-slate-600 md:inline">
                {user?.email}
              </span>
              <button
                onClick={() => {
                  clearSession();
                  nav("/login");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Tabs mobile */}
        <div className="flex w-full justify-between gap-2 md:hidden">
          <Tab to="/dashboard" icon={LayoutDashboard}>Dash</Tab>
          <Tab to="/exercise" icon={Dumbbell}>Ćw.</Tab>
          <Tab to="/progress" icon={BarChart3}>Postęp</Tab>
          <Tab to="/ai" icon={MessageSquare}>AI</Tab>
        </div>
      </div>
    </header>
  );
}
