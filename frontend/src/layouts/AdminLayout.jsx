import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

const AdminLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#f8f8f2] md:flex">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#123e30] px-5 py-3 text-white md:hidden">
        <Link to="/admin" className="font-serif text-xl">
          Company A · Admin
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
          aria-expanded={menuOpen}
          className="rounded p-2 transition-colors hover:bg-white/10"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Desktop sidebar remains visible while dashboard content scrolls */}
      <div className="hidden h-screen shrink-0 self-start md:sticky md:top-0 md:block">
        <AdminSidebar />
      </div>

      {/* Mobile navigation drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 md:hidden"
          onClick={closeMenu}
        >
          <div
            className="h-full w-[min(280px,85vw)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <AdminSidebar onNavigate={closeMenu} />
          </div>
        </div>
      )}

      <main className="min-h-screen min-w-0 flex-1">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayout;
