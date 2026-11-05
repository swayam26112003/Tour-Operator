
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3 } from "lucide-react";

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
  const handleImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <article className="group bg-white">
      <Link
        to={`/package/${id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#e8ebe4]"
      >
        <img
          src={image}
          alt={title}
          onError={handleImageError}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {category && (
          <span className="absolute left-4 top-4 bg-[#f8f6ed] px-3 py-2 text-[9px] uppercase tracking-[1.5px] text-[#174d3b]">
            {category}
          </span>
        )}
      </Link>

      <div className="pb-6 pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[1.5px] text-[#718077]">
          <span className="flex items-center gap-1.5">
            <Clock3 size={12} />
            {duration}
          </span>

          {route && (
            <>
              <span className="text-[#c6cfc7]">·</span>
              <span>{route}</span>
            </>
          )}
        </div>

        <Link to={`/package/${id}`}>
          <h3 className="font-serif text-[25px] leading-tight text-[#194b39] transition-colors hover:text-[#a77947]">
            {title}
          </h3>
        </Link>

        <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#777f77]">
          {description}
        </p>

        <div className="mt-6 flex items-end justify-between border-t border-[#e9ece6] pt-5">
          <div>
            <span className="mb-1 block text-[10px] text-[#8b948b]">
              From, per person
            </span>

            <span className="font-serif text-[25px] text-[#194b39]">
              ₹{Number(price).toLocaleString("en-IN")}
            </span>
          </div>

          <Link
            to={`/package/${id}`}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[1px] text-[#194b39] transition-colors hover:text-[#b17c43]"
          >
            Explore <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PackageCard;
