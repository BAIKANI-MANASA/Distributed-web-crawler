import { useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-5xl place-items-center px-4 py-10">
      <section className="w-full text-center">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">Distributed AI search</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-6xl">WebCrawler AI</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">Fast full-text search, live crawling, suggestions, analytics, and AI-style page summaries in one production-ready stack.</p>
        </div>
        <SearchBox onSearch={(query) => navigate(`/search?query=${encodeURIComponent(query)}`)} />
      </section>
    </main>
  );
}
