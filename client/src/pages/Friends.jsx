import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Chat/Nav";
import { useAuth } from "../context/authContext";
import toast from "react-hot-toast";

const Friends = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "requests" | "blocked"
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modals state
  const [unfriendTarget, setUnfriendTarget] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [unblockTarget, setUnblockTarget] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  // Handle Escape key to close any open confirmation modal or menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setUnfriendTarget(null);
        setBlockTarget(null);
        setUnblockTarget(null);
        setActiveMenuId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, blockedRes] = await Promise.all([
        axios.get("/api/friends"),
        axios.get("/api/friends/requests"),
        axios.get("/api/friends/blocked"),
      ]);
      setFriends(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      setRequests({
        received: Array.isArray(requestsRes.data?.received)
          ? requestsRes.data.received
          : [],
        sent: Array.isArray(requestsRes.data?.sent)
          ? requestsRes.data.sent
          : [],
      });
      setBlocked(Array.isArray(blockedRes.data) ? blockedRes.data : []);
    } catch (err) {
      console.error("Error fetching friends data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/accept`);
      toast.success("Friend request accepted!");
      fetchData();
    } catch (err) {
      console.error("Error accepting request:", err);
      toast.error(err?.response?.data?.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/decline`);
      toast.success("Friend request declined");
      fetchData();
    } catch (err) {
      console.error("Error declining request:", err);
      toast.error(err?.response?.data?.message || "Failed to decline request");
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      await axios.delete(`/api/friends/request/${userId}`);
      toast.success("Friend request cancelled");
      fetchData();
    } catch (err) {
      console.error("Error cancelling request:", err);
      toast.error(err?.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleConfirmUnfriend = async () => {
    if (!unfriendTarget) return;
    try {
      await axios.delete(`/api/friends/${unfriendTarget._id}`);
      toast.success(`Unfriended ${unfriendTarget.firstName || "user"}`);
      setUnfriendTarget(null);
      fetchData();
    } catch (err) {
      console.error("Error unfriending user:", err);
      toast.error(err?.response?.data?.message || "Failed to unfriend");
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    try {
      await axios.post(`/api/friends/block/${blockTarget._id}`);
      toast.success(`Blocked ${blockTarget.firstName || "user"}`);
      setBlockTarget(null);
      fetchData();
    } catch (err) {
      console.error("Error blocking user:", err);
      toast.error(err?.response?.data?.message || "Failed to block user");
    }
  };

  const handleConfirmUnblock = async () => {
    if (!unblockTarget) return;
    try {
      await axios.delete(`/api/friends/block/${unblockTarget._id}`);
      toast.success(`Unblocked ${unblockTarget.firstName || "user"}`);
      setUnblockTarget(null);
      fetchData();
    } catch (err) {
      console.error("Error unblocking user:", err);
      toast.error(err?.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleMessage = (userId) => {
    navigate(`/chathome?userId=${userId}`);
  };

  const cleanSearch = search.trim().toLowerCase();
  const strippedSearch = cleanSearch.replace(/^@/, "");

  const filteredFriends = friends.filter((f) => {
    const fullName = `${f.firstName || ""} ${f.lastName || ""}`.toLowerCase();
    const handle = (f.username || "").toLowerCase();
    return (
      fullName.includes(cleanSearch) ||
      (handle && handle.includes(strippedSearch))
    );
  });

  const pendingReceivedCount = requests.received?.length || 0;

  return (
    <div className="flex min-h-screen bg-cream-100 relative text-plum-900">
      <Nav pendingRequestsCount={pendingReceivedCount} />

      {/* Backdrop for open menus */}
      {activeMenuId && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setActiveMenuId(null)}
        ></div>
      )}

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full pb-24 md:pb-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 border border-chatora-pink/20 text-chatora-pink text-xs font-bold mb-3 uppercase tracking-wider">
            Social 💕
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-plum-900 mb-2">
            Friends & Connections ✨
          </h1>
          <p className="text-sm text-plum-500 max-w-xl">
            Manage your network, review incoming friend requests, and connect
            exclusively with your favorite friends.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-chatora-border pb-4">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "friends"
                ? "bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] text-plum-900 font-extrabold border border-chatora-pink/30 shadow-sweet-pink scale-102"
                : "bg-white text-plum-900 hover:text-plum-950 border border-border-subtle hover:bg-cream-100 shadow-sweet-sm"
            }`}
          >
            <span>All Friends 💕</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "friends"
                  ? "bg-white text-plum-900 shadow-sm"
                  : "bg-cream-200 text-plum-900 border border-border-subtle"
              }`}
            >
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 relative ${
              activeTab === "requests"
                ? "bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] text-plum-900 font-extrabold border border-chatora-pink/30 shadow-sweet-pink scale-102"
                : "bg-white text-plum-900 hover:text-plum-950 border border-border-subtle hover:bg-cream-100 shadow-sweet-sm"
            }`}
          >
            <span>Friend Requests 👀</span>
            {pendingReceivedCount > 0 && (
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-extrabold animate-pulse shadow-sweet-pink">
                {pendingReceivedCount}
              </span>
            )}
            {pendingReceivedCount === 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "requests"
                    ? "bg-white text-plum-900 shadow-sm"
                    : "bg-cream-200 text-plum-900 border border-border-subtle"
                }`}
              >
                {(requests.received?.length || 0) +
                  (requests.sent?.length || 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "blocked"
                ? "bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] text-plum-900 font-extrabold border border-chatora-pink/30 shadow-sweet-pink scale-102"
                : "bg-white text-plum-900 hover:text-plum-950 border border-border-subtle hover:bg-cream-100 shadow-sweet-sm"
            }`}
          >
            <span>Blocked 🚫</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "blocked"
                  ? "bg-white text-plum-900 shadow-sm"
                  : "bg-cream-200 text-plum-900 border border-border-subtle"
              }`}
            >
              {blocked.length}
            </span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: ALL FRIENDS */}
        {/* ==================================================== */}
        {activeTab === "friends" && (
          <div>
            {/* Search filter for friends */}
            <div className="mb-6 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-plum-400">
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
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Filter friends by name or @username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-chatora-border rounded-2xl pl-10 pr-9 py-2.5 text-sm text-plum-900 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all placeholder:text-plum-500 shadow-sweet"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-plum-400 hover:text-plum-800"
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
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-chatora-border rounded-3xl p-6 flex flex-col items-center animate-pulse shadow-sweet"
                  >
                    <div className="w-16 h-16 rounded-full bg-cream-200 mb-3"></div>
                    <div className="w-24 h-4 bg-cream-200 rounded mb-2"></div>
                    <div className="w-16 h-3 bg-cream-200 rounded mb-4"></div>
                    <div className="w-full h-9 bg-cream-200 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFriends.map((friend) => {
                  const fullName = `${friend.firstName || ""} ${
                    friend.lastName || ""
                  }`.trim() || "User";
                  const avatar =
                    friend.avatarLink ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";
                  const isMenuOpen = activeMenuId === friend._id;

                  return (
                    <div
                      key={friend._id}
                      className="bg-white border border-chatora-border hover:border-chatora-pink/40 rounded-3xl p-5 flex flex-col items-center shadow-sweet hover:shadow-sweet-lg transition-all duration-200 hover:-translate-y-1 relative group"
                    >
                      {/* Options menu trigger in top right */}
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(isMenuOpen ? null : friend._id)
                          }
                          className="p-1.5 rounded-xl text-plum-400 hover:text-plum-800 hover:bg-cream-100 transition-colors"
                          title="Friend options"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 w-40 bg-white border border-chatora-border rounded-2xl shadow-sweet-lg py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setUnfriendTarget(friend);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-cream-100 text-plum-800 flex items-center gap-2 transition-colors font-medium"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.75}
                                stroke="currentColor"
                                className="w-3.5 h-3.5 text-plum-500"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 10.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z"
                                />
                              </svg>
                              Unfriend
                            </button>
                            <div className="h-px bg-chatora-border my-1"></div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setBlockTarget(friend);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-rose-50 text-chatora-coral flex items-center gap-2 transition-colors font-medium"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.75}
                                stroke="currentColor"
                                className="w-3.5 h-3.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              Block User
                            </button>
                          </div>
                        )}
                      </div>

                      <img
                        src={avatar}
                        alt={fullName}
                        className="w-16 h-16 rounded-full object-cover bg-cream-50 p-0.5 border-2 border-chatora-border mb-3 shadow-sweet"
                      />

                      <h3 className="text-sm font-extrabold text-plum-900 mb-0.5 text-center truncate max-w-full">
                        {fullName}
                      </h3>

                      {friend.username && (
                        <p className="text-xs text-chatora-pink font-bold mb-2 truncate max-w-full">
                          @{friend.username}
                        </p>
                      )}

                      {friend.bio ? (
                        <p className="text-xs text-plum-700 text-center line-clamp-2 mb-4 w-full italic px-2 bg-cream-50 py-1 rounded-xl border border-chatora-border/40 font-medium">
                          "{friend.bio}"
                        </p>
                      ) : (
                        <div className="mb-4"></div>
                      )}

                      <div className="w-full flex items-center gap-2 mt-auto">
                        <button
                          onClick={() => handleMessage(friend._id)}
                          className="flex-1 bg-gradient-to-r from-chatora-pink to-chatora-peach hover:opacity-95 text-white py-2 px-3 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1.5 shadow-sweet-pink active:scale-95"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.579a22.54 22.54 0 004.14-.46 3.25 3.25 0 002.428-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Message 💬
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center bg-white border border-chatora-border rounded-3xl p-8 max-w-md mx-auto shadow-sweet">
                <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-chatora-pink/20 text-chatora-pink flex items-center justify-center mx-auto mb-4 text-3xl">
                  🌸
                </div>
                <h3 className="text-base font-extrabold text-plum-900 mb-1">
                  {search ? "No friends match your search" : "No friends yet"}
                </h3>
                <p className="text-xs text-plum-500 mb-5">
                  {search
                    ? "Try a different search query."
                    : "Discover new members in the directory and send them a friend request."}
                </p>
                <button
                  onClick={() => navigate("/people")}
                  className="bg-gradient-to-r from-chatora-pink to-chatora-peach hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sweet-pink active:scale-95"
                >
                  Discover People ✨
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: FRIEND REQUESTS */}
        {/* ==================================================== */}
        {activeTab === "requests" && (
          <div className="space-y-10">
            {/* Received Requests */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-extrabold text-plum-900">
                  Someone wants to chat with you 👀
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-chatora-pink font-bold border border-chatora-pink/20">
                  {requests.received?.length || 0}
                </span>
              </div>

              {requests.received?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests.received.map((item) => {
                    const sender = item.user;
                    if (!sender) return null;
                    const fullName = `${sender.firstName || ""} ${
                      sender.lastName || ""
                    }`.trim() || "User";
                    const avatar =
                      sender.avatarLink ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

                    return (
                      <div
                        key={item._id}
                        className="bg-white border border-chatora-border rounded-3xl p-5 flex flex-col items-center shadow-sweet hover:shadow-sweet-lg transition-all"
                      >
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-16 h-16 rounded-full object-cover bg-cream-50 p-0.5 border-2 border-chatora-border mb-3 shadow-sweet"
                        />
                        <h4 className="text-sm font-extrabold text-plum-900 mb-0.5 truncate max-w-full">
                          {fullName}
                        </h4>
                        {sender.username && (
                          <p className="text-xs text-chatora-pink font-bold mb-2 truncate max-w-full">
                            @{sender.username}
                          </p>
                        )}
                        {sender.bio && (
                          <p className="text-xs text-plum-700 text-center line-clamp-2 mb-4 italic px-2 bg-cream-50 py-1 rounded-xl border border-chatora-border/40 font-medium">
                            "{sender.bio}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 w-full mt-auto">
                          <button
                            onClick={() => handleAcceptRequest(sender._id)}
                            className="flex-1 bg-chatora-mint hover:opacity-90 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sweet active:scale-95"
                          >
                            Accept 💕
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(sender._id)}
                            className="flex-1 bg-cream-100 hover:bg-cream-200 text-plum-700 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-white border border-chatora-border rounded-3xl text-center shadow-sweet">
                  <p className="text-xs text-plum-500 font-medium">
                    No incoming friend requests at this time.
                  </p>
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-extrabold text-plum-900">
                  Sent Requests
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-plum-700 font-bold border border-chatora-border">
                  {requests.sent?.length || 0}
                </span>
              </div>

              {requests.sent?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests.sent.map((item) => {
                    const recipient = item.user;
                    if (!recipient) return null;
                    const fullName = `${recipient.firstName || ""} ${
                      recipient.lastName || ""
                    }`.trim() || "User";
                    const avatar =
                      recipient.avatarLink ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

                    return (
                      <div
                        key={item._id}
                        className="bg-white border border-chatora-border rounded-3xl p-5 flex flex-col items-center shadow-sweet hover:shadow-sweet-lg transition-all"
                      >
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-16 h-16 rounded-full object-cover bg-cream-50 p-0.5 border-2 border-chatora-border mb-3 shadow-sweet"
                        />
                        <h4 className="text-sm font-extrabold text-plum-900 mb-0.5 truncate max-w-full">
                          {fullName}
                        </h4>
                        {recipient.username && (
                          <p className="text-xs text-chatora-pink font-bold mb-3 truncate max-w-full">
                            @{recipient.username}
                          </p>
                        )}
                        <div className="flex items-center justify-between w-full mt-auto bg-cream-50 p-2.5 rounded-2xl border border-chatora-border">
                          <span className="text-[11px] text-plum-600 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-chatora-yellow animate-pulse"></span>
                            Pending...
                          </span>
                          <button
                            onClick={() => handleCancelRequest(recipient._id)}
                            className="text-xs text-chatora-coral hover:opacity-90 font-bold transition-colors px-2 py-1 hover:bg-rose-50 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-white border border-chatora-border rounded-3xl text-center shadow-sweet">
                  <p className="text-xs text-plum-500 font-medium">
                    No active sent friend requests.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: BLOCKED USERS */}
        {/* ==================================================== */}
        {activeTab === "blocked" && (
          <div>
            {blocked.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {blocked.map((item) => {
                  const target = item.user;
                  if (!target) return null;
                  const fullName = `${target.firstName || ""} ${
                    target.lastName || ""
                  }`.trim() || "User";
                  const avatar =
                    target.avatarLink ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

                  return (
                    <div
                      key={item._id}
                      className="bg-white border border-chatora-border rounded-3xl p-5 flex flex-col items-center shadow-sweet"
                    >
                      <img
                        src={avatar}
                        alt={fullName}
                        className="w-16 h-16 rounded-full object-cover bg-cream-50 p-0.5 border border-chatora-border mb-3 grayscale opacity-70"
                      />
                      <h4 className="text-sm font-extrabold text-plum-900 mb-0.5 truncate max-w-full">
                        {fullName}
                      </h4>
                      {target.username && (
                        <p className="text-xs text-plum-400 font-medium mb-4 truncate max-w-full">
                          @{target.username}
                        </p>
                      )}
                      <button
                        onClick={() => setUnblockTarget(target)}
                        className="w-full bg-cream-100 hover:bg-cream-200 text-plum-800 border border-chatora-border py-2 px-3 rounded-xl text-xs font-bold transition-all mt-auto active:scale-95"
                      >
                        Unblock User
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center bg-white border border-chatora-border rounded-3xl p-8 max-w-md mx-auto shadow-sweet">
                <div className="w-14 h-14 rounded-2xl bg-cream-100 border border-chatora-border text-plum-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                  🛡️
                </div>
                <h3 className="text-base font-extrabold text-plum-900 mb-1">
                  No blocked users
                </h3>
                <p className="text-xs text-plum-500">
                  Users you block will appear here. You can unblock them at any
                  time.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* UNFRIEND CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {unfriendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-chatora-border rounded-3xl p-6 shadow-sweet-lg text-left">
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Unfriend {unfriendTarget.firstName} {unfriendTarget.lastName}?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed">
              You will no longer be able to message each other unless you become
              friends again.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUnfriendTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-plum-600 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnfriend}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-chatora-coral hover:opacity-90 transition-colors shadow-sweet active:scale-95"
              >
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* BLOCK CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-chatora-border rounded-3xl p-6 shadow-sweet-lg text-left">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-chatora-coral">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Block {blockTarget.firstName} {blockTarget.lastName}?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed">
              Blocking will prevent them from sending you friend requests and
              messages.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-plum-600 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-chatora-coral hover:opacity-90 transition-colors shadow-sweet active:scale-95"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* UNBLOCK CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {unblockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum-950/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-chatora-border rounded-3xl p-6 shadow-sweet-lg text-left">
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Unblock {unblockTarget.firstName} {unblockTarget.lastName}?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed">
              They will be able to see you in the member directory, but you will
              not be friends until a new friend request is accepted.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUnblockTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-plum-600 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnblock}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-chatora-pink to-chatora-peach hover:opacity-95 transition-all shadow-sweet-pink active:scale-95"
              >
                Unblock ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Friends;
