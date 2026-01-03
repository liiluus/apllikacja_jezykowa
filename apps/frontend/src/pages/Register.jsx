import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, setSession } from "../utils/auth";
import { UserPlus, Mail, Lock } from "lucide-react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await register(email, password);
      setSession({ token: data.token, user: data.user });
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-7">
          <div className="flex items-center gap-3 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold">Rejestracja</div>
              <div className="text-sm text-white/80">Załóż konto i zacznij naukę</div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Mail className="h-4 w-4 text-slate-500" />
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Lock className="h-4 w-4 text-slate-500" />
              Hasło
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="hasło"
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            disabled={loading}
            className={cx(
              "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
              loading ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {loading ? "..." : "Załóż konto"}
          </button>

          {err ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{err}</div> : null}

          <div className="text-sm text-slate-600">
            Masz konto?{" "}
            <Link to="/login" className="font-semibold text-slate-900 underline decoration-slate-300">
              Logowanie
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
