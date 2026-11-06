import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85";

const PackageCard = ({
  id,
  image,
  category,
  duration,
  route,
  title,
  description,
  price,
}) => {
  const packageUrl = `/package/${id}`;
  const numericPrice = Number(price);
  const validPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[3px] border border-[#e4e7df] bg-white shadow-[0_8px_30px_rgba(18,62,48,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(18,62,48,0.11)]">
      <Link
        to={packageUrl}
        aria-label={`View ${title}`}
        className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-[#e8ebe4]"
      >
        <img
          src={image || FALLBACK_IMAGE}
          alt={title || "Journey destination"}
          onError={handleImageError}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        {category && (
          <span className="absolute left-5 top-5 max-w-[calc(100%-2.5rem)] truncate rounded-sm bg-[#f8f6ed]/95 px-3 py-2 text-[10px] font-medium uppercase tracking-[1.5px] text-[#174d3b] shadow-sm">
            {category}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex min-h-[20px] flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-medium uppercase tracking-[1.2px] text-[#738277]">
          {duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} strokeWidth={1.7} />
              {duration}
            </span>
          )}
        </div>

        {route && (
          <div className="mt-3 flex min-w-0 items-start gap-2 text-[11px] leading-5 text-[#718077]">
            <MapPin size={14} strokeWidth={1.7} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2 break-words">{route}</span>
          </div>
        )}

        <Link to={packageUrl} className="mt-4 block">
          <h3 className="line-clamp-2 font-serif text-[25px] leading-[1.2] text-[#194b39] transition-colors group-hover:text-[#a77947] sm:text-[27px]">
            {title}
          </h3>
        </Link>

        <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[#737e75]">
          {description || "Discover a thoughtfully planned journey."}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-[#e9ece6] pt-5">
          <div className="min-w-0">
            <span className="mb-1 block text-[11px] text-[#8b948b]">
              Starting from · per person
            </span>
            <span className="font-serif text-[27px] leading-none text-[#194b39]">
              {validPrice ? `₹${numericPrice.toLocaleString("en-IN")}` : "On request"}
            </span>
          </div>
          <Link
            to={packageUrl}
            className="inline-flex shrink-0 items-center gap-2 border-b border-[#194b39] pb-1 text-[11px] font-medium uppercase tracking-[1px] text-[#194b39] transition-colors hover:border-[#b17c43] hover:text-[#b17c43]"
          >
            Explore <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PackageCard;
