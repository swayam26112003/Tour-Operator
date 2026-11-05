import { useEffect, useState } from "react";
import api from "../services/api";

const MediaAssetPicker = ({ title = "Choose an image", onSelect, onClose }) => {
  const [assets, setAssets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/media", {
          params: { page, limit: 12, ...(search ? { search } : {}) },
        });
        if (!active) return;
        setAssets(response.data?.data || []);
        setTotalPages(response.data?.pagination?.totalPages || 1);
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load images from the media library."
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAssets();
    return () => { active = false; };
  }, [page, search]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-[#e6e9e1] bg-[#f7f8f4] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#e6e9e1] bg-white px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">Media library</p>
            <h2 className="mt-1 font-serif text-2xl text-[#174b38]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-[#879187]" aria-label="Close media picker">×</button>
        </header>

        <div className="border-b border-[#e6e9e1] bg-white p-5">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search image name or category..."
              className="min-w-0 flex-1 border border-[#e1e5dc] px-4 py-3 text-sm outline-none focus:border-[#174b38]"
            />
            <button type="submit" className="bg-[#174b38] px-6 py-3 text-xs text-white">Search library</button>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="py-12 text-center text-sm text-[#879187]">Loading media assets...</p>
          ) : error ? (
            <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : assets.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-serif text-xl text-[#174b38]">No images found</p>
              <p className="mt-2 text-sm text-[#879187]">Add an image in the Media Library, then return here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <article key={asset.id} className="overflow-hidden border border-[#e3e7de] bg-white">
                  <div className="aspect-[16/10] bg-[#eef1eb]">
                    <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm text-[#244536]" title={asset.name}>{asset.name}</h3>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-[#879187]">{asset.category || "GENERAL"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { onSelect(asset); onClose(); }}
                        className="shrink-0 bg-[#174b38] px-3 py-2 text-xs text-white"
                      >
                        Select
                      </button>
                    </div>
                    {asset.altText && <p className="mt-2 line-clamp-2 text-xs text-[#718075]">{asset.altText}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[#e6e9e1] bg-white px-5 py-4">
          <p className="text-xs text-[#879187]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="border border-[#dfe3d9] px-4 py-2 text-xs text-[#174b38] disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="border border-[#dfe3d9] px-4 py-2 text-xs text-[#174b38] disabled:opacity-40">Next</button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default MediaAssetPicker;
