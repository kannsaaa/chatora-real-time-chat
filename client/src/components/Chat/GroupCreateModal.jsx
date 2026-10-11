// GroupCreateModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const PRESET_AVATARS = [
  "🚀",
  "🌪️",
  "🍓",
  "✨",
  "💕",
  "🐱",
  "🎮",
  "🎨",
  "🍕",
  "☕",
];

const GroupCreateModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🌪️");
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSelectedAvatar("🌪️");
      setSelectedFriends([]);
      setSearchQuery("");
      return;
    }

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const res = await axios.get("/api/friends");
        if (Array.isArray(res.data)) {
          setFriends(res.data);
        }
      } catch (err) {
        console.error("Error fetching friends for group creation:", err);
        toast.error("Could not load friends list");
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${f.firstName || ""} ${f.lastName || ""}`.toLowerCase();
    const username = (f.username || "").toLowerCase();
    return fullName.includes(q) || username.includes(q);
  });

  const toggleFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a group name");
      return;
    }
    if (trimmedName.length > 50) {
      toast.error("Group name must be 50 characters or less");
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error("Select at least 1 friend to create a group");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/api/groups", {
        name: trimmedName,
        avatar: selectedAvatar,
        members: selectedFriends,
      });
      toast.success(`Group "${trimmedName}" created! 🎉`);
      if (onGroupCreated) {
        onGroupCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error(err?.response?.data?.message || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div className="relative w-full max-w-lg bg-white border border-chatora-border rounded-3xl shadow-sweet-lg flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-chatora-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-chatora-pink/20 flex items-center justify-center text-xl">
              🌪️
            </div>
            <div>
              <h2
                id="create-group-title"
                className="text-base font-extrabold text-plum-900 tracking-tight"
              >
                Create your little chaos group 🌪️
              </h2>
              <p className="text-xs text-plum-500">
                Connect and banter with your favorite circle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="p-2 rounded-xl text-plum-400 hover:text-plum-800 hover:bg-cream-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-5"
        >
          {/* Group Icon & Name */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-plum-800">
              Group Photo & Name
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cream-50 border border-chatora-border flex items-center justify-center text-2xl flex-shrink-0 shadow-sweet">
                {selectedAvatar}
              </div>
              <div className="relative flex-1">
                <input
                  id="group-name-input"
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekend Chaos, Secret Club"
                  className="w-full bg-cream-50 border border-chatora-border text-sm text-plum-900 rounded-xl px-3.5 py-3 outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all placeholder:text-plum-400 font-medium"
                  required
                />
                <span className="absolute right-3 top-3.5 text-[10px] text-plum-400 font-medium">
                  {name.length}/50
                </span>
              </div>
            </div>

            {/* Avatar presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-plum-500 mr-1 font-semibold">
                Presets:
              </span>
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-sm transition-all active:scale-95 ${
                    selectedAvatar === av
                      ? "bg-pink-100 border-2 border-chatora-pink text-plum-900 scale-105 shadow-sweet"
                      : "bg-cream-50 border border-chatora-border text-plum-700 hover:bg-cream-100"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Add Friends Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-plum-800">
                Choose Friends ({selectedFriends.length} selected)
              </label>
              <span className="text-[11px] text-plum-500">
                Min. 1 friend required
              </span>
            </div>

            {/* Selected friends pills */}
            {selectedFriends.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-2xl bg-cream-50 border border-chatora-border">
                {selectedFriends.map((fId) => {
                  const fObj = friends.find((f) => f._id === fId);
                  if (!fObj) return null;
                  return (
                    <span
                      key={fId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-chatora-pink/30 text-xs font-semibold text-plum-800 shadow-sweet"
                    >
                      <span>{fObj.firstName || fObj.username}</span>
                      <button
                        type="button"
                        onClick={() => toggleFriend(fId)}
                        className="text-plum-400 hover:text-chatora-coral"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Friend search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search friends by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-cream-50 border border-chatora-border text-xs text-plum-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all placeholder:text-plum-400"
              />
            </div>

            {/* Friends list */}
            <div className="max-h-52 overflow-y-auto space-y-1 rounded-2xl bg-cream-50/50 border border-chatora-border p-2">
              {loadingFriends ? (
                <div className="p-6 text-center text-xs text-plum-400 animate-pulse">
                  Loading friends...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-6 text-center text-xs text-plum-400">
                  {friends.length === 0
                    ? "You haven't added any friends yet. Add friends first to create a group!"
                    : "No friends match your search"}
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isChecked = selectedFriends.includes(friend._id);
                  const displayName = `${friend.firstName || ""} ${
                    friend.lastName || ""
                  }`.trim() || friend.username;

                  return (
                    <label
                      key={friend._id}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isChecked
                          ? "bg-pink-50 border border-chatora-pink/40"
                          : "hover:bg-cream-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-chatora-border flex items-center justify-center font-bold text-xs text-chatora-pink flex-shrink-0 shadow-sweet">
                          {friend.avatarLink ? (
                            <img
                              src={friend.avatarLink}
                              alt={displayName}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            friend.firstName?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-plum-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-plum-500 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFriend(friend._id)}
                        className="w-4 h-4 rounded-md border-chatora-border text-chatora-pink focus:ring-chatora-pink accent-chatora-pink"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-chatora-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-plum-600 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-group-btn"
              type="submit"
              disabled={submitting || !name.trim() || selectedFriends.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 active:scale-95"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-plum-900/30 border-t-plum-900 rounded-full animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <span>Create Group ✨</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupCreateModal;

