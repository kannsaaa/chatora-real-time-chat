// GroupInfoModal.jsx
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
  "👥",
  "🎉",
];

const GroupInfoModal = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onGroupUpdated,
  onLeaveGroup,
}) => {
  const [activeTab, setActiveTab] = useState("members"); // 'members' | 'add'
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatar, setNewAvatar] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Add members state
  const [friends, setFriends] = useState([]);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  // Removing member state
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Leaving group state
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  useEffect(() => {
    if (!isOpen || !group) {
      setActiveTab("members");
      setIsEditingName(false);
      setIsEditingAvatar(false);
      setMemberToRemove(null);
      setShowConfirmLeave(false);
      setSelectedFriendsToAdd([]);
      return;
    }
    setNewName(group.name || "");
    setNewAvatar(group.avatar || "👥");
  }, [isOpen, group]);

  // Load eligible friends when opening the "add" tab
  useEffect(() => {
    if (activeTab !== "add" || !isOpen) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const res = await axios.get("/api/friends");
        if (Array.isArray(res.data)) {
          setFriends(res.data);
        }
      } catch (err) {
        console.error("Error fetching friends:", err);
        toast.error("Could not load friends list");
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [activeTab, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !savingDetails && !addingMembers && !leavingGroup) {
        if (showConfirmLeave) {
          setShowConfirmLeave(false);
          return;
        }
        if (memberToRemove) {
          setMemberToRemove(null);
          return;
        }
        if (isEditingName) {
          setIsEditingName(false);
          return;
        }
        if (isEditingAvatar) {
          setIsEditingAvatar(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, savingDetails, addingMembers, leavingGroup, showConfirmLeave, memberToRemove, isEditingName, isEditingAvatar, onClose]);

  if (!isOpen || !group) return null;

  const isAdmin = (group.admins || []).some(
    (a) => (a._id || a).toString() === String(currentUserId)
  );

  const isCreator =
    (group.createdBy?._id || group.createdBy)?.toString() ===
    String(currentUserId);

  const memberList = group.members || [];
  const adminIds = new Set(
    (group.admins || []).map((a) => (a._id || a).toString())
  );

  // Filter eligible friends (exclude current members)
  const currentMemberIds = new Set(
    memberList.map((m) => (m._id || m).toString())
  );
  const eligibleFriends = friends.filter(
    (f) => !currentMemberIds.has(f._id.toString())
  );

  const filteredEligibleFriends = eligibleFriends.filter((f) => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${f.firstName || ""} ${f.lastName || ""}`.toLowerCase();
    const username = (f.username || "").toLowerCase();
    return fullName.includes(q) || username.includes(q);
  });

  const toggleSelectFriendToAdd = (id) => {
    setSelectedFriendsToAdd((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle Save Name
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Group name cannot be empty");
      return;
    }
    if (trimmed.length > 50) {
      toast.error("Group name must be 50 characters or less");
      return;
    }
    if (trimmed === group.name) {
      setIsEditingName(false);
      return;
    }

    setSavingDetails(true);
    try {
      const res = await axios.patch(`/api/groups/${group._id}`, {
        name: trimmed,
      });
      toast.success("Group renamed");
      setIsEditingName(false);
      if (onGroupUpdated) onGroupUpdated(res.data.group || res.data);
    } catch (err) {
      console.error("Failed to rename group:", err);
      toast.error(err?.response?.data?.message || "Failed to rename group");
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle Save Avatar
  const handleSaveAvatar = async (avatarChar) => {
    setSavingDetails(true);
    try {
      const res = await axios.patch(`/api/groups/${group._id}`, {
        avatar: avatarChar,
      });
      toast.success("Group icon updated");
      setNewAvatar(avatarChar);
      setIsEditingAvatar(false);
      if (onGroupUpdated) onGroupUpdated(res.data.group || res.data);
    } catch (err) {
      console.error("Failed to update avatar:", err);
      toast.error(err?.response?.data?.message || "Failed to update group icon");
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle Add Selected Members
  const handleAddMembers = async () => {
    if (selectedFriendsToAdd.length === 0) {
      toast.error("Please select at least one friend to add");
      return;
    }

    setAddingMembers(true);
    try {
      const res = await axios.post(`/api/groups/${group._id}/members`, {
        members: selectedFriendsToAdd,
      });
      toast.success("Members added to group");
      setSelectedFriendsToAdd([]);
      setActiveTab("members");
      if (onGroupUpdated) onGroupUpdated(res.data);
    } catch (err) {
      console.error("Failed to add members:", err);
      toast.error(err?.response?.data?.message || "Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  // Handle Remove Member
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const res = await axios.delete(
        `/api/groups/${group._id}/members/${memberToRemove._id}`
      );
      toast.success(
        `${memberToRemove.firstName || memberToRemove.username || "Member"} removed`
      );
      setMemberToRemove(null);
      if (onGroupUpdated) onGroupUpdated(res.data.group || res.data);
    } catch (err) {
      console.error("Failed to remove member:", err);
      toast.error(err?.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingMember(false);
    }
  };

  // Handle Leave Group
  const handleConfirmLeave = async () => {
    setLeavingGroup(true);
    try {
      await axios.post(`/api/groups/${group._id}/leave`);
      toast.success("You left the group");
      setShowConfirmLeave(false);
      onClose();
      if (onLeaveGroup) onLeaveGroup(group._id);
    } catch (err) {
      console.error("Failed to leave group:", err);
      toast.error(err?.response?.data?.message || "Failed to leave group");
    } finally {
      setLeavingGroup(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Group Information"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-plum-950/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white border border-chatora-border rounded-3xl shadow-sweet-lg flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Background Accent */}
        <div className="relative p-6 pb-4 border-b border-chatora-border bg-gradient-to-b from-cream-100 to-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-plum-400 hover:text-plum-800 hover:bg-cream-200 transition-colors"
            aria-label="Close group details"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Group Avatar */}
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-100 via-peach-100 to-lavender-100 border-2 border-chatora-pink/30 flex items-center justify-center text-4xl shadow-sweet">
                {group.avatar || "👥"}
              </div>

              {isAdmin && !isEditingAvatar && (
                <button
                  type="button"
                  onClick={() => setIsEditingAvatar(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-r from-chatora-pink to-chatora-peach hover:opacity-95 text-white shadow-sweet-pink border-2 border-white transition-transform hover:scale-105"
                  title="Change group icon"
                  aria-label="Change group icon"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Avatar Selector Tray */}
            {isEditingAvatar && (
              <div className="w-full max-w-sm p-3 mb-3 bg-cream-50 border border-chatora-border rounded-2xl animate-in zoom-in-95 duration-150 shadow-sweet">
                <p className="text-xs font-bold text-plum-800 mb-2">
                  Choose Group Icon
                </p>
                <div className="flex items-center justify-center flex-wrap gap-2">
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={savingDetails}
                      onClick={() => handleSaveAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform hover:scale-110 ${
                        newAvatar === emoji
                          ? "bg-pink-100 border-2 border-chatora-pink text-plum-900 shadow-sweet"
                          : "bg-white hover:bg-cream-100 text-plum-700 border border-chatora-border"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAvatar(false)}
                  className="mt-2 text-xs font-semibold text-plum-500 hover:text-plum-900"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Group Name Display or Edit */}
            {isEditingName ? (
              <div className="flex items-center gap-2 max-w-sm w-full mb-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  placeholder="Group Name"
                  className="flex-1 bg-cream-50 text-plum-900 text-base font-bold px-3 py-1.5 rounded-xl border border-chatora-pink focus:outline-none focus:ring-1 focus:ring-chatora-pink"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingDetails}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-chatora-pink to-chatora-peach text-white text-xs font-bold shadow-sweet-pink hover:opacity-95 active:scale-95"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName(group.name);
                    setIsEditingName(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-plum-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 max-w-full px-4 mb-1">
                <h2 className="text-xl font-extrabold text-plum-900 tracking-tight truncate">
                  {group.name}
                </h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded-lg text-plum-400 hover:text-plum-800 hover:bg-cream-200 transition-colors"
                    title="Rename group"
                    aria-label="Rename group"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-plum-500 font-medium">
              {memberList.length} {memberList.length === 1 ? "member" : "members"}
              {group.createdBy && (
                <>
                  {" "}
                  • Created by{" "}
                  <span className="text-plum-800 font-bold">
                    {group.createdBy.firstName || group.createdBy.username || "Admin"}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "members"
                  ? "bg-gradient-to-r from-chatora-pink to-chatora-peach text-white shadow-sweet-pink"
                  : "bg-cream-100 text-plum-600 hover:text-plum-900"
              }`}
            >
              Members ({memberList.length})
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("add")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "add"
                    ? "bg-gradient-to-r from-chatora-pink to-chatora-peach text-white shadow-sweet-pink"
                    : "bg-cream-100 text-plum-600 hover:text-plum-900"
                }`}
              >
                <span>+</span> Add Friends
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Member List */}
        {activeTab === "members" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {memberList.map((m) => {
              const memberId = (m._id || m).toString();
              const isMemberAdmin = adminIds.has(memberId);
              const isSelf = memberId === String(currentUserId);
              const displayName =
                `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
                m.username ||
                "Member";
              const canRemove =
                isAdmin &&
                !isSelf &&
                (!isMemberAdmin || adminIds.size > 1);

              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-cream-50/60 hover:bg-cream-100 border border-chatora-border transition-all shadow-sweet"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        m.avatarLink ||
                        "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"
                      }
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover bg-white border border-chatora-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-plum-900 truncate">
                          {displayName}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] text-plum-600 bg-white px-1.5 py-0.5 rounded-md border border-chatora-border font-medium">
                            You
                          </span>
                        )}
                      </div>
                      {m.username && (
                        <p className="text-xs text-chatora-pink font-semibold truncate">
                          @{m.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isMemberAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <span>👑</span> Admin
                      </span>
                    )}

                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(m)}
                        className="p-1.5 rounded-xl text-plum-400 hover:text-chatora-coral hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all text-xs"
                        title="Remove member"
                        aria-label={`Remove ${displayName}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Add Friends to Group (Admin only) */}
        {activeTab === "add" && isAdmin && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full bg-cream-50 text-xs text-plum-900 border border-chatora-border rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-chatora-pink placeholder:text-plum-400"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3.5 h-3.5 text-plum-400 absolute left-2.5 top-3 pointer-events-none"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>

            {loadingFriends ? (
              <div className="py-8 text-center text-xs text-plum-400">
                Loading friends...
              </div>
            ) : filteredEligibleFriends.length === 0 ? (
              <div className="py-8 text-center text-xs text-plum-400">
                {friendSearch
                  ? "No friends match your search."
                  : "All your friends are already in this group!"}
              </div>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-56 pr-1">
                {filteredEligibleFriends.map((f) => {
                  const isChecked = selectedFriendsToAdd.includes(f._id);
                  const displayName =
                    `${f.firstName || ""} ${f.lastName || ""}`.trim() ||
                    f.username;

                  return (
                    <div
                      key={f._id}
                      onClick={() => toggleSelectFriendToAdd(f._id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                        isChecked
                          ? "bg-pink-50 border-chatora-pink/50 text-plum-900"
                          : "bg-cream-50/50 hover:bg-cream-100 border-chatora-border text-plum-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            f.avatarLink ||
                            "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"
                          }
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover bg-white border border-chatora-border"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-plum-900 truncate">
                            {displayName}
                          </p>
                          {f.username && (
                            <p className="text-[11px] text-chatora-pink font-semibold truncate">
                              @{f.username}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-chatora-pink border-chatora-pink text-white"
                            : "border-chatora-border bg-white"
                        }`}
                      >
                        {isChecked && (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-chatora-border flex items-center justify-between">
              <span className="text-xs text-plum-500 font-medium">
                {selectedFriendsToAdd.length} selected
              </span>
              <button
                type="button"
                onClick={handleAddMembers}
                disabled={addingMembers || selectedFriendsToAdd.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFB3C6] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink disabled:opacity-40 disabled:cursor-not-allowed text-plum-900 text-xs font-extrabold transition-all active:scale-95"
              >
                {addingMembers ? "Adding..." : "Add to Group ✨"}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions (Leave Group) */}
        <div className="p-4 border-t border-chatora-border bg-cream-50/50 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowConfirmLeave(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-chatora-coral hover:text-white bg-rose-50 hover:bg-chatora-coral border border-rose-200 hover:border-chatora-coral transition-all active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            Leave Group
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-cream-100 text-plum-800 text-xs font-bold border border-chatora-border shadow-sweet transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Remove Member */}
      {memberToRemove && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-plum-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-chatora-border rounded-3xl p-5 shadow-sweet-lg animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-chatora-coral flex items-center justify-center mx-auto mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.765Z"
                />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1">
              Remove Member?
            </h3>
            <p className="text-xs text-plum-600 mb-5 leading-relaxed">
              Remove{" "}
              <span className="text-plum-900 font-bold">
                {memberToRemove.firstName || memberToRemove.username}
              </span>{" "}
              from the group? They will no longer receive group messages.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={removingMember}
                className="flex-1 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-plum-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={removingMember}
                className="flex-1 py-2 rounded-xl bg-chatora-coral hover:opacity-90 text-white text-xs font-bold shadow-sweet transition-all active:scale-95"
              >
                {removingMember ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Leave Group */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-plum-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-chatora-border rounded-3xl p-5 shadow-sweet-lg animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1">
              Leave this group?
            </h3>
            <p className="text-xs text-plum-600 mb-5 leading-relaxed">
              You will not be able to send or receive messages in{" "}
              <span className="text-plum-900 font-bold">{group.name}</span>{" "}
              unless re-added by an admin.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                disabled={leavingGroup}
                className="flex-1 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-plum-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={leavingGroup}
                className="flex-1 py-2 rounded-xl bg-chatora-coral hover:opacity-90 text-white text-xs font-bold shadow-sweet transition-all active:scale-95"
              >
                {leavingGroup ? "Leaving..." : "Leave Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoModal;

