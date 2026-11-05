import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import DOMPurify from "dompurify";

const JOURNAL_ARTICLE_STYLES = `
.journal-rich-content { color: #66766a; font-size: 1rem; line-height: 2; overflow-wrap: anywhere; }
.journal-rich-content > * + * { margin-top: 1.35rem; }
.journal-rich-content p { margin: 0 0 1.25rem; }
.journal-rich-content h2 { margin: 2.4rem 0 0.85rem; color: #174b38; font-family: Georgia, serif; font-size: clamp(1.7rem, 3vw, 2.3rem); line-height: 1.25; }
.journal-rich-content h3 { margin: 1.8rem 0 0.65rem; color: #174b38; font-family: Georgia, serif; font-size: 1.55rem; line-height: 1.35; }
.journal-rich-content ul, .journal-rich-content ol { margin: 1.2rem 0 1.5rem; padding-left: 1.6rem; }
.journal-rich-content ul { list-style: disc; }
.journal-rich-content ol { list-style: decimal; }
.journal-rich-content li { margin: 0.4rem 0; padding-left: 0.2rem; }
.journal-rich-content blockquote { margin: 2rem 0; border-left: 3px solid #a17e50; padding: 0.7rem 1.25rem; background: #f0eee5; color: #536c5c; font-family: Georgia, serif; font-size: 1.15rem; }
.journal-rich-content a { color: #174b38; text-decoration: underline; text-underline-offset: 3px; }
.journal-rich-content img { display: block; max-width: 100%; max-height: 680px; margin: 2.2rem auto; object-fit: contain; }
.journal-rich-content hr { margin: 2rem 0; border-color: #e1e4da; }
`;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85";

const SafeImage = ({ src, alt, className = "", ...props }) => {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt || ""}
      loading="lazy"
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
      }}
      className={className}
      {...props}
    />
  );
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const JournalArticle = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [helpful, setHelpful] = useState(null);
  const [copied, setCopied] = useState(false);
  const [articles, setArticles] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArticle = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const [articleResponse, listResponse] = await Promise.all([
          api.get(`/journal/public/slug/${encodeURIComponent(slug)}`),
          api.get("/journal/public"),
        ]);

        if (!active) return;

        const articleData = articleResponse.data?.data;
        if (!articleData) {
          setArticle(null);
          setLoadError("This article could not be found.");
          return;
        }

        setArticle(articleData);

        const allArticles = listResponse.data?.data || [];
        setRelatedArticles(
          allArticles
            .filter((item) => item.id !== articleData.id)
            .slice(0, 2)
        );
      } catch (error) {
        console.error("Unable to load journal article:", error);
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load this article right now."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) {
      loadArticle();
    } else {
      setLoading(false);
      setArticle(null);
    }

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (slug) return;
    let active = true;
    const loadArticles = async () => {
      try {
        setListLoading(true);
        setListError("");
        const response = await api.get("/journal/public");
        const rows = response.data?.data ?? [];
        if (active) setArticles(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (active) {
          setListError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load travel stories."
          );
        }
      } finally {
        if (active) setListLoading(false);
      }
    };
    loadArticles();
    return () => {
      active = false;
    };
  }, [slug]);

  if (!slug) {
    return (
      <main className="min-h-screen bg-[#f8f8f2] text-[#244536]">
        <section className="bg-[#e9eddf] px-6 py-20 md:px-12">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">The travel journal</p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-tight text-[#174b38] md:text-7xl">Stories to help you travel a little deeper.</h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[#718075]">Local notes, thoughtful guides and inspiration for journeys across South India.</p>
          </div>
        </section>
        <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-12">
          {listLoading ? (
            <p className="py-16 text-center text-sm text-[#778277]">Loading stories...</p>
          ) : listError ? (
            <div className="bg-white p-10 text-center">
              <p className="text-sm text-red-700">{listError}</p>
              <button onClick={() => window.location.reload()} className="mt-5 text-sm text-[#174b38] underline">Try again</button>
            </div>
          ) : articles.length ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((item) => (
                <Link key={item.id} to={`/journal/${item.slug}`} className="group bg-white">
                  <div className="h-60 overflow-hidden bg-[#e1e8df]">
                    <SafeImage src={item.coverImage} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-[10px] uppercase tracking-[2px] text-[#a17e50]">{item.category || "Travel story"}</p>
                    <h2 className="mt-4 font-serif text-2xl text-[#174b38] group-hover:text-[#a77947]">{item.title}</h2>
                    {item.excerpt && <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#718075]">{item.excerpt}</p>}
                    <p className="mt-6 text-xs text-[#174b38]">Read story ↗</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white px-6 py-16 text-center">
              <h2 className="font-serif text-3xl text-[#174b38]">Stories are coming soon</h2>
              <p className="mt-4 text-sm text-[#718075]">Please explore our journeys while we prepare the next travel stories.</p>
              <Link to="/journeys" className="mt-7 inline-block bg-[#174b38] px-7 py-3 text-xs text-white">Explore journeys →</Link>
            </div>
          )}
        </section>
      </main>
    );
  }

  useEffect(() => {
    if (!article) return;

    document.title = article.seoTitle || article.title || "Journal";
    let description = document.querySelector('meta[name="description"]');

    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }

    description.content =
      article.seoDescription || article.excerpt || "";
  }, [article]);

  const safeArticleHtml = useMemo(() => {
    const storedContent = String(article?.content || "").trim();
    if (!storedContent) return "";

    // Preserve legacy plain-text and ## heading content from older articles.
    let html = storedContent;
    const looksLikeHtml = /<\/?(p|h[1-6]|ul|ol|li|blockquote|img|br|strong|em|a)\b/i.test(storedContent);
    if (!looksLikeHtml) {
      html = storedContent
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)
        .map((block) => {
          const lines = block.split("\n");
          const firstLine = (lines.shift() || "").trim();
          const heading = firstLine.match(/^##\s+(.+)$/);
          const textLines = heading ? lines : [firstLine, ...lines];
          const escapeText = (value) => String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
          const body = textLines.map((line) => escapeText(line.trim())).filter(Boolean).join("<br>");
          return `${heading ? `<h2>${escapeText(heading[1])}</h2>` : ""}${body ? `<p>${body}</p>` : ""}`;
        })
        .join("");
    }

    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }, [article?.content]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f8f2] px-6 py-32 text-center">
        <p className="text-sm text-[#778277]">Loading article...</p>
      </main>
    );
  }

  if (loadError || !article) {
    return (
      <main className="min-h-screen bg-[#f8f8f2] px-6 py-32 text-center">
        <h1 className="font-serif text-4xl text-[#174b38]">
          Article unavailable
        </h1>
        <p className="mt-4 text-sm text-[#778277]">
          {loadError || "This article could not be found."}
        </p>
        <Link
          to="/journal"
          className="mt-8 inline-block text-sm text-[#174b38] underline"
        >
          Back to journal
        </Link>
      </main>
    );
  }

  const relatedPackages = article.relatedPackages || [];
  const publishedDate = formatDate(article.publishedAt || article.createdAt);
  const author = article.author || "The Company A local team";

  return (
    <main className="bg-[#f8f8f2] text-[#244536]">
      <style>{JOURNAL_ARTICLE_STYLES}</style>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1440px] px-6 pt-8 md:px-12">
        <p className="text-[10px] uppercase tracking-[2px] text-[#849084]">
          <Link to="/" className="hover:text-[#174b38]">Home</Link>
          {" / "}
          <Link to="/journal" className="hover:text-[#174b38]">Journal</Link>
          {" / "}
          {article.category || "Travel story"}
        </p>
      </div>

      {/* ARTICLE HEADER */}
      <header className="mx-auto max-w-[1100px] px-6 pb-12 pt-14 md:px-12">
        <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
          {article.category || "Travel journal"}
        </p>

        <h1 className="mt-7 max-w-4xl font-serif text-5xl leading-[1.05] text-[#174b38] md:text-7xl lg:text-[82px]">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#718075] md:text-lg">
            {article.excerpt}
          </p>
        )}

        <div className="mt-10 flex items-center gap-4 border-t border-[#e1e4da] pt-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe7d9] font-serif text-lg text-[#174b38]">
            {String(author).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-[#174b38]">{author}</p>
            <p className="mt-2 text-[10px] text-[#849084]">
              {publishedDate}
            </p>
          </div>
        </div>
      </header>

      {/* HERO IMAGE */}
      <section className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="h-[280px] overflow-hidden md:h-[520px]">
          <SafeImage
            src={article.coverImage}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
        {article.title && (
          <p className="mt-4 text-[10px] text-[#849084]">{article.title}</p>
        )}
      </section>

      {/* ARTICLE BODY */}
      <article className="mx-auto max-w-[760px] px-6 pb-10 pt-14">
        {safeArticleHtml ? (
          <div
            className="journal-rich-content"
            dangerouslySetInnerHTML={{ __html: safeArticleHtml }}
          />
        ) : (
          <p className="text-sm leading-8 text-[#66766a]">
            Article content has not been added yet.
          </p>
        )}

        {/* FEEDBACK */}
        <section className="mt-16 border-y border-[#e1e4da] py-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-serif text-xl text-[#174b38]">
                Was this helpful?
              </p>
              {helpful !== null && (
                <p className="mt-2 text-xs text-[#778277]">
                  Thank you for your feedback.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setHelpful(true)}
                className={`border px-5 py-3 text-xs transition ${
                  helpful === true
                    ? "bg-[#174b38] text-white"
                    : "border-[#dfe3d9] hover:border-[#174b38]"
                }`}
              >
                Yes, helpful
              </button>
              <button
                onClick={() => setHelpful(false)}
                className={`border px-5 py-3 text-xs transition ${
                  helpful === false
                    ? "bg-[#174b38] text-white"
                    : "border-[#dfe3d9] hover:border-[#174b38]"
                }`}
              >
                Not quite
              </button>
              <button
                onClick={copyLink}
                className="text-xs text-[#174b38] underline"
              >
                {copied ? "Copied!" : "Copy link ↗"}
              </button>
            </div>
          </div>
        </section>
      </article>

      {/* RELATED PACKAGES */}
      {relatedPackages.length > 0 && (
        <section className="bg-[#eeeade] py-20">
          <div className="mx-auto max-w-[1100px] px-6 md:px-12">
            <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
              From field note to first step
            </p>
            <h2 className="mb-10 mt-5 font-serif text-4xl text-[#174b38] md:text-5xl">
              Journeys connected to this story.
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {relatedPackages.map((item) => (
                <article key={item.id} className="flex flex-col justify-between bg-white p-7 md:p-9">
                  <div>
                    <p className="text-[10px] uppercase tracking-[2px] text-[#a17e50]">Related journey</p>
                    <h3 className="mt-4 font-serif text-2xl text-[#174b38]">{item.title}</h3>
                  </div>
                  <Link
                    to={`/package/${item.id}`}
                    className="mt-7 inline-block self-start bg-[#174b38] px-7 py-3 text-xs text-white transition hover:bg-[#28634e]"
                  >
                    Personalise this journey →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RELATED ARTICLES */}
      {relatedArticles.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12">
          <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
            Keep wandering
          </p>
          <h2 className="mb-10 mt-5 font-serif text-4xl text-[#174b38]">
            More stories from the South.
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {relatedArticles.map((item) => (
              <Link
                to={`/journal/${item.slug}`}
                key={item.id}
                className="group grid grid-cols-1 items-center gap-6 sm:grid-cols-[200px_1fr]"
              >
                <div className="h-[190px] overflow-hidden">
                  <SafeImage
                    src={item.coverImage}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div>
                  <p className="text-[10px] tracking-[2px] text-[#a17e50]">
                    {item.category || "TRAVEL JOURNAL"}
                  </p>
                  <h3 className="mt-4 font-serif text-2xl text-[#174b38] transition group-hover:text-[#a17e50]">
                    {item.title}
                  </h3>
                  <p className="mt-5 text-xs text-[#778277]">Read story ↗</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default JournalArticle;
