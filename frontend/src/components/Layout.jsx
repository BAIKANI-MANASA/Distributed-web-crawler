import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Bell, Bookmark, FileText, Gauge, Github, Linkedin, LogOut, Mail, Moon, Search, Shield, Sun, Twitter, User } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { useTheme } from "../state/ThemeContext.jsx";
import SearchBox from "./SearchBox.jsx";

export default function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"}`;
  const navItems = [
    { to: "/user", icon: Search, label: "Search" },
    { to: "/favorites", icon: Bookmark, label: "Favorites" },
    ...(user?.role === "ADMIN" ? [
      { to: "/stats", icon: BarChart3, label: "Stats" },
      { to: "/admin", icon: Gauge, label: "Admin" },
    ] : []),
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-base font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-600 text-white shadow-glow">
              <Search size={19} />
            </span>
            WebCrawler AI
          </NavLink>
          <div className="hidden min-w-0 md:block">
            <SearchBox compact onSearch={(query) => navigate(`/search?query=${encodeURIComponent(query)}`)} />
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/favorites" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="Favorites">
              <Bookmark size={18} />
            </NavLink>
            <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <details className="relative">
              <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="Profile menu">
                <User size={18} />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold">{user?.name}</p>
                <p className="truncate text-slate-500">{user?.email}</p>
                <NavLink to="/profile" className="mt-3 block rounded-md px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">Profile settings</NavLink>
              </div>
            </details>
            <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[220px_1fr]">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] py-6 md:block">
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return <NavLink key={item.to} to={item.to} className={linkClass}><Icon size={17} /> {item.label}</NavLink>;
              })}
            </div>
            <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              Distributed crawling, live search, and indexed discovery in one console.
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
      <footer className="mt-10 border-t border-slate-200 bg-white/70 px-4 py-8 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-2 font-semibold"><Search size={18} /> WebCrawler AI</div>
            <p className="text-sm leading-6 text-slate-500">A full-stack distributed crawler with Kafka queues, Redis caching, Elasticsearch indexing, and instant search.</p>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="font-semibold">Quick Links</p>
            <NavLink to="/user" className="text-slate-500 hover:text-blue-600">Search</NavLink>
            <NavLink to="/favorites" className="text-slate-500 hover:text-blue-600">Favorites</NavLink>
            <NavLink to="/stats" className="text-slate-500 hover:text-blue-600">Stats</NavLink>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="font-semibold">Company</p>
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"><Github size={16} /> GitHub Repository</a>
            <a href="mailto:contact@example.com" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"><Mail size={16} /> Contact</a>
            <a href="/privacy" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"><Shield size={16} /> Privacy Policy</a>
            <a href="/terms" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600"><FileText size={16} /> Terms</a>
          </div>
          <div className="grid content-start gap-3 text-sm">
            <p className="font-semibold">Social</p>
            <div className="flex gap-2">
              <a href="https://github.com/" target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:border-blue-400 dark:border-slate-800" aria-label="GitHub"><Github size={16} /></a>
              <a href="https://twitter.com/" target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:border-blue-400 dark:border-slate-800" aria-label="Twitter"><Twitter size={16} /></a>
              <a href="https://linkedin.com/" target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:border-blue-400 dark:border-slate-800" aria-label="LinkedIn"><Linkedin size={16} /></a>
            </div>
            <p className="text-slate-500">Copyright 2026 WebCrawler AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
