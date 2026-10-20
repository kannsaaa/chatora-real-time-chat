import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import ChatoraLogo from "./ChatoraLogo";

const LandingNav = () => {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-border-subtle bg-cream-100/90 backdrop-blur-xl sticky top-0 z-50 select-none">
      <div className="max-w-7xl flex flex-wrap items-center justify-between mx-auto px-4 sm:px-6 py-4">
        <ChatoraLogo size="md" to="/" showTagline={false} />

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
          className="inline-flex items-center p-2.5 w-10 h-10 justify-center text-sm text-plum-600 rounded-2xl md:hidden hover:bg-cream-200 focus:outline-none focus:ring-2 focus:ring-chatora-pink/30 transition-colors"
          aria-controls="navbar-default"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="sr-only">Open main menu</span>
          <svg
            className="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>

        <div
          className={`${
            isMobileMenuOpen ? "flex" : "hidden"
          } w-full md:flex md:w-auto flex-col md:flex-row items-center gap-3 md:gap-7 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border-subtle`}
          id="navbar-default"
        >
          <a
            href="/#features"
            className="text-sm font-semibold text-plum-600 hover:text-plum-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Features ✨
          </a>
          <a
            href="/#architecture"
            className="text-sm font-semibold text-plum-600 hover:text-plum-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Architecture ⚡
          </a>
          <Link
            to="/privacy"
            className="text-sm font-semibold text-plum-600 hover:text-plum-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Privacy 🛡️
          </Link>

          <div className="flex items-center gap-3 w-full md:w-auto pt-2 md:pt-0">
            {isAuthenticated ? (
              <Link
                to="/chathome"
                className="w-full md:w-auto text-center px-5 py-2.5 rounded-2xl text-sm font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC] transition-all active:scale-95"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Enter Chat Home 💬
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full md:w-auto text-center px-4 py-2.5 rounded-2xl text-sm font-bold text-plum-800 hover:text-plum-950 hover:bg-cream-200 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="w-full md:w-auto text-center px-5 py-2.5 rounded-2xl text-sm font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC] transition-all active:scale-95"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Start Chatting ✨
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
