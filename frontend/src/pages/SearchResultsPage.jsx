import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookmarkCheck, BookmarkPlus, Filter, Loader2 } from "lucide-react";
import { addFavorite, favorites, removeFavoriteByUrl, search } from "../api/client.js";
import ResultCard from "../components/ResultCard.jsx";
import SearchBox from "../components/SearchBox.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("query") || "";
  const [domain, setDomain] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [savedUrls, setSavedUrls] = useState(new Set());

  useEffect(() => {
    favorites().then((items) => setSavedUrls(new Set(items.map((item) => item.url)))).catch(() => null);
  }, []);

  useEffect(() => {
    if (!query) return;
    let active = true;
    setLoading(true);
    setError("");
    search(query, page, 10, domain)
      .then((next) => active && setData((current) => (page === 1 ? next : { ...next, results: [...(current?.results || []), ...next.results] })))
      .catch(() => active && setError("Search failed. Please try again."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query, page, domain]);

  function runSearch(nextQuery) {
    setPage(1);
    navigate(`/search?query=${encodeURIComponent(nextQuery)}`);
  }

  return (
    <main>
      <section className="sticky top-[65px] z-40 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-5xl">
          <SearchBox initialValue={query} onSearch={runSearch} loading={loading} compact />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total.toLocaleString()} results in ${data.took_ms} ms${data.cached ? " from cache" : ""}` : "Ready to search"}
          </p>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
            <Filter size={16} />
            <input value={domain} onChange={(event) => { setPage(1); setDomain(event.target.value); }} placeholder="Filter by domain" className="bg-transparent outline-none" />
          </label>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}
        {toast && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">{toast}</div>}
        {!query && <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">Enter a query to search the index.</div>}
        {loading && page === 1 && <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}</div>}
        {data && data.results.length === 0 && !loading && <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">No results found. Try a broader query or queue a crawl from the admin page.</div>}
        {data && data.results.length > 0 && (
          <div className="space-y-4">
            {data.results.map((result) => (
              <div key={`${result.url}-${result.score}`} className="relative">
                <ResultCard result={result} />
                <button
                  onClick={async () => {
                    try {
                      if (savedUrls.has(result.url)) {
                        await removeFavoriteByUrl(result.url);
                        setSavedUrls((current) => {
                          const next = new Set(current);
                          next.delete(result.url);
                          return next;
                        });
                        setToast("Favorite removed");
                      } else {
                        await addFavorite({ title: result.title, url: result.url, snippet: result.snippet });
                        setSavedUrls((current) => new Set(current).add(result.url));
                        setToast("Favorite saved");
                      }
                    } catch {
                      setToast("Unable to update favorite");
                    }
                  }}
                  className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md border bg-white hover:border-blue-400 dark:bg-slate-900 ${savedUrls.has(result.url) ? "border-blue-300 text-blue-600 dark:border-blue-800" : "border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-200"}`}
                  aria-label={savedUrls.has(result.url) ? "Remove favorite" : "Save favorite"}
                >
                  {savedUrls.has(result.url) ? <BookmarkCheck size={17} /> : <BookmarkPlus size={17} />}
                </button>
              </div>
            ))}
            {data.results.length < data.total && (
              <button onClick={() => setPage((current) => current + 1)} className="mx-auto flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-white dark:text-slate-950" disabled={loading}>
                {loading && <Loader2 className="animate-spin" size={17} />} Load more
              </button>
            )}
          </div>
        )}
        {data?.related_searches?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {data.related_searches.map((item) => <button key={item} onClick={() => runSearch(item)} className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:border-blue-400 dark:border-slate-800">{item}</button>)}
          </div>
        )}
      </section>
    </main>
  );
}
