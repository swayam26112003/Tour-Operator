
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23dce8d9%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23a9c4ad%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22url%28%23g%29%22/%3E%3Cpath%20d%3D%22M0%20590%20Q220%20430%20430%20590%20T860%20560%20T1200%20540%20V800%20H0Z%22%20fill%3D%22%23174b38%22%20opacity%3D%22.75%22/%3E%3Cpath%20d%3D%22M0%20650%20Q240%20510%20500%20650%20T1000%20610%20T1200%20620%20V800%20H0Z%22%20fill%3D%22%23123e30%22%20opacity%3D%22.55%22/%3E%3Ctext%20x%3D%22600%22%20y%3D%22390%22%20text-anchor%3D%22middle%22%20font-family%3D%22Georgia%2Cserif%22%20font-size%3D%2272%22%20fill%3D%22%23174b38%22%3EKERALA%3C/text%3E%3Ctext%20x%3D%22600%22%20y%3D%22455%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2224%22%20letter-spacing%3D%228%22%20fill%3D%22%23456b55%22%3EA%20JOURNEY%20TO%20REMEMBER%3C/text%3E%3C/svg%3E";

const SafeImage = ({ src, alt, className = "" }) => {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
      }}
      className={className}
    />
  );
};




const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

const getTodayInputDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

const getDurationLabel = (value = "") =>
  String(value).replace(/\s*\/\s*/g, " / ");

const normalizePackageData = (result) => {
  if (!result) return null;
  return {
    ...result,
    itinerary: [...(result.itinerary || [])].sort(
      (a, b) => a.dayNumber - b.dayNumber
    ),
    hotels: result.hotels || [],
    seasonalPrices: [...(result.seasonalPrices || [])].sort(
      (a, b) => new Date(a.validFrom) - new Date(b.validFrom)
    ),
  };
};

const PackageDetails = ({ initialData = null } = {}) => {
  const { id } = useParams();
  const bootstrapPackage = initialData ||
    (typeof window !== "undefined" ? window.__SSR_DATA__?.packageData || null : null);
  const matchingInitialPackage = bootstrapPackage?.id === id ? bootstrapPackage : null;

  const [activeTab, setActiveTab] = useState("Overview");
  const [packageData, setPackageData] = useState(() => normalizePackageData(matchingInitialPackage));
  const [loading, setLoading] = useState(() => !matchingInitialPackage);
  const [loadError, setLoadError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    travellers: "",
    message: "",
    consent: false,
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      try {
        if (!matchingInitialPackage) setLoading(true);
        setLoadError("");
        const response = await api.get(`/packages/${id}`);
        const result = response.data?.data;

        if (!result || result.status !== "PUBLISHED") {
          throw new Error("This journey is not currently available.");
        }

        if (active) {
          setPackageData(normalizePackageData(result));
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load this package."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPackage();
    return () => {
      active = false;
    };
  }, [id]);

  const prices = packageData?.seasonalPrices || [];
  const currentPrice = Number(
    prices[selectedPrice]?.priceTwinSharing ??
      prices[selectedPrice]?.pricePerPerson ??
      packageData?.price ??
      0
  );

  const routeStops = useMemo(() => {
    const configuredStops = Array.isArray(packageData?.mapStops)
      ? packageData.mapStops
      : [];
    const itineraryStops = (packageData?.itinerary || [])
      .map((day) => day.location)
      .filter(Boolean);
    const stops = configuredStops.length ? configuredStops : itineraryStops;
    return [...new Set(stops.map((stop) => String(stop).trim()).filter(Boolean))];
  }, [packageData]);

  const mapsDirectionsUrl = useMemo(() => {
    if (!routeStops.length) return "";
    const origin = routeStops[0];
    const destination = routeStops[routeStops.length - 1];
    const params = new URLSearchParams({
      api: "1",
      origin,
      destination,
      travelmode: "driving",
    });
    if (routeStops.length > 2) {
      params.set("waypoints", routeStops.slice(1, -1).join("|"));
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [routeStops]);

  const mapEmbedUrl = useMemo(() => {
    const focus = routeStops[0] || packageData?.destination || "South India";
    return `https://maps.google.com/maps?q=${encodeURIComponent(focus)}&z=9&output=embed`;
  }, [routeStops, packageData?.destination]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consent) {
      setSubmitError("Please agree to be contacted about this enquiry before submitting.");
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError("");

      await api.post("/enquiries", {
        packageId: id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        travelDate: formData.date,
        travellers: formData.travellers,
        message: formData.message.trim(),
        contactConsent: formData.consent,
      });

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to submit your enquiry. Please try again."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const tabs = [
    "Overview",
    "Itinerary",
    "Stays",
    "Prices",
    "Included",
    "Route",
  ];

  const scrollToSection = (section) => {
    setActiveTab(section);

    const element = document.getElementById(
      section.toLowerCase()
    );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#f8f8f2] flex items-center justify-center text-sm text-[#718075]">
        Loading journey details...
      </div>
    );
  }

  if (loadError || !packageData) {
    return (
      <div className="min-h-[60vh] bg-[#f8f8f2] px-6 flex flex-col items-center justify-center text-center">
        <h1 className="font-serif text-3xl text-[#174b38]">Journey unavailable</h1>
        <p className="mt-4 text-sm text-[#718075]">{loadError || "Package not found."}</p>
        <Link to="/journeys" className="mt-7 text-sm text-[#174b38] underline">
          Back to journeys
        </Link>
      </div>
    );
  }

  const durationLabel = getDurationLabel(packageData.duration);
  const itineraryDays = packageData.itinerary || [];
  const hotelStays = packageData.hotels || [];
  const packageImage = packageData.image || FALLBACK_IMAGE;
  const packageTitle = packageData.title || "Your South India journey";
  const destinationLabel = packageData.destination || "South India";

  return (
    <div className="bg-[#f8f8f2] text-[#244536] pb-20 md:pb-0">

      {/* BREADCRUMB */}

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-6">
        <p className="text-[10px] uppercase tracking-[2px] text-[#849084]">
          <Link to="/">Home</Link>
          {" / "}
          <Link to="/journeys">Kerala</Link>
          {" / "}
          Private journeys
        </p>
      </div>

      {/* PACKAGE HERO */}

      <section className="max-w-[1440px] mx-auto px-6 md:px-12">

        <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
          {packageData.category || "A thoughtfully planned journey"} · {durationLabel}
        </p>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mt-5 mb-8">

          <div>
            <h1 className="font-serif text-5xl md:text-7xl text-[#174b38] leading-tight">
{packageTitle}
            </h1>

            <p className="text-sm text-[#718075] mt-5">
              {destinationLabel}
            </p>
          </div>

          <p className="text-xs text-[#718075]">
            01 / 12 photos
            <span className="ml-4 text-[#174b38] underline cursor-pointer">
              View gallery
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[300px] md:h-[460px]">

          <div className="md:col-span-2 overflow-hidden">
            <SafeImage
              src={packageImage}
              alt={packageTitle}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="hidden md:grid grid-rows-2 gap-3 overflow-hidden">
            <SafeImage
              src={packageImage}
              alt="Munnar hills"
              className="w-full h-full object-cover"
            />
            <SafeImage
              src={packageImage}
              alt="Kerala beach"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* SECTION NAVIGATION */}

      <nav className="sticky top-[82px] z-30 bg-[#fbfcf7] border-b border-[#e6e8df] mt-12">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex gap-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => scrollToSection(tab)}
              className={`py-5 text-xs whitespace-nowrap border-b-2 transition ${
                activeTab === tab
                  ? "border-[#174b38] text-[#174b38]"
                  : "border-transparent text-[#829084]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* OVERVIEW */}

      <section
        id="overview"
        className="scroll-mt-32 max-w-[1440px] mx-auto px-6 md:px-12 py-20"
      >

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-16">

          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
              The journey at a glance
            </p>

            <h2 className="font-serif text-4xl md:text-5xl text-[#174b38] mt-5">
{packageTitle}
            </h2>

            <p className="text-sm text-[#718075] leading-8 mt-7 max-w-2xl">
{packageData.description || "A thoughtfully planned journey with handpicked stays and experiences across the South."}
            </p>

            <div className="grid grid-cols-2 gap-8 mt-12 border-y border-[#e3e6dc] py-8">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#9b835e]">
                  Travel style
                </p>
                <p className="text-sm mt-3">{packageData.category || "Personalised"}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#9b835e]">
                  Best time
                </p>
                <p className="text-sm mt-3">Seasonal departures</p>
              </div>
            </div>

            <div className="space-y-5 mt-9 text-sm">
              <p>✳ &nbsp; {itineraryDays.length} itinerary days planned</p>
              <p>✳ &nbsp; {hotelStays.length} accommodation option{hotelStays.length === 1 ? "" : "s"} listed</p>
              <p>✳ &nbsp; {destinationLabel}</p>
            </div>
          </div>

          <div className="bg-[#eeeade] p-8 md:p-10 flex flex-col justify-center">
            <p className="text-[10px] tracking-[3px] uppercase text-[#9b835e]">
              Your journey
            </p>

            <h3 className="font-serif text-3xl text-[#174b38] mt-5">
              {durationLabel}, many little discoveries.
            </h3>

            <div className="mt-9 space-y-6">
              {itineraryDays.map((day) => (
                <div key={day.id || day.dayNumber} className="flex gap-5 items-center">
                  <span className="text-xs text-[#a17e50]">
                    {String(day.dayNumber).padStart(2, "0")}
                  </span>
                  <span className="text-sm">{day.location || day.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ITINERARY */}

      <section
        id="itinerary"
        className="scroll-mt-32 bg-[#eeeade] py-20"
      >

        <div className="max-w-[1440px] mx-auto px-6 md:px-12">

          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            {durationLabel}, many little discoveries
          </p>

          <h2 className="font-serif text-4xl md:text-5xl text-[#174b38] mt-5 mb-14">
            Your day-wise itinerary
          </h2>

          <div className="max-w-4xl">

            {itineraryDays.map((day) => (
              <div
                key={day.id || day.dayNumber}
                className="grid grid-cols-[55px_1fr] md:grid-cols-[90px_1fr] gap-5 md:gap-8 py-9 border-t border-[#d9dbd0]"
              >
                <div className="text-2xl font-serif text-[#a17e50]">
                  {String(day.dayNumber).padStart(2, "0")}
                </div>

                <div>
                  <h3 className="font-serif text-2xl md:text-3xl text-[#174b38]">
                    {day.title}
                  </h3>

                  <p className="text-sm leading-7 text-[#718075] mt-4 max-w-2xl">
                    {day.description}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-5 text-[10px] uppercase tracking-[1px] text-[#8a806b]">
                    <span>{day.location}</span>
                    <span>·</span>
                    <span>{(day.activities || []).join(" · ")}</span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* STAYS */}

      <section
        id="stays"
        className="scroll-mt-32 max-w-[1440px] mx-auto px-6 md:px-12 py-20"
      >

        <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
          Rest easy
        </p>

        <h2 className="font-serif text-4xl md:text-5xl text-[#174b38] mt-5">
          Stay somewhere special.
        </h2>

        <p className="text-sm text-[#778277] mt-5 max-w-2xl leading-7">
          Accommodation options currently listed for this package.
        </p>

        <div className="mt-12 space-y-8">

          {hotelStays.map((stay, index) => (
            <div
              key={stay.id || `${stay.name}-${index}`}
              className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-7 items-center border-b border-[#e1e4da] pb-8"
            >
              <div className="h-[190px] overflow-hidden">
                <SafeImage
                  src={stay.image || packageImage}
                  alt={stay.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#a17e50]">
                  {stay.location}
                </p>

                <h3 className="font-serif text-3xl text-[#174b38] mt-4">
                  {stay.name}
                </h3>

                <p className="text-sm text-[#778277] mt-3">
                  {stay.roomType || stay.description || "Stay details available on request"}
                </p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* PRICING */}

      <section
        id="prices"
        className="scroll-mt-32 bg-[#eeeade] py-20"
      >

        <div className="max-w-[1440px] mx-auto px-6 md:px-12">

          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            Seasonal pricing
          </p>

          <h2 className="font-serif text-4xl md:text-5xl text-[#174b38] mt-5">
            A season for every plan.
          </h2>

          <p className="text-sm text-[#778277] mt-5">
            Rates shown are taken from the package seasonal price table.
          </p>

          <div className="mt-10 space-y-3">

            {prices.length ? prices.map((price, index) => (
              <button
                key={price.id || `${price.season}-${price.validFrom}`}
                onClick={() => setSelectedPrice(index)}
                className={`w-full flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-6 md:px-9 text-left border transition ${
                  selectedPrice === index
                    ? "bg-[#174b38] text-white border-[#174b38]"
                    : "bg-white text-[#244536] border-transparent hover:border-[#174b38]"
                }`}
              >
                <div>
                  <p className="text-sm">{price.season} · {formatDate(price.validFrom)} – {formatDate(price.validTo)}</p>
                  <p className={`text-xs mt-2 ${
                    selectedPrice === index ? "text-white/65" : "text-[#829084]"
                  }`}>
                    {price.hotelCategory} · GST {Number(price.gstPercentage || 0)}%
                  </p>
                </div>

                <span className="font-serif text-3xl">
                  ₹{formatCurrency(price.priceTwinSharing ?? price.pricePerPerson)}
                </span>
              </button>
            )) : (
              <p className="bg-white p-6 text-sm text-[#778277]">
                Seasonal prices have not been added for this package yet. Please enquire for a quote.
              </p>
            )}

          </div>

          <p className="text-xs text-[#778277] mt-7 leading-6">
            Final pricing depends on travel dates, hotel category and occupancy. Please request a quote for confirmation.
          </p>
        </div>
      </section>

      {/* INCLUSIONS */}

      <section id="included" className="scroll-mt-32 max-w-[1440px] mx-auto px-6 md:px-12 py-20">

        <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
          Everything considered
        </p>

        <h2 className="font-serif text-4xl md:text-5xl text-[#174b38] mt-5 mb-12">
          All the little details.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-14">

          <div>
            <h3 className="text-xs tracking-[3px] uppercase text-[#a17e50] mb-8">
              Included
            </h3>

            {Array.isArray(packageData.inclusions) && packageData.inclusions.length > 0 ? (
              <ul className="space-y-4">
                {packageData.inclusions.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-7 text-[#536c5c]">
                    <span className="mt-1 text-[#6b9a73]" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#778277] leading-7">
                Inclusions for this package have not been listed yet. Please enquire for confirmation.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs tracking-[3px] uppercase text-[#a17e50] mb-8">
              Not included
            </h3>

            {Array.isArray(packageData.exclusions) && packageData.exclusions.length > 0 ? (
              <ul className="space-y-4">
                {packageData.exclusions.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-7 text-[#536c5c]">
                    <span className="mt-1 text-[#b47762]" aria-hidden="true">×</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#778277] leading-7">
                Exclusions for this package have not been listed yet. Please enquire for confirmation.
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 border-t border-[#e1e4da] pt-9">
          <h3 className="font-serif text-2xl text-[#174b38]">
            Booking & cancellation terms ↗
          </h3>

          <p className="text-sm text-[#778277] mt-4 leading-7 max-w-3xl">
            30% deposit to confirm. Balance 21 days before arrival.
            Cancellation charges depend on notice and supplier terms;
            your quote includes full details.
          </p>
        </div>
      </section>

      {/* ROUTE MAP */}

      <section id="route" className="scroll-mt-32 bg-[#e6ebdf] py-20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            Follow the journey
          </p>
          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-4xl text-[#174b38]">
                Explore the route.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718075]">
                Stops are shown in the order configured for this package. Open the full route for directions between every stop.
              </p>
            </div>
            {mapsDirectionsUrl && (
              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center bg-[#174b38] px-6 py-4 text-xs text-white transition hover:bg-[#28634e]"
              >
                Open full route in Google Maps ↗
              </a>
            )}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="min-h-[320px] overflow-hidden border border-[#d2ddcf] bg-white">
              <iframe
                title={`Map showing ${routeStops[0] || destinationLabel}`}
                src={mapEmbedUrl}
                className="h-[320px] w-full border-0 md:h-[420px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="border border-[#d2ddcf] bg-[#f7f8f4] p-7 md:p-9">
              <p className="text-[10px] uppercase tracking-[2px] text-[#9b835e]">Route order</p>
              <div className="mt-6 space-y-0">
                {(routeStops.length ? routeStops : [destinationLabel]).map((place, index, allStops) => (
                  <div key={`${place}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < allStops.length - 1 && (
                      <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-[#b9cbb9]" aria-hidden="true" />
                    )}
                    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174b38] text-xs text-white">
                      {index + 1}
                    </span>
                    <div className="pt-1">
                      <p className="text-sm text-[#244536]">{place}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[#879187]">
                        {index === 0 ? "Starting stop" : index === allStops.length - 1 ? "Final stop" : "On the way"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 border-t border-[#e1e7de] pt-5 text-xs leading-6 text-[#718075]">
                The map focuses on the first stop. Use Google Maps for the full multi-stop route and live directions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ENQUIRY FORM */}

      <section
        id="enquiry"
        className="scroll-mt-32 max-w-[1440px] mx-auto px-6 md:px-12 py-20"
      >

        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-14">

          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-[#a17e50]">
              Personal planning · No obligation
            </p>

            <h2 className="font-serif text-5xl md:text-6xl text-[#174b38] mt-6 leading-tight">
              Make this journey yours.
            </h2>

            <p className="text-sm text-[#778277] mt-7 leading-8">
              Share a few details. A local consultant will get back
              to you within one working hour.
            </p>

            <div className="mt-12 bg-[#eeeade] p-7">
              <p className="text-[10px] uppercase tracking-[2px] text-[#9b835e]">
                Your selected journey
              </p>

              <h3 className="font-serif text-2xl mt-4 text-[#174b38]">
                {packageTitle}
              </h3>

              <p className="text-xs text-[#778277] mt-3">
                {durationLabel}
              </p>

              <p className="font-serif text-3xl text-[#174b38] mt-6">
                ₹{formatCurrency(currentPrice)}
              </p>

              <p className="text-[10px] text-[#778277] mt-2">
                From / person · Twin sharing
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e6e8df] p-6 md:p-10">

            {submitted ? (
              <div className="py-16 text-center">
                <span className="text-4xl text-[#78966e]">✓</span>

                <h3 className="font-serif text-3xl text-[#174b38] mt-6">
                  Thank you for your enquiry.
                </h3>

                <p className="text-sm text-[#778277] mt-4">
                  Your enquiry has been sent successfully. Our team will contact you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-7">

                <div>
                  <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                    Your name
                  </label>

                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your full name"
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

                  <div>
                    <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                      Email address
                    </label>

                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                      Phone / WhatsApp
                    </label>

                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+91 98XXX XX410"
                      className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

                  <div>
                    <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                      Travel date
                    </label>

                    <input
                      required
                      type="date"
                      min={getTodayInputDate()}
                      value={formData.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                      Travellers
                    </label>

                    <select
                      required
                      value={formData.travellers}
                      onChange={(e) => updateField("travellers", e.target.value)}
                      className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none bg-transparent"
                    >
                      <option value="">Select group size</option>
                      <option>1 adult</option>
                      <option>2 adults</option>
                      <option>2 adults, 1 child</option>
                      <option>2 adults, 2 children</option>
                      <option>3 adults</option>
                      <option>4 adults</option>
                      <option>5+ travellers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[2px] text-[#778277] mb-3">
                    Anything we should know?
                  </label>

                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    placeholder="Tell us about your preferences, rooms, meals and interests..."
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none resize-none focus:border-[#174b38]"
                  />
                </div>

                <label className="flex items-start gap-3 text-xs text-[#778277] leading-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consent}
                    onChange={(e) => updateField("consent", e.target.checked)}
                    className="mt-1 accent-[#174b38]"
                  />

                  <span>
                    I agree to be contacted about this enquiry and accept
                    the privacy policy. No marketing, unless I opt in.
                  </span>
                </label>

                {submitError && (
                  <p className="text-sm text-red-700" role="alert">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-[#174b38] text-white py-5 text-xs tracking-[1px] hover:bg-[#28634e] transition disabled:opacity-60"
                >
                  {submitLoading ? "Sending..." : "Send my enquiry →"}
                </button>

                <p className="text-center text-xs text-[#778277]">
                  Prefer a conversation?{" "}
                  <a
                    href="https://wa.me/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#174b38] underline"
                  >
                    Chat on WhatsApp ↗
                  </a>
                </p>

              </form>
            )}
          </div>
        </div>
      </section>

      {/* MOBILE STICKY ENQUIRY BAR */}

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#fbfcf7] border-t border-[#e2e5db] px-5 py-3 flex items-center justify-between shadow-lg">

        <div>
          <p className="text-[9px] text-[#778277]">
            From / person
          </p>

          <p className="font-serif text-xl text-[#174b38]">
            ₹{formatCurrency(currentPrice)}
          </p>
        </div>

        <button
          onClick={() => {
            document.getElementById("enquiry")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
          className="bg-[#174b38] text-white px-7 py-3 text-xs"
        >
          Enquire now →
        </button>
      </div>

    </div>
  );
};

export default PackageDetails;
