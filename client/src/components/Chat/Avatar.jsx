import React from "react";

export default function Avatar({ username, userId, isOnline, avatarLink, size = "md" }) {
  const colors = [
    "#FF6F91", // Chatora pink
    "#FF9E79", // Soft peach
    "#A78BFA", // Lavender
    "#F472B6", // Rose
    "#FB7185", // Coral
    "#38BDF8", // Soft sky
    "#34D399", // Mint
    "#FBBF24", // Honey yellow
    "#C084FC", // Purple
    "#FB923C", // Tangerine
  ];
  const userIdBase10 = parseInt(userId?.substring(10) || "0", 16) || 0;
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const initial = (username?.[0] || "?").toUpperCase();

  return (
    <div
      className={`relative rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-border-subtle bg-cream-100 select-none shadow-sweet-sm ${
        sizeClasses[size] || sizeClasses.md
      }`}
    >
      {avatarLink && (avatarLink.startsWith("http") || avatarLink.startsWith("data:")) ? (
        <img
          src={avatarLink}
          className="w-full h-full object-cover rounded-full"
          alt={username || "Avatar"}
          loading="lazy"
        />
      ) : avatarLink ? (
        <div className="w-full h-full flex items-center justify-center text-base sm:text-lg select-none bg-cream-50">
          {avatarLink}
        </div>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-white shadow-inner"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
