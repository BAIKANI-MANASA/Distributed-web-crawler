export default function StatCard({ label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  };
  const normalized = String(value).toLowerCase();
  const dot = normalized.includes("online") || normalized === "ok" || normalized === "green" ? "bg-emerald-500" : normalized.includes("reconnecting") || normalized.includes("yellow") || normalized.includes("unknown") ? "bg-amber-500" : normalized.includes("offline") || normalized.includes("error") || normalized.includes("unavailable") ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="rounded-lg border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/70">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {value}
      </p>
    </div>
  );
}
