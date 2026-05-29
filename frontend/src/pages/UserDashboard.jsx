import { useEffect, useState } from "react";
import { Bookmark, Clock, Search, Star, XCircle } from "lucide-react";
import { addFavorite, favorites, removeFavoriteByUrl, removeHistory, searchHistory } from "../api/client.js";
import SearchBox from "../components/SearchBox.jsx";
import { useNavigate } from "react-router-dom";

function asUrl(value) {
  const trimmed = value.trim();
  const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.hostname.includes(".") ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    searchHistory().then(setHistory).catch(() => setHistory([]));
    favorites().then(setSaved).catch(() => setSaved([]));
  }, []);

  async function deleteHistoryItem(id) {
    await removeHistory(id);
    setHistory((current) => current.filter((item) => item.id !== id));
    setMessage("History item removed");
  }

  async function toggleFavorite(query) {
    const url = asUrl(query);
    if (!url) {
      setMessage("Only URL searches can be saved as favorite links.");
      return;
    }
    const existing = saved.find((item) => item.url === url);
    if (existing) {
      await removeFavoriteByUrl(url);
      setSaved((current) => current.filter((item) => item.url !== url));
      setMessage("Favorite removed");
      return;
    }
    const favorite = await addFavorite({ title: new URL(url).hostname, url, snippet: "Saved from search history" });
    setSaved((current) => [favorite, ...current]);
    setMessage("Favorite saved");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8">
        <div className="mb-5 flex items-center gap-3">
          <Search className="text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">User Dashboard</h1>
            <p className="text-sm text-slate-500">Search indexed pages with fuzzy and partial matching.</p>
          </div>
        </div>
        <SearchBox onSearch={(query) => navigate(`/search?query=${encodeURIComponent(query)}`)} />
      </section>
      {message && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">{message}</div>}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 font-semibold"><Clock size={18} /> Search history</div>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                <button onClick={() => navigate(`/search?query=${encodeURIComponent(item.query)}`)} className="min-w-0 flex-1 text-left hover:text-blue-600">
                  <span className="block truncate">{item.query}</span>
                  <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} - {item.results_count} results</span>
                </button>
                <button onClick={() => toggleFavorite(item.query)} className="grid h-8 w-8 place-items-center rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950" aria-label="Toggle favorite">
                  <Star size={16} fill={saved.some((savedItem) => savedItem.url === asUrl(item.query)) ? "currentColor" : "none"} />
                </button>
                <button onClick={() => deleteHistoryItem(item.id)} className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label="Delete history item">
                  <XCircle size={16} />
                </button>
              </div>
            ))}
            {!history.length && <p className="text-sm text-slate-500">No searches yet.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 font-semibold"><Bookmark size={18} /> Favorite links</div>
          <div className="space-y-2">
            {saved.map((item) => (
              <a key={item.id} href={item.url} className="block rounded-md bg-slate-50 px-3 py-2 text-sm hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-slate-800">
                <span className="font-medium">{item.title}</span>
                <span className="block truncate text-slate-500">{item.url}</span>
              </a>
            ))}
            {!saved.length && <p className="text-sm text-slate-500">No favorites saved.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
