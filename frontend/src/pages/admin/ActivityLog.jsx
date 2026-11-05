import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const actionLabels = {
  ENQUIRY_CREATED: "Enquiry created",
  STATUS_CHANGED: "Status changed",
  PRIORITY_CHANGED: "Priority changed",
  CONSULTANT_ASSIGNED: "Consultant assigned",
  NOTE_ADDED: "Note added",
  MESSAGE_RECORDED: "Message recorded",
  PACKAGE_CREATED: "Package created",
  PACKAGE_UPDATED: "Package updated",
  PACKAGE_DELETED: "Package deleted",
};

const formatAction = (action = "") =>
  actionLabels[action] ||
  action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Activity recorded";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDetailsText = (details) => {
  if (details == null || details === "") return "No additional details";
  if (typeof details === "string") return details;
  if (typeof details === "object") {
    return Object.entries(details)
      .map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .replace(/^./, (letter) => letter.toUpperCase());
        const readableValue =
          value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "—");
        return `${label}: ${readableValue}`;
      })
      .join(" · ");
  }
  return String(details);
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = filter === "ALL" ? {} : { entityType: filter };
      const response = await api.get("/activity-logs", { params });
      setLogs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't load the activity log. Check that the backend is running and try again."
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) => {
      const searchable = [
        log.action,
        formatAction(log.action),
        log.entityType,
        log.entityId,
        getDetailsText(log.details),
        log.user?.name,
        log.user?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [logs, search]);

  const enquiryCount = logs.filter((log) => log.entityType?.toUpperCase() === "ENQUIRY").length;
  const packageCount = logs.filter((log) => log.entityType?.toUpperCase() === "PACKAGE").length;

  return (
    <div className="min-h-screen bg-[#f7f7f3] px-5 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[3px] text-[#9a8969]">
              Workspace / Settings
            </p>
            <h1 className="font-serif text-3xl text-[#173f32] md:text-4xl">Activity log</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777b72]">
              A record of the latest changes and actions across your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 border border-[#d9ddd4] bg-white px-5 py-3 text-xs font-medium uppercase tracking-[1.5px] text-[#315a46] transition hover:border-[#315a46] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">↻</span> Refresh
          </button>
        </div>

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-[#e7e7df] bg-white p-5">
            <p className="text-[10px] uppercase tracking-[2px] text-[#8a8d83]">Latest records</p>
            <p className="mt-3 font-serif text-3xl text-[#173f32]">{logs.length}</p>
            <p className="mt-1 text-xs text-[#92958c]">Maximum 100 records returned</p>
          </div>
          <div className="border border-[#e7e7df] bg-white p-5">
            <p className="text-[10px] uppercase tracking-[2px] text-[#8a8d83]">Enquiry activity</p>
            <p className="mt-3 font-serif text-3xl text-[#173f32]">{enquiryCount}</p>
            <p className="mt-1 text-xs text-[#92958c]">Records related to enquiries</p>
          </div>
          <div className="border border-[#e7e7df] bg-white p-5">
            <p className="text-[10px] uppercase tracking-[2px] text-[#8a8d83]">Package activity</p>
            <p className="mt-3 font-serif text-3xl text-[#173f32]">{packageCount}</p>
            <p className="mt-1 text-xs text-[#92958c]">Records related to packages</p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 border border-[#e7e7df] bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All activity", value: "ALL" },
              { label: "Enquiries", value: "ENQUIRY" },
              { label: "Packages", value: "PACKAGE" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2.5 text-xs transition ${
                  filter === item.value
                    ? "bg-[#174b38] text-white"
                    : "bg-[#f4f5f0] text-[#626b60] hover:bg-[#e9eee7]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#92958c]">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity..."
              className="w-full border border-[#e3e5de] bg-[#fbfbf8] py-2.5 pl-9 pr-3 text-sm text-[#35463b] outline-none transition focus:border-[#78917f]"
            />
          </div>
        </div>

        <div className="border border-[#e7e7df] bg-white">
          <div className="flex items-center justify-between border-b border-[#ecece6] px-5 py-4 md:px-6">
            <div>
              <h2 className="font-serif text-xl text-[#234536]">Recent activity</h2>
              <p className="mt-1 text-xs text-[#92958c]">Newest actions appear first</p>
            </div>
            <span className="text-xs text-[#92958c]">{filteredLogs.length} shown</span>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#dce5dc] border-t-[#315a46]" />
              <p className="text-sm text-[#777b72]">Loading activity...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-[#9b5145]">{error}</p>
              <button onClick={fetchLogs} className="mt-4 text-xs font-medium uppercase tracking-wider text-[#315a46] underline underline-offset-4">
                Try again
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mb-3 text-3xl text-[#b5b9ae]">◷</div>
              <p className="font-serif text-xl text-[#365443]">No activity found</p>
              <p className="mt-2 text-sm text-[#92958c]">
                {search ? "Try a different search term." : "New workspace activity will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#efefe9]">
              {filteredLogs.map((log) => {
                const entityType = log.entityType?.toUpperCase() || "OTHER";
                const entityPath =
                  entityType === "ENQUIRY" && log.entityId
                    ? `/admin/enquiries`
                    : entityType === "PACKAGE" && log.entityId
                      ? `/admin/packages/${log.entityId}/edit`
                      : null;
                return (
                  <div key={log.id} className="flex gap-4 px-5 py-5 transition hover:bg-[#fcfcf9] md:px-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf2eb] text-lg text-[#315a46]">
                      {entityType === "ENQUIRY" ? "✉" : entityType === "PACKAGE" ? "◇" : "•"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#304a3b]">{formatAction(log.action)}</p>
                          <p className="mt-1 break-words text-sm leading-6 text-[#777b72]">{getDetailsText(log.details)}</p>
                        </div>
                        <time className="shrink-0 text-[11px] text-[#92958c]">{formatDate(log.createdAt)}</time>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#8a8d83]">
                        <span className="bg-[#f1f3ee] px-2.5 py-1 uppercase tracking-wider">{entityType}</span>
                        {log.entityId && <span>ID: {log.entityId}</span>}
                        <span>By: {log.user?.name || "System / unavailable"}</span>
                        {log.user?.email && <span>{log.user.email}</span>}
                        {entityPath && (
                          <Link to={entityPath} className="font-medium text-[#315a46] underline underline-offset-2 hover:text-[#173f32]">
                            View {entityType.toLowerCase()}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[#9a9c93]">
          Activity records are read from the backend. The API currently returns the latest 100 records.
        </p>
      </div>
    </div>
  );
};

export default ActivityLog;
