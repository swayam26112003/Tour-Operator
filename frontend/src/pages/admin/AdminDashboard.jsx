import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

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

const statusLabel = (status) => {
  const labels = {
    NEW: "New",
    CONTACTED: "Contacted",
    QUOTED: "Quoted",
    CONFIRMED: "Confirmed",
    CLOSED: "Closed",
    LOST: "Lost",
    CANCELLED: "Cancelled",
  };
  return labels[status] || String(status || "New").replaceAll("_", " ");
};

const statusStyles = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  QUOTED: "bg-purple-50 text-purple-700",
  CONFIRMED: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  LOST: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const unwrap = (response) => {
  const data = response?.data?.data ?? response?.data;
  return Array.isArray(data) ? data : [];
};

const getPackageName = (enquiry) =>
  enquiry.package?.title ||
  enquiry.packageTitle ||
  enquiry.package?.name ||
  "General enquiry";

const AdminDashboard = () => {
  const [period, setPeriod] = useState("7 days");
  const [enquiries, setEnquiries] = useState([]);
  const [packages, setPackages] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      const requests = await Promise.allSettled([
        api.get("/enquiries"),
        api.get("/packages"),
        api.get("/quotes"),
        api.get("/activity-logs"),
      ]);

      if (!active) return;

      const failures = [];
      const read = (index, label) => {
        const result = requests[index];
        if (result.status === "rejected") {
          failures.push(`${label}: ${result.reason?.response?.data?.message || result.reason?.message || "Request failed"}`);
          return [];
        }
        return unwrap(result.value);
      };

      setEnquiries(read(0, "Enquiries"));
      setPackages(read(1, "Packages"));
      setQuotes(read(2, "Quotes"));
      setActivity(read(3, "Activity log"));
      setErrors(failures);
      setLoading(false);
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const publishedPackages = packages.filter(
    (item) => item.status === "PUBLISHED",
  );
  const draftPackages = packages.filter((item) => item.status === "DRAFT");
  const acceptedQuotes = quotes.filter((item) => item.status === "ACCEPTED");
  const sentQuotes = quotes.filter((item) => item.status === "SENT");
  const conversionRate = quotes.length
    ? ((acceptedQuotes.length / quotes.length) * 100).toFixed(1)
    : "0.0";

  const stats = [
    {
      label: "Total enquiries",
      value: enquiries.length.toLocaleString("en-IN"),
      note: `${enquiries.filter((item) => item.status === "NEW").length} new enquiries`,
      icon: "✉",
    },
    {
      label: "Published packages",
      value: publishedPackages.length.toLocaleString("en-IN"),
      note: `${draftPackages.length} drafts`,
      icon: "◈",
    },
    {
      label: "Accepted quotes",
      value: acceptedQuotes.length.toLocaleString("en-IN"),
      note: `${sentQuotes.length} awaiting response`,
      icon: "✓",
    },
    {
      label: "Quote acceptance rate",
      value: `${conversionRate}%`,
      note: "Accepted quotes / all quotes",
      icon: "↗",
    },
  ];

  const recentEnquiries = useMemo(
    () =>
      [...enquiries]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [enquiries],
  );

  const popularPackages = useMemo(() => {
    const counts = new Map();
    enquiries.forEach((enquiry) => {
      if (!enquiry.packageId) return;
      const key = enquiry.packageId;
      const current = counts.get(key) || {
        id: key,
        name: getPackageName(enquiry),
        enquiries: 0,
      };
      current.enquiries += 1;
      counts.set(key, current);
    });

    const sorted = [...counts.values()]
      .sort((a, b) => b.enquiries - a.enquiries)
      .slice(0, 4);
    const maximum = Math.max(1, ...sorted.map((item) => item.enquiries));

    return sorted.map((item) => ({
      ...item,
      percentage: Math.max(6, Math.round((item.enquiries / maximum) * 100)),
    }));
  }, [enquiries]);

  const chartData = useMemo(() => {
    const now = new Date();
    const days = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
    const bucketCount = 7;
    const bucketSize = Math.ceil(days / bucketCount);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const startOffset = (bucketCount - 1 - index) * bucketSize;
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - startOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + bucketSize);
      return {
        start,
        end,
        month:
          period === "7 days"
            ? start.toLocaleDateString("en-IN", { weekday: "short" })
            : start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        value: 0,
      };
    });

    enquiries.forEach((enquiry) => {
      const created = new Date(enquiry.createdAt);
      if (Number.isNaN(created.getTime())) return;
      const age = Math.floor((now.getTime() - created.getTime()) / 86400000);
      if (age < 0 || age >= days) return;
      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.floor((days - 1 - age) / bucketSize),
      );
      if (buckets[bucketIndex]) buckets[bucketIndex].value += 1;
    });

    const max = Math.max(1, ...buckets.map((item) => item.value));
    return buckets.map((item) => ({
      ...item,
      height: Math.max(3, Math.round((item.value / max) * 100)),
    }));
  }, [enquiries, period]);

  const recentActivity = useMemo(
    () =>
      [...activity]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [activity],
  );

  const activityDescription = (item) =>
    item.description ||
    item.action?.replaceAll("_", " ") ||
    item.actionType?.replaceAll("_", " ") ||
    "Activity recorded";

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-7 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#a17e50]">
              Overview
            </p>
            <h1 className="font-serif text-3xl text-[#174b38]">
              Good morning, Admin
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Here's what's happening with your business today.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/packages/new/edit"
              className="rounded-lg border border-[#174b38] px-4 py-2.5 text-sm text-[#174b38]"
            >
              + New package
            </Link>
            <Link
              to="/admin/enquiries"
              className="rounded-lg bg-[#174b38] px-4 py-2.5 text-sm text-white"
            >
              View enquiries →
            </Link>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mb-5 rounded-lg border border-[#ead8bd] bg-[#fff8eb] px-4 py-3 text-sm text-[#87622e]">
            Some dashboard data could not be loaded: {errors.join(" · ")}.
            Available sections are still shown where possible.
          </div>
        )}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#e8ebe4] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4ed] text-lg text-[#174b38]">
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#174b38]">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-2 text-xs text-gray-400">{stat.note}</p>
            </div>
          ))}
        </div>

        <div className="mb-7 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-6">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">
                  Enquiry overview
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Enquiries received during the selected period
                </p>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-[#e4e7df] bg-white px-3 py-2 text-sm text-gray-600 outline-none"
              >
                <option>7 days</option>
                <option>30 days</option>
                <option>90 days</option>
              </select>
            </div>

            <div className="flex h-56 items-end justify-between gap-3 border-b border-l border-[#edf0ea] px-3 pb-0 pt-4">
              {chartData.map((item, index) => (
                <div
                  key={`${item.month}-${index}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[#174b38] transition-all"
                      style={{ height: `${item.height}%` }}
                      title={`${item.value} enquiries`}
                    />
                  </div>
                  <span className="pb-2 text-[11px] text-gray-400">
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
            {!loading && enquiries.length === 0 && (
              <p className="mt-3 text-xs text-gray-400">
                No enquiry records are available yet.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-6">
            <h2 className="font-serif text-xl text-[#174b38]">
              Popular packages
            </h2>
            <p className="mb-7 mt-1 text-xs text-gray-400">
              Packages generating the most enquiries
            </p>

            {popularPackages.length ? (
              <div className="space-y-6">
                {popularPackages.map((item, index) => (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-[#34483b]">
                        <span className="mr-2 text-xs text-gray-400">
                          0{index + 1}
                        </span>
                        {item.name}
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-[#174b38]">
                        {item.enquiries}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#edf0ea]">
                      <div
                        className="h-full rounded-full bg-[#174b38]"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No package-linked enquiries available yet.
              </p>
            )}

            <Link
              to="/admin/packages"
              className="mt-7 inline-block text-sm font-medium text-[#174b38] hover:underline"
            >
              Manage packages →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
            <div>
              <h2 className="font-serif text-xl text-[#174b38]">
                Recent enquiries
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Latest customer enquiries received
              </p>
            </div>
            <Link
              to="/admin/enquiries"
              className="text-sm font-medium text-[#174b38] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8f9f6] text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Package</th>
                  <th className="px-5 py-4 font-medium">Received</th>
                  <th className="px-5 py-4 font-medium">Travel date</th>
                  <th className="px-5 py-4 font-medium">Travellers</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-sm text-gray-400">
                      Loading recent enquiries...
                    </td>
                  </tr>
                ) : recentEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-sm text-gray-400">
                      No enquiries received yet.
                    </td>
                  </tr>
                ) : (
                  recentEnquiries.map((enquiry) => (
                    <tr
                      key={enquiry.id}
                      className="border-t border-[#edf0ea] text-sm"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#174b38]">
                          {enquiry.name || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {enquiry.email || ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {getPackageName(enquiry)}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {formatDate(enquiry.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {formatDate(enquiry.travelDate)}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {enquiry.travellers || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs ${
                            statusStyles[enquiry.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabel(enquiry.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <section>
            <h2 className="mb-4 font-serif text-xl text-[#174b38]">
              Quick actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Manage packages",
                  description: "Create and update travel packages",
                  link: "/admin/packages",
                  icon: "◈",
                },
                {
                  title: "Enquiry inbox",
                  description: "Respond to customer enquiries",
                  link: "/admin/enquiries",
                  icon: "✉",
                },
                {
                  title: "Journal editor",
                  description: "Write and publish travel stories",
                  link: "/admin/journal/edit",
                  icon: "▤",
                },
                {
                  title: "Quote builder",
                  description: "Prepare and manage quotations",
                  link: "/admin/quotes",
                  icon: "₹",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  to={item.link}
                  className="rounded-xl border border-[#e8ebe4] bg-white p-5 transition hover:-translate-y-1 hover:shadow-sm"
                >
                  <span className="text-2xl text-[#a17e50]">{item.icon}</span>
                  <h3 className="mt-4 font-medium text-[#174b38]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#e8ebe4] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">
                  Recent activity
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Latest recorded workspace actions
                </p>
              </div>
              <Link
                to="/admin/activity"
                className="text-sm font-medium text-[#174b38] hover:underline"
              >
                View more →
              </Link>
            </div>
            {recentActivity.length ? (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-[#edf0ea] pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm capitalize text-[#34483b]">
                      {activityDescription(item)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {item.user?.name || "System"} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {loading ? "Loading activity..." : "No activity records available."}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
