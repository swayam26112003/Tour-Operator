import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PackageCard from "../../components/PackageCard";
import api from "../../services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85";

const getJourneyStyle = (pkg) => {
  const value =
    `${pkg.category || ""} ${pkg.title || ""} ${pkg.destination || ""}`.toLowerCase();

  if (value.includes("honeymoon") || value.includes("romantic"))
    return "Honeymoon";
  if (
    value.includes("beach") ||
    value.includes("coast") ||
    value.includes("marari") ||
    value.includes("varkala")
  )
    return "Beach";
  if (
    value.includes("culture") ||
    value.includes("heritage") ||
    value.includes("temple")
  )
    return "Culture";
  if (value.includes("family")) return "Family";
  return "Nature";
};

const mapPackageToJourney = (pkg) => {
  const itineraryLocations = (pkg.itinerary || [])
    .map((day) => day.location)
    .filter(Boolean);
  const route =
    [...new Set(itineraryLocations)].join(" → ") || pkg.destination || "";

  const seasonalPrices = (pkg.seasonalPrices || [])
    .map((item) => Number(item.pricePerPerson))
    .filter((price) => Number.isFinite(price) && price > 0);
  const packagePrice = Number(pkg.price);
  const price = seasonalPrices.length
    ? Math.min(...seasonalPrices)
    : Number.isFinite(packagePrice) && packagePrice > 0
      ? packagePrice
      : 0;

  return {
    id: pkg.id,
    image: pkg.image || FALLBACK_IMAGE,
    category: pkg.category || "South India journey",
    duration: pkg.duration || "",
    route,
    title: pkg.title || "Untitled journey",
    description: pkg.description || "",
    price,
    style: getJourneyStyle(pkg),
    destination: pkg.destination || "",
    seasonalPrices: pkg.seasonalPrices || [],
  };
};

const SafeImage = ({ src, alt, className = "" }) => {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) {
          setImageSrc(FALLBACK_IMAGE);
        }
      }}
      className={className}
    />
  );
};

const KeralaJourneys = ({ initialData = null } = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("All");
  const [sort, setSort] = useState("recommended");
  const bootstrapPackages =
    initialData ??
    (typeof window !== "undefined"
      ? (window.__SSR_DATA__?.packages ?? null)
      : null);
  const [journeys, setJourneys] = useState(() =>
    Array.isArray(bootstrapPackages)
      ? bootstrapPackages.map(mapPackageToJourney)
      : [],
  );
  const [loading, setLoading] = useState(
    () => !Array.isArray(bootstrapPackages),
  );
  const [loadError, setLoadError] = useState("");

  const destinationFilter = searchParams.get("destination") || "";
  const homeStyleFilter = searchParams.get("style") || "";
  const monthFilter = searchParams.get("month") || "";
  const durationFilter = searchParams.get("duration") || "";

  useEffect(() => {
    const loadJourneys = async () => {
      try {
        if (!Array.isArray(bootstrapPackages)) setLoading(true);
        setLoadError("");
        const response = await api.get("/packages", {
          params: { status: "PUBLISHED" },
        });
        const rows = response.data?.data || [];
        setJourneys(rows.map(mapPackageToJourney));
      } catch (error) {
        console.error("Unable to load journeys:", error);
        setLoadError(
          error.response?.data?.message ||
            error.message ||
            "Unable to load journeys right now.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadJourneys();
  }, []);

  useEffect(() => {
    if (homeStyleFilter === "Family holidays") setSelectedStyle("Family");
    else if (homeStyleFilter === "Honeymoon") setSelectedStyle("Honeymoon");
    else if (homeStyleFilter === "Culture & groups")
      setSelectedStyle("Culture");
  }, [homeStyleFilter]);

  const filteredJourneys = useMemo(() => {
    const query = search.trim().toLowerCase();
    const normalizedDestination = destinationFilter
      .replace(", South India", "")
      .toLowerCase();

    let result = journeys.filter((journey) => {
      const matchesSearch =
        !query ||
        journey.title.toLowerCase().includes(query) ||
        journey.route.toLowerCase().includes(query) ||
        journey.description.toLowerCase().includes(query) ||
        journey.destination.toLowerCase().includes(query);

      const matchesStyle =
        selectedStyle === "All" || journey.style === selectedStyle;

      const matchesDestination =
        !normalizedDestination ||
        normalizedDestination === "south india" ||
        journey.destination.toLowerCase().includes(normalizedDestination) ||
        journey.route.toLowerCase().includes(normalizedDestination);

      const durationText = journey.duration.toLowerCase();
      const daysMatch = durationText.match(/(\d+)\s*days?/);
      const days = daysMatch ? Number(daysMatch[1]) : null;
      const matchesDuration =
        !durationFilter ||
        durationFilter === "Any duration" ||
        (durationFilter === "3–5 days" &&
          days !== null &&
          days >= 3 &&
          days <= 5) ||
        (durationFilter === "6–8 days" &&
          days !== null &&
          days >= 6 &&
          days <= 8) ||
        (durationFilter === "9+ days" && days !== null && days >= 9);

      const matchesMonth = (() => {
        if (!monthFilter) return true;
        const targetMonth = new Date(`${monthFilter} 1, 2026`).getMonth();
        if (!journey.seasonalPrices.length) return true;

        return journey.seasonalPrices.some((price) => {
          const from = new Date(price.validFrom);
          const to = new Date(price.validTo);
          if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
            return false;
          const fromMonth = from.getMonth();
          const toMonth = to.getMonth();
          return from.getFullYear() === to.getFullYear()
            ? targetMonth >= fromMonth && targetMonth <= toMonth
            : targetMonth >= fromMonth || targetMonth <= toMonth;
        });
      })();

      return (
        matchesSearch &&
        matchesStyle &&
        matchesDestination &&
        matchesDuration &&
        matchesMonth
      );
    });

    if (sort === "low") result.sort((a, b) => a.price - b.price);
    else if (sort === "high") result.sort((a, b) => b.price - a.price);

    return result;
  }, [
    journeys,
    search,
    selectedStyle,
    sort,
    destinationFilter,
    durationFilter,
    monthFilter,
  ]);

  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#f8f8f2]">
      {/* HERO */}

      <section className="relative flex h-[420px] items-center md:h-[500px]">
        <SafeImage
          src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1800&q=90"
          alt="Kerala backwaters"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[#102f25]/55" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 text-white md:px-12">
          <p className="text-[10px] uppercase tracking-[4px] text-[#e1d4b4]">
            Discover Kerala
          </p>

          <h1 className="mt-6 max-w-3xl font-serif text-5xl md:text-7xl">
            A beautiful South,
            <br />
            one journey at a time.
          </h1>

          <p className="mt-6 max-w-lg text-sm leading-7 text-white/85">
            From mist-covered mountains to quiet backwaters, find a Kerala
            journey that feels like yours.
          </p>
        </div>
      </section>

      {/* INTRODUCTION */}

      <section className="mx-auto w-full max-w-[1440px] px-6 py-16 md:px-12">
        <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
          Find your kind of journey
        </p>

        <h2 className="mt-4 font-serif text-4xl text-[#174b38] md:text-5xl">
          Journeys worth slowing down for.
        </h2>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#778277]">
          Every journey is thoughtfully planned around your interests, travel
          dates and the experiences you love.
        </p>
      </section>

      {/* FILTERS AND PACKAGES */}

      <section className="mx-auto w-full max-w-[1440px] px-6 pb-24 md:px-12">
        <div className="border border-[#e8e8df] bg-white p-5 md:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-[2px] text-[#778277]">
                Search journeys
              </label>

              <input
                type="text"
                placeholder="Search destination or experience..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-3 w-full border-b border-[#d9ded5] py-3 text-sm outline-none"
              />
            </div>

            <div className="lg:w-56">
              <label className="text-[10px] uppercase tracking-[2px] text-[#778277]">
                Sort by price
              </label>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-3 w-full border-b border-[#d9ded5] bg-transparent py-3 text-sm outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="low">Price: Low to high</option>
                <option value="high">Price: High to low</option>
              </select>
            </div>
          </div>

          {/* STYLE FILTERS */}

          <div className="mt-7 flex flex-wrap gap-3">
            {["All", "Family", "Honeymoon", "Nature", "Beach", "Culture"].map(
              (style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`border px-5 py-2.5 text-xs transition ${
                    selectedStyle === style
                      ? "border-[#174b38] bg-[#174b38] text-white"
                      : "border-[#dfe3d9] text-[#536c5c] hover:border-[#174b38]"
                  }`}
                >
                  {style}
                </button>
              ),
            )}
          </div>
        </div>

        {/* RESULTS HEADING */}

        <div className="mb-8 mt-12 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#9b835e]">
              Curated for you
            </p>

            <h2 className="mt-2 font-serif text-3xl text-[#174b38]">
              Kerala journeys
            </h2>
          </div>

          <p className="text-xs text-[#778277]">
            {filteredJourneys.length} journeys found
          </p>
        </div>

        {/* PACKAGE CARDS */}

        {loading ? (
          <div className="bg-white py-20 text-center">
            <p className="text-sm text-[#778277]">Loading journeys...</p>
          </div>
        ) : loadError ? (
          <div className="bg-white py-20 text-center">
            <h3 className="font-serif text-2xl text-[#174b38]">
              Journeys are temporarily unavailable
            </h3>
            <p className="mt-3 text-sm text-gray-500">{loadError}</p>
          </div>
        ) : filteredJourneys.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredJourneys.map((journey) => (
              <PackageCard key={journey.id} {...journey} />
            ))}
          </div>
        ) : (
          <div className="bg-white py-20 text-center">
            <h3 className="font-serif text-2xl text-[#174b38]">
              No journeys found
            </h3>

            <p className="mt-3 text-sm text-gray-500">
              Try changing your search or filters.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setSelectedStyle("All");
                setSort("recommended");
                setSearchParams({});
              }}
              className="mt-6 text-sm text-[#174b38] underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* BOTTOM CTA */}

      <section className="bg-[#e0e9d9] py-16">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-6 px-6 md:flex-row md:px-12">
          <div>
            <h2 className="font-serif text-3xl text-[#174b38] md:text-4xl">
              Have something else in mind?
            </h2>

            <p className="mt-3 text-sm text-[#65796b]">
              Tell us what you are dreaming of. We'll plan it together.
            </p>
          </div>

          <Link
            to="/plan-your-journey"
            className="bg-[#174b38] px-7 py-4 text-xs text-white transition hover:bg-[#28634e]"
          >
            Plan a custom journey →
          </Link>
        </div>
      </section>
    </main>
  );
};

export default KeralaJourneys;
