
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9f6]">
      <Navbar />

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default PublicLayout;
