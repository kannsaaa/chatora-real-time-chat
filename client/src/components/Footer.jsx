import React from "react";
import { Link } from "react-router-dom";
import ChatoraLogo from "./ChatoraLogo";

const Footer = () => {
  return (
    <footer className="border-t border-border-subtle bg-cream-100 py-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-border-subtle">
          <ChatoraLogo size="md" to="/" showTagline={true} />

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-plum-600">
            <Link to="/chathome" className="hover:text-chatora-pink transition-colors">
              Chat
            </Link>
            <Link to="/people" className="hover:text-chatora-pink transition-colors">
              People
            </Link>
            <Link to="/friends" className="hover:text-chatora-pink transition-colors">
              Friends
            </Link>
            <Link to="/login" className="hover:text-chatora-pink transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-chatora-pink transition-colors">
              Register
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-plum-500 text-center sm:text-left">
          <span>
            © {new Date().getFullYear()} Chatora. Talk. Laugh. Connect. All rights reserved.
          </span>
          <span className="text-[11px] text-plum-600 font-medium">
            🍓 Sweet Chaos • Crafted for playful, expressive social chats.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
