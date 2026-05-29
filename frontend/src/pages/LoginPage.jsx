import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await signIn(form);
      navigate(user.role === "ADMIN" ? "/admin" : "/user", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-blue-600 text-white"><Search size={18} /></span>
          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-slate-500">Access your crawler dashboard.</p>
          </div>
        </div>
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}
        <input className="mb-3 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="mb-4 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
          {loading && <Loader2 className="animate-spin" size={18} />} Login
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">New here? <Link className="font-semibold text-blue-600" to="/register">Create an account</Link></p>
      </form>
    </main>
  );
}
