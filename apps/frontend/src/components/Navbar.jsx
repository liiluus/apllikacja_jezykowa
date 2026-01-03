import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearSession, getUser } from "../utils/auth";
import {
  LayoutDashboard,
  Dumbbell,
  BarChart3,
  MessageSquare,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from "lucide-react";

function NavItem({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = getUser();

  const [open, setOpen] = useState(false);

  // zamknij drawer po zmianie route
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ESC zamyka drawer
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // blokada scrolla kiedy drawer otwarty (opcjonalnie, ale fajne)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function logout() {
    clearSession();
    setOpen(false);
    nav("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* Brand */}
          <Link to="/dashboard" className="mr-2 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">Lingua AI</div>
              <div className="text-xs text-slate-500">nauka języka</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {token && (
              <span className="hidden sm:inline text-sm text-slate-600">
                {user?.email}
              </span>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Otwórz menu"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={[
          "fixed inset-0 z-50 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-dvh w-[320px] max-w-[85vw] border-l border-slate-200 bg-white shadow-xl",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">Menu</div>
              <div className="text-xs text-slate-500">nawigacja</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100dvh-56px)] flex-col px-4 py-4">
          <nav className="flex flex-col gap-2">
            <NavItem to="/dashboard" icon={LayoutDashboard} onClick={() => setOpen(false)}>
              Dashboard
            </NavItem>
            <NavItem to="/exercise" icon={Dumbbell} onClick={() => setOpen(false)}>
              Ćwiczenia
            </NavItem>
            <NavItem to="/progress" icon={BarChart3} onClick={() => setOpen(false)}>
              Postęp
            </NavItem>
            <NavItem to="/ai" icon={MessageSquare} onClick={() => setOpen(false)}>
              AI Asystent
            </NavItem>
          </nav>

          <div className="my-4 h-px bg-slate-200" />

          <div className="mt-auto">
            {token ? (
              <div className="grid gap-2">
                <div className="truncate text-sm text-slate-600">{user?.email}</div>
                <button
                  onClick={logout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Wyloguj
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
