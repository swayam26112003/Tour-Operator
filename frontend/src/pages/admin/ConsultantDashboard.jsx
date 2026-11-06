import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const unwrapRows = (response) => {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

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

const statusLabel = (status) =>
  String(status || "NEW").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusClass = (status) => {
  const value = String(status || "NEW").toUpperCase();
  if (value === "CONFIRMED" || value === "ACCEPTED") return "bg-emerald-50 text-emerald-700";
  if (value === "QUOTED" || value === "SENT") return "bg-purple-50 text-purple-700";
  if (value === "CONTACTED") return "bg-amber-50 text-amber-700";
  if (value === "LOST" || value === "CANCELLED") return "bg-red-50 text-red-700";
  if (value === "CLOSED") return "bg-gray-100 text-gray-600";
  return "bg-blue-50 text-blue-700";
};

const getPackageName = (enquiry) =>
  enquiry.package?.title || enquiry.packageTitle || enquiry.package?.name || "General enquiry";

const getAssignedName = (enquiry) =>
  enquiry.assignedTo?.name || enquiry.assignee?.name || (enquiry.assignedToId ? "Assigned" : "Unassigned");

const StatCard = ({ label, value, note, icon }) => (
  <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-500">{label}</p>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4ed] text-lg text-[#174b38]">{icon}</span>
    </div>
    <p className="mt-4 text-3xl font-semibold text-[#174b38]">{value}</p>
    <p className="mt-2 text-xs text-gray-400">{note}</p>
  </div>
);

const ConsultantDashboard = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);

  const loadWorkspace = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setErrors([]);

    const results = await Promise.allSettled([
      api.get("/enquiries"),
      api.get("/quotes"),
      api.get("/packages", { params: { status: "PUBLISHED" } }),
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

    setEnquiries(read(0, "Enquiries"));
    setQuotes(read(1, "Quotes"));
    setPackages(read(2, "Published packages"));
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const recentEnquiries = useMemo(
    () =>
      [...enquiries]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6),
    [enquiries]
  );

  const unassignedEnquiries = useMemo(
    () => enquiries.filter((item) => !item.assignedToId && !item.assignedTo?.id),
    [enquiries]
  );

  const newEnquiries = enquiries.filter((item) => item.status === "NEW").length;
  const activeEnquiries = enquiries.filter((item) => ["CONTACTED", "QUOTED"].includes(item.status)).length;
  const sentQuotes = quotes.filter((item) => item.status === "SENT").length;
  const acceptedQuotes = quotes.filter((item) => item.status === "ACCEPTED").length;

  const stats = [
    { label: "Total enquiries", value: enquiries.length, note: "Customer requests received", icon: "✉" },
    { label: "New enquiries", value: newEnquiries, note: "Waiting for follow-up", icon: "◷" },
    { label: "In progress", value: activeEnquiries, note: "Contacted or quoted", icon: "↗" },
    { label: "Quotes sent", value: sentQuotes, note: `${acceptedQuotes} accepted`, icon: "₹" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-7 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#a17e50]">
              Team workspace · Consultant
            </p>
            <h1 className="font-serif text-3xl text-[#174b38]">Customer desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review customer travel requests, follow up on enquiries and prepare personalised quotations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadWorkspace(true)}
              disabled={refreshing}
              className="rounded-lg border border-[#174b38] px-4 py-3 text-sm text-[#174b38] transition hover:bg-[#edf2eb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh data"}
            </button>
            <Link to="/admin/enquiries" className="rounded-lg bg-[#174b38] px-5 py-3 text-sm text-white transition hover:bg-[#123e30]">
              Open enquiry inbox →
            </Link>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mb-5 rounded-lg border border-[#ead8bd] bg-[#fff8eb] px-4 py-3 text-sm text-[#87622e]">
            Some workspace data could not be loaded: {errors.join(" · ")}. Other available data is still shown.
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={loading ? "—" : stat.value.toLocaleString("en-IN")}
              note={stat.note}
              icon={stat.icon}
            />
          ))}
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <Link to="/admin/enquiries" className="group rounded-xl border border-[#e8ebe4] bg-white p-5 transition hover:-translate-y-1 hover:shadow-sm">
            <span className="text-2xl text-[#a17e50]">✉</span>
            <h2 className="mt-4 font-serif text-xl text-[#174b38]">Enquiry inbox</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">Review customer requests, update statuses, assign owners and record follow-up notes.</p>
            <p className="mt-5 text-sm font-medium text-[#174b38] group-hover:underline">Manage enquiries →</p>
          </Link>
          <Link to="/admin/quotes" className="group rounded-xl border border-[#e8ebe4] bg-white p-5 transition hover:-translate-y-1 hover:shadow-sm">
            <span className="text-2xl text-[#a17e50]">₹</span>
            <h2 className="mt-4 font-serif text-xl text-[#174b38]">Quote builder</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">Prepare branded quotations, share PDFs and track quote progress.</p>
            <p className="mt-5 text-sm font-medium text-[#174b38] group-hover:underline">Create a quote →</p>
          </Link>
          <Link to="/journeys" className="group rounded-xl border border-[#e8ebe4] bg-white p-5 transition hover:-translate-y-1 hover:shadow-sm">
            <span className="text-2xl text-[#a17e50]">◇</span>
            <h2 className="mt-4 font-serif text-xl text-[#174b38]">Published journeys</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">Browse live itineraries and package information when advising customers.</p>
            <p className="mt-5 text-sm font-medium text-[#174b38] group-hover:underline">Browse journeys →</p>
          </Link>
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">Recent enquiries</h2>
                <p className="mt-1 text-xs text-gray-400">Latest customer requests across the enquiry inbox</p>
              </div>
              <Link to="/admin/enquiries" className="text-sm font-medium text-[#174b38] hover:underline">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#f8f9f6] text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Package</th>
                    <th className="px-5 py-4 font-medium">Received</th>
                    <th className="px-5 py-4 font-medium">Assigned to</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-400">Loading enquiries…</td></tr>
                  ) : recentEnquiries.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-400">No enquiries received yet.</td></tr>
                  ) : recentEnquiries.map((item) => (
                    <tr key={item.id} className="border-t border-[#edf0ea] text-sm">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#174b38]">{item.name || "—"}</p>
                        <p className="mt-1 text-xs text-gray-400">{item.email || ""}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{getPackageName(item)}</td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="px-5 py-4 text-gray-500">{getAssignedName(item)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-xs ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">Follow-up queue</h2>
                <p className="mt-1 text-xs text-gray-400">Enquiries without an assigned consultant</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{loading ? "—" : unassignedEnquiries.length}</span>
            </div>
            {loading ? (
              <p className="mt-6 text-sm text-gray-400">Loading follow-up queue…</p>
            ) : unassignedEnquiries.length === 0 ? (
              <p className="mt-6 text-sm leading-6 text-gray-500">All currently returned enquiries have an assigned owner.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {unassignedEnquiries.slice(0, 4).map((item) => (
                  <div key={item.id} className="border-b border-[#edf0ea] pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-[#294337]">{item.name || "Unnamed customer"}</p>
                    <p className="mt-1 text-xs text-gray-400">{getPackageName(item)} · {formatDate(item.createdAt)}</p>
                    <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/admin/enquiries" className="mt-5 inline-block text-sm font-medium text-[#174b38] hover:underline">Open assignment inbox →</Link>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
            <div>
              <h2 className="font-serif text-xl text-[#174b38]">Published packages to recommend</h2>
              <p className="mt-1 text-xs text-gray-400">Published package records available through the package API</p>
            </div>
            <Link to="/journeys" className="text-sm font-medium text-[#174b38] hover:underline">Open public journeys →</Link>
          </div>
          {loading ? (
            <p className="px-5 py-7 text-center text-sm text-gray-400">Loading packages…</p>
          ) : packages.length === 0 ? (
            <p className="px-5 py-7 text-center text-sm text-gray-400">No published packages were returned.</p>
          ) : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {packages.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-[#edf0ea] p-4">
                  <p className="font-medium text-[#174b38]">{item.title || item.name || "Travel package"}</p>
                  <p className="mt-1 text-xs text-gray-400">{item.destination || item.location || "Destination details available in package"}</p>
                  <Link to={`/package/${item.id}`} className="mt-3 inline-block text-sm font-medium text-[#174b38] hover:underline">View package →</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-gray-400">
          This workspace currently uses shared enquiry and quote records. Consultant-specific filtering requires a signed-in consultant identity and backend authorization; records are not isolated by this dashboard alone.
        </p>
      </div>
    </div>
  );
};

export default ConsultantDashboard;
