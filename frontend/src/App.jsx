import { useLayoutEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Home from "./pages/public/Home";
import KeralaJourneys from "./pages/public/KeralaJourneys";
import PackageDetails from "./pages/public/PackageDetails";
import JournalArticle from "./pages/public/JournalArticle";
import PlanYourJourney from "./pages/public/PlanYourJourney";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EditorDashboard from "./pages/admin/EditorDashboard";
import ConsultantDashboard from "./pages/admin/ConsultantDashboard";
import PackageLibrary from "./pages/admin/PackageLibrary";
import EditPackage from "./pages/admin/EditPackage";
import EnquiryInbox from "./pages/admin/EnquiryInbox";
import EditJournal from "./pages/admin/EditJournal";
import RolesManagement from "./pages/admin/RolesManagement";
import QuoteBuilder from "./pages/admin/QuoteBuilder";
import ActivityLog from "./pages/admin/ActivityLog";
import MediaLibrary from "./pages/admin/MediaLibrary";

function ScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        const element = document.getElementById(
          decodeURIComponent(location.hash.slice(1))
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
}

function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f8f2] px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[3px] text-[#a17e50]">Page not found</p>
        <h1 className="mt-4 font-serif text-6xl text-[#174b38]">404</h1>
        <p className="mt-4 text-sm text-[#718075]">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-7 inline-block bg-[#174b38] px-7 py-3 text-sm text-white">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/journeys" element={<PublicLayout><KeralaJourneys /></PublicLayout>} />
        <Route path="/package/:id" element={<PublicLayout><PackageDetails /></PublicLayout>} />
        <Route path="/journal" element={<PublicLayout><JournalArticle /></PublicLayout>} />
        <Route path="/journal/:slug" element={<PublicLayout><JournalArticle /></PublicLayout>} />
        <Route path="/plan-your-journey" element={<PublicLayout><PlanYourJourney /></PublicLayout>} />

        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/editor" element={<AdminLayout><EditorDashboard /></AdminLayout>} />
        <Route path="/admin/consultant" element={<AdminLayout><ConsultantDashboard /></AdminLayout>} />
        <Route path="/admin/packages" element={<AdminLayout><PackageLibrary /></AdminLayout>} />
        <Route path="/admin/packages/:id/edit" element={<AdminLayout><EditPackage /></AdminLayout>} />
        <Route path="/admin/enquiries" element={<AdminLayout><EnquiryInbox /></AdminLayout>} />
        <Route path="/admin/media" element={<AdminLayout><MediaLibrary /></AdminLayout>} />
        <Route path="/admin/quotes" element={<AdminLayout><QuoteBuilder /></AdminLayout>} />
        <Route path="/admin/journal/edit" element={<AdminLayout><EditJournal /></AdminLayout>} />
        <Route path="/admin/journal/:id/edit" element={<AdminLayout><EditJournal /></AdminLayout>} />
        <Route path="/admin/roles" element={<AdminLayout><RolesManagement /></AdminLayout>} />
        <Route path="/admin/activity" element={<AdminLayout><ActivityLog /></AdminLayout>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
