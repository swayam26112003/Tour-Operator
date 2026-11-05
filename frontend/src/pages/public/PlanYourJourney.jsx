import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  destination: "Not sure yet",
  travelDate: "",
  travellers: "2 adults",
  budget: "Not decided",
  style: "A little of everything",
  message: "",
  consent: false,
};

const PlanYourJourney = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.consent) {
      setError(
        "Please agree to be contacted about this enquiry before sending.",
      );
      return;
    }

    const message = [
      `Preferred destination: ${form.destination}`,
      `Travel style: ${form.style}`,
      `Approximate budget per person: ${form.budget}`,
      form.message.trim() ? `Additional details: ${form.message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      setSubmitting(true);
      setError("");

      // Keep the payload consistent with the existing package enquiry form.
      // A custom enquiry deliberately has no packageId.
      await api.post("/enquiries", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        travelDate: form.travelDate || undefined,
        travellers: form.travellers,
        message,
        contactConsent: form.consent,
      });

      setSubmitted(true);
    } catch (requestError) {
      console.error("Custom journey enquiry error:", requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "We couldn't send your enquiry. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f8f2] text-[#244536]">
      <section className="bg-[#e9eddf] px-6 py-16 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-[10px] uppercase tracking-[3px] text-[#9b835e]">
            Personal planning · From our local team
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-tight text-[#174b38] md:text-7xl">
            Let's make a journey that feels like yours.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#718075] md:text-base">
            Tell us a little about the trip you have in mind. A local travel
            consultant will use these details to help shape your journey.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-6 py-14 md:px-12 lg:grid-cols-[0.75fr_1.25fr] lg:py-20">
        <aside>
          <h2 className="font-serif text-3xl text-[#174b38]">
            Thoughtfully local. Beautifully yours.
          </h2>
          <p className="mt-5 text-sm leading-8 text-[#718075]">
            You don't need to have every detail figured out. Share your
            destination, dates, group size and interests. We'll take it from
            there.
          </p>
          <div className="mt-8 border-l-2 border-[#c4b18d] pl-5">
            <p className="text-xs leading-6 text-[#718075]">
              No payment is taken here. Your request is sent to the enquiry
              inbox so the team can follow up with you.
            </p>
          </div>
          <Link
            to="/journeys"
            className="mt-8 inline-flex text-xs text-[#174b38] underline"
          >
            Browse ready-made journeys →
          </Link>
        </aside>

        <div className="border border-[#e6e8df] bg-white p-6 md:p-10">
          {submitted ? (
            <div className="py-14 text-center">
              <span className="text-4xl text-[#78966e]">✓</span>
              <h2 className="mt-6 font-serif text-3xl text-[#174b38]">
                Thank you. Your enquiry is with us.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#718075]">
                Our team has received your custom journey request and will
                contact you using the details you provided.
              </p>
              <Link
                to="/"
                className="mt-8 inline-block bg-[#174b38] px-7 py-4 text-xs text-white transition hover:bg-[#28634e]"
              >
                Back to homepage →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Your name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Your full name"
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Email address
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Phone / WhatsApp
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+91 98XXX XX410"
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Where would you like to go?
                  </label>
                  <select
                    value={form.destination}
                    onChange={(event) =>
                      update("destination", event.target.value)
                    }
                    className="w-full border-b border-[#dfe3d9] bg-transparent py-3 text-sm outline-none"
                  >
                    <option>Not sure yet</option>
                    <option>Kerala</option>
                    <option>Tamil Nadu</option>
                    <option>Karnataka</option>
                    <option>Across South India</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Preferred travel date
                  </label>
                  <input
                    type="date"
                    value={form.travelDate}
                    onChange={(event) =>
                      update("travelDate", event.target.value)
                    }
                    className="w-full border-b border-[#dfe3d9] py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Travellers
                  </label>
                  <select
                    value={form.travellers}
                    onChange={(event) =>
                      update("travellers", event.target.value)
                    }
                    className="w-full border-b border-[#dfe3d9] bg-transparent py-3 text-sm outline-none"
                  >
                    <option>1 adult</option>
                    <option>2 adults</option>
                    <option>2 adults, 1 child</option>
                    <option>2 adults, 2 children</option>
                    <option>3 adults</option>
                    <option>4 adults</option>
                    <option>5+ travellers</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    Approximate budget per person
                  </label>
                  <select
                    value={form.budget}
                    onChange={(event) => update("budget", event.target.value)}
                    className="w-full border-b border-[#dfe3d9] bg-transparent py-3 text-sm outline-none"
                  >
                    <option>Not decided</option>
                    <option>Under ₹30,000</option>
                    <option>₹30,000 – ₹60,000</option>
                    <option>₹60,000 – ₹1,00,000</option>
                    <option>Above ₹1,00,000</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                    What kind of trip?
                  </label>
                  <select
                    value={form.style}
                    onChange={(event) => update("style", event.target.value)}
                    className="w-full border-b border-[#dfe3d9] bg-transparent py-3 text-sm outline-none"
                  >
                    <option>A little of everything</option>
                    <option>Family holiday</option>
                    <option>Honeymoon</option>
                    <option>Culture and heritage</option>
                    <option>Nature and hills</option>
                    <option>Small group journey</option>
                    <option>Food and local experiences</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[10px] uppercase tracking-[2px] text-[#778277]">
                  Tell us a little more
                </label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  placeholder="Places you would love to see, preferred pace, hotel preferences, special occasions..."
                  className="w-full resize-y border-b border-[#dfe3d9] py-3 text-sm outline-none focus:border-[#174b38]"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-xs leading-6 text-[#778277]">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => {
                    update("consent", event.target.checked);
                    setError("");
                  }}
                  className="mt-1 accent-[#174b38]"
                />
                <span>
                  I agree to be contacted about this enquiry by email or phone.
                  This does not subscribe me to marketing messages.
                </span>
              </label>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#174b38] py-5 text-xs tracking-[1px] text-white transition hover:bg-[#28634e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Sending your request..."
                  : "Send my journey request →"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default PlanYourJourney;
