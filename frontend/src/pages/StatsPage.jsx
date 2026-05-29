import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { stats as loadStats } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";

export default function StatsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    loadStats().then(setData).catch(() => setData(null));
    const id = window.setInterval(() => loadStats().then(setData).catch(() => null), 5000);
    return () => window.clearInterval(id);
  }, []);
  const chartData = useMemo(() => (data?.trending_searches || []).map((name, index) => ({ name, searches: 8 - index })), [data]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Real-time Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Crawled URLs" value={data?.total_crawled_pages ?? "-"} />
        <StatCard label="Active Workers" value={data?.active_workers ?? "-"} tone="green" />
        <StatCard label="Queue Size" value={data?.queue_size ?? "-"} tone="amber" />
        <StatCard label="Indexed Pages" value={data?.total_crawled_pages ?? "-"} />
        <StatCard label="Search Requests" value={data?.searches_last_24h ?? "-"} />
        <StatCard label="Kafka Status" value={data?.kafka_status ?? "-"} tone={data?.kafka_status === "online" ? "green" : data?.kafka_status === "reconnecting" ? "amber" : "red"} />
        <StatCard label="Redis Cache Hits" value={data?.redis_cache_hits ?? "-"} tone="green" />
        <StatCard label="Elasticsearch" value={data?.elasticsearch_health ?? "-"} />
      </div>
      {data?.kafka_details && (
        <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white/75 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:grid-cols-4">
          {["broker", "topics", "producer", "consumer"].map((key) => (
            <div key={key} className="rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
              <span className="capitalize text-slate-500">{key}</span>
              <strong className="block capitalize">{data.kafka_details[key]}</strong>
            </div>
          ))}
        </section>
      )}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Trending searches</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="searches" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
