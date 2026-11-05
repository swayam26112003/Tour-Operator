import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import MediaAssetPicker from "../../components/MediaAssetPicker";
import RichTextEditor from "../../components/RichTextEditor";
import DOMPurify from "dompurify";

const initialArticle = {
  title: "",
  slug: "",
  category: "Travel Guide",
  excerpt: "",
  coverImage: "",
  author: "Company A Editorial Team",
  readTime: "6 min read",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
  content: "<p></p>",
  relatedPackageIds: [],
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Existing articles were stored as plain text / markdown-like blocks.
// Convert that legacy content into editor HTML without changing its wording.
const legacyContentToHtml = (content = "") => {
  const value = String(content || "").trim();
  if (!value) return "<p></p>";
  if (/<\/?(p|h[1-6]|ul|ol|li|blockquote|img|br|strong|em|a)\b/i.test(value)) {
    return value;
  }

  return value
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const firstLine = (lines.shift() || "").trim();
      const headingMatch = firstLine.match(/^##\s+(.+)$/);
      const bodyLines = headingMatch ? lines : [firstLine, ...lines];
      const body = bodyLines.map((line) => escapeHtml(line.trim())).filter(Boolean).join("<br>");
      return `${headingMatch ? `<h2>${escapeHtml(headingMatch[1])}</h2>` : ""}${body ? `<p>${body}</p>` : ""}`;
    })
    .filter(Boolean)
    .join("") || "<p></p>";
};

const EditJournal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id && id !== "new");

  const [article, setArticle] = useState(initialArticle);
  const [activeTab, setActiveTab] = useState("content");
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [publishedPackages, setPublishedPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArticle = async () => {
      if (!isEditing) {
        setArticle({ ...initialArticle, relatedPackageIds: [] });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/journal/${id}`);
        const data = response.data?.data;

        if (!data) throw new Error("Article was not found.");

        if (active) {
          setArticle({
            ...initialArticle,
            ...data,
            status: data.status || "DRAFT",
            content: legacyContentToHtml(data.content),
            relatedPackageIds: (data.relatedPackages || []).map((item) => item.id),
          });
        }
      } catch (err) {
        console.error("Unable to load journal article:", err);
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load this article.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadArticle();
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  useEffect(() => {
    let active = true;
    const loadPublishedPackages = async () => {
      try {
        setPackagesLoading(true);
        setPackagesError("");
        const response = await api.get("/packages", { params: { status: "PUBLISHED" } });
        if (active) setPublishedPackages(response.data?.data || []);
      } catch (err) {
        if (active) {
          setPackagesError(
            err.response?.data?.message || "Unable to load published packages."
          );
        }
      } finally {
        if (active) setPackagesLoading(false);
      }
    };
    loadPublishedPackages();
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => {
    setArticle((prev) => ({ ...prev, [field]: value }));
    setSavedMessage("");
    setError("");
  };

  const buildPayload = () => {
    const title = article.title.trim();
    const slug = article.slug.trim() || slugify(title);

    if (!title) throw new Error("Please enter an article title.");
    if (!slug) throw new Error("Please enter a valid URL slug.");

    return {
      title,
      slug,
      excerpt: article.excerpt.trim(),
      content: DOMPurify.sanitize(article.content || "", { USE_PROFILES: { html: true } }),
      relatedPackageIds: [...new Set(article.relatedPackageIds || [])],
      coverImage: article.coverImage.trim() || null,
      category: article.category.trim(),
      author: article.author.trim(),
      seoTitle: article.seoTitle.trim(),
      seoDescription: article.seoDescription.trim(),
    };
  };

  const saveArticle = async (publish = false) => {
    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const payload = buildPayload();
      let response;

      if (isEditing) {
        response = await api.put(`/journal/${id}`, payload);
      } else {
        response = await api.post("/journal", payload);
      }

      let savedArticle = response.data?.data;
      const savedId = savedArticle?.id || id;

      if (!savedId) {
        throw new Error("The server saved the article but did not return its ID.");
      }

      if (publish) {
        const publishResponse = await api.patch(`/journal/${savedId}/publish`);
        savedArticle = publishResponse.data?.data || savedArticle;
      }

      if (savedArticle) {
        setArticle((prev) => ({
          ...prev,
          ...savedArticle,
          status: savedArticle.status || (publish ? "PUBLISHED" : "DRAFT"),
          content: savedArticle.content ?? payload.content,
          relatedPackageIds: (savedArticle.relatedPackages || []).length
            ? savedArticle.relatedPackages.map((item) => item.id)
            : payload.relatedPackageIds,
        }));
      }

      setSavedMessage(
        publish
          ? "Article published successfully."
          : "Draft saved successfully.",
      );

      if (!isEditing && savedId) {
        navigate(`/admin/journal/${savedId}/edit`, { replace: true });
      }
    } catch (err) {
      console.error("Unable to save journal article:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save this article.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#e4e7df] bg-white px-4 py-3 text-sm text-[#263b30] outline-none transition focus:border-[#174b38]";
  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-wider text-[#68766c]";
  const isPublished = article.status === "PUBLISHED";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f8f4] text-sm text-[#68766c]">
        Loading article...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin/journal"
              className="mb-3 inline-flex items-center gap-2 text-sm text-[#68766c] hover:text-[#174b38]"
            >
              ← Back to journal
            </Link>
            <h1 className="font-serif text-3xl text-[#174b38]">
              {isEditing ? "Edit article" : "Create article"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Write, edit and manage your travel stories.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg border border-[#dce3da] bg-white px-4 py-2.5 text-sm text-[#174b38]"
            >
              {showPreview ? "Close preview" : "Preview"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveArticle(false)}
              className="rounded-lg border border-[#174b38] px-4 py-2.5 text-sm text-[#174b38] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveArticle(true)}
              className="rounded-lg bg-[#174b38] px-4 py-2.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : isPublished ? "Save & publish changes" : "Publish article"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-[#e8c9c2] bg-[#fbefec] px-4 py-3 text-sm text-[#994c40]">
            {error}
          </div>
        )}

        {savedMessage && (
          <div className="mb-5 rounded-lg border border-[#d9e8dc] bg-[#edf5ed] px-4 py-3 text-sm text-[#174b38]">
            {savedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-7">
              <div className="mb-6 flex gap-6 border-b border-[#edf0ea]">
                <button
                  type="button"
                  onClick={() => setActiveTab("content")}
                  className={`border-b-2 pb-3 text-sm font-medium ${
                    activeTab === "content"
                      ? "border-[#174b38] text-[#174b38]"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  Article content
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("seo")}
                  className={`border-b-2 pb-3 text-sm font-medium ${
                    activeTab === "seo"
                      ? "border-[#174b38] text-[#174b38]"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  SEO settings
                </button>
              </div>

              {activeTab === "content" ? (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>Article title</label>
                    <input
                      className={inputClass}
                      value={article.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setArticle((prev) => ({
                          ...prev,
                          title,
                          slug: prev.slug || slugify(title),
                        }));
                        setSavedMessage("");
                      }}
                      placeholder="Enter article title"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>URL slug</label>
                    <input
                      className={inputClass}
                      value={article.slug}
                      onChange={(e) => updateField("slug", slugify(e.target.value))}
                      placeholder="article-url-slug"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Short description</label>
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={article.excerpt}
                      onChange={(e) => updateField("excerpt", e.target.value)}
                      placeholder="Write a short introduction..."
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Category</label>
                      <select
                        className={inputClass}
                        value={article.category}
                        onChange={(e) => updateField("category", e.target.value)}
                      >
                        <option>Travel Guide</option>
                        <option>Culture</option>
                        <option>Food & Cuisine</option>
                        <option>Experiences</option>
                        <option>Destinations</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Author</label>
                      <input
                        className={inputClass}
                        value={article.author}
                        onChange={(e) => updateField("author", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Cover image</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        className={inputClass}
                        value={article.coverImage || ""}
                        onChange={(e) => updateField("coverImage", e.target.value)}
                        placeholder="Paste an image URL or choose from the media library"
                      />
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="shrink-0 rounded-lg bg-[#174b38] px-5 py-3 text-sm text-white"
                      >
                        Choose from library
                      </button>
                    </div>
                    {article.coverImage && (
                      <div className="mt-3">
                        <img
                          src={article.coverImage}
                          alt="Article cover preview"
                          className="h-52 w-full rounded-lg object-cover"
                        />
                        <button type="button" onClick={() => updateField("coverImage", "")} className="mt-2 text-xs text-red-600 underline">Remove cover image</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Reading time</label>
                    <input
                      className={inputClass}
                      value={article.readTime}
                      onChange={(e) => updateField("readTime", e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Display-only field; it is not stored by the current article API.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>SEO title</label>
                    <input
                      className={inputClass}
                      value={article.seoTitle || ""}
                      onChange={(e) => updateField("seoTitle", e.target.value)}
                      placeholder="Search engine title"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {(article.seoTitle || "").length} characters
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Meta description</label>
                    <textarea
                      rows={4}
                      className={inputClass}
                      value={article.seoDescription || ""}
                      onChange={(e) => updateField("seoDescription", e.target.value)}
                      placeholder="Describe this article for search engines"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {(article.seoDescription || "").length} characters
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f7f8f4] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Search result preview
                    </p>
                    <p className="text-lg text-blue-800">
                      {article.seoTitle || article.title}
                    </p>
                    <p className="text-xs text-green-800">
                      companya.com/journal/{article.slug}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {article.seoDescription || article.excerpt}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {activeTab === "content" && (
              <div className="rounded-xl border border-[#e8ebe4] bg-white p-5 md:p-7">
                <div className="mb-5">
                  <h2 className="font-serif text-xl text-[#174b38]">Article body</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Format the story and insert images from your Media Library.
                  </p>
                </div>
                <RichTextEditor
                  value={article.content || ""}
                  onChange={(content) => updateField("content", content)}
                  placeholder="Write the full travel story here..."
                />
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
              <h3 className="mb-4 font-serif text-lg text-[#174b38]">
                Publishing
              </h3>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={article.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">Current status</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    isPublished
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-400">
                Use Save draft or Publish article above to persist the status.
              </p>
            </div>

            <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
              <h3 className="mb-2 font-serif text-lg text-[#174b38]">
                Related packages
              </h3>
              <p className="mb-4 text-xs leading-5 text-gray-400">
                Select published journeys to recommend at the end of this story.
              </p>
              {packagesError && (
                <p className="mb-3 rounded bg-red-50 p-3 text-xs text-red-700">{packagesError}</p>
              )}
              {packagesLoading ? (
                <p className="text-xs text-gray-400">Loading published packages...</p>
              ) : publishedPackages.length === 0 ? (
                <p className="text-xs text-gray-400">No published packages are available yet.</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {publishedPackages.map((item) => {
                    const selected = (article.relatedPackageIds || []).includes(item.id);
                    return (
                      <label key={item.id} className="flex cursor-pointer items-start gap-3 border-b border-[#f0f1ed] py-2.5 last:border-0">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            const current = article.relatedPackageIds || [];
                            const next = event.target.checked
                              ? [...current, item.id]
                              : current.filter((packageId) => packageId !== item.id);
                            updateField("relatedPackageIds", next);
                          }}
                          className="mt-1 accent-[#174b38]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm text-[#244536]">{item.title}</span>
                          <span className="mt-1 block text-[10px] text-gray-400">{item.destination || item.slug}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-[10px] text-[#879187]">
                {(article.relatedPackageIds || []).length} package(s) selected
              </p>
            </div>

            <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
              <h3 className="mb-3 font-serif text-lg text-[#174b38]">
                Article checklist
              </h3>
              {[
                ["Title added", !!article.title.trim()],
                ["URL slug added", !!article.slug.trim()],
                ["Description added", !!article.excerpt.trim()],
                ["Cover image added", !!(article.coverImage || "").trim()],
                ["Article body added", !!(article.content || "").replace(/<[^>]*>/g, " ").trim()],
                ["Related package selected", (article.relatedPackageIds || []).length > 0],
                ["SEO title added", !!(article.seoTitle || "").trim()],
              ].map(([label, complete]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 border-b border-[#f0f1ed] py-2.5 text-sm last:border-0"
                >
                  <span className={complete ? "text-green-600" : "text-gray-300"}>
                    {complete ? "✓" : "○"}
                  </span>
                  <span className={complete ? "text-gray-700" : "text-gray-400"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#174b38] p-5 text-white">
              <p className="text-xs uppercase tracking-widest text-white/60">
                Public URL
              </p>
              <p className="mt-2 break-all text-sm">
                /journal/{article.slug || "your-article"}
              </p>
            </div>
          </aside>
        </div>

        {showPreview && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
            <div className="mx-auto my-8 max-w-3xl rounded-xl bg-white p-6 md:p-10">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#a17e50]">
                  Article preview
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-gray-500"
                >
                  Close ✕
                </button>
              </div>
              {article.coverImage && (
                <img
                  src={article.coverImage}
                  alt=""
                  className="mb-7 h-64 w-full rounded-lg object-cover"
                />
              )}
              <p className="text-xs uppercase tracking-widest text-[#a17e50]">
                {article.category}
              </p>
              <h1 className="mt-3 font-serif text-3xl text-[#174b38] md:text-5xl">
                {article.title}
              </h1>
              <p className="mt-4 text-gray-500">{article.excerpt}</p>
              <p className="mt-4 text-xs text-gray-400">
                By {article.author} · {article.readTime}
              </p>
              <div
                className="journal-rich-content mt-8"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(article.content || "", { USE_PROFILES: { html: true } }),
                }}
              />
              {(article.relatedPackageIds || []).length > 0 && (
                <div className="mt-10 border-t border-[#e8ebe4] pt-6">
                  <p className="text-xs uppercase tracking-wider text-[#a17e50]">Related journeys</p>
                  <p className="mt-2 text-sm text-[#536c5c]">
                    {publishedPackages.filter((item) => article.relatedPackageIds.includes(item.id)).map((item) => item.title).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {mediaPickerOpen && (
          <MediaAssetPicker
            title="Choose article cover image"
            onClose={() => setMediaPickerOpen(false)}
            onSelect={(asset) => updateField("coverImage", asset.url)}
          />
        )}
      </div>
    </div>
  );
};

export default EditJournal;
