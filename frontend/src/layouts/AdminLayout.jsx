import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";

const AdminLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f8f2] md:flex">
      <div className="sticky top-0 z-50 flex items-center justify-between bg-[#123e30] px-5 py-3 text-white md:hidden">
        <span className="font-serif text-xl">Company A · Admin</span>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close admin menu" : "Open admin menu"} className="p-2">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className="hidden md:block"><AdminSidebar /></div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="h-full w-[270px] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <AdminSidebar />
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
};

export default AdminLayout;
