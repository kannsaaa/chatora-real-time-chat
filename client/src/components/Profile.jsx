import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Nav from "./Chat/Nav";
import { useProfile } from "../context/profileContext";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import SelectAvatar from "./SelectAvatar";

const Profile = () => {
  const { userDetails, setUserDetails } = useProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [selectedLink, setSelectedLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setFormData(userDetails || {});
    if (userDetails?.avatarLink) {
      setSelectedLink(userDetails.avatarLink);
    }
    toast("Changes reverted", { icon: "↩️" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (formData.username) {
      const normalizedUsername = formData.username.trim().toLowerCase().replace(/^@/, "");
      if (normalizedUsername.length < 3) {
        toast.error("Username must be at least 3 characters.");
        return;
      }
      if (normalizedUsername.length > 20) {
        toast.error("Username cannot exceed 20 characters.");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        toast.error("Username can only contain letters, numbers, and underscores.");
        return;
      }
    }

    if (formData.bio && formData.bio.length > 160) {
      toast.error("Bio cannot exceed 160 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const normalizedUsername = formData.username
        ? formData.username.trim().toLowerCase().replace(/^@/, "")
        : undefined;

      const response = await axios.put("/api/user/profile/update", {
        ...formData,
        username: normalizedUsername,
        avatarLink: selectedLink,
      });
      setUserDetails(response.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    setFormData(userDetails || {});
    if (userDetails?.avatarLink) {
      setSelectedLink(userDetails.avatarLink);
    }
  }, [userDetails, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen bg-cream-100 text-plum-900 relative">
      <Nav />
      <main className="flex-1 overflow-y-auto w-full flex items-start justify-center p-4 sm:p-6 md:p-10 pb-24 md:pb-12">
        <div className="w-full max-w-2xl bg-white border border-chatora-border p-6 sm:p-10 rounded-3xl shadow-sweet-lg mt-4 sm:mt-6">
          {/* Header & Avatar Banner */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start mb-8 pb-8 border-b border-chatora-border">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-chatora-pink via-chatora-peach to-chatora-lavender shadow-sweet-pink">
                <img
                  src={
                    selectedLink ||
                    userDetails?.avatarLink ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"
                  }
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-cover bg-white p-1"
                />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 border border-chatora-pink/20 text-chatora-pink text-xs font-bold mb-2 uppercase tracking-wider">
                User Profile 💕
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-plum-900 mb-1 tracking-tight truncate">
                {userDetails?.firstName} {userDetails?.lastName}
              </h1>
              <p className="text-sm font-bold text-chatora-pink mb-2 truncate">
                @{userDetails?.username || "username"}
              </p>
              {userDetails?.bio ? (
                <p className="text-sm text-plum-700 italic mb-4 max-w-md bg-cream-50 border border-chatora-border px-3.5 py-2 rounded-2xl break-words font-medium">
                  "{userDetails.bio}"
                </p>
              ) : (
                <p className="text-sm text-plum-500 mb-4">{userDetails?.email}</p>
              )}
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 shadow-sweet">
                  <span className="w-1.5 h-1.5 rounded-full bg-chatora-mint"></span>
                  Verified Account ✨
                </span>
                <span className="px-3 py-1 bg-cream-100 text-plum-600 rounded-full text-xs font-semibold border border-chatora-border">
                  Member since{" "}
                  {new Date(
                    userDetails?.createdAt || Date.now()
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <h2 className="mb-6 text-lg font-extrabold text-plum-900 flex items-center gap-2">
            <span>✨</span>
            Personal Information
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  id="firstName"
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-chatora-border text-plum-900 placeholder:text-plum-500 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all text-sm font-semibold"
                  value={formData?.firstName || ""}
                  placeholder="First Name"
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  id="lastName"
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-chatora-border text-plum-900 placeholder:text-plum-500 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all text-sm font-semibold"
                  value={formData?.lastName || ""}
                  placeholder="Last Name"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="username"
                    className="block text-xs font-bold uppercase tracking-wider text-plum-700"
                  >
                    Username
                  </label>
                  <span className="text-[11px] text-plum-500 font-medium">
                    3–20 characters, lowercase letters, numbers & _
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-chatora-pink font-bold text-sm select-none pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cream-50 border border-chatora-border text-plum-900 placeholder:text-plum-500 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all text-sm font-semibold"
                    value={formData?.username || ""}
                    placeholder="username"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="bio"
                    className="block text-xs font-bold uppercase tracking-wider text-plum-700"
                  >
                    Bio
                  </label>
                  <span
                    className={`text-xs font-mono font-bold ${
                      (formData?.bio || "").length >= 160
                        ? "text-chatora-coral"
                        : (formData?.bio || "").length >= 140
                        ? "text-chatora-yellow"
                        : "text-plum-500"
                    }`}
                  >
                    {(formData?.bio || "").length} / 160
                  </span>
                </div>
                <textarea
                  name="bio"
                  id="bio"
                  rows={3}
                  maxLength={160}
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-chatora-border text-plum-900 placeholder:text-plum-500 focus:outline-none focus:border-chatora-pink focus:ring-1 focus:ring-chatora-pink transition-all text-sm resize-none font-semibold"
                  value={formData?.bio || ""}
                  placeholder="Share a short bio about what you do, what you build, or what you study..."
                  onChange={(e) => {
                    if (e.target.value.length <= 160) {
                      handleChange(e);
                    }
                  }}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="email"
                  className="block mb-2 text-xs font-bold uppercase tracking-wider text-plum-700"
                >
                  Email Address{" "}
                  <span className="text-[11px] text-plum-500 font-normal lowercase ml-1">
                    (read-only)
                  </span>
                </label>
                <input
                  type="text"
                  name="email"
                  id="email"
                  disabled
                  className="w-full px-4 py-3 rounded-2xl bg-cream-200/70 border border-chatora-border text-plum-800 placeholder:text-plum-500 cursor-not-allowed text-sm font-semibold"
                  value={formData?.email || ""}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-chatora-border">
              <SelectAvatar
                setSelectedLink={setSelectedLink}
                selectedLink={selectedLink}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-chatora-border">
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                  isSaving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSaving ? "Saving Changes..." : "Save Changes ✨"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 bg-cream-100 hover:bg-cream-200 border border-chatora-border text-plum-700 font-bold text-sm rounded-2xl transition-colors active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profile;
