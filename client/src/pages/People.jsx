import React, { useState, useEffect } from "react";
import axios from "axios";
import Nav from "../components/Chat/Nav";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/profileContext";
import { useAuth } from "../context/authContext";
import toast from "react-hot-toast";

const People = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { userDetails } = useProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isAuthenticated, navigate]);

  const fetchUsers = async (query = "") => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/user/people?q=${encodeURIComponent(query)}`
      );
      // filter out current user safely
      const filtered = (Array.isArray(res.data) ? res.data : []).filter((u) =>
        userDetails?._id ? String(u._id) !== String(userDetails._id) : true
      );
      setUsers(filtered);
    } catch (err) {
      console.error("Error fetching people:", err);
      if (err?.response?.status === 401) {
        toast.error("Session expired or authentication required. Please log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocalStatus = (userId, newStatus) => {
    setUsers((prev) =>
      prev.map((u) =>
        String(u._id) === String(userId)
          ? { ...u, relationshipStatus: newStatus }
          : u
      )
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchUsers("");
  };

  const handleMessage = (userId) => {
    navigate(`/chathome?userId=${userId}`);
  };

  const handleAddFriend = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}`);
      toast.success("Friend request sent!");
      updateLocalStatus(userId, "PENDING_SENT");
    } catch (err) {
      console.error("Error sending request:", err);
      toast.error(err?.response?.data?.message || "Failed to send request");
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      await axios.delete(`/api/friends/request/${userId}`);
      toast.success("Friend request cancelled");
      updateLocalStatus(userId, "NOT_CONNECTED");
    } catch (err) {
      console.error("Error cancelling request:", err);
      toast.error(err?.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/accept`);
      toast.success("Friend request accepted!");
      updateLocalStatus(userId, "FRIENDS");
    } catch (err) {
      console.error("Error accepting request:", err);
      toast.error(err?.response?.data?.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/decline`);
      toast.success("Friend request declined");
      updateLocalStatus(userId, "NOT_CONNECTED");
    } catch (err) {
      console.error("Error declining request:", err);
      toast.error(err?.response?.data?.message || "Failed to decline request");
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await axios.delete(`/api/friends/block/${userId}`);
      toast.success("User unblocked");
      updateLocalStatus(userId, "NOT_CONNECTED");
    } catch (err) {
      console.error("Error unblocking user:", err);
      toast.error(err?.response?.data?.message || "Failed to unblock user");
    }
  };

  return (
    <div className="flex min-h-screen bg-cream-100 relative text-plum-900">
      <Nav />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full pb-24 md:pb-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 border border-chatora-pink/20 text-chatora-pink text-xs font-bold mb-3 uppercase tracking-wider">
            Directory ✨
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-plum-900 mb-2">
            Discover People 🌸
          </h1>
          <p className="text-sm text-plum-500 max-w-xl">
            Explore the active Chatora community, connect with teammates, send
            friend requests, and build your trusted circle of sweet chaos.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2.5 sm:gap-3 max-w-xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-plum-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5"
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
              placeholder="Search by name, username, or @handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-border-subtle rounded-2xl pl-10 sm:pl-11 pr-9 py-2.5 sm:py-3 text-sm text-plum-900 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all placeholder:text-plum-500 shadow-sweet-sm"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-plum-500 hover:text-plum-900"
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
          <button
            type="submit"
            className="bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-shrink-0 select-none active:scale-95"
          >
            <span>Search</span>
            <span className="hidden sm:inline">✨</span>
          </button>
        </form>

        {/* Content State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-chatora-border rounded-3xl p-6 flex flex-col items-center animate-pulse shadow-sweet"
              >
                <div className="w-20 h-20 rounded-full bg-cream-200 mb-4"></div>
                <div className="w-28 h-4 bg-cream-200 rounded mb-2"></div>
                <div className="w-20 h-3 bg-cream-200 rounded mb-5"></div>
                <div className="w-full h-10 bg-cream-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.length > 0 ? (
              users.map((user) => {
                const fullName = `${user.firstName || ""} ${
                  user.lastName || ""
                }`.trim() || "User";
                const avatar =
                  user.avatarLink ||
                  "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

                return (
                  <div
                    key={user._id}
                    className="bg-white border border-chatora-border hover:border-chatora-pink/40 rounded-3xl p-6 flex flex-col items-center shadow-sweet hover:shadow-sweet-lg transition-all duration-200 hover:-translate-y-1 group relative"
                  >
                    <div className="relative mb-3">
                      <img
                        src={avatar}
                        alt={fullName}
                        className="w-20 h-20 rounded-full object-cover bg-cream-50 p-1 border-2 border-chatora-border group-hover:border-chatora-pink/40 transition-transform duration-200 shadow-sweet"
                        loading="lazy"
                      />
                    </div>

                    <h3 className="text-base font-extrabold text-plum-900 mb-0.5 group-hover:text-chatora-pink transition-colors text-center truncate max-w-full">
                      {fullName}
                    </h3>

                    {user.username && (
                      <p className="text-xs font-bold text-chatora-pink mb-2 truncate max-w-full">
                        @{user.username}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-chatora-mint"></span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Verified Member ✨
                      </span>
                    </div>

                    {user.bio ? (
                      <p className="text-xs text-plum-700 text-center line-clamp-2 mb-4 w-full px-3 py-2 italic bg-cream-50 rounded-xl border border-chatora-border/60 break-words font-medium">
                        "{user.bio}"
                      </p>
                    ) : (
                      <div className="mb-4"></div>
                    )}

                    {/* Relationship Action Buttons */}
                    <div className="w-full mt-auto">
                      {user.relationshipStatus === "FRIENDS" && (
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 bg-emerald-50 text-emerald-700 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 select-none">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3.5 h-3.5 text-emerald-600"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Friends 💕
                          </span>
                          <button
                            onClick={() => handleMessage(user._id)}
                            className="flex-1 bg-gradient-to-r from-chatora-pink to-chatora-peach hover:opacity-95 text-white py-2.5 px-3 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1.5 shadow-sweet-pink active:scale-95"
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
                            Message
                          </button>
                        </div>
                      )}

                      {user.relationshipStatus === "PENDING_SENT" && (
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 bg-cream-100 text-plum-900 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-border-subtle select-none shadow-sweet-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-chatora-yellow animate-pulse"></span>
                            Request Sent ✓
                          </span>
                          <button
                            onClick={() => handleCancelRequest(user._id)}
                            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-chatora-coral text-xs font-bold border border-border-subtle shadow-sweet-sm transition-colors active:scale-95"
                            title="Cancel Request"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {user.relationshipStatus === "PENDING_RECEIVED" && (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => handleAcceptRequest(user._id)}
                            className="flex-1 bg-chatora-mint hover:opacity-90 text-white py-2.5 px-3 rounded-xl font-bold text-xs transition-all shadow-sweet active:scale-95"
                          >
                            Accept 💕
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(user._id)}
                            className="flex-1 bg-white hover:bg-cream-100 text-plum-700 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border border-chatora-border shadow-sweet active:scale-95"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {user.relationshipStatus === "BLOCKED" && (
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 bg-rose-50 text-rose-700 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center border border-rose-200 select-none">
                            Blocked
                          </span>
                          <button
                            onClick={() => handleUnblock(user._id)}
                            className="px-3 py-2.5 rounded-xl bg-white hover:bg-cream-100 text-plum-800 text-xs font-bold border border-chatora-border shadow-sweet transition-colors active:scale-95"
                          >
                            Unblock
                          </button>
                        </div>
                      )}

                      {user.relationshipStatus === "BLOCKED_BY_USER" && (
                        <div className="w-full bg-cream-100 text-plum-600 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center border border-border-subtle select-none">
                          Unavailable
                        </div>
                      )}

                      {(!user.relationshipStatus ||
                        user.relationshipStatus === "NOT_CONNECTED") && (
                        <button
                          onClick={() => handleAddFriend(user._id)}
                          className="w-full bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 py-2.5 px-4 rounded-xl transition-all duration-150 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95"
                        >
                          <span className="text-sm font-bold">+</span>
                          Add Friend 💕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-white border border-chatora-border flex items-center justify-center mx-auto mb-4 text-3xl shadow-sweet">
                  🌸
                </div>
                <h3 className="text-base font-extrabold text-plum-900 mb-1">
                  {search ? `No members match "${search}"` : "No members found"}
                </h3>
                <p className="text-xs text-plum-500 max-w-sm mx-auto">
                  {search
                    ? "Check your spelling or try searching for another name."
                    : "When new users register in Chatora, they will appear in this directory."}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mt-4 text-xs font-bold text-chatora-pink hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default People;
