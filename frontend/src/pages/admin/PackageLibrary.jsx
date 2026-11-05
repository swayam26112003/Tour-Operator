import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";

const formatPackage = (pkg) => {
  const seasonalPrices = pkg.seasonalPrices || [];
  const firstPrice = seasonalPrices[0];

  const durationMatch = pkg.duration?.match(/(\d+)\s*Days?/i);
  const days = durationMatch ? Number(durationMatch[1]) : 0;

  const destinationParts = (pkg.destination || "").split(",");
  const destinationRegion =
    destinationParts.length > 1
      ? destinationParts[destinationParts.length - 1].trim()
      : destinationParts[0].trim();

  const seasonLabels = {
    PEAK: "Peak season",
    MONSOON: "Monsoon",
    OFF_SEASON: "Off season",
  };

  const statusLabels = {
    PUBLISHED: "Published",
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
  };

  const price = firstPrice
    ? Number(firstPrice.pricePerPerson)
    : Number(pkg.price || 0);

  const hotelLabels = {
    STANDARD: "3 star",
    DELUXE: "4 star",
    PREMIUM: "5 star",
  };

  return {
    id: pkg.id,
    title: pkg.title,
    code: pkg.code || pkg.id,
    destination: destinationRegion,
    days,
    season: firstPrice
      ? seasonLabels[firstPrice.season] || firstPrice.season
      : "All year",
    hotel: firstPrice
      ? hotelLabels[firstPrice.hotelCategory] || firstPrice.hotelCategory
      : "Not specified",
    price,
    status: statusLabels[pkg.status] || pkg.status,
    scheduledAt: pkg.scheduledAt || null,
    updated: pkg.updatedAt
      ? new Date(pkg.updatedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
  };
};

const PackageLibrary = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [destinationFilter, setDestinationFilter] = useState("All");
  const [showDelete, setShowDelete] = useState(null);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPackages = async () => {
    try {
      setError("");

      const response = await api.get("/packages");

      const packageData = response.data?.data || [];

      setPackages(packageData.map(formatPackage));
    } catch (err) {
      console.error("Failed to fetch packages:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load packages. Please check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const query = search.toLowerCase();

      const matchesSearch =
        pkg.title.toLowerCase().includes(query) ||
        pkg.code.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || pkg.status === statusFilter;

      const matchesDestination =
        destinationFilter === "All" ||
        pkg.destination === destinationFilter;

      return matchesSearch && matchesStatus && matchesDestination;
    });
  }, [packages, search, statusFilter, destinationFilter]);

  const publishedCount = packages.filter(
    (pkg) => pkg.status === "Published"
  ).length;

  const draftCount = packages.filter(
    (pkg) => pkg.status === "Draft"
  ).length;

  const scheduledCount = packages.filter(
    (pkg) => pkg.status === "Scheduled"
  ).length;

  const deletePackage = async () => {
    if (!showDelete) return;

    try {
      setActionLoading(true);
      setError("");

      await api.delete(`/packages/${showDelete}`);

      setPackages((previous) =>
        previous.filter((pkg) => pkg.id !== showDelete)
      );

      setShowDelete(null);
    } catch (err) {
      console.error("Failed to delete package:", err);
      setError(
        err.response?.data?.message || "Failed to delete package."
      );
    } finally {
      setActionLoading(false);
    }
  };


  const duplicatePackage = async (pkg) => {
    try {
      setActionLoading(true);
      setError("");
      setActionMessage("");

      const response = await api.post(`/packages/${pkg.id}/duplicate`, {});
      const duplicated = response.data?.data;

      if (!duplicated?.id) {
        throw new Error("The duplicate was created but its ID was not returned.");
      }

      setActionMessage(`Created draft copy: ${duplicated.title || pkg.title}.`);
      await fetchPackages();
      navigate(`/admin/packages/${duplicated.id}/edit`);
    } catch (err) {
      console.error("Failed to duplicate package:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to duplicate package."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openPackagePreview = async (pkg) => {
    try {
      setPreviewLoading(true);
      setPreviewError("");
      setPreviewPackage({ id: pkg.id, title: pkg.title, loading: true });

      const response = await api.get(`/packages/${pkg.id}/preview`);
      const data = response.data?.data;
      if (!data) throw new Error("Package preview data was not returned.");
      setPreviewPackage(data);
    } catch (err) {
      console.error("Failed to load package preview:", err);
      setPreviewError(
        err.response?.data?.message || err.message || "Unable to load package preview."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleStatus = async (pkg) => {
    const newStatus =
      pkg.status === "Published" ? "DRAFT" : pkg.status === "Scheduled" ? "DRAFT" : "PUBLISHED";

    try {
      setActionLoading(true);
      setError("");

      await api.put(`/packages/${pkg.id}`, {
        status: newStatus,
        scheduledAt: null,
      });

      await fetchPackages();
    } catch (err) {
      console.error("Failed to update package status:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update package status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      {/* HEADER */}

      <header className="bg-white border-b border-[#e6e9e1] px-6 md:px-10 py-6">
        <div className="flex flex-wrap justify-between items-center gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#929b90]">
              Administration / Content
            </p>

            <h1 className="font-serif text-3xl text-[#174b38] mt-2">
              Package library
            </h1>

            <p className="text-xs text-[#849084] mt-2">
              Create, edit and manage your travel packages.
            </p>
          </div>

          <Link
            to="/admin/packages/new/edit"
            className="bg-[#174b38] text-white px-6 py-4 text-xs hover:bg-[#28634e] transition"
          >
            + Create new package
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}

      <main className="p-6 md:p-10 max-w-[1600px] mx-auto">
        {actionMessage && (
          <div className="mb-6 border border-[#d9e8dc] bg-[#edf5ed] px-5 py-4 text-sm text-[#174b38]">
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-9">
          <div className="bg-white border border-[#e8ebe3] p-6">
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
              Total packages
            </p>

            <h2 className="font-serif text-4xl text-[#174b38] mt-4">
              {loading ? "—" : packages.length}
            </h2>

            <p className="text-xs text-[#879187] mt-3">
              In your library
            </p>
          </div>

          <div className="bg-white border border-[#e8ebe3] p-6">
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
              Published
            </p>

            <h2 className="font-serif text-4xl text-[#174b38] mt-4">
              {loading ? "—" : publishedCount}
            </h2>

            <p className="text-xs text-[#879187] mt-3">
              Live on website
            </p>
          </div>

          <div className="bg-white border border-[#e8ebe3] p-6">
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
              Drafts
            </p>

            <h2 className="font-serif text-4xl text-[#a17e50] mt-4">
              {loading ? "—" : draftCount}
            </h2>

            <p className="text-xs text-[#879187] mt-3">
              Awaiting publication
            </p>
          </div>

          <div className="bg-white border border-[#e8ebe3] p-6">
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
              Scheduled
            </p>
            <h2 className="font-serif text-4xl text-[#987442] mt-4">
              {loading ? "—" : scheduledCount}
            </h2>
            <p className="text-xs text-[#879187] mt-3">
              Awaiting publication
            </p>
          </div>

          <div className="bg-white border border-[#e8ebe3] p-6">
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
              Destinations
            </p>

            <h2 className="font-serif text-4xl text-[#174b38] mt-4">
              {loading
                ? "—"
                : new Set(packages.map((p) => p.destination)).size}
            </h2>

            <p className="text-xs text-[#879187] mt-3">
              Across South India
            </p>
          </div>
        </div>

        {/* PACKAGE TABLE */}

        <div className="bg-white border border-[#e6e9e1]">
          <div className="p-6 border-b border-[#e6e9e1]">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  All packages
                </h2>

                <p className="text-xs text-[#879187] mt-2">
                  Manage your seasonal package catalogue.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search packages..."
                  className="border border-[#e1e5dc] px-4 py-3 text-xs outline-none focus:border-[#174b38]"
                />

                <select
                  value={destinationFilter}
                  onChange={(e) =>
                    setDestinationFilter(e.target.value)
                  }
                  className="border border-[#e1e5dc] px-4 py-3 text-xs outline-none bg-white"
                >
                  <option value="All">All destinations</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Karnataka">Karnataka</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-[#e1e5dc] px-4 py-3 text-xs outline-none bg-white"
                >
                  <option value="All">All statuses</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[950px]">
              <thead className="bg-[#f8f9f5]">
                <tr className="text-[10px] uppercase tracking-[1.5px] text-[#849084]">
                  <th className="px-6 py-5 font-medium">Package</th>
                  <th className="px-6 py-5 font-medium">Destination</th>
                  <th className="px-6 py-5 font-medium">Duration</th>
                  <th className="px-6 py-5 font-medium">Season</th>
                  <th className="px-6 py-5 font-medium">
                    Price / person
                  </th>
                  <th className="px-6 py-5 font-medium">Status</th>
                  <th className="px-6 py-5 font-medium">Updated</th>
                  <th className="px-6 py-5 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-20 text-sm text-[#879187]"
                    >
                      Loading packages...
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((pkg) => (
                    <tr
                      key={pkg.id}
                      className="border-t border-[#edf0e9] hover:bg-[#fafbf8] transition"
                    >
                      <td className="px-6 py-6">
                        <p className="text-sm text-[#244536] max-w-[250px]">
                          {pkg.title}
                        </p>

                        <p className="text-[10px] text-[#9aa398] mt-2">
                          {pkg.code}
                        </p>
                      </td>

                      <td className="px-6 py-6 text-xs text-[#66766a]">
                        {pkg.destination}
                      </td>

                      <td className="px-6 py-6 text-xs text-[#66766a]">
                        {pkg.days ? `${pkg.days} days` : "—"}
                      </td>

                      <td className="px-6 py-6 text-xs text-[#66766a]">
                        {pkg.season}
                      </td>

                      <td className="px-6 py-6 text-sm text-[#174b38]">
                        ₹{pkg.price.toLocaleString("en-IN")}
                        <p className="text-[10px] text-[#9aa398] mt-1">
                          {pkg.hotel}
                        </p>
                      </td>

                      <td className="px-6 py-6">
                        <span
                          className={`text-[10px] px-3 py-2 ${
                            pkg.status === "Published"
                              ? "bg-[#e7eee4] text-[#376448]"
                              : pkg.status === "Scheduled"
                                ? "bg-[#f5eddf] text-[#987442]"
                                : "bg-[#f1f2ed] text-[#66766a]"
                          }`}
                        >
                          {pkg.status}
                        </span>
                        {pkg.status === "Scheduled" && pkg.scheduledAt && (
                          <p className="mt-2 text-[10px] text-[#987442]">
                            {new Date(pkg.scheduledAt).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-6 text-xs text-[#849084]">
                        {pkg.updated}
                      </td>

                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <button
                            onClick={() => openPackagePreview(pkg)}
                            disabled={actionLoading || previewLoading}
                            className="text-xs text-[#66766a] hover:text-[#174b38] disabled:opacity-50"
                          >
                            Preview
                          </button>

                          <Link
                            to={`/admin/packages/${pkg.id}/edit`}
                            className="text-xs text-[#174b38] underline"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() => duplicatePackage(pkg)}
                            disabled={actionLoading}
                            className="text-xs text-[#8b7959] hover:text-[#174b38] disabled:opacity-50"
                          >
                            Duplicate
                          </button>

                          <button
                            onClick={() => toggleStatus(pkg)}
                            disabled={actionLoading}
                            className="text-xs text-[#8b7959] hover:text-[#174b38] disabled:opacity-50"
                          >
                            {pkg.status === "Published"
                              ? "Unpublish"
                              : pkg.status === "Scheduled"
                                ? "Cancel schedule"
                                : "Publish"}
                          </button>

                          <button
                            onClick={() => setShowDelete(pkg.id)}
                            disabled={actionLoading}
                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!loading && filteredPackages.length === 0 && (
              <div className="text-center py-20">
                <p className="font-serif text-2xl text-[#174b38]">
                  No packages found
                </p>

                <p className="text-xs text-[#879187] mt-3">
                  Try changing your search or filters.
                </p>

                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("All");
                    setDestinationFilter("All");
                  }}
                  className="text-xs text-[#174b38] underline mt-5"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="border-t border-[#e6e9e1] p-5 flex justify-between items-center text-xs text-[#879187]">
            <span>
              Showing {filteredPackages.length} of {packages.length} packages
            </span>

            <span>Package library</span>
          </div>
        </div>
      </main>

      {/* PACKAGE PREVIEW */}
      {previewPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-[#f8f9f5] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e6e9e1] bg-white px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">Package preview</p>
                <h2 className="mt-2 font-serif text-2xl text-[#174b38]">{previewPackage.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => { setPreviewPackage(null); setPreviewError(""); }}
                className="text-2xl text-[#879187]"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6 md:p-8">
              {previewLoading && (
                <p className="bg-white p-6 text-sm text-[#66766a]">Loading package preview...</p>
              )}
              {previewError && (
                <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{previewError}</p>
              )}
              {!previewLoading && !previewError && !previewPackage.loading && (
                <>
                  {previewPackage.image && (
                    <img src={previewPackage.image} alt={previewPackage.title} className="h-64 w-full object-cover" />
                  )}
                  <section className="border border-[#e6e9e1] bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">{previewPackage.destination || "Destination not specified"}</p>
                        <h3 className="mt-2 font-serif text-2xl text-[#174b38]">{previewPackage.title}</h3>
                        <p className="mt-2 text-sm text-[#66766a]">{previewPackage.duration || "Duration not specified"}</p>
                      </div>
                      <span className={`px-3 py-2 text-[10px] ${previewPackage.status === "PUBLISHED" ? "bg-[#e7eee4] text-[#376448]" : "bg-[#f5eddf] text-[#987442]"}`}>
                        {previewPackage.status || "DRAFT"}
                      </span>
                    </div>
                    {previewPackage.description && <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[#536c5c]">{previewPackage.description}</p>}
                  </section>

                  <section className="border border-[#e6e9e1] bg-white p-6">
                    <h3 className="font-serif text-xl text-[#174b38]">Day-wise itinerary</h3>
                    <div className="mt-5 space-y-4">
                      {(previewPackage.itinerary || []).map((day, index) => (
                        <div key={day.id || index} className="border-l-2 border-[#d7c39e] pl-4">
                          <p className="text-[10px] uppercase tracking-wider text-[#879187]">Day {day.dayNumber || index + 1}</p>
                          <p className="mt-1 text-sm text-[#244536]">{day.title}</p>
                          {day.location && <p className="mt-1 text-xs text-[#879187]">{day.location}</p>}
                          {day.description && <p className="mt-2 text-sm leading-6 text-[#66766a]">{day.description}</p>}
                        </div>
                      ))}
                      {(previewPackage.itinerary || []).length === 0 && <p className="text-sm text-[#879187]">No itinerary has been added.</p>}
                    </div>
                  </section>

                  <section className="border border-[#e6e9e1] bg-white p-6">
                    <h3 className="font-serif text-xl text-[#174b38]">Stays</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(previewPackage.hotels || []).map((hotel, index) => (
                        <div key={hotel.id || index} className="bg-[#f7f8f4] p-4">
                          <p className="text-sm text-[#244536]">{hotel.name || "Hotel not specified"}</p>
                          <p className="mt-1 text-xs text-[#879187]">{[hotel.location, hotel.roomType].filter(Boolean).join(" · ")}</p>
                          {hotel.description && <p className="mt-2 text-xs leading-5 text-[#66766a]">{hotel.description}</p>}
                        </div>
                      ))}
                      {(previewPackage.hotels || []).length === 0 && <p className="text-sm text-[#879187]">No stays have been added.</p>}
                    </div>
                  </section>

                  <section className="border border-[#e6e9e1] bg-white p-6">
                    <h3 className="font-serif text-xl text-[#174b38]">Seasonal pricing from database</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="text-[10px] uppercase tracking-wider text-[#879187]">
                          <tr><th className="py-2 pr-4">Season</th><th className="py-2 pr-4">Hotel</th><th className="py-2 pr-4">Per person</th><th className="py-2 pr-4">Twin sharing</th><th className="py-2">GST</th></tr>
                        </thead>
                        <tbody>
                          {(previewPackage.seasonalPrices || []).map((price, index) => (
                            <tr key={price.id || index} className="border-t border-[#edf0e9]">
                              <td className="py-3 pr-4">{String(price.season || "").replaceAll("_", " ")}</td>
                              <td className="py-3 pr-4">{price.hotelCategory}</td>
                              <td className="py-3 pr-4">₹{Number(price.pricePerPerson || 0).toLocaleString("en-IN")}</td>
                              <td className="py-3 pr-4">₹{Number(price.priceTwinSharing || 0).toLocaleString("en-IN")}</td>
                              <td className="py-3">{Number(price.gstPercentage || 0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(previewPackage.seasonalPrices || []).length === 0 && <p className="py-3 text-sm text-[#879187]">No seasonal prices have been added.</p>}
                    </div>
                  </section>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={() => setPreviewPackage(null)} className="border border-[#dfe3d9] px-5 py-3 text-xs text-[#174b38]">Close preview</button>
                    <Link to={`/admin/packages/${previewPackage.id}/edit`} onClick={() => setPreviewPackage(null)} className="bg-[#174b38] px-5 py-3 text-xs text-white">Edit package</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
          <div className="bg-white p-8 max-w-md w-full shadow-xl">
            <h3 className="font-serif text-2xl text-[#174b38]">
              Delete this package?
            </h3>

            <p className="text-sm text-[#778277] mt-4 leading-7">
              This will permanently remove the package from your database.
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowDelete(null)}
                disabled={actionLoading}
                className="border border-[#dfe3d9] px-5 py-3 text-xs"
              >
                Cancel
              </button>

              <button
                onClick={deletePackage}
                disabled={actionLoading}
                className="bg-red-700 text-white px-5 py-3 text-xs disabled:opacity-50"
              >
                {actionLoading ? "Please wait..." : "Delete package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageLibrary;