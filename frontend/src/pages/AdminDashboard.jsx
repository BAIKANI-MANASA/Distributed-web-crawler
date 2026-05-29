import { useEffect, useState } from "react";
import { Activity, Plus, Server, Square, Trash2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminUsers, deleteIndexedPages, queueCrawl, stats as loadStats, stopCrawler } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";

export default function AdminDashboard() {
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState(1);
  const [message, setMessage] = useState("");
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const chartData = [
    { name: "Indexed", value: data?.total_crawled_pages || 0 },
    { name: "Queued", value: data?.queue_size || 0 },
    { name: "Workers", value: data?.active_workers || 0 },
    { name: "Searches", value: data?.searches_last_24h || 0 },
  ];

  useEffect(() => {
    loadStats().then(setData).catch(() => setData(null));
    adminUsers().then(setUsers).catch(() => setUsers([]));
    const id = window.setInterval(() => loadStats().then(setData).catch(() => null), 5000);
    return () => window.clearInterval(id);
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await queueCrawl(url, Number(depth));
      setMessage(response.message);
      setUrl("");
    } catch {
      setMessage("Unable to queue crawl. Check the URL and services.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Activity className="text-blue-600" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Crawled pages" value={data?.total_crawled_pages ?? "-"} />
        <StatCard label="Queue size" value={data?.queue_size ?? "-"} tone="amber" />
        <StatCard label="Active workers" value={data?.active_workers ?? "-"} tone="green" />
        <StatCard label="Searches 24h" value={data?.searches_last_24h ?? "-"} />
      </div>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">Search analytics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Server size={19} /> Service health</div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950"><span>Elasticsearch</span><strong>{data?.elasticsearch_health || "-"}</strong></div>
            <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950"><span>Redis</span><strong>{data?.redis_status || "-"}</strong></div>
            <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950"><span>Kafka</span><strong>{data?.kafka_status || "-"}</strong></div>
          </div>
          <h3 className="mt-5 text-sm font-semibold">Trending searches</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(data?.trending_searches || []).map((item) => <span key={item} className="rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">{item}</span>)}
            {!data?.trending_searches?.length && <span className="text-sm text-slate-500">No searches recorded yet.</span>}
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">Queue crawl</h2>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="mb-3 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" required />
          <label className="mb-4 block text-sm text-slate-500">Depth</label>
          <input type="range" min="0" max="5" value={depth} onChange={(event) => setDepth(event.target.value)} className="w-full" />
          <div className="mt-2 text-sm text-slate-500">Depth: {depth}</div>
          <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={17} /> Add URL
          </button>
          <button type="button" onClick={async () => setMessage((await stopCrawler()).message)} className="ml-3 mt-5 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-amber-400 dark:border-slate-800">
            <Square size={17} /> Stop
          </button>
          <button type="button" onClick={async () => setMessage((await deleteIndexedPages()).message)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
            <Trash2 size={17} /> Delete indexed pages
          </button>
          {message && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        </form>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">Crawl logs</h2>
          <div className="max-h-80 space-y-2 overflow-auto">
            {(data?.recent_crawl_logs || []).map((log, index) => (
              <div key={`${log.message}-${index}`} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{log.message}</div>
            ))}
            {!data?.recent_crawl_logs?.length && <p className="text-sm text-slate-500">No crawl logs yet.</p>}
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Failed URLs</h2>
        <div className="grid gap-2">
          {(data?.failed_urls || []).map((item) => <div key={item} className="truncate rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{item}</div>)}
          {!data?.failed_urls?.length && <p className="text-sm text-slate-500">No failed URLs reported.</p>}
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Users size={19} /> Registered users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
