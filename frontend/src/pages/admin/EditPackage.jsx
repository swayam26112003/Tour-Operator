import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import MediaAssetPicker from "../../components/MediaAssetPicker";
import PackageSchedulePanel from "../../components/PackageSchedulePanel";

const SEASON_TO_API = {
  "Peak season": "PEAK",
  Monsoon: "MONSOON",
  "Off season": "OFF_SEASON",
};

const SEASON_FROM_API = {
  PEAK: "Peak season",
  MONSOON: "Monsoon",
  OFF_SEASON: "Off season",
};

const CATEGORY_TO_API = {
  "3 star": "STANDARD",
  "4 star": "DELUXE",
  "5 star": "PREMIUM",
  Luxury: "PREMIUM",
};

const CATEGORY_FROM_API = {
  STANDARD: "3 star",
  DELUXE: "4 star",
  PREMIUM: "5 star",
};

const inputClass =
  "w-full border border-[#e3e7de] bg-white px-4 py-3 text-sm outline-none focus:border-[#174b38] transition";

const labelClass =
  "block text-[10px] uppercase tracking-[1.5px] text-[#788579] mb-3";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const formatDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const parseDuration = (value) => {
  const text = String(value || "");
  const days = text.match(/(\d+)\s*Days?/i);
  const nights = text.match(/(\d+)\s*Nights?/i);
  return {
    duration: days ? Number(days[1]) : 1,
    nights: nights ? Number(nights[1]) : 0,
  };
};

const makeDuration = (days, nights) =>
  `${Number(days) || 1} Days / ${Number(nights) || 0} Nights`;

const textToLines = (value) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const linesToText = (value) =>
  Array.isArray(value) ? value.join("\n") : "";

const EditPackage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id && id !== "new");

  const [activeTab, setActiveTab] = useState("Basic information");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Keep database-only fields so editing does not discard them.
  const [packageMeta, setPackageMeta] = useState({
    slug: "",
    originalTitle: "",
    image: "",
    category: "Hill Station",
    featured: false,
    price: 0,
    scheduledAt: null,
  });

  const [form, setForm] = useState({
    title: "",
    destination: "",
    packageId: "",
    duration: 1,
    nights: 0,
    description: "",
    hotelCategory: "4 star",
    status: "Draft",
    highlights: "",
    inclusionsText: "",
    exclusionsText: "",
    mapStopsText: "",
  });

  const [itinerary, setItinerary] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [prices, setPrices] = useState([]);

  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [restoringVersion, setRestoringVersion] = useState("");
  const [versionMessage, setVersionMessage] = useState("");

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSuccessMessage("");
  };

  const updateItinerary = (index, field, value) => {
    setItinerary((previous) =>
      previous.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      )
    );
    setSuccessMessage("");
  };

  const addDay = () => {
    setItinerary((previous) => [
      ...previous,
      {
        day: previous.length + 1,
        title: "",
        location: "",
        description: "",
        activities: [],
      },
    ]);
  };

  const removeDay = (index) => {
    setItinerary((previous) =>
      previous
        .filter((_, i) => i !== index)
        .map((day, i) => ({ ...day, day: i + 1 }))
    );
  };

  const updateHotel = (index, field, value) => {
    setHotels((previous) =>
      previous.map((hotel, i) =>
        i === index ? { ...hotel, [field]: value } : hotel
      )
    );
    setSuccessMessage("");
  };

  const addHotel = () => {
    setHotels((previous) => [
      ...previous,
      {
        location: "",
        name: "",
        category: "4 star",
        description: "",
        image: null,
        price: null,
      },
    ]);
  };

  const removeHotel = (index) => {
    setHotels((previous) => previous.filter((_, i) => i !== index));
  };

  const updatePrice = (index, field, value) => {
    setPrices((previous) =>
      previous.map((price, i) =>
        i === index ? { ...price, [field]: value } : price
      )
    );
    setSuccessMessage("");
  };

  const addPrice = () => {
    setPrices((previous) => [
      ...previous,
      {
        id: null,
        season: "Peak season",
        hotelCategory: form.hotelCategory || "4 star",
        startDate: "",
        endDate: "",
        price: 0,
        twinSharing: 0,
        gstPercentage: 5,
      },
    ]);
  };

  const removePrice = (index) => {
    setPrices((previous) => previous.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!isEditing) {
      setForm({
        title: "",
        destination: "",
        packageId: "",
        duration: 1,
        nights: 0,
        description: "",
        hotelCategory: "4 star",
        status: "Draft",
        highlights: "",
        inclusionsText: "",
        exclusionsText: "",
        mapStopsText: "",
      });
      setItinerary([]);
      setHotels([]);
      setPrices([]);
      setPackageMeta({
        slug: "",
        originalTitle: "",
        image: "",
        category: "Hill Station",
        featured: false,
        price: 0,
        scheduledAt: null,
      });
      return;
    }

    let cancelled = false;

    const loadPackage = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await api.get(`/packages/${id}`);
        const data = response.data?.data;

        if (!data) throw new Error("Package data was not returned by the API.");
        if (cancelled) return;

        const duration = parseDuration(data.duration);

        setForm({
          title: data.title || "",
          destination: data.destination || "",
          packageId: data.code || "",
          duration: duration.duration,
          nights: duration.nights,
          description: data.description || "",
          hotelCategory: "4 star",
          status:
            data.status === "PUBLISHED"
              ? "Published"
              : data.status === "SCHEDULED"
                ? "Scheduled"
                : "Draft",
          highlights: data.highlights || "",
          inclusionsText: linesToText(data.inclusions),
          exclusionsText: linesToText(data.exclusions),
          mapStopsText: linesToText(data.mapStops),
        });

        setPackageMeta({
          slug: data.slug || "",
          originalTitle: data.title || "",
          image: data.image || "",
          category: data.category || "Hill Station",
          featured: Boolean(data.featured),
          price: Number(data.price || 0),
          scheduledAt: data.scheduledAt || null,
        });

        setItinerary(
          (data.itinerary || []).map((day) => ({
            id: day.id,
            day: day.dayNumber,
            title: day.title || "",
            location: day.location || "",
            description: day.description || "",
            activities: Array.isArray(day.activities) ? day.activities : [],
          }))
        );

        setHotels(
          (data.hotels || []).map((hotel) => ({
            id: hotel.id,
            location: hotel.location || "",
            name: hotel.name || "",
            category:
              CATEGORY_FROM_API[hotel.roomType] || hotel.roomType || "4 star",
            description: hotel.description || "",
            image: hotel.image || null,
            price: hotel.price == null ? null : Number(hotel.price),
          }))
        );

        setPrices(
          (data.seasonalPrices || []).map((price) => ({
            id: price.id,
            season: SEASON_FROM_API[price.season] || "Peak season",
            hotelCategory:
              CATEGORY_FROM_API[price.hotelCategory] || "4 star",
            startDate: formatDateForInput(price.validFrom),
            endDate: formatDateForInput(price.validTo),
            price: Number(price.pricePerPerson || 0),
            twinSharing: Number(price.priceTwinSharing || 0),
            gstPercentage: Number(price.gstPercentage ?? 5),
          }))
        );
      } catch (error) {
        console.error("Package loading error:", error);
        if (!cancelled) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load package."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPackage();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setVersions([]);
      return undefined;
    }

    let cancelled = false;

    const loadVersions = async () => {
      try {
        setVersionsLoading(true);
        setVersionsError("");
        const response = await api.get(`/packages/${id}/versions`);
        if (!cancelled) setVersions(response.data?.data || []);
      } catch (error) {
        console.error("Package version history loading error:", error);
        if (!cancelled) {
          setVersionsError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load package version history.",
          );
        }
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    };

    loadVersions();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  const restoreVersion = async (version) => {
    const versionNumber = version.version;
    const confirmed = window.confirm(
      `Restore package version ${versionNumber} as a draft?\n\nThe current package will first be saved to version history. The restored content will NOT be published automatically.`,
    );
    if (!confirmed) return;

    try {
      setRestoringVersion(version.id);
      setVersionsError("");
      setVersionMessage("");

      const response = await api.post(
        `/packages/${id}/versions/${version.id}/restore`,
        {},
      );

      setVersionMessage(
        response.data?.message || `Version ${versionNumber} restored as a draft.`,
      );
      // Reload the editor from the restored database state and refresh history.
      window.location.reload();
    } catch (error) {
      console.error("Package version restore error:", error);
      setVersionsError(
        error.response?.data?.message ||
          error.message ||
          "Unable to restore this package version.",
      );
    } finally {
      setRestoringVersion("");
    }
  };

  const validatePackage = () => {
    if (!form.title.trim()) {
      setActiveTab("Basic information");
      return "Please enter a package title.";
    }

    if (!form.destination.trim()) {
      setActiveTab("Basic information");
      return "Please enter a destination.";
    }

    if (Number(form.duration) < 1 || Number(form.nights) < 0) {
      setActiveTab("Basic information");
      return "Please enter a valid duration and number of nights.";
    }

    for (let index = 0; index < prices.length; index += 1) {
      const price = prices[index];
      if (!price.season || !price.startDate || !price.endDate) {
        setActiveTab("Seasonal pricing");
        return `Complete the season and date range for Season ${index + 1}.`;
      }
      if (new Date(price.endDate) < new Date(price.startDate)) {
        setActiveTab("Seasonal pricing");
        return `The end date for Season ${index + 1} must be after its start date.`;
      }
      if (Number(price.price) < 0 || Number(price.twinSharing) < 0) {
        setActiveTab("Seasonal pricing");
        return "Seasonal prices cannot be negative.";
      }
    }

    return "";
  };

  const handleSave = async (requestedStatus) => {
    const validationError = validatePackage();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const status =
        requestedStatus === "Published" ? "PUBLISHED" : "DRAFT";

      const nextPackageTitle = form.title.trim();
      const nextPackageSlug =
        isEditing && nextPackageTitle === packageMeta.originalTitle
          ? packageMeta.slug
          : slugify(nextPackageTitle);

      const packagePayload = {
        title: nextPackageTitle,
        slug: nextPackageSlug,
        code: form.packageId.trim() || null,
        description: form.description,
        destination: form.destination.trim(),
        duration: makeDuration(form.duration, form.nights),
        price:
          prices.length > 0
            ? Number(prices[0].price || 0)
            : Number(packageMeta.price || 0),
        image: packageMeta.image || null,
        category: packageMeta.category || "Hill Station",
        status,
        scheduledAt: null,
        featured: packageMeta.featured,
        inclusions: textToLines(form.inclusionsText),
        exclusions: textToLines(form.exclusionsText),
        mapStops: textToLines(form.mapStopsText),
        itinerary: itinerary.map((day, index) => ({
          dayNumber: index + 1,
          title: day.title || `Day ${index + 1}`,
          description: day.description || "",
          location: day.location || "",
          activities: Array.isArray(day.activities) ? day.activities : [],
        })),
        hotels: hotels.map((hotel) => ({
          name: hotel.name || "",
          location: hotel.location || "",
          roomType: hotel.category || "4 star",
          description: hotel.description || "",
          image: hotel.image || null,
          price: hotel.price == null ? null : Number(hotel.price),
        })),
        changeNote: "Updated through package editor",
      };

      let packageId = id;

      let savedPackage;
      if (isEditing) {
        const updateResponse = await api.put(`/packages/${id}`, packagePayload);
        savedPackage = updateResponse.data?.data;
      } else {
        const createResponse = await api.post("/packages", packagePayload);
        savedPackage = createResponse.data?.data;
        packageId = savedPackage?.id;
        if (!packageId) {
          throw new Error("Package was created but the API did not return its ID.");
        }
      }

      // Synchronize seasonal prices separately. Existing IDs are updated,
      // new rows are created, and rows removed in the editor are deleted.
      const currentPriceIds = new Set(
        prices.filter((price) => price.id).map((price) => price.id)
      );

      if (isEditing) {
        const originalResponse = await api.get(`/packages/${packageId}/prices`);
        const originalPrices = originalResponse.data?.data || [];

        for (const original of originalPrices) {
          if (!currentPriceIds.has(original.id)) {
            await api.delete(
              `/packages/${packageId}/prices/${original.id}`
            );
          }
        }
      }

      for (const price of prices) {
        const pricePayload = {
          season: SEASON_TO_API[price.season] || "PEAK",
          hotelCategory:
            CATEGORY_TO_API[price.hotelCategory] || "DELUXE",
          validFrom: price.startDate,
          validTo: price.endDate,
          pricePerPerson: Number(price.price || 0),
          priceTwinSharing: Number(
            price.twinSharing || price.price || 0
          ),
          gstPercentage: Number(price.gstPercentage ?? 5),
        };

        if (price.id) {
          await api.put(
            `/packages/${packageId}/prices/${price.id}`,
            pricePayload
          );
        } else {
          await api.post(
            `/packages/${packageId}/prices`,
            pricePayload
          );
        }
      }

      if (isEditing) {
        const versionsResponse = await api.get(`/packages/${packageId}/versions`);
        setVersions(versionsResponse.data?.data || []);
      }

      setSuccessMessage(
        `Package ${requestedStatus === "Published" ? "published" : "saved as draft"} successfully.`
      );
      setForm((previous) => ({ ...previous, status: requestedStatus }));
      setPackageMeta((previous) => ({
        ...previous,
        slug: savedPackage?.slug || nextPackageSlug,
        originalTitle: nextPackageTitle,
        scheduledAt: null,
      }));

      if (!isEditing) {
        navigate(`/admin/packages/${packageId}/edit`, { replace: true });
      }
    } catch (error) {
      console.error("Package save error:", error);
      setSaveError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Unable to save package. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    "Basic information",
    "Itinerary",
    "Hotels",
    "Inclusions & map",
    "Seasonal pricing",
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <header className="bg-white border-b border-[#e5e9e0] px-6 md:px-10 py-6">
        <div className="flex flex-wrap justify-between items-center gap-5">
          <div>
            <Link
              to="/admin/packages"
              className="text-[10px] uppercase tracking-[2px] text-[#879187]"
            >
              Package library / Back to packages
            </Link>
            <h1 className="font-serif text-3xl text-[#174b38] mt-3">
              {isEditing ? "Edit package" : "Create a package"}
            </h1>
            <p className="text-xs text-[#879187] mt-2">
              {form.packageId || (isEditing ? "No package code assigned" : "New package")}{" "}
              · {form.status}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSave("Draft")}
              disabled={saving || loading}
              className="border border-[#dfe3d9] px-5 py-3 text-xs hover:border-[#174b38] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={() => handleSave("Published")}
              disabled={saving || loading}
              className="bg-[#174b38] text-white px-6 py-3 text-xs hover:bg-[#28634e] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish package →"}
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-[#e5e9e0] px-6 md:px-10 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSuccessMessage("");
                setSaveError("");
              }}
              className={`py-5 text-xs border-b-2 transition ${
                activeTab === tab
                  ? "border-[#174b38] text-[#174b38]"
                  : "border-transparent text-[#879187]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto p-6 md:p-10">
        {loading && (
          <div className="bg-white border border-[#e6e9e1] p-6 mb-6 text-sm text-[#174b38]">
            Loading package information from database...
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 border border-red-200 p-5 mb-6 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 p-5 mb-6 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {successMessage && (
          <div className="bg-[#e6eee3] text-[#376448] px-5 py-4 mb-7 text-sm">
            ✓ {successMessage}
          </div>
        )}

        {activeTab === "Basic information" && (
          <section className="bg-white border border-[#e6e9e1] p-6 md:p-9">
            <div className="mb-9">
              <h2 className="font-serif text-2xl text-[#174b38]">
                Package information
              </h2>
              <p className="text-xs text-[#879187] mt-2">
                Add the essential details travellers will see.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              <div className="md:col-span-2">
                <label className={labelClass}>Package title *</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Enter package title"
                />
              </div>

              <div>
                <label className={labelClass}>Package ID / Code</label>
                <input
                  className={inputClass}
                  value={form.packageId}
                  onChange={(e) => updateForm("packageId", e.target.value)}
                  placeholder="e.g. PKG-KL-07"
                />
              </div>

              <div>
                <label className={labelClass}>Destination</label>
                <input
                  className={inputClass}
                  value={form.destination}
                  onChange={(e) => updateForm("destination", e.target.value)}
                  placeholder="e.g. Munnar, Kerala"
                />
              </div>

              <div>
                <label className={labelClass}>Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.duration}
                  onChange={(e) =>
                    updateForm("duration", Number(e.target.value))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Nights</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.nights}
                  onChange={(e) =>
                    updateForm("nights", Number(e.target.value))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Hotel category</label>
                <select
                  className={inputClass}
                  value={form.hotelCategory}
                  onChange={(e) =>
                    updateForm("hotelCategory", e.target.value)
                  }
                >
                  <option>3 star</option>
                  <option>4 star</option>
                  <option>5 star</option>
                  <option>Luxury</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                >
                  <option>Draft</option>
                  <option>Published</option>
                  {form.status === "Scheduled" && (
                    <option value="Scheduled" disabled>Scheduled (manage below)</option>
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows={5}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    updateForm("description", e.target.value)
                  }
                  placeholder="Describe this travel experience..."
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Package highlights</label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.highlights}
                  onChange={(e) =>
                    updateForm("highlights", e.target.value)
                  }
                  placeholder="Add package highlights..."
                />
              </div>

              <div className="md:col-span-2 border-t border-[#edf0e9] pt-7">
                <label className={labelClass}>Package cover image</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className={inputClass}
                    value={packageMeta.image}
                    onChange={(e) => setPackageMeta((previous) => ({ ...previous, image: e.target.value }))}
                    placeholder="Paste an image URL or choose from the media library"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="shrink-0 bg-[#174b38] px-5 py-3 text-xs text-white"
                  >
                    Choose from library
                  </button>
                </div>
                {packageMeta.image && (
                  <div className="mt-4">
                    <img src={packageMeta.image} alt={form.title ? `${form.title} package cover` : "Package cover preview"} className="h-56 w-full max-w-2xl border border-[#e6e9e1] object-cover" />
                    <button type="button" onClick={() => setPackageMeta((previous) => ({ ...previous, image: "" }))} className="mt-2 text-xs text-red-600 underline">Remove cover image</button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "Itinerary" && (
          <section className="bg-white border border-[#e6e9e1] p-6 md:p-9">
            <div className="flex flex-wrap justify-between items-center gap-5 mb-9">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  Day-wise itinerary
                </h2>
                <p className="text-xs text-[#879187] mt-2">
                  Create and manage daily travel activities.
                </p>
              </div>
              <button
                onClick={addDay}
                className="bg-[#174b38] text-white px-5 py-3 text-xs"
              >
                + Add day
              </button>
            </div>

            <div className="space-y-7">
              {itinerary.map((day, index) => (
                <div
                  key={day.id || index}
                  className="border border-[#e6e9e1] p-5 md:p-7"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl text-[#174b38]">
                      Day {index + 1}
                    </h3>
                    <button
                      onClick={() => removeDay(index)}
                      className="text-xs text-red-600"
                    >
                      Remove day
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Day title</label>
                      <input
                        className={inputClass}
                        value={day.title}
                        onChange={(e) =>
                          updateItinerary(index, "title", e.target.value)
                        }
                        placeholder="Enter day title"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Location</label>
                      <input
                        className={inputClass}
                        value={day.location}
                        onChange={(e) =>
                          updateItinerary(index, "location", e.target.value)
                        }
                        placeholder="Enter location"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Activities and description
                      </label>
                      <textarea
                        rows={3}
                        className={inputClass}
                        value={day.description}
                        onChange={(e) =>
                          updateItinerary(index, "description", e.target.value)
                        }
                        placeholder="Describe the day's activities..."
                      />
                    </div>
                  </div>
                </div>
              ))}
              {itinerary.length === 0 && (
                <p className="text-sm text-[#879187]">
                  No itinerary days added yet.
                </p>
              )}
            </div>
          </section>
        )}

        {activeTab === "Hotels" && (
          <section className="bg-white border border-[#e6e9e1] p-6 md:p-9">
            <div className="flex flex-wrap justify-between items-center gap-5 mb-9">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  Accommodation details
                </h2>
                <p className="text-xs text-[#879187] mt-2">
                  Add hotels and stays for each destination.
                </p>
              </div>
              <button
                onClick={addHotel}
                className="bg-[#174b38] text-white px-5 py-3 text-xs"
              >
                + Add hotel
              </button>
            </div>

            <div className="space-y-6">
              {hotels.map((hotel, index) => (
                <div
                  key={hotel.id || index}
                  className="border border-[#e6e9e1] p-6"
                >
                  <div className="flex justify-between mb-6">
                    <h3 className="font-serif text-xl text-[#174b38]">
                      Stay {index + 1}
                    </h3>
                    <button
                      onClick={() => removeHotel(index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Destination</label>
                      <input
                        className={inputClass}
                        value={hotel.location}
                        onChange={(e) =>
                          updateHotel(index, "location", e.target.value)
                        }
                        placeholder="Munnar"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Hotel name</label>
                      <input
                        className={inputClass}
                        value={hotel.name}
                        onChange={(e) =>
                          updateHotel(index, "name", e.target.value)
                        }
                        placeholder="Enter hotel name"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Category / Room type</label>
                      <select
                        className={inputClass}
                        value={hotel.category}
                        onChange={(e) =>
                          updateHotel(index, "category", e.target.value)
                        }
                      >
                        <option>3 star</option>
                        <option>4 star</option>
                        <option>5 star</option>
                        <option>Luxury</option>
                        <option>Standard Room</option>
                        <option>Deluxe Room</option>
                        <option>Premium Room</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {hotels.length === 0 && (
                <p className="text-sm text-[#879187]">
                  No hotels added yet.
                </p>
              )}
            </div>
          </section>
        )}

        {activeTab === "Inclusions & map" && (
          <section className="space-y-6">
            <div className="bg-white border border-[#e6e9e1] p-6 md:p-9">
              <div className="mb-7">
                <h2 className="font-serif text-2xl text-[#174b38]">What's included</h2>
                <p className="mt-2 text-xs leading-6 text-[#879187]">
                  Add one item per line. These details are shown on the public package page.
                </p>
              </div>
              <label className={labelClass}>Package inclusions</label>
              <textarea
                rows={7}
                className={inputClass}
                value={form.inclusionsText}
                onChange={(e) => updateForm("inclusionsText", e.target.value)}
                placeholder={"3 nights accommodation\nDaily breakfast\nPrivate AC vehicle for transfers\nGuided tea garden visit"}
              />
              <p className="mt-2 text-[11px] text-[#9aa398]">Each non-empty line becomes a separate inclusion.</p>
            </div>

            <div className="bg-white border border-[#e6e9e1] p-6 md:p-9">
              <div className="mb-7">
                <h2 className="font-serif text-2xl text-[#174b38]">What's not included</h2>
                <p className="mt-2 text-xs leading-6 text-[#879187]">
                  Be clear about costs or services that travellers need to arrange separately.
                </p>
              </div>
              <label className={labelClass}>Package exclusions</label>
              <textarea
                rows={7}
                className={inputClass}
                value={form.exclusionsText}
                onChange={(e) => updateForm("exclusionsText", e.target.value)}
                placeholder={"Flights and airport taxes\nTravel insurance\nPersonal expenses\nMeals not specifically mentioned"}
              />
              <p className="mt-2 text-[11px] text-[#9aa398]">Each non-empty line becomes a separate exclusion.</p>
            </div>

            <div className="bg-white border border-[#e6e9e1] p-6 md:p-9">
              <div className="mb-7">
                <h2 className="font-serif text-2xl text-[#174b38]">Route map stops</h2>
                <p className="mt-2 text-xs leading-6 text-[#879187]">
                  Enter locations in travel order, one per line. Use clear place names such as "Kochi, Kerala" or "Munnar, Kerala" so the public map can locate them.
                </p>
              </div>
              <label className={labelClass}>Stops in route order</label>
              <textarea
                rows={5}
                className={inputClass}
                value={form.mapStopsText}
                onChange={(e) => updateForm("mapStopsText", e.target.value)}
                placeholder={"Kochi, Kerala\nMunnar, Kerala\nAlleppey, Kerala"}
              />
              <div className="mt-5 border border-[#e6e9e1] bg-[#f7f8f4] p-4">
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">Route preview</p>
                <p className="mt-3 text-sm leading-7 text-[#174b38]">
                  {textToLines(form.mapStopsText).length
                    ? textToLines(form.mapStopsText).join("  →  ")
                    : "Add route stops to preview the journey."}
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Seasonal pricing" && (
          <section className="bg-white border border-[#e6e9e1] p-6 md:p-9">
            <div className="flex flex-wrap justify-between items-center gap-5 mb-9">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  Seasonal price management
                </h2>
                <p className="text-xs text-[#879187] mt-2">
                  Set prices and their effective date ranges.
                </p>
              </div>
              <button
                onClick={addPrice}
                className="bg-[#174b38] text-white px-5 py-3 text-xs"
              >
                + Add season
              </button>
            </div>

            <div className="space-y-6">
              {prices.map((price, index) => (
                <div
                  key={price.id || `new-${index}`}
                  className="border border-[#e6e9e1] p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl text-[#174b38]">
                      Season {index + 1}
                    </h3>
                    <button
                      onClick={() => removePrice(index)}
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Season name</label>
                      <select
                        className={inputClass}
                        value={price.season}
                        onChange={(e) =>
                          updatePrice(index, "season", e.target.value)
                        }
                      >
                        <option>Peak season</option>
                        <option>Monsoon</option>
                        <option>Off season</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Hotel category</label>
                      <select
                        className={inputClass}
                        value={price.hotelCategory}
                        onChange={(e) =>
                          updatePrice(index, "hotelCategory", e.target.value)
                        }
                      >
                        <option>3 star</option>
                        <option>4 star</option>
                        <option>5 star</option>
                        <option>Luxury</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Price per person (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={price.price}
                        onChange={(e) =>
                          updatePrice(index, "price", Number(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Twin sharing price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={price.twinSharing}
                        onChange={(e) =>
                          updatePrice(
                            index,
                            "twinSharing",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>GST (%)</label>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={price.gstPercentage}
                        onChange={(e) =>
                          updatePrice(
                            index,
                            "gstPercentage",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Effective from</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={price.startDate}
                        onChange={(e) =>
                          updatePrice(index, "startDate", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Effective until</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={price.endDate}
                        onChange={(e) =>
                          updatePrice(index, "endDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              {prices.length === 0 && (
                <p className="text-sm text-[#879187]">
                  No seasonal prices configured for this package.
                </p>
              )}
            </div>

            <div className="bg-[#f0f3ec] p-5 mt-8">
              <p className="text-xs text-[#536c5c] leading-6">
                Each seasonal rate has its own effective dates, hotel category,
                twin-sharing price and GST. Existing quotes retain the pricing
                snapshot used when they were created.
              </p>
            </div>
          </section>
        )}

        {isEditing && (
          <section className="mt-8 border border-[#e6e9e1] bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
                  Package history
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#174b38]">
                  Version history
                </h2>
                <p className="mt-2 text-xs leading-6 text-[#879187]">
                  Previous package states are saved automatically when you update this package.
                  Restore any version as a draft; the live website will not change until you publish it.
                </p>
              </div>
              <span className="border border-[#e6e9e1] px-3 py-2 text-[10px] uppercase tracking-wider text-[#66766a]">
                {versions.length} saved {versions.length === 1 ? "version" : "versions"}
              </span>
            </div>

            {versionMessage && (
              <p className="mt-5 border border-[#d8e7db] bg-[#edf5ed] px-4 py-3 text-xs text-[#376448]">
                {versionMessage}
              </p>
            )}
            {versionsError && (
              <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {versionsError}
              </p>
            )}

            {versionsLoading ? (
              <p className="mt-6 text-sm text-[#879187]">Loading version history...</p>
            ) : versions.length > 0 ? (
              <div className="mt-6 divide-y divide-[#edf0e9] border-y border-[#edf0e9]">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-lg text-[#174b38]">
                          Version {version.version}
                        </h3>
                        {index === 0 && (
                          <span className="bg-[#e7eee4] px-2.5 py-1 text-[9px] uppercase tracking-wider text-[#376448]">
                            Latest snapshot
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#66766a]">
                        {version.changeNote || "Package update"}
                      </p>
                      <p className="mt-2 text-[10px] text-[#9aa398]">
                        {version.createdAt
                          ? new Date(version.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Date unavailable"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreVersion(version)}
                      disabled={Boolean(restoringVersion)}
                      className="border border-[#174b38] px-4 py-3 text-xs text-[#174b38] transition hover:bg-[#174b38] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {restoringVersion === version.id
                        ? "Restoring..."
                        : "Restore as draft"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 bg-[#f7f8f4] p-5 text-sm leading-6 text-[#66766a]">
                No previous versions have been saved yet. The first snapshot is created automatically when you save an update to this existing package.
              </p>
            )}
          </section>
        )}

        {isEditing && (
          <PackageSchedulePanel
            packageId={id}
            currentStatus={
              form.status === "Published"
                ? "PUBLISHED"
                : form.status === "Scheduled"
                  ? "SCHEDULED"
                  : "DRAFT"
            }
            scheduledAt={packageMeta.scheduledAt}
            onStatusChange={(nextStatus, nextScheduledAt) => {
              setForm((previous) => ({ ...previous, status: nextStatus }));
              setPackageMeta((previous) => ({
                ...previous,
                scheduledAt: nextScheduledAt || null,
              }));
              setSuccessMessage("");
            }}
          />
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 mt-9">
          <button
            onClick={() => navigate("/admin/packages")}
            className="text-xs text-[#778277] underline"
          >
            ← Back to package library
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleSave("Draft")}
              disabled={saving || loading}
              className="border border-[#dfe3d9] bg-white px-6 py-4 text-xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={() => handleSave("Published")}
              disabled={saving || loading}
              className="bg-[#174b38] text-white px-7 py-4 text-xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & publish →"}
            </button>
          </div>
        </div>
      </main>

      {mediaPickerOpen && (
        <MediaAssetPicker
          title="Choose package cover image"
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(asset) => {
            setPackageMeta((previous) => ({ ...previous, image: asset.url }));
            setSuccessMessage("");
          }}
        />
      )}
    </div>
  );
};

export default EditPackage;
