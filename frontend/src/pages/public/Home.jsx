
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PackageCard from "../../components/PackageCard";
import api from "../../services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85";

const destinations = [
  {
    name: "Kerala",
    subtitle: "Backwaters, hills & a slower rhythm",
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=85",
  },
  {
    name: "Tamil Nadu",
    subtitle: "Living temples & storied coastlines",
    image:
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=85",
  },
  {
    name: "The Western Ghats",
    subtitle: "Wild trails & tea-scented mornings",
    image:
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=85",
  },
];


const faqs = [
  {
    question: "Can you tailor a package to our family?",
    answer:
      "Absolutely. Tell us your dates, ages and interests. We'll adjust the pace, hotels and experiences to suit you.",
  },
  {
    question: "When is the best time to visit Kerala?",
    answer:
      "November to February brings mild days. The monsoon has its own lush, quieter charm. We'll help you choose.",
  },
  {
    question: "Do you arrange journeys for overseas groups?",
    answer:
      "Yes. We can plan airport transfers, English-speaking guides and coordinated stays for your group.",
  },
];

// Reusable image with automatic fallback
const SafeImage = ({ src, alt, className = "", ...props }) => {
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
      {...props}
    />
  );
};

const Home = () => {
  const navigate = useNavigate();

  const [destination, setDestination] = useState("Kerala, South India");
  const [travelStyle, setTravelStyle] = useState("Any travel style");
  const [month, setMonth] = useState("");
  const [duration, setDuration] = useState("Any duration");
  const [openFaq, setOpenFaq] = useState(0);
  const [featuredPackages, setFeaturedPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [journalPosts, setJournalPosts] = useState([]);
  const [journalLoading, setJournalLoading] = useState(true);
  const [journalError, setJournalError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedPackages = async () => {
      try {
        setPackagesLoading(true);
        setPackagesError("");

        const response = await api.get("/packages", {
          params: { status: "PUBLISHED", featured: true },
        });

        const records = response.data?.data ?? response.data?.packages ?? [];

        if (!Array.isArray(records)) {
          throw new Error("The packages response has an unexpected format.");
        }

        const mappedPackages = records.map((pkg) => {
          const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];
          const route = itinerary
            .map((day) => day.location)
            .filter(Boolean)
            .filter((location, index, locations) => locations.indexOf(location) === index)
            .join(" → ");

          const seasonalPrices = Array.isArray(pkg.seasonalPrices)
            ? [...pkg.seasonalPrices].sort(
                (a, b) => Number(a.pricePerPerson) - Number(b.pricePerPerson),
              )
            : [];

          return {
            id: pkg.id,
            image: pkg.image || FALLBACK_IMAGE,
            category: pkg.category || "Featured journey",
            duration: pkg.duration || "",
            route: route || pkg.destination || "",
            title: pkg.title || "Untitled journey",
            description: pkg.description || "",
            price: seasonalPrices.length
              ? Number(seasonalPrices[0].pricePerPerson)
              : Number(pkg.price || 0),
          };
        });

        if (isMounted) setFeaturedPackages(mappedPackages);
      } catch (error) {
        console.error("Featured packages loading error:", error);
        if (isMounted) {
          setPackagesError(
            error.response?.data?.message ||
              "Featured journeys are temporarily unavailable.",
          );
        }
      } finally {
        if (isMounted) setPackagesLoading(false);
      }
    };

    loadFeaturedPackages();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadJournalPosts = async () => {
      try {
        setJournalLoading(true);
        setJournalError("");

        const response = await api.get("/journal/public");
        const records = response.data?.data ?? [];

        if (!Array.isArray(records)) {
          throw new Error("The journal response has an unexpected format.");
        }

        const mappedPosts = records
          .filter((article) => article?.id && article?.slug)
          .slice(0, 3)
          .map((article) => {
            const wordCount = String(article.content || "")
              .trim()
              .split(/\s+/)
              .filter(Boolean).length;

            return {
              id: article.id,
              slug: article.slug,
              category: article.category || "Travel story",
              read: `${Math.max(1, Math.ceil(wordCount / 200))} min read`,
              title: article.title || "Untitled story",
              image: article.coverImage || FALLBACK_IMAGE,
            };
          });

        if (isMounted) setJournalPosts(mappedPosts);
      } catch (error) {
        console.error("Journal posts loading error:", error);
        if (isMounted) {
          setJournalError(
            error.response?.data?.message ||
              "Travel stories are temporarily unavailable."
          );
        }
      } finally {
        if (isMounted) setJournalLoading(false);
      }
    };

    loadJournalPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams({
      destination,
      style: travelStyle,
      month,
      duration,
    });

    navigate(`/journeys?${params.toString()}`);
  };

  return (
    <main className="w-full overflow-hidden bg-[#f8f8f2] text-[#244536]">

      {/* HERO SECTION */}

      <section className="relative flex min-h-[650px] items-center lg:min-h-[740px]">
        <SafeImage
          src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=2000&q=90"
          alt="Kerala backwaters"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#092c23]/75 via-[#092c23]/40 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 pb-36 pt-12 md:px-12">
          <p className="mb-7 text-[10px] uppercase tracking-[5px] text-[#e0d5b9]">
            Kerala & South India, personally yours
          </p>

          <h1 className="max-w-[750px] font-serif text-5xl leading-[1.05] text-white md:text-7xl lg:text-[88px]">
            Some places ask you
            <br />
            to slow down.
          </h1>

          <p className="mt-7 text-sm tracking-wide text-white/90 md:text-base">
            Misty hills. Palm-lined waters. A warm welcome.
          </p>

          <p className="mt-2 text-sm text-white/80">
            Discover the South with people who call it home.
          </p>

          <Link
            to="/journeys"
            className="mt-9 inline-flex items-center gap-5 bg-[#f5f4e9] px-7 py-4 text-xs tracking-wide text-[#174b38] transition hover:bg-white"
          >
            Find your kind of journey <span>↗</span>
          </Link>
        </div>

        <div className="absolute bottom-5 right-6 text-[10px] uppercase tracking-[2px] text-white md:right-12">
          01 / 03 &nbsp; ALLEPPEY, KERALA
        </div>
      </section>

      {/* JOURNEY SEARCH */}

      <section className="relative z-20 mx-auto -mt-9 w-full max-w-[1370px] px-5">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 items-end gap-5 bg-[#fbfcf7] p-5 shadow-xl sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] md:p-7"
        >
          <div>
            <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#758278]">
              Where to?
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full border-b border-[#d9ded5] bg-transparent py-3 text-sm outline-none"
            >
              <option>Kerala, South India</option>
              <option>Tamil Nadu</option>
              <option>Western Ghats</option>
              <option>South India</option>
            </select>
          </div>

          <div>
            <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#758278]">
              Your journey
            </label>
            <select
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              className="w-full border-b border-[#d9ded5] bg-transparent py-3 text-sm outline-none"
            >
              <option>Any travel style</option>
              <option>Family holidays</option>
              <option>Honeymoon</option>
              <option>Culture & groups</option>
            </select>
          </div>

          <div>
            <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#758278]">
              When?
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border-b border-[#d9ded5] bg-transparent py-3 text-sm outline-none"
            >
              <option value="">Choose your month</option>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#758278]">
              How long?
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border-b border-[#d9ded5] bg-transparent py-3 text-sm outline-none"
            >
              <option>Any duration</option>
              <option>3–5 days</option>
              <option>6–8 days</option>
              <option>9+ days</option>
            </select>
          </div>

          <button
            type="submit"
            className="whitespace-nowrap bg-[#174d3b] px-7 py-4 text-xs text-white transition hover:bg-[#28634e]"
          >
            Explore journeys →
          </button>
        </form>
      </section>

      {/* TRUST STRIP */}

      <section className="mx-auto grid w-full max-w-[1370px] grid-cols-1 gap-6 border-b border-[#e5e7df] px-6 py-10 md:grid-cols-3 md:px-12">
        {[
          "Born in Kochi, rooted in the South",
          "Made around you, not a template",
          "A real person, every step of the way",
        ].map((item, index) => (
          <div
            key={item}
            className="flex items-center justify-center gap-3 text-center text-xs tracking-wide text-[#536c5c]"
          >
            <span className="text-lg text-[#9caa91]">
              {["✳", "◇", "◎"][index]}
            </span>
            {item}
          </div>
        ))}
      </section>

      {/* DESTINATIONS */}

      <section className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-12">
        <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
          Many worlds. One beautiful South.
        </p>

        <div className="mb-9 mt-4 flex flex-wrap items-end justify-between gap-5">
          <h2 className="font-serif text-4xl text-[#174b38] md:text-5xl">
            Where will your curiosity take you?
          </h2>

          <Link
            to="/journeys"
            className="text-xs text-[#567260] transition hover:text-[#b17c43]"
          >
            All destinations ↗
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {destinations.map((place) => (
            <Link
              to={`/journeys?destination=${encodeURIComponent(place.name === "The Western Ghats" ? "Western Ghats" : place.name)}`}
              key={place.name}
              className="group relative h-[330px] overflow-hidden bg-[#dfe5dc] md:h-[380px]"
            >
              <SafeImage
                src={place.image}
                alt={place.name}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

              <div className="absolute bottom-7 left-7 text-white">
                <h3 className="font-serif text-3xl md:text-4xl">
                  {place.name}
                </h3>
                <p className="mt-2 text-xs text-white/80">
                  {place.subtitle}
                </p>
              </div>

              <span className="absolute right-6 top-6 text-xl text-white">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PACKAGES */}

      <section className="w-full bg-[#eeeade] py-20">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            Thoughtfully put together
          </p>

          <div className="mb-10 mt-4 flex flex-wrap items-end justify-between gap-5">
            <h2 className="font-serif text-4xl text-[#174b38] md:text-5xl">
              Good days, beautifully connected.
            </h2>

            <Link
              to="/journeys"
              className="bg-white px-6 py-3 text-xs text-[#174b38] transition hover:bg-[#174b38] hover:text-white"
            >
              Explore all journeys →
            </Link>
          </div>

          {packagesLoading ? (
            <p className="py-12 text-center text-sm text-[#778277]">
              Loading featured journeys...
            </p>
          ) : featuredPackages.length > 0 ? (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {featuredPackages.slice(0, 3).map((pkg) => (
                <PackageCard key={pkg.id} {...pkg} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[#778277]">
              {packagesError || "New journeys are being prepared. Please check back soon."}
            </p>
          )}

          <p className="mt-9 text-center text-[11px] text-[#818779]">
            Indicative prices per person on twin sharing. Your dates, stays
            and inclusions shape the final quote.
          </p>
        </div>
      </section>

      {/* TRAVEL STYLES */}

      <section className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-12">
        <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
          Your people. Your pace.
        </p>

        <h2 className="mb-10 mt-4 font-serif text-4xl text-[#174b38] md:text-5xl">
          No two holidays should be the same.
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              title: "Bring the whole family",
              subtitle: "Room for wonder, at every age.",
              styleFilter: "Family holidays",
            },
            {
              title: "Make time for two",
              subtitle: "Quiet stays, shared discoveries.",
              styleFilter: "Honeymoon",
            },
            {
              title: "Come together",
              subtitle: "Culture-rich journeys for groups.",
              styleFilter: "Culture & groups",
            },
          ].map((style, index) => (
            <Link
              to={`/journeys?style=${encodeURIComponent(style.styleFilter)}`}
              key={style.title}
              className="border border-[#e7e8df] bg-white p-8 transition hover:shadow-lg md:p-9"
            >
              <span className="text-3xl text-[#8a9d82]">
                {["♧", "♡", "◎"][index]}
              </span>

              <h3 className="mt-6 font-serif text-2xl text-[#174b38]">
                {style.title}
              </h3>

              <p className="mt-3 text-sm text-[#778277]">
                {style.subtitle}
              </p>

              <p className="mt-7 text-xs text-[#9a805a]">
                Find my journey ↗
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* LOCAL TEAM */}

      <section className="w-full bg-[#123e30] py-16 text-white md:py-20">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-2">
          <div className="h-[300px] overflow-hidden bg-[#eab308] md:h-[430px]">
            <SafeImage
              src="https://images.unsplash.com/photo-1517849845537-4d257902454a?w=1000&q=85"
              alt="Local travel companion"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[3px] text-[#c3b18a]">
              Not just where to go. Who to know.
            </p>

            <h2 className="mt-6 font-serif text-4xl leading-tight md:text-6xl">
              The South is our home.
              <br />
              Let us show you around.
            </h2>

            <p className="mt-7 max-w-xl text-sm leading-8 text-white/70">
              A favourite tea stall. A quieter bend in the backwaters. A host
              who remembers how you like your coffee. Our Kochi-based team
              brings the small, personal details that turn a trip into your
              story.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-7 text-xs text-white/80">
              {[
                "Listen to what you love",
                "Build a journey around you",
                "Fine-tune every detail",
                "Travel with local support",
              ].map((item, index) => (
                <div key={item}>
                  <span className="text-[#c3b18a]">
                    0{index + 1}
                  </span>
                  <p className="mt-2">{item}</p>
                </div>
              ))}
            </div>

            <Link
              to="/plan-your-journey"
              className="mt-9 inline-block border border-white/50 px-7 py-4 text-xs transition hover:bg-white hover:text-[#174b38]"
            >
              Plan with our local team →
            </Link>
          </div>
        </div>
      </section>

      {/* WINTER PROMOTION */}

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-6 py-20 md:px-12 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            November to February · Winter in the South
          </p>

          <h2 className="mt-6 font-serif text-4xl leading-tight text-[#174b38] md:text-6xl">
            Trade your winter coat for a sea breeze.
          </h2>

          <p className="mt-6 max-w-lg text-sm leading-7 text-[#778277]">
            Clear mornings in the hills, gentle days by the sea and long,
            lazy houseboat afternoons. This is Kerala at its unhurried best.
          </p>

          <Link
            to="/journeys?destination=Kerala&month=December"
            className="mt-8 inline-block bg-[#174b38] px-7 py-4 text-xs text-white transition hover:bg-[#28634e]"
          >
            Find a winter escape →
          </Link>
        </div>

        <div className="h-[300px] overflow-hidden bg-[#dfe5dc] md:h-[390px]">
          <SafeImage
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85"
            alt="Beautiful tropical beach"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* JOURNAL */}

      <section className="w-full bg-[#eeeade] py-20">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            Planning your journey starts here
          </p>

          <div className="mb-10 mt-4 flex flex-wrap items-end justify-between gap-5">
            <h2 className="font-serif text-4xl text-[#174b38] md:text-5xl">
              A little reading, a lot of possibility.
            </h2>

            <Link to="/journal" className="text-xs text-[#567260]">
              Visit the journal ↗
            </Link>
          </div>

          {journalLoading ? (
            <p className="py-12 text-center text-sm text-[#778277]">
              Loading travel stories...
            </p>
          ) : journalPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {journalPosts.map((post) => (
                <Link
                  to={`/journal/${post.slug}`}
                  key={post.id}
                  className="group"
                >
                  <div className="h-[230px] overflow-hidden bg-[#dfe5dc]">
                    <SafeImage
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>

                  <p className="mt-5 text-[10px] uppercase tracking-[2px] text-[#9b835e]">
                    {post.category} · {post.read}
                  </p>

                  <h3 className="mt-3 font-serif text-2xl text-[#174b38] transition group-hover:text-[#a77947]">
                    {post.title}
                  </h3>

                  <p className="mt-4 text-xs text-[#66806e]">
                    Read the story ↗
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-[#778277]">
                {journalError || "New travel stories are being prepared. Please check back soon."}
              </p>
              <Link
                to="/journal"
                className="mt-5 inline-block text-xs text-[#174b38] underline"
              >
                Visit the journal →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 py-20 md:px-12 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            A few things you might wonder
          </p>

          <h2 className="mt-5 font-serif text-4xl text-[#174b38] md:text-5xl">
            Good journeys start with good questions.
          </h2>

          <p className="mt-6 text-sm text-[#778277]">
            Our team is always happy to help.
          </p>
        </div>

        <div>
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="border-b border-[#dfe3d9] py-6"
            >
              <button
                onClick={() =>
                  setOpenFaq(openFaq === index ? -1 : index)
                }
                className="flex w-full items-center justify-between gap-5 text-left"
              >
                <span className="font-serif text-lg text-[#174b38]">
                  {faq.question}
                </span>

                <span className="text-xl text-[#9b835e]">
                  {openFaq === index ? "−" : "+"}
                </span>
              </button>

              {openFaq === index && (
                <p className="mt-5 pr-8 text-sm leading-7 text-[#778277]">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="w-full bg-[#e0e9d9] py-16">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-8 px-6 md:flex-row md:px-12">
          <div>
            <h2 className="font-serif text-4xl text-[#174b38] md:text-5xl">
              Your South India story starts here.
            </h2>

            <p className="mt-4 text-sm text-[#65796b]">
              Tell us what you're dreaming of. We'll take care of the details.
            </p>
          </div>

          <Link
            to="/plan-your-journey"
            className="whitespace-nowrap bg-[#174b38] px-8 py-4 text-xs text-white transition hover:bg-[#28634e]"
          >
            Let's plan your holiday →
          </Link>
        </div>
      </section>

    </main>
  );
};

export default Home;
