import React, { useEffect, useState } from "react";
import axios from "axios";

const SelectAvatar = ({ setSelectedLink, selectedLink }) => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/avatar/all");
        setAvatars(response.data?.avatars || []);
      } catch (error) {
        console.error("Error fetching avatars:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvatars();
  }, []);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-plum-900">
          Choose Avatar 🎨
        </label>
        <span className="text-xs text-plum-500 font-medium">
          Click an avatar to preview
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cream-100 animate-pulse border border-chatora-border"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
          {avatars?.map((avatar) => {
            const isSelected = selectedLink === avatar.link;
            return (
              <button
                type="button"
                key={avatar._id}
                onClick={() => setSelectedLink(avatar.link)}
                aria-label={`Select avatar ${avatar._id}`}
                className={`relative group aspect-square rounded-2xl p-1.5 transition-all duration-200 flex items-center justify-center bg-cream-50 shadow-sweet ${
                  isSelected
                    ? "ring-2 ring-chatora-pink bg-pink-50 shadow-sweet-pink scale-105"
                    : "border border-chatora-border hover:border-chatora-pink/50 hover:scale-102"
                }`}
              >
                <img
                  src={avatar.link}
                  alt={`Avatar ${avatar._id}`}
                  className="w-full h-full rounded-xl object-cover bg-white p-1"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar._id || "fallback"}`;
                  }}
                />
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-chatora-pink text-white rounded-full flex items-center justify-center shadow">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SelectAvatar;
