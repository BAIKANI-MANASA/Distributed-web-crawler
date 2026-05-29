import { useEffect, useState } from "react";
import { Camera, Save, User } from "lucide-react";
import { profileSummary, updateProfile, uploadAvatar } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";
import StatCard from "../components/StatCard.jsx";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ name: user?.name || "", profile_picture: user?.profile_picture || "", bio: user?.bio || "", location: user?.location || "" });
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    profileSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const updated = await updateProfile(form);
    setUser(updated);
    setMessage("Profile updated");
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      setForm((current) => ({ ...current, profile_picture: updated.profile_picture || "" }));
      setMessage("Profile image updated");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <User className="text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">{user?.role === "ADMIN" ? "Admin Profile" : "User Profile"}</h1>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Role" value={user?.role || "-"} />
        <StatCard label="Saved searches" value={summary?.saved_searches ?? "-"} />
        <StatCard label="Favorites" value={summary?.favorites ?? "-"} tone="green" />
        <StatCard label={user?.role === "ADMIN" ? "Active workers" : "Indexed pages"} value={user?.role === "ADMIN" ? (summary?.active_workers ?? "-") : (summary?.total_crawled_pages ?? "-")} tone="amber" />
      </div>
      {user?.role === "ADMIN" && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StatCard label="Total crawled pages" value={summary?.total_crawled_pages ?? "-"} />
          <StatCard label="Elasticsearch status" value={summary?.elasticsearch_status ?? "-"} tone="green" />
        </div>
      )}
      <form onSubmit={submit} className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {form.profile_picture ? <img src={form.profile_picture} alt="" className="h-full w-full object-cover" /> : <User size={30} className="text-slate-400" />}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-blue-400 dark:border-slate-800">
            <Camera size={17} /> {uploading ? "Uploading..." : "Upload image"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>
        <label className="mb-2 block text-sm font-medium">Name</label>
        <input className="mb-4 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="mb-2 block text-sm font-medium">Profile picture URL</label>
        <input className="mb-4 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" value={form.profile_picture} onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} />
        <label className="mb-2 block text-sm font-medium">Location</label>
        <input className="mb-4 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <label className="mb-2 block text-sm font-medium">Bio</label>
        <textarea rows="4" className="mb-4 w-full rounded-md border border-slate-200 bg-transparent px-3 py-3 outline-none focus:border-blue-500 dark:border-slate-800" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><Save size={17} /> Save profile</button>
        {message && <span className="ml-3 text-sm text-green-600">{message}</span>}
      </form>
    </main>
  );
}
