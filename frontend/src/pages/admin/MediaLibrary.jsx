import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const PAGE_SIZE = 24;
const DEFAULT_CATEGORIES = ["PACKAGE", "JOURNAL", "GENERAL"];

const emptyForm = {
  name: "",
  url: "",
  altText: "",
  category: "GENERAL",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const MediaLibrary = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    let active = true;

    const loadAssets = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/media", {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(searchTerm ? { search: searchTerm } : {}),
            ...(categoryFilter ? { category: categoryFilter } : {}),
          },
        });

        if (!active) return;
        setAssets(response.data?.data || []);
        setPagination(response.data?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: response.data?.count || 0,
          totalPages: 1,
        });
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load media assets."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAssets();
    return () => {
      active = false;
    };
  }, [page, searchTerm, categoryFilter]);

  useEffect(() => {
    let active = true;
    api.get("/media/categories")
      .then((response) => {
        if (!active) return;
        const received = response.data?.data || [];
        setCategories([...new Set([...DEFAULT_CATEGORIES, ...received])]);
      })
      .catch(() => {
        // The built-in categories remain available if category loading fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const asset of assets) {
      const key = asset.category || "Uncategorised";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [assets]);

  const openCreateModal = () => {
    setEditingAsset(null);
    setForm(emptyForm);
    setNotice("");
    setModalOpen(true);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name || "",
      url: asset.url || "",
      altText: asset.altText || "",
      category: asset.category || "GENERAL",
    });
    setNotice("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingAsset(null);
    setForm(emptyForm);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleCategoryChange = (event) => {
    setPage(1);
    setCategoryFilter(event.target.value);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      altText: form.altText.trim(),
      category: form.category.trim(),
    };

    if (!payload.name || !payload.url) {
      setNotice("Asset name and image URL are required.");
      return;
    }

    try {
      setSaving(true);
      if (editingAsset) {
        await api.put(`/media/${editingAsset.id}`, payload);
        setNotice("Media asset updated successfully.");
      } else {
        await api.post("/media", payload);
        setNotice("Media asset added successfully.");
        setPage(1);
        setSearchInput("");
        setSearchTerm("");
        setCategoryFilter("");
      }

      setModalOpen(false);
      setEditingAsset(null);
      setForm(emptyForm);
      // Refresh using the current filter state after the modal closes.
      const response = await api.get("/media", {
        params: {
          page: editingAsset ? page : 1,
          limit: PAGE_SIZE,
          ...(editingAsset && searchTerm ? { search: searchTerm } : {}),
          ...(editingAsset && categoryFilter ? { category: categoryFilter } : {}),
        },
      });
      setAssets(response.data?.data || []);
      setPagination(response.data?.pagination || pagination);
    } catch (requestError) {
      setNotice(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to save the media asset."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset) => {
    const confirmed = window.confirm(`Delete “${asset.name}” from the media library?`);
    if (!confirmed) return;

    try {
      setError("");
      setNotice("");
      await api.delete(`/media/${asset.id}`);
      setNotice("Media asset deleted successfully.");
      const response = await api.get("/media", {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
        },
      });
      setAssets(response.data?.data || []);
      setPagination(response.data?.pagination || pagination);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to delete the media asset."
      );
    }
  };

  const copyUrl = async (asset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setError("Your browser could not copy this URL. Select and copy it from Edit.");
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <header className="bg-white border-b border-[#e6e9e1] px-6 md:px-10 py-6">
        <div className="flex flex-wrap justify-between items-center gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#929b90]">
              Administration / Content
            </p>
            <h1 className="font-serif text-3xl text-[#174b38] mt-2">Media library</h1>
            <p className="text-xs text-[#849084] mt-2">
              Keep package and journal images organised in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="bg-[#174b38] text-white px-6 py-3.5 text-xs tracking-wide hover:bg-[#123e30] transition"
          >
            + Add image URL
          </button>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-[1600px] mx-auto">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#e6e9e1] p-5">
            <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">Total assets</p>
            <p className="font-serif text-3xl text-[#174b38] mt-3">{pagination.total || 0}</p>
          </div>
          <div className="bg-white border border-[#e6e9e1] p-5">
            <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">On this page</p>
            <p className="font-serif text-3xl text-[#174b38] mt-3">{assets.length}</p>
          </div>
          <div className="bg-white border border-[#e6e9e1] p-5">
            <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">Categories represented</p>
            <p className="font-serif text-3xl text-[#174b38] mt-3">{Object.keys(categoryCounts).length}</p>
          </div>
        </section>

        <section className="bg-white border border-[#e6e9e1]">
          <div className="p-5 md:p-6 border-b border-[#e6e9e1]">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">All media</h2>
                <p className="text-xs text-[#879187] mt-2">Search by asset name, URL or alternative text.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <form onSubmit={handleSearch} className="flex w-full sm:w-[330px]">
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search media assets..."
                    className="min-w-0 flex-1 border border-[#e1e5dc] px-4 py-3 text-xs outline-none focus:border-[#174b38]"
                  />
                  <button type="submit" className="bg-[#174b38] text-white px-5 text-xs">Search</button>
                </form>
                <select
                  value={categoryFilter}
                  onChange={handleCategoryChange}
                  className="border border-[#e1e5dc] bg-white px-4 py-3 text-xs outline-none focus:border-[#174b38]"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option value={category} key={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(error || notice) && (
            <div className={`mx-5 md:mx-6 mt-5 p-3 text-xs ${error ? "bg-red-50 text-red-700" : "bg-[#edf3eb] text-[#376448]"}`}>
              {error || notice}
            </div>
          )}

          <div className="p-5 md:p-6">
            {loading ? (
              <div className="py-20 text-center text-sm text-[#879187]">Loading media library...</div>
            ) : error && assets.length === 0 ? (
              <div className="py-20 text-center text-sm text-red-600">{error}</div>
            ) : assets.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#dfe5db]">
                <div className="text-3xl text-[#9aa99b]">▧</div>
                <h3 className="font-serif text-2xl text-[#174b38] mt-4">No media assets found</h3>
                <p className="text-xs text-[#879187] mt-2">Add an image URL or adjust your search and category filters.</p>
                <button onClick={openCreateModal} className="mt-6 bg-[#174b38] text-white px-5 py-3 text-xs">Add first image</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {assets.map((asset) => (
                  <article key={asset.id} className="border border-[#e6e9e1] bg-white group">
                    <div className="relative h-48 bg-[#f1f3ed] overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-[#a3ad9f] text-xs">Image preview unavailable</div>
                      <img
                        src={asset.url}
                        alt={asset.altText || asset.name}
                        loading="lazy"
                        className="relative w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                      <span className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 text-[9px] uppercase tracking-[1px] text-[#536c5c]">
                        {asset.category || "Uncategorised"}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm text-[#244536] truncate" title={asset.name}>{asset.name}</h3>
                          <p className="text-[10px] text-[#929b90] mt-1">Added {formatDate(asset.createdAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyUrl(asset)}
                          className="shrink-0 text-[10px] text-[#174b38] underline"
                        >
                          {copiedId === asset.id ? "Copied" : "Copy URL"}
                        </button>
                      </div>
                      {asset.altText && <p className="text-xs text-[#718075] mt-3 line-clamp-2">{asset.altText}</p>}
                      <p className="text-[10px] text-[#a0a99f] mt-3 truncate" title={asset.url}>{asset.url}</p>
                      <div className="flex justify-between items-center border-t border-[#edf0e9] mt-4 pt-3">
                        <button type="button" onClick={() => openEditModal(asset)} className="text-xs text-[#174b38] underline">Edit details</button>
                        <button type="button" onClick={() => handleDelete(asset)} className="text-xs text-[#a15f4e] hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 md:px-6 py-5 border-t border-[#e6e9e1] text-xs text-[#879187]">
            <p>Showing {assets.length} of {pagination.total || 0} assets · Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="border border-[#dfe3d9] px-4 py-2 disabled:opacity-40"
              >Previous</button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="border border-[#dfe3d9] px-4 py-2 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        </section>

        <p className="text-[10px] text-[#929b90] mt-4">
          This version stores image URLs and metadata in PostgreSQL. Uploading image files to persistent cloud storage is not enabled yet.
        </p>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-[#f8f9f5] w-full max-w-[560px] h-full overflow-y-auto shadow-2xl">
            <div className="bg-white p-6 border-b border-[#e6e9e1] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">Media library</p>
                <h2 className="font-serif text-2xl text-[#174b38] mt-2">{editingAsset ? "Edit media asset" : "Add image URL"}</h2>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} className="text-2xl text-[#879187]">×</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {notice && <p className="bg-red-50 text-red-700 p-3 text-xs">{notice}</p>}
              <div>
                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mb-2">Asset name</label>
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full border border-[#e1e5dc] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                  placeholder="e.g. Munnar tea gardens"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mb-2">Image URL</label>
                <input
                  required
                  type="url"
                  maxLength={2048}
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  className="w-full border border-[#e1e5dc] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-[10px] text-[#929b90] mt-2">Use a publicly accessible HTTPS or HTTP image URL.</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mb-2">Alternative text</label>
                <input
                  maxLength={250}
                  value={form.altText}
                  onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
                  className="w-full border border-[#e1e5dc] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mb-2">Category</label>
                <input
                  list="media-category-options"
                  maxLength={60}
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full border border-[#e1e5dc] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                  placeholder="PACKAGE, JOURNAL or GENERAL"
                />
                <datalist id="media-category-options">
                  {categories.map((category) => <option key={category} value={category} />)}
                </datalist>
              </div>

              {form.url && (
                <div className="border border-[#e6e9e1] bg-white p-3">
                  <p className="text-[10px] uppercase tracking-[1px] text-[#879187] mb-3">Preview</p>
                  <img src={form.url} alt={form.altText || form.name || "Media preview"} className="w-full max-h-56 object-contain bg-[#f1f3ed]" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 border border-[#dfe3d9] py-3 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#174b38] text-white py-3 text-xs disabled:opacity-60">
                  {saving ? "Saving..." : editingAsset ? "Save changes" : "Add to library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
