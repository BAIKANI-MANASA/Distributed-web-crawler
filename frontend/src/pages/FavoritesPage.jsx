import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { favorites, removeFavorite } from "../api/client.js";

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    favorites().then(setItems).catch(() => setItems([]));
  }, []);

  async function deleteItem(id) {
    await removeFavorite(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage("Favorite removed");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Bookmark className="text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Favorite links</h1>
          <p className="text-sm text-slate-500">Saved results persist across logout and login.</p>
        </div>
      </div>
      {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">{message}</div>}
      <section className="grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 truncate text-lg font-semibold text-blue-700 hover:underline dark:text-blue-300">
                  {item.title}
                  <ExternalLink size={16} className="shrink-0" />
                </a>
                <p className="mt-1 truncate text-sm text-emerald-700 dark:text-emerald-300">{item.url}</p>
                {item.snippet && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: item.snippet }} />}
              </div>
              <button onClick={() => deleteItem(item.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" aria-label="Remove favorite">
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
        {!items.length && <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">No favorites yet. Save results from the search page.</div>}
      </section>
    </main>
  );
}
