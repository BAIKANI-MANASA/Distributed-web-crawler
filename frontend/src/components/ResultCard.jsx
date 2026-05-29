import { ExternalLink } from "lucide-react";

export default function ResultCard({ result }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-start gap-3">
        <img src={result.favicon || "/favicon.ico"} alt="" className="mt-1 h-6 w-6 rounded-sm" onError={(event) => (event.currentTarget.style.display = "none")} />
        <div className="min-w-0 flex-1">
          <a href={result.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 text-xl font-semibold text-blue-700 hover:underline dark:text-blue-300">
            {result.title}
            <ExternalLink size={16} className="opacity-0 transition group-hover:opacity-100" />
          </a>
          <p className="truncate text-sm text-emerald-700 dark:text-emerald-400">{result.url}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-800">{result.source || "Elasticsearch"}</span>
      </div>
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: result.snippet || result.summary || "No snippet available." }} />
      {result.summary && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">{result.summary}</p>}
    </article>
  );
}
