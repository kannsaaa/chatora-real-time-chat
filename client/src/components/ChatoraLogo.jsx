import React from "react";
import { Link } from "react-router-dom";

const ChatoraLogo = ({ size = "md", to = "/", className = "", showTagline = false }) => {
  const iconSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      <div
        className={`${iconSizes[size] || iconSizes.md} rounded-2xl bg-gradient-to-tr from-chatora-pink via-[#FF7E9C] to-chatora-peach p-[2px] shadow-sweet-pink flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]`}
      >
        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center shadow-inner">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-chatora-pink drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3C6.48 3 2 6.94 2 11.8C2 14.39 3.27 16.7 5.28 18.27L4.5 21.5L8.03 20.33C9.28 20.73 10.61 20.95 12 20.95C17.52 20.95 22 17.01 22 12.15C22 7.29 17.52 3 12 3Z"
              fill="currentColor"
              fillOpacity="0.18"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="12" r="1.3" fill="currentColor" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" />
            <circle cx="15.5" cy="12" r="1.3" fill="currentColor" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-extrabold tracking-tight text-plum-900 ${textSizes[size] || textSizes.md} leading-none`}
          >
            Chatora
          </span>
          <span className="text-xs text-chatora-pink select-none animate-pulse">✨</span>
        </div>
        {showTagline && (
          <span className="text-[11px] font-semibold text-plum-600 mt-0.5 tracking-tight">
            Talk. Laugh. Connect.
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};

export default ChatoraLogo;
