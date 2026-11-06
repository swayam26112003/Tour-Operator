import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const unwrapRows = (response) => {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.packages)) return payload.packages;
  return [];
};

const normalStatus = (value) => String(value || "").toUpperCase();

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) => {
  const value = normalStatus(status);
  if (value === "PUBLISHED") return "bg-emerald-50 text-emerald-700";
  if (value === "SCHEDULED") return "bg-blue-50 text-blue-700";
  if (value === "ARCHIVED") return "bg-gray-100 text-gray-600";
  return "bg-amber-50 text-amber-700";
};

const ActionCard = ({ icon, title, description, to, action }) => (
  <Link
    to={to}
    className="group rounded-xl border border-[#e8ebe4] bg-white p-5 transition hover:-translate-y-1 hover:shadow-sm"
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f0f4ed] text-xl text-[#174b38]">
      {icon}
    </div>
    <h3 className="mt-4 font-serif text-xl text-[#174b38]">{title}</h3>
    <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">{description}</p>
    <p className="mt-5 text-sm font-medium text-[#174b38] group-hover:underline">
      {action} →
    </p>
  </Link>
);

const EditorDashboard = () => {
  const [packages, setPackages] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);

  const loadWorkspace = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setErrors([]);

    const results = await Promise.allSettled([
      api.get("/packages"),
      api.get("/journal"),
    ]);

    const nextErrors = [];
    const read = (index, label) => {
      const result = results[index];
      if (result.status === "rejected") {
        nextErrors.push(
          `${label}: ${result.reason?.response?.data?.message || result.reason?.message || "Request failed"}`
        );
        return [];
      }
      return unwrapRows(result.value);
    };

    setPackages(read(0, "Packages"));
    setArticles(read(1, "Journal"));
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const counts = useMemo(() => {
    const packageStatuses = packages.map((item) => normalStatus(item.status));
    const articleStatuses = articles.map((item) => normalStatus(item.status));
    return {
      totalPackages: packages.length,
      publishedPackages: packageStatuses.filter((status) => status === "PUBLISHED").length,
      draftPackages: packageStatuses.filter((status) => status === "DRAFT").length,
      scheduledPackages: packageStatuses.filter((status) => status === "SCHEDULED").length,
      totalArticles: articles.length,
      publishedArticles: articleStatuses.filter((status) => status === "PUBLISHED").length,
      draftArticles: articleStatuses.filter((status) => status === "DRAFT").length,
    };
  }, [packages, articles]);

  const recentPackages = useMemo(
    () =>
      [...packages]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 5),
    [packages]
  );

  const recentArticles = useMemo(
    () =>
      [...articles]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 5),
    [articles]
  );

  const stats = [
    { label: "Total packages", value: counts.totalPackages, note: "In the package library", icon: "◇" },
    { label: "Published packages", value: counts.publishedPackages, note: "Visible to travellers", icon: "✓" },
    { label: "Package drafts", value: counts.draftPackages, note: `${counts.scheduledPackages} scheduled`, icon: "▤" },
    { label: "Journal stories", value: counts.totalArticles, note: `${counts.publishedArticles} published · ${counts.draftArticles} drafts`, icon: "✎" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-7 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#a17e50]">
              Team workspace · Editor
            </p>
            <h1 className="font-serif text-3xl text-[#174b38]">Content studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Manage travel packages, publishing schedules, seasonal details and journal stories.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadWorkspace(true)}
            disabled={refreshing}
            className="rounded-lg border border-[#174b38] px-4 py-3 text-sm text-[#174b38] transition hover:bg-[#edf2eb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh data"}
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-5 rounded-lg border border-[#ead8bd] bg-[#fff8eb] px-4 py-3 text-sm text-[#87622e]">
            Some content data could not be loaded: {errors.join(" · ")}. Other available data is still shown.
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#e8ebe4] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4ed] text-lg text-[#174b38]">
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#174b38]">
                {loading ? "—" : stat.value.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs text-gray-400">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="font-serif text-2xl text-[#174b38]">Your content tools</h2>
          <p className="mt-1 text-sm text-gray-500">Open a workspace to create, edit or review content.</p>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            icon="◇"
            title="Package library"
            description="Create, edit, duplicate and preview journeys, including itineraries, hotels and seasonal prices."
            to="/admin/packages"
            action="Open packages"
          />
          <ActionCard
            icon="▤"
            title="Journal editor"
            description="Write travel stories, manage article content, connect related packages and publish updates."
            to="/admin/journal/edit"
            action="Open journal editor"
          />
          <ActionCard
            icon="◈"
            title="Media library"
            description="Browse saved media records and select images for package and journal content."
            to="/admin/media"
            action="Browse media"
          />
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">Recently updated packages</h2>
                <p className="mt-1 text-xs text-gray-400">Latest package content changes</p>
              </div>
              <Link to="/admin/packages" className="text-sm font-medium text-[#174b38] hover:underline">View library →</Link>
            </div>
            <div className="divide-y divide-[#edf0ea]">
              {loading ? (
                <p className="px-5 py-7 text-center text-sm text-gray-400">Loading packages…</p>
              ) : recentPackages.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">No packages are available yet.</p>
                  <Link to="/admin/packages" className="mt-3 inline-block text-sm font-medium text-[#174b38] hover:underline">Create your first package →</Link>
                </div>
              ) : recentPackages.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#294337]">{item.title || item.name || "Untitled package"}</p>
                    <p className="mt-1 text-xs text-gray-400">Updated {formatDate(item.updatedAt || item.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] ${statusClass(item.status)}`}>{String(item.status || "DRAFT").replaceAll("_", " ")}</span>
                    <Link to={`/admin/packages/${item.id}/edit`} className="text-sm text-[#174b38] hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">Journal stories</h2>
                <p className="mt-1 text-xs text-gray-400">Recent articles in the editorial workspace</p>
              </div>
              <Link to="/admin/journal/edit" className="text-sm font-medium text-[#174b38] hover:underline">Open editor →</Link>
            </div>
            <div className="divide-y divide-[#edf0ea]">
              {loading ? (
                <p className="px-5 py-7 text-center text-sm text-gray-400">Loading journal…</p>
              ) : recentArticles.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">No journal stories are available yet.</p>
                  <Link to="/admin/journal/edit" className="mt-3 inline-block text-sm font-medium text-[#174b38] hover:underline">Write your first story →</Link>
                </div>
              ) : recentArticles.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#294337]">{item.title || "Untitled story"}</p>
                    <p className="mt-1 text-xs text-gray-400">Updated {formatDate(item.updatedAt || item.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] ${statusClass(item.status)}`}>{String(item.status || "DRAFT").replaceAll("_", " ")}</span>
                    <Link to={`/admin/journal/${item.id}/edit`} className="text-sm text-[#174b38] hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-6">
          <h2 className="font-serif text-xl text-[#174b38]">Before publishing</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Check package travel dates, itinerary details, inclusions, exclusions and seasonal prices. Preview public pages after editing to confirm that content is accurate and ready for travellers.
          </p>
          <Link to="/journeys" className="mt-4 inline-block text-sm font-medium text-[#174b38] hover:underline">View public journeys →</Link>
        </div>
      </div>
    </div>
  );
};

export default EditorDashboard;
