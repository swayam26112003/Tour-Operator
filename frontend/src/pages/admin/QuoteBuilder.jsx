import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateOnly = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const statusStyles = {
  DRAFT: "bg-[#f2eee5] text-[#927448]",
  SENT: "bg-[#e8eee5] text-[#376448]",
  ACCEPTED: "bg-[#dcebe0] text-[#245b38]",
  REJECTED: "bg-[#f5e8e5] text-[#a34f42]",
  EXPIRED: "bg-[#eeeeeb] text-[#77786f]",
};

const today = dateOnly(new Date());
const defaultValidity = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return dateOnly(date);
})();

const emptyForm = {
  enquiryId: "",
  packageId: "",
  travellerName: "",
  travellerEmail: "",
  travellerPhone: "",
  travelDate: "",
  returnDate: "",
  numberOfAdults: 2,
  numberOfChildren: 0,
  hotelCategory: "DELUXE",
  travelSeason: "PEAK",
  pricingBasis: "PER_PERSON",
  discountAmount: "0",
  validUntil: defaultValidity,
  notes: "",
  terms: "Subject to availability and confirmation.",
};

const QuoteBuilder = () => {
  const [quotes, setQuotes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [workingId, setWorkingId] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [quoteResponse, packageResponse, enquiryResponse] =
        await Promise.all([
          api.get("/quotes"),
          api.get("/packages", { params: { status: "PUBLISHED" } }),
          api.get("/enquiries"),
        ]);

      setQuotes(quoteResponse.data?.data || []);
      setPackages(packageResponse.data?.data || []);
      setEnquiries(enquiryResponse.data?.data || []);
    } catch (err) {
      console.error("Unable to load quote builder data:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load quotation data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === form.packageId),
    [packages, form.packageId],
  );

  const matchingSeasonalPrice = useMemo(() => {
    if (!selectedPackage || !form.travelDate) return null;
    const selectedDate = new Date(`${form.travelDate}T00:00:00`);
    return (selectedPackage.seasonalPrices || []).find((price) => {
      const from = new Date(price.validFrom);
      const to = new Date(price.validTo);
      return (
        price.season === form.travelSeason &&
        price.hotelCategory === form.hotelCategory &&
        selectedDate >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) &&
        selectedDate <= new Date(to.getFullYear(), to.getMonth(), to.getDate())
      );
    }) || null;
  }, [selectedPackage, form.travelDate, form.travelSeason, form.hotelCategory]);

  const estimatedUnitPrice = matchingSeasonalPrice
    ? Number(
        form.pricingBasis === "TWIN_SHARING"
          ? matchingSeasonalPrice.priceTwinSharing
          : matchingSeasonalPrice.pricePerPerson,
      )
    : null;

  const estimatedSubtotal =
    estimatedUnitPrice === null
      ? null
      : estimatedUnitPrice * (Number(form.numberOfAdults) || 0);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "enquiryId") {
      const enquiry = enquiries.find((item) => item.id === value);
      if (enquiry) {
        setForm((current) => ({
          ...current,
          enquiryId: value,
          travellerName: enquiry.name || current.travellerName,
          travellerEmail: enquiry.email || current.travellerEmail,
          travellerPhone: enquiry.phone || current.travellerPhone,
          packageId: enquiry.packageId || current.packageId,
          travelDate: dateOnly(enquiry.travelDate) || current.travelDate,
        }));
      }
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.packageId) {
      setError("Please select a published package.");
      return;
    }
    if (!form.travelDate || !matchingSeasonalPrice) {
      setError(
        "No matching seasonal price exists for this travel date, season and hotel category. Check the package pricing first.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const payload = {
        enquiryId: form.enquiryId || undefined,
        packageId: form.packageId,
        travellerName: form.travellerName.trim(),
        travellerEmail: form.travellerEmail.trim(),
        travellerPhone: form.travellerPhone.trim(),
        travelDate: form.travelDate,
        returnDate: form.returnDate || undefined,
        numberOfAdults: Number(form.numberOfAdults),
        numberOfChildren: Number(form.numberOfChildren),
        hotelCategory: form.hotelCategory,
        travelSeason: form.travelSeason,
        pricingBasis: form.pricingBasis,
        currency: "INR",
        discountAmount: Number(form.discountAmount || 0),
        validUntil: form.validUntil,
        notes: form.notes,
        terms: form.terms,
        snapshot: {
          packageTitle: selectedPackage.title,
          destination: selectedPackage.destination,
          duration: selectedPackage.duration,
        },
        items: [
          {
            description: `${selectedPackage.title} package`,
            quantity: Number(form.numberOfAdults),
            // The backend replaces this value with the selected database rate.
            unitPrice: 0,
          },
        ],
      };

      const response = await api.post("/quotes", payload);
      const created = response.data?.data;
      setNotice(`Quotation ${created?.quoteNumber || ""} created as a draft.`);
      setShowForm(false);
      setForm(emptyForm);
      await loadData();
      if (created?.id) {
        const detail = await api.get(`/quotes/${created.id}`);
        setSelectedQuote(detail.data?.data || created);
      }
    } catch (err) {
      console.error("Unable to create quotation:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create quotation.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openQuote = async (id) => {
    try {
      setWorkingId(id);
      setError("");
      const response = await api.get(`/quotes/${id}`);
      setSelectedQuote(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to open quotation.");
    } finally {
      setWorkingId("");
    }
  };

  const changeStatus = async (id, status) => {
    try {
      setWorkingId(id);
      setError("");
      const response = await api.patch(`/quotes/${id}/status`, { status });
      setSelectedQuote(response.data?.data || selectedQuote);
      await loadData();
      setNotice(`Quotation status changed to ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update quote status.");
    } finally {
      setWorkingId("");
    }
  };

  const generatePdf = async (quote) => {
    try {
      setWorkingId(quote.id);
      setError("");
      const response = await api.post(`/quotes/${quote.id}/pdf`);
      const pdfUrl = response.data?.data?.pdfUrl;
      if (!pdfUrl) throw new Error("The server did not return a PDF link.");

      const apiRoot = (api.defaults.baseURL || "http://localhost:5000/api")
        .replace(/\/api\/?$/, "");
      window.open(`${apiRoot}${pdfUrl}`, "_blank", "noopener,noreferrer");

      if (quote.status === "DRAFT") {
        const statusResponse = await api.patch(`/quotes/${quote.id}/status`, {
          status: "SENT",
        });
        setSelectedQuote(statusResponse.data?.data || quote);
      }
      await loadData();
      setNotice("PDF generated. The quotation is now marked as sent.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate quotation PDF.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const copyShareLink = async (quote) => {
    const apiBase = (api.defaults.baseURL || "http://localhost:5000/api").replace(/\/$/, "");
    const url = `${apiBase}/quotes/public/${quote.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Public quotation link copied.");
    } catch {
      setError("Unable to copy the link. Please copy it from the browser address manually.");
    }
  };

  const summary = useMemo(() => {
    return {
      total: quotes.length,
      drafts: quotes.filter((quote) => quote.status === "DRAFT").length,
      sent: quotes.filter((quote) => quote.status === "SENT").length,
      accepted: quotes.filter((quote) => quote.status === "ACCEPTED").length,
    };
  }, [quotes]);

  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <header className="border-b border-[#e6e9e1] bg-white px-6 py-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#929b90]">
              Administration / Workspace
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#174b38]">
              Quote builder
            </h1>
            <p className="mt-2 text-xs text-[#849084]">
              Prepare clear, package-linked travel quotations for your guests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedQuote(null);
              setError("");
              setNotice("");
              setShowForm(true);
            }}
            className="bg-[#174b38] px-6 py-3 text-xs text-white transition hover:bg-[#245d45]"
          >
            + Create quotation
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-7 px-6 py-8 md:px-10">
        {error && (
          <div className="border border-[#e8c9c2] bg-[#fbefec] px-4 py-3 text-sm text-[#994c40]">
            {error}
          </div>
        )}
        {notice && (
          <div className="border border-[#d6e3d5] bg-[#edf3eb] px-4 py-3 text-sm text-[#376448]">
            {notice}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["All quotations", summary.total],
            ["Drafts", summary.drafts],
            ["Sent", summary.sent],
            ["Accepted", summary.accepted],
          ].map(([label, value]) => (
            <div key={label} className="border border-[#e6e9e1] bg-white p-5">
              <p className="text-[10px] uppercase tracking-[1.5px] text-[#929b90]">
                {label}
              </p>
              <p className="mt-3 font-serif text-3xl text-[#174b38]">{value}</p>
            </div>
          ))}
        </section>

        {showForm && (
          <section className="border border-[#e6e9e1] bg-white">
            <div className="flex items-center justify-between border-b border-[#e6e9e1] px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#a17e50]">
                  New quotation
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#174b38]">
                  Traveller and trip details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-[#7c887d] hover:text-[#174b38]"
              >
                Close ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-7 p-6">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[1.5px] text-[#879187]">
                  Link an enquiry (optional)
                </label>
                <select
                  value={form.enquiryId}
                  onChange={(event) => updateField("enquiryId", event.target.value)}
                  className="w-full border border-[#dfe3d9] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                >
                  <option value="">Create without linking an enquiry</option>
                  {enquiries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.email} · {item.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="mb-4 font-serif text-xl text-[#174b38]">
                  Traveller details
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["travellerName", "Full name", "text"],
                    ["travellerEmail", "Email address", "email"],
                    ["travellerPhone", "Phone number", "tel"],
                  ].map(([field, label, type]) => (
                    <label key={field} className="block">
                      <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                        {label}
                      </span>
                      <input
                        required
                        type={type}
                        value={form[field]}
                        onChange={(event) => updateField(field, event.target.value)}
                        className="w-full border border-[#dfe3d9] p-3 text-sm outline-none focus:border-[#174b38]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-serif text-xl text-[#174b38]">
                  Journey details
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block md:col-span-3">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Published package
                    </span>
                    <select
                      required
                      value={form.packageId}
                      onChange={(event) => updateField("packageId", event.target.value)}
                      className="w-full border border-[#dfe3d9] bg-white p-3 text-sm outline-none focus:border-[#174b38]"
                    >
                      <option value="">Choose a package</option>
                      {packages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {item.destination}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Travel date
                    </span>
                    <input
                      required
                      type="date"
                      min={today}
                      value={form.travelDate}
                      onChange={(event) => updateField("travelDate", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Return date
                    </span>
                    <input
                      type="date"
                      min={form.travelDate || today}
                      value={form.returnDate}
                      onChange={(event) => updateField("returnDate", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Quote valid until
                    </span>
                    <input
                      required
                      type="date"
                      min={today}
                      value={form.validUntil}
                      onChange={(event) => updateField("validUntil", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Adults
                    </span>
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.numberOfAdults}
                      onChange={(event) => updateField("numberOfAdults", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Children
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.numberOfChildren}
                      onChange={(event) => updateField("numberOfChildren", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Hotel category
                    </span>
                    <select
                      value={form.hotelCategory}
                      onChange={(event) => updateField("hotelCategory", event.target.value)}
                      className="w-full border border-[#dfe3d9] bg-white p-3 text-sm outline-none"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="DELUXE">Deluxe</option>
                      <option value="PREMIUM">Premium</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Travel season
                    </span>
                    <select
                      value={form.travelSeason}
                      onChange={(event) => updateField("travelSeason", event.target.value)}
                      className="w-full border border-[#dfe3d9] bg-white p-3 text-sm outline-none"
                    >
                      <option value="OFF_SEASON">Off season</option>
                      <option value="MONSOON">Monsoon</option>
                      <option value="PEAK">Peak</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Pricing basis
                    </span>
                    <select
                      value={form.pricingBasis}
                      onChange={(event) => updateField("pricingBasis", event.target.value)}
                      className="w-full border border-[#dfe3d9] bg-white p-3 text-sm outline-none"
                    >
                      <option value="PER_PERSON">Per person</option>
                      <option value="TWIN_SHARING">Twin sharing</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                      Discount (₹)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountAmount}
                      onChange={(event) => updateField("discountAmount", event.target.value)}
                      className="w-full border border-[#dfe3d9] p-3 text-sm outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                    Additional notes
                  </span>
                  <textarea
                    rows="3"
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className="w-full resize-y border border-[#dfe3d9] p-3 text-sm outline-none"
                    placeholder="Special requests or details for this traveller"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[1.2px] text-[#879187]">
                    Terms and conditions
                  </span>
                  <textarea
                    rows="3"
                    value={form.terms}
                    onChange={(event) => updateField("terms", event.target.value)}
                    className="w-full resize-y border border-[#dfe3d9] p-3 text-sm outline-none"
                  />
                </label>
              </div>

              <div className="border border-[#e6e9e1] bg-[#f8f8f2] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#9b835e]">
                      Database seasonal rate
                    </p>
                    <p className="mt-2 font-serif text-2xl text-[#174b38]">
                      {estimatedUnitPrice === null
                        ? "Rate not available"
                        : money(estimatedUnitPrice)}
                    </p>
                    <p className="mt-1 text-xs text-[#849084]">
                      {matchingSeasonalPrice
                        ? `${form.pricingBasis === "TWIN_SHARING" ? "Twin sharing" : "Per person"} · ${form.hotelCategory} · ${form.travelSeason}`
                        : "Select a package, date, season and hotel category with a matching saved price."}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#9b835e]">
                      Indicative subtotal
                    </p>
                    <p className="mt-2 font-serif text-2xl text-[#174b38]">
                      {estimatedSubtotal === null ? "—" : money(estimatedSubtotal)}
                    </p>
                    <p className="mt-1 text-xs text-[#849084]">
                      {form.numberOfAdults} adult(s); GST calculated by server
                    </p>
                  </div>
                </div>
                {matchingSeasonalPrice && (
                  <p className="mt-4 border-t border-[#e1e5dc] pt-3 text-xs text-[#66766a]">
                    GST rate from saved package pricing: {matchingSeasonalPrice.gstPercentage}%.
                    Final totals and GST are recalculated by the backend when you save.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[#e6e9e1] pt-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-[#dfe3d9] px-6 py-3 text-xs text-[#66766a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !matchingSeasonalPrice}
                  className="bg-[#174b38] px-7 py-3 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create draft quotation"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="border border-[#e6e9e1] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e9e1] px-6 py-5">
            <div>
              <p className="text-[10px] uppercase tracking-[1.5px] text-[#a17e50]">
                Quotations
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#174b38]">
                Recent quotes
              </h2>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="border border-[#dfe3d9] px-4 py-2 text-xs text-[#66766a] hover:border-[#174b38]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-8 text-sm text-[#849084]">Loading quotations...</p>
          ) : quotes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-serif text-xl text-[#174b38]">
                No quotations yet
              </p>
              <p className="mt-2 text-sm text-[#849084]">
                Create a quotation from a published package to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#f8f8f2]">
                  <tr className="text-[10px] uppercase tracking-[1.2px] text-[#929b90]">
                    <th className="px-6 py-4 font-medium">Quote</th>
                    <th className="px-6 py-4 font-medium">Traveller</th>
                    <th className="px-6 py-4 font-medium">Package</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="border-t border-[#edf0e9]">
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#174b38]">{quote.quoteNumber}</p>
                        <p className="mt-1 text-[11px] text-[#929b90]">
                          {dateOnly(quote.createdAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#354b3d]">{quote.travellerName}</p>
                        <p className="mt-1 text-[11px] text-[#929b90]">
                          {quote.travellerEmail}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#66766a]">
                        {quote.package?.title || quote.snapshot?.packageTitle || "Custom quote"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#174b38]">
                        {money(quote.totalAmount, quote.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-[1px] ${statusStyles[quote.status] || statusStyles.DRAFT}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={workingId === quote.id}
                          onClick={() => openQuote(quote.id)}
                          className="text-xs text-[#376448] underline underline-offset-4 disabled:opacity-50"
                        >
                          {workingId === quote.id ? "Opening..." : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedQuote && (
          <section className="border border-[#e6e9e1] bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e9e1] px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#a17e50]">
                  Quotation details
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#174b38]">
                  {selectedQuote.quoteNumber}
                </h2>
                <p className="mt-1 text-xs text-[#849084]">
                  {selectedQuote.travellerName} · {selectedQuote.travellerEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="text-sm text-[#7c887d]"
              >
                Close ×
              </button>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="space-y-2 text-sm text-[#66766a]">
                <p><span className="text-[#929b90]">Package:</span> {selectedQuote.package?.title || selectedQuote.snapshot?.packageTitle || "Custom quote"}</p>
                <p><span className="text-[#929b90]">Travel date:</span> {dateOnly(selectedQuote.travelDate) || "—"}</p>
                <p><span className="text-[#929b90]">Travellers:</span> {selectedQuote.numberOfAdults} adults, {selectedQuote.numberOfChildren} children</p>
                <p><span className="text-[#929b90]">Hotel:</span> {selectedQuote.hotelCategory || "—"}</p>
                <p><span className="text-[#929b90]">Season:</span> {selectedQuote.travelSeason || "—"}</p>
                <p><span className="text-[#929b90]">Valid until:</span> {dateOnly(selectedQuote.validUntil)}</p>
              </div>
              <div className="bg-[#f8f8f2] p-5 text-sm">
                <div className="flex justify-between py-1 text-[#66766a]">
                  <span>Subtotal</span><span>{money(selectedQuote.subtotal, selectedQuote.currency)}</span>
                </div>
                <div className="flex justify-between py-1 text-[#66766a]">
                  <span>Discount</span><span>− {money(selectedQuote.discountAmount, selectedQuote.currency)}</span>
                </div>
                <div className="flex justify-between py-1 text-[#66766a]">
                  <span>GST ({selectedQuote.gstPercentage}%)</span><span>{money(selectedQuote.gstAmount, selectedQuote.currency)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-[#e1e5dc] pt-3 font-medium text-[#174b38]">
                  <span>Grand total</span><span>{money(selectedQuote.totalAmount, selectedQuote.currency)}</span>
                </div>
              </div>
            </div>
            {selectedQuote.items?.length > 0 && (
              <div className="px-6 pb-5">
                <h3 className="mb-3 text-[10px] uppercase tracking-[1.5px] text-[#929b90]">
                  Price breakdown
                </h3>
                {selectedQuote.items.map((item) => (
                  <div key={item.id} className="flex justify-between border-t border-[#edf0e9] py-3 text-sm text-[#66766a]">
                    <span>{item.description} × {item.quantity}</span>
                    <span>{money(item.totalPrice, selectedQuote.currency)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-t border-[#e6e9e1] p-6">
              <button
                type="button"
                disabled={workingId === selectedQuote.id}
                onClick={() => generatePdf(selectedQuote)}
                className="bg-[#174b38] px-5 py-3 text-xs text-white disabled:opacity-50"
              >
                {workingId === selectedQuote.id ? "Working..." : "Generate / download PDF"}
              </button>
              <button
                type="button"
                onClick={() => copyShareLink(selectedQuote)}
                className="border border-[#dfe3d9] px-5 py-3 text-xs text-[#376448]"
              >
                Copy public quote link
              </button>
              {selectedQuote.status === "SENT" && (
                <>
                  <button
                    type="button"
                    onClick={() => changeStatus(selectedQuote.id, "ACCEPTED")}
                    className="border border-[#d6e3d5] px-5 py-3 text-xs text-[#376448]"
                  >
                    Mark accepted
                  </button>
                  <button
                    type="button"
                    onClick={() => changeStatus(selectedQuote.id, "REJECTED")}
                    className="border border-[#e8c9c2] px-5 py-3 text-xs text-[#994c40]"
                  >
                    Mark rejected
                  </button>
                </>
              )}
              {selectedQuote.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => changeStatus(selectedQuote.id, "SENT")}
                  className="border border-[#dfe3d9] px-5 py-3 text-xs text-[#376448]"
                >
                  Mark as sent
                </button>
              )}
            </div>
            <p className="px-6 pb-6 text-[11px] leading-5 text-[#929b90]">
              Copy public quote link shares the backend's public quote-data endpoint. The PDF link is available after generating the PDF. This screen does not send email or WhatsApp messages.
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default QuoteBuilder;
