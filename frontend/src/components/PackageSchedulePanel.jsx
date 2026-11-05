import { useEffect, useState } from "react";
import api from "../services/api";

const toLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const defaultScheduleTime = () =>
  toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000));

const minimumScheduleTime = () =>
  toLocalDateTime(new Date(Date.now() + 60 * 1000));

const PackageSchedulePanel = ({
  packageId,
  currentStatus,
  scheduledAt,
  onStatusChange,
}) => {
  const [status, setStatus] = useState(currentStatus || "DRAFT");
  const [dateTime, setDateTime] = useState(
    toLocalDateTime(scheduledAt) || defaultScheduleTime(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStatus(currentStatus || "DRAFT");
    setDateTime(toLocalDateTime(scheduledAt) || defaultScheduleTime());
  }, [currentStatus, scheduledAt]);

  const handleSchedule = async () => {
    setError("");
    setMessage("");

    if (!dateTime) {
      setError("Choose a publication date and time.");
      return;
    }

    const selectedDate = new Date(dateTime);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
      setError("Choose a date and time in the future.");
      return;
    }

    try {
      setSaving(true);
      const response = await api.patch(`/packages/${packageId}/schedule`, {
        scheduledAt: selectedDate.toISOString(),
      });
      const data = response.data?.data;
      setStatus("SCHEDULED");
      setMessage(response.data?.message || "Package publication scheduled.");
      onStatusChange?.("Scheduled", data?.scheduledAt || selectedDate.toISOString());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to schedule this package.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setError("");
    setMessage("");
    try {
      setSaving(true);
      const response = await api.patch(`/packages/${packageId}/cancel-schedule`, {});
      setStatus("DRAFT");
      setDateTime(defaultScheduleTime());
      setMessage(response.data?.message || "Scheduled publication cancelled.");
      onStatusChange?.("Draft", null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to cancel the scheduled publication.",
      );
    } finally {
      setSaving(false);
    }
  };

  const isPublished = status === "PUBLISHED";
  const isScheduled = status === "SCHEDULED";

  return (
    <section className="mt-8 border border-[#e6e9e1] bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
            Publishing
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#174b38]">
            Scheduled publishing
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-[#879187]">
            Schedule a draft package to become public automatically. The publishing
            worker checks for due packages every 30 seconds while the backend is running.
          </p>
        </div>
        <span
          className={`px-3 py-2 text-[10px] uppercase tracking-wider ${
            isScheduled
              ? "bg-[#f5eddf] text-[#987442]"
              : isPublished
                ? "bg-[#e7eee4] text-[#376448]"
                : "bg-[#f1f2ed] text-[#66766a]"
          }`}
        >
          {isScheduled ? "Scheduled" : isPublished ? "Published" : "Draft"}
        </span>
      </div>

      {isPublished ? (
        <div className="mt-6 border border-[#e9dfca] bg-[#fbf8f0] p-5 text-sm leading-6 text-[#78633e]">
          This package is currently live. To prepare a future publication without
          removing or changing this listing, duplicate it as a draft first and
          schedule the copy. The copy will publish as a separate listing; this
          workflow does not automatically archive or replace the original.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-3 block text-[10px] uppercase tracking-[1.5px] text-[#788579]">
              Publication date and time · your local timezone
            </label>
            <input
              type="datetime-local"
              min={minimumScheduleTime()}
              value={dateTime}
              onChange={(event) => setDateTime(event.target.value)}
              className="w-full border border-[#e3e7de] bg-white px-4 py-3 text-sm outline-none focus:border-[#174b38]"
              disabled={saving}
            />
            <p className="mt-2 text-[10px] text-[#879187]">
              The package remains a draft and is not visible publicly until the scheduled time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSchedule}
              disabled={saving}
              className="bg-[#174b38] px-6 py-3 text-xs text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : isScheduled ? "Reschedule update" : "Schedule publication"}
            </button>
            {isScheduled && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="border border-[#dfe3d9] px-5 py-3 text-xs text-[#66766a] disabled:opacity-50"
              >
                Cancel schedule
              </button>
            )}
          </div>
        </div>
      )}

      {isScheduled && scheduledAt && (
        <p className="mt-5 border border-[#e9dfca] bg-[#fbf8f0] px-4 py-3 text-xs text-[#78633e]">
          Scheduled for {new Date(scheduledAt).toLocaleString()}.
        </p>
      )}
      {message && (
        <p className="mt-5 border border-[#d8e7db] bg-[#edf5ed] px-4 py-3 text-xs text-[#376448]">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
};

export default PackageSchedulePanel;
