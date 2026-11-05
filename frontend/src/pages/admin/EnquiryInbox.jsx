
import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const toUiStatus = (value) => ({
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Closed",
  // Keep the legacy label readable if an older record exists.
  CLOSED: "Closed",
}[value] || value || "New");

const toApiStatus = (value) => ({
  New: "NEW",
  Contacted: "CONTACTED",
  "Follow-up": "FOLLOW_UP",
  Quoted: "QUOTED",
  Confirmed: "CONFIRMED",
  Closed: "CANCELLED",
}[value] || value);

const mapEnquiry = (item) => ({
  ...item,
  package: item.package?.title || "Custom enquiry",
  date: item.travelDate ? new Date(item.travelDate).toLocaleDateString("en-IN") : "Not specified",
  received: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "",
  status: toUiStatus(item.status),
  priority: item.priority ? "High" : "Normal",
  assigned: item.assignedTo?.name || "Unassigned",
  assignedToId: item.assignedToId || "",
  travellers: item.travellers || "Not specified",
  budget: item.budget || "Not specified",
});

const statusStyles = {
  New: "bg-[#e5eee5] text-[#376448]",
  Contacted: "bg-[#e7edf5] text-[#496b92]",
  "Follow-up": "bg-[#f5eddf] text-[#987442]",
  Quoted: "bg-[#f5eddf] text-[#987442]",
  Confirmed: "bg-[#e1eee8] text-[#276449]",
  Closed: "bg-[#eeeeeb] text-[#77786f]",
};

const EnquiryInbox = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [consultants, setConsultants] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [detailError, setDetailError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [messageSaving, setMessageSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiReplyDraft, setAiReplyDraft] = useState("");
  const [aiRecordSaving, setAiRecordSaving] = useState(false);
  const [aiDraftRecorded, setAiDraftRecorded] = useState(false);


  const loadEnquiries = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const response = await api.get("/enquiries");
      setEnquiries((response.data?.data || []).map(mapEnquiry));
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
    api.get("/users")
      .then((response) => setConsultants(response.data?.data || []))
      .catch(() => setConsultants([]));
  }, []);

  const loadEnquiryExtras = async (id) => {
    setDetailError("");
    try {
      const [notesResponse, messagesResponse] = await Promise.all([
        api.get(`/enquiries/${id}/notes`),
        api.get(`/enquiries/${id}/messages`),
      ]);
      setNotes(notesResponse.data?.data || []);
      setMessages(messagesResponse.data?.data || []);
    } catch (error) {
      setDetailError(error.response?.data?.message || "Could not load enquiry notes/messages.");
    }
  };

  const filters = [
    "All",
    "New",
    "Contacted",
    "Follow-up",
    "Quoted",
    "Confirmed",
    "Closed",
  ];

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      const matchesFilter =
        activeFilter === "All" || item.status === activeFilter;

      const matchesSearch =
        String(item.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.email || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.phone || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.id || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.package || "").toLowerCase().includes(search.toLowerCase()) ||
        String(item.assigned || "").toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [enquiries, activeFilter, search]);

  const updateEnquiry = async (id, field, value) => {
    const payload = {};
    if (field === "status") payload.status = toApiStatus(value);
    if (field === "priority") payload.priority = value === "High";
    if (field === "assigned") payload.assignedToId = value || null;
    try {
      setSaving(true);
      const response = await api.patch(`/enquiries/${id}`, payload);
      const updated = mapEnquiry(response.data?.data || {
        ...enquiries.find((item) => item.id === id),
        ...(field === "status" ? { status: toApiStatus(value) } : {}),
        ...(field === "priority" ? { priority: value === "High" } : {}),
        ...(field === "assigned" ? { assignedToId: value } : {}),
      });
      setEnquiries((previous) => previous.map((item) => item.id === id ? updated : item));
      setSelectedEnquiry(updated);
    } catch (error) {
      setDetailError(error.response?.data?.message || error.message || "Unable to update enquiry.");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedEnquiry || noteSaving) return;
    try {
      setNoteSaving(true);
      setDetailError("");
      const response = await api.post(`/enquiries/${selectedEnquiry.id}/notes`, {
        content: noteText.trim(),
      });
      if (response.data?.data) {
        setNotes((previous) => [response.data.data, ...previous]);
      }
      setNoteText("");
    } catch (error) {
      setDetailError(error.response?.data?.message || error.message || "Unable to save note.");
    } finally {
      setNoteSaving(false);
    }
  };

  const addMessage = async () => {
    if (!messageText.trim() || !selectedEnquiry || messageSaving) return;
    try {
      setMessageSaving(true);
      setDetailError("");
      const response = await api.post(`/enquiries/${selectedEnquiry.id}/messages`, {
        content: messageText.trim(),
        direction: "OUTBOUND",
      });
      if (response.data?.data) {
        setMessages((previous) => [...previous, response.data.data]);
      }
      setMessageText("");
    } catch (error) {
      setDetailError(error.response?.data?.message || error.message || "Unable to record message.");
    } finally {
      setMessageSaving(false);
    }
  };

  const runAIAssist = async () => {
    if (!selectedEnquiry) return;

    try {
      setAiLoading(true);
      setAiError("");
      const response = await api.post(`/enquiries/${selectedEnquiry.id}/ai-assist`, {}, { timeout: 120000 });
      const result = response.data?.data;

      if (!result) {
        throw new Error("The AI service returned an empty result.");
      }

      setAiResult(result);
      setAiReplyDraft(result.replyDraft || "");
      setAiDraftRecorded(false);
      setSelectedEnquiry((previous) => previous ? {
        ...previous,
        aiExtractedData: result.extractedData,
        aiSuggestedPackages: result.suggestedPackages,
        aiReplyDraft: result.replyDraft,
        aiProcessedAt: result.processedAt,
      } : previous);
      setEnquiries((previous) => previous.map((item) => item.id === selectedEnquiry.id
        ? mapEnquiry({
            ...item,
            aiExtractedData: result.extractedData,
            aiSuggestedPackages: result.suggestedPackages,
            aiReplyDraft: result.replyDraft,
            aiProcessedAt: result.processedAt,
          })
        : item));
    } catch (error) {
      setAiError(error.response?.data?.message || error.message || "Unable to process this enquiry with AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const copyAIDraft = async () => {
    if (!aiReplyDraft.trim()) return;
    try {
      await navigator.clipboard.writeText(aiReplyDraft);
    } catch {
      setAiError("Could not copy automatically. Select and copy the draft text manually.");
    }
  };

  const recordApprovedAIDraft = async () => {
    if (!selectedEnquiry || !aiReplyDraft.trim()) return;

    try {
      setAiRecordSaving(true);
      setAiError("");
      const response = await api.post(`/enquiries/${selectedEnquiry.id}/messages`, {
        content: aiReplyDraft.trim(),
        direction: "OUTBOUND",
      });
      if (response.data?.data) {
        setMessages((previous) => [...previous, response.data.data]);
      }
      setAiDraftRecorded(true);
    } catch (error) {
      setAiError(error.response?.data?.message || error.message || "Unable to record the approved draft.");
    } finally {
      setAiRecordSaving(false);
    }
  };

  const getCount = (status) => {
    if (status === "All") return enquiries.length;

    return enquiries.filter((item) => item.status === status).length;
  };


  const closeDetails = () => {
    setSelectedEnquiry(null);
    setNoteText("");
    setMessageText("");
    setAiResult(null);
    setAiReplyDraft("");
    setAiError("");
    setAiDraftRecorded(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f4]">

      {/* HEADER */}

      <header className="bg-white border-b border-[#e6e9e1] px-6 md:px-10 py-6">

        <div className="flex flex-wrap justify-between items-center gap-5">

          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#929b90]">
              Administration / Workspace
            </p>

            <h1 className="font-serif text-3xl text-[#174b38] mt-2">
              Enquiry inbox
            </h1>

            <p className="text-xs text-[#849084] mt-2">
              Manage customer enquiries and booking requests.
            </p>
          </div>

          <div className="bg-[#e8eee5] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[2px] text-[#718075]">
              New enquiries
            </p>

            <p className="font-serif text-3xl text-[#174b38] mt-2">
              {getCount("New")}
            </p>
          </div>

        </div>
      </header>

      {/* MAIN */}

      <main className="p-6 md:p-10 max-w-[1600px] mx-auto">

        {/* SUMMARY */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-9">

          {[
            ["Total enquiries", "All"],
            ["New", "New"],
            ["Contacted", "Contacted"],
            ["Quoted", "Quoted"],
            ["Confirmed", "Confirmed"],
          ].map(([label, status]) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`text-left bg-white border p-5 transition ${
                activeFilter === status
                  ? "border-[#174b38]"
                  : "border-[#e6e9e1]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">
                {label}
              </p>

              <p className="font-serif text-3xl text-[#174b38] mt-3">
                {getCount(status)}
              </p>
            </button>
          ))}

        </div>

        {/* INBOX */}

        <div className="bg-white border border-[#e6e9e1]">

          {/* TOOLBAR */}

          <div className="p-6 border-b border-[#e6e9e1]">

            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">

              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  Customer enquiries
                </h2>

                <p className="text-xs text-[#879187] mt-2">
                  Review, respond and manage incoming requests.
                </p>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or ID..."
                className="border border-[#e1e5dc] px-4 py-3 text-xs outline-none focus:border-[#174b38] w-full lg:w-[300px]"
              />

            </div>

            {/* FILTERS */}

            <div className="flex gap-5 overflow-x-auto mt-7">

              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`pb-3 text-xs whitespace-nowrap border-b-2 ${
                    activeFilter === filter
                      ? "border-[#174b38] text-[#174b38]"
                      : "border-transparent text-[#879187]"
                  }`}
                >
                  {filter}
                  <span className="ml-2 text-[10px]">
                    {getCount(filter)}
                  </span>
                </button>
              ))}

            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left">

              <thead className="bg-[#f8f9f5]">
                <tr className="text-[10px] uppercase tracking-[1.5px] text-[#849084]">
                  <th className="px-6 py-5 font-medium">Customer</th>
                  <th className="px-6 py-5 font-medium">Package</th>
                  <th className="px-6 py-5 font-medium">Travel date</th>
                  <th className="px-6 py-5 font-medium">Travellers</th>
                  <th className="px-6 py-5 font-medium">Received</th>
                  <th className="px-6 py-5 font-medium">Assigned consultant</th>
                  <th className="px-6 py-5 font-medium">Priority</th>
                  <th className="px-6 py-5 font-medium">Status</th>
                  <th className="px-6 py-5 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="px-6 py-12 text-center text-sm text-[#879187]">Loading enquiries...</td></tr>
                ) : loadError ? (
                  <tr><td colSpan="9" className="px-6 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
                ) : filteredEnquiries.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[#edf0e9] hover:bg-[#fafbf8]"
                  >

                    <td className="px-6 py-6">
                      <p className="text-sm text-[#244536]">
                        {item.name}
                      </p>

                      <p className="text-[10px] text-[#929b90] mt-2">
                        {item.id}
                      </p>
                    </td>

                    <td className="px-6 py-6 text-xs text-[#66766a] max-w-[190px]">
                      {item.package}
                    </td>

                    <td className="px-6 py-6 text-xs text-[#66766a]">
                      {item.date}
                    </td>

                    <td className="px-6 py-6 text-xs text-[#66766a]">
                      {item.travellers}
                    </td>

                    <td className="px-6 py-6 text-xs text-[#66766a]">
                      {item.received}
                    </td>

                    <td className="px-6 py-6 text-xs text-[#66766a]">
                      {item.assigned || "Unassigned"}
                    </td>

                    <td className="px-6 py-6">
                      <span className={`text-[10px] ${
                        item.priority === "High"
                          ? "text-red-600"
                          : item.priority === "Low"
                            ? "text-[#929b90]"
                            : "text-[#987442]"
                      }`}>
                        ● {item.priority}
                      </span>
                    </td>

                    <td className="px-6 py-6">
                      <span className={`px-3 py-2 text-[10px] ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-6">
                      <button
                        onClick={() => {
                          setSelectedEnquiry(item);
                          setNotes([]);
                          setMessages([]);
                          setNoteText("");
                          setMessageText("");
                          setDetailError("");
                          setAiError("");
                          setAiDraftRecorded(false);
                          const hasSavedAI = item.aiExtractedData || item.aiSuggestedPackages || item.aiReplyDraft;
                          setAiResult(hasSavedAI ? {
                            enquiryId: item.id,
                            extractedData: item.aiExtractedData || null,
                            suggestedPackages: item.aiSuggestedPackages || [],
                            replyDraft: item.aiReplyDraft || "",
                            processedAt: item.aiProcessedAt || null,
                          } : null);
                          setAiReplyDraft(item.aiReplyDraft || "");
                          loadEnquiryExtras(item.id);
                        }}
                        className="text-xs text-[#174b38] underline"
                      >
                        View details →
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>

            {filteredEnquiries.length === 0 && (
              <div className="py-20 text-center">
                <h3 className="font-serif text-2xl text-[#174b38]">
                  No enquiries found
                </h3>

                <p className="text-xs text-[#879187] mt-3">
                  Try changing your filters or search.
                </p>
              </div>
            )}

          </div>

          <div className="p-5 border-t border-[#e6e9e1] text-xs text-[#879187]">
            Showing {filteredEnquiries.length} of {enquiries.length} enquiries
          </div>

        </div>
      </main>

      {/* DETAIL PANEL */}

      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">

          <div className="bg-[#f8f9f5] w-full max-w-[600px] h-full overflow-y-auto shadow-2xl">

            {/* PANEL HEADER */}

            <div className="bg-white p-6 border-b border-[#e6e9e1] flex justify-between items-center">

              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-[#879187]">
                  Enquiry details
                </p>

                <h2 className="font-serif text-2xl text-[#174b38] mt-2">
                  {selectedEnquiry.id}
                </h2>
              </div>

              <button
                onClick={closeDetails}
                className="text-2xl text-[#879187]"
              >
                ×
              </button>

            </div>

            <div className="p-6 space-y-6">
              {detailError && <p className="bg-red-50 text-red-700 p-3 text-xs">{detailError}</p>}
              {saving && <p className="text-xs text-[#879187]">Saving changes...</p>}

              {/* CUSTOMER */}

              <section className="bg-white border border-[#e6e9e1] p-6">

                <h3 className="font-serif text-xl text-[#174b38] mb-5">
                  Customer information
                </h3>

                <div className="space-y-4 text-sm">

                  <div>
                    <p className="text-[10px] uppercase tracking-[1px] text-[#879187]">
                      Name
                    </p>
                    <p className="mt-2">{selectedEnquiry.name}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[1px] text-[#879187]">
                      Email
                    </p>
                    <a
                      href={`mailto:${selectedEnquiry.email}`}
                      className="mt-2 block text-[#174b38] underline"
                    >
                      {selectedEnquiry.email}
                    </a>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[1px] text-[#879187]">
                      Phone
                    </p>
                    <a
                      href={`tel:${selectedEnquiry.phone}`}
                      className="mt-2 block text-[#174b38]"
                    >
                      {selectedEnquiry.phone}
                    </a>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[1px] text-[#879187]">
                      Contact consent
                    </p>
                    <p className="mt-2 text-[#536c5c]">
                      {selectedEnquiry.contactConsent
                        ? `Given${selectedEnquiry.contactConsentAt ? ` · ${new Date(selectedEnquiry.contactConsentAt).toLocaleString("en-IN")}` : ""}`
                        : "Not recorded"}
                    </p>
                  </div>

                </div>
              </section>

              {/* AI ENQUIRY ASSISTANT */}

              <section className="bg-white border border-[#dfe8dc] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#879187]">Consultant workspace</p>
                    <h3 className="font-serif text-xl text-[#174b38] mt-2">AI enquiry assistant</h3>
                    <p className="text-xs leading-5 text-[#879187] mt-2 max-w-[360px]">
                      Extract requirements, review published package matches and prepare a reply for human review.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runAIAssist}
                    disabled={aiLoading}
                    className="bg-[#174b38] text-white px-5 py-3 text-xs disabled:opacity-60"
                  >
                    {aiLoading ? "Processing..." : aiResult ? "Run again" : "Run AI assistant"}
                  </button>
                </div>

                {aiError && <p className="mt-4 bg-red-50 border border-red-100 text-red-700 p-3 text-xs">{aiError}</p>}

                {aiLoading && (
                  <p className="mt-5 text-xs text-[#879187]">Analysing the enquiry and checking published packages...</p>
                )}

                {aiResult && !aiLoading && (
                  <div className="mt-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[1px] text-[#536c5c]">Extracted requirements</h4>
                        {aiResult.processedAt && <span className="text-[10px] text-[#929b90]">Processed {new Date(aiResult.processedAt).toLocaleString("en-IN")}</span>}
                      </div>
                      {aiResult.extractedData ? (
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ["Destination", aiResult.extractedData.destination],
                            ["Travel date", aiResult.extractedData.travelDate],
                            ["Return date", aiResult.extractedData.returnDate],
                            ["Duration", aiResult.extractedData.tripDurationDays ? `${aiResult.extractedData.tripDurationDays} days` : null],
                            ["Travellers", aiResult.extractedData.travellersText || [aiResult.extractedData.numberOfAdults ? `${aiResult.extractedData.numberOfAdults} adults` : null, aiResult.extractedData.numberOfChildren ? `${aiResult.extractedData.numberOfChildren} children` : null].filter(Boolean).join(", ")],
                            ["Budget", aiResult.extractedData.budgetText || (aiResult.extractedData.budgetMin || aiResult.extractedData.budgetMax ? `${aiResult.extractedData.currency || "INR"} ${aiResult.extractedData.budgetMin ?? "—"} to ${aiResult.extractedData.budgetMax ?? "—"}` : null)],
                            ["Travel style", aiResult.extractedData.travelStyle],
                            ["Hotel preference", aiResult.extractedData.hotelPreference],
                            ["Interests", (aiResult.extractedData.interests || []).join(", ")],
                            ["Pace", aiResult.extractedData.pace],
                          ].filter(([, value]) => value).map(([label, value]) => (
                            <div key={label} className="bg-[#f7f8f4] p-3 min-w-0">
                              <p className="text-[9px] uppercase tracking-[1px] text-[#879187]">{label}</p>
                              <p className="text-xs text-[#244536] mt-1 break-words">{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-[#879187]">No extracted requirements were saved.</p>}

                      {(aiResult.extractedData?.specialRequirements || []).length > 0 && (
                        <div className="mt-3 bg-[#f7f8f4] p-3">
                          <p className="text-[9px] uppercase tracking-[1px] text-[#879187]">Special requirements</p>
                          <p className="text-xs text-[#244536] mt-1">{aiResult.extractedData.specialRequirements.join(" · ")}</p>
                        </div>
                      )}

                      {(aiResult.extractedData?.missingInformation || []).length > 0 && (
                        <div className="mt-3 border border-[#efe3cd] bg-[#fcf9f2] p-3">
                          <p className="text-[9px] uppercase tracking-[1px] text-[#987442]">Details to confirm with customer</p>
                          <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-[#765f3d]">
                            {aiResult.extractedData.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-[1px] text-[#536c5c] mb-3">Suggested published packages</h4>
                      {(aiResult.suggestedPackages || []).length > 0 ? (
                        <div className="space-y-3">
                          {aiResult.suggestedPackages.map((pkg) => (
                            <div key={pkg.packageId} className="border border-[#e6e9e1] p-4">
                              <div className="flex flex-wrap justify-between gap-2">
                                <div>
                                  <p className="text-sm text-[#244536]">{pkg.title}</p>
                                  <p className="text-[10px] text-[#879187] mt-1">{[pkg.destination, pkg.duration, pkg.category].filter(Boolean).join(" · ")}</p>
                                </div>
                                <span className="text-[10px] text-[#376448]">{pkg.matchScore}% match</span>
                              </div>
                              {(pkg.reasons || []).length > 0 && <p className="text-xs text-[#66766a] mt-3">{pkg.reasons.join(" · ")}</p>}
                              {(pkg.priceOptions || []).length > 0 ? (
                                <div className="mt-3 pt-3 border-t border-[#edf0e9] space-y-2">
                                  <p className="text-[9px] uppercase tracking-[1px] text-[#879187]">Seasonal rates from the package database</p>
                                  {pkg.priceOptions.map((price, index) => (
                                    <div key={`${price.season}-${price.hotelCategory}-${index}`} className="text-xs text-[#536c5c]">
                                      <span className="font-medium">₹{Number(price.pricePerPerson).toLocaleString("en-IN")} / person</span>
                                      <span className="text-[#879187]"> · {price.season} · {price.hotelCategory} · GST {price.gstPercentage}%</span>
                                      <p className="text-[10px] text-[#929b90] mt-1">Valid {price.validFrom} to {price.validTo}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-[10px] text-[#987442] mt-3">{pkg.pricingNote || "No matching seasonal rate is configured. Confirm with the package team before quoting."}</p>}
                              <p className="text-[10px] text-[#929b90] mt-3">{pkg.pricingNote}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="bg-[#f7f8f4] p-4 text-xs leading-5 text-[#66766a]">
                          No direct match was found among the currently published packages. Review the extracted destination and package catalogue before recommending an option.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[1px] text-[#536c5c]">Suggested reply draft</h4>
                        <span className="text-[9px] uppercase tracking-[1px] text-[#987442]">Not sent</span>
                      </div>
                      <textarea
                        rows={9}
                        value={aiReplyDraft}
                        onChange={(event) => {
                          setAiReplyDraft(event.target.value);
                          setAiDraftRecorded(false);
                        }}
                        className="w-full border border-[#e1e5dc] p-3 text-sm leading-6 text-[#536c5c] outline-none focus:border-[#174b38] resize-y"
                        placeholder="The AI reply draft will appear here. Review and edit it before approval."
                      />
                      <div className="flex flex-wrap gap-3 mt-3">
                        <button type="button" onClick={copyAIDraft} disabled={!aiReplyDraft.trim()} className="border border-[#174b38] text-[#174b38] px-4 py-3 text-xs disabled:opacity-50">Copy draft</button>
                        <button type="button" onClick={recordApprovedAIDraft} disabled={!aiReplyDraft.trim() || aiRecordSaving || aiDraftRecorded} className="bg-[#174b38] text-white px-4 py-3 text-xs disabled:opacity-50">
                          {aiRecordSaving ? "Saving..." : aiDraftRecorded ? "Recorded in history" : "Approve & record in history"}
                        </button>
                      </div>
                      <p className="text-[10px] leading-5 text-[#879187] mt-3">
                        Approval records your reviewed text as an outbound entry in message history. It does not send an email or WhatsApp message.
                      </p>
                    </div>
                  </div>
                )}

                {!aiResult && !aiLoading && (
                  <p className="mt-5 bg-[#f7f8f4] p-4 text-xs leading-5 text-[#66766a]">
                    Run the assistant to extract the customer&apos;s requirements, find relevant published packages and prepare an editable reply draft.
                  </p>
                )}
              </section>

              {/* TRAVEL DETAILS */}

              <section className="bg-white border border-[#e6e9e1] p-6">

                <h3 className="font-serif text-xl text-[#174b38] mb-5">
                  Travel requirements
                </h3>

                <div className="grid grid-cols-2 gap-5 text-sm">

                  <div>
                    <p className="text-[10px] text-[#879187] uppercase">
                      Package
                    </p>
                    <p className="mt-2">{selectedEnquiry.package}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#879187] uppercase">
                      Travel date
                    </p>
                    <p className="mt-2">{selectedEnquiry.date}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#879187] uppercase">
                      Travellers
                    </p>
                    <p className="mt-2">{selectedEnquiry.travellers}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#879187] uppercase">
                      Budget
                    </p>
                    <p className="mt-2">{selectedEnquiry.budget}</p>
                  </div>

                </div>

                <div className="mt-6 bg-[#f7f8f4] p-4">
                  <p className="text-[10px] uppercase text-[#879187]">
                    Customer message
                  </p>

                  <p className="text-sm leading-7 mt-3 text-[#536c5c]">
                    {selectedEnquiry.message}
                  </p>
                </div>

              </section>

              {/* ASSIGNMENT */}

              <section className="bg-white border border-[#e6e9e1] p-6">

                <h3 className="font-serif text-xl text-[#174b38] mb-5">
                  Enquiry management
                </h3>

                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mb-3">
                  Enquiry status
                </label>

                <select
                  value={selectedEnquiry.status}
                  onChange={(e) =>
                    updateEnquiry(
                      selectedEnquiry.id,
                      "status",
                      e.target.value
                    )
                  }
                  className="w-full border border-[#e1e5dc] p-3 text-sm bg-white outline-none"
                >
                  {filters.slice(1).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>

                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mt-6 mb-3">
                  Assign consultant
                </label>

                <select
                  value={selectedEnquiry.assignedToId || ""}
                  onChange={(e) =>
                    updateEnquiry(
                      selectedEnquiry.id,
                      "assigned",
                      e.target.value
                    )
                  }
                  className="w-full border border-[#e1e5dc] p-3 text-sm bg-white outline-none"
                >
                  <option value="">Unassigned</option>
                  {consultants.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>

                <label className="block text-[10px] uppercase tracking-[1px] text-[#879187] mt-6 mb-3">
                  Priority
                </label>

                <select
                  value={selectedEnquiry.priority}
                  onChange={(e) =>
                    updateEnquiry(
                      selectedEnquiry.id,
                      "priority",
                      e.target.value
                    )
                  }
                  className="w-full border border-[#e1e5dc] p-3 text-sm bg-white outline-none"
                >
                  <option>Normal</option>
                  <option>High</option>
                </select>

              </section>

              <section className="bg-white border border-[#e6e9e1] p-6">
                <h3 className="font-serif text-xl text-[#174b38]">Need to prepare a quotation?</h3>
                <p className="text-xs leading-5 text-[#879187] mt-2 mb-5">
                  Create and save the formal package quotation in the dedicated Quote Builder.
                </p>
                <a href="/admin/quotes" className="inline-flex bg-[#174b38] text-white px-5 py-3 text-xs">
                  Open Quote Builder ↗
                </a>
              </section>

              <section className="bg-white border border-[#e6e9e1] p-6">
                <h3 className="font-serif text-xl text-[#174b38] mb-4">Internal notes</h3>
                <div className="space-y-3 mb-4">
                  {notes.map((note) => <div key={note.id} className="bg-[#f7f8f4] p-3 text-xs text-[#536c5c]"><p>{note.content}</p>{note.createdAt && <p className="text-[10px] text-[#929b90] mt-2">{new Date(note.createdAt).toLocaleString("en-IN")}</p>}</div>)}
                  {notes.length === 0 && <p className="text-xs text-[#879187]">No notes yet.</p>}
                </div>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} className="w-full border border-[#e1e5dc] p-3 text-sm" placeholder="Add an internal note..." />
                <button onClick={addNote} disabled={!noteText.trim() || noteSaving} className="mt-3 bg-[#174b38] text-white px-5 py-3 text-xs disabled:opacity-50">{noteSaving ? "Saving..." : "Save note"}</button>
              </section>

              <section className="bg-white border border-[#e6e9e1] p-6">
                <h3 className="font-serif text-xl text-[#174b38] mb-4">Message history</h3>
                <div className="space-y-3 mb-4">
                  {messages.map((message) => <div key={message.id} className="bg-[#f7f8f4] p-3 text-xs text-[#536c5c]"><span className="font-medium">{message.direction === "OUTBOUND" ? "Consultant reply" : "Customer message"}</span><p className="mt-1 whitespace-pre-wrap">{message.content}</p>{message.createdAt && <p className="text-[10px] text-[#929b90] mt-2">{new Date(message.createdAt).toLocaleString("en-IN")}</p>}</div>)}
                  {messages.length === 0 && <p className="text-xs text-[#879187]">No messages recorded.</p>}
                </div>
                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} className="w-full border border-[#e1e5dc] p-3 text-sm" placeholder="Record an outgoing message..." />
                <button onClick={addMessage} disabled={!messageText.trim() || messageSaving} className="mt-3 bg-[#174b38] text-white px-5 py-3 text-xs disabled:opacity-50">{messageSaving ? "Saving..." : "Record message"}</button>
                <p className="text-[10px] text-[#879187] mt-2">This records a message; it does not send an email or WhatsApp message.</p>
              </section>

              {/* CONTACT ACTIONS */}

              <div className="grid grid-cols-2 gap-3">

                <a
                  href={`mailto:${selectedEnquiry.email}`}
                  className="bg-[#174b38] text-white text-center py-4 text-xs"
                >
                  Email customer ↗
                </a>

                <a
                  href={`https://wa.me/${selectedEnquiry.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-[#174b38] text-[#174b38] text-center py-4 text-xs"
                >
                  WhatsApp ↗
                </a>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnquiryInbox;
