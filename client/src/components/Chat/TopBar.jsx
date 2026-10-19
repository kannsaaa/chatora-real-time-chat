import React, { useState, useEffect } from "react";

const TopBar = ({
  setSelectedUserId,
  selectedUserId,
  selectedGroupId = null,
  setSelectedGroupId = null,
  currentGroup = null,
  onOpenGroupInfo = null,
  onLeaveGroup = null,
  offlinePeople,
  onlinePeople,
  allPeople = [],
  conversations = [],
  friends = [],
  onDeleteConversation,
  onUnfriend,
  onBlockUser,
  relationshipStatus,
  onOpenChaos,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmUnfriend, setShowConfirmUnfriend] = useState(false);
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);

  // Close menus and dialogs on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowMenu(false);
        setShowConfirmDelete(false);
        setShowConfirmUnfriend(false);
        setShowConfirmBlock(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isGroup = Boolean(selectedGroupId && !selectedUserId);

  const isOnline = !!onlinePeople[selectedUserId];
  const onlineUser = onlinePeople[selectedUserId];
  const offlineUser = offlinePeople[selectedUserId];
  const directoryUser = allPeople.find(
    (p) => String(p._id) === String(selectedUserId)
  );
  const convUser = (conversations || []).find(
    (c) => String(c.userId || c._id) === String(selectedUserId)
  );
  const friendUser = (friends || []).find(
    (f) => String(f._id || f.userId) === String(selectedUserId)
  );

  const fullName = isGroup
    ? currentGroup?.name || "Group Chat"
    : (convUser
        ? `${convUser.firstName || ""} ${convUser.lastName || ""}`.trim() || convUser.username
        : "") ||
      (friendUser
        ? `${friendUser.firstName || ""} ${friendUser.lastName || ""}`.trim() || friendUser.username
        : "") ||
      (offlineUser
        ? `${offlineUser.firstName || ""} ${offlineUser.lastName || ""}`.trim()
        : "") ||
      (directoryUser
        ? `${directoryUser.firstName || ""} ${directoryUser.lastName || ""}`.trim()
        : "") ||
      onlineUser?.username ||
      "User";

  const usernameHandle = isGroup
    ? null
    : convUser?.username ||
      friendUser?.username ||
      directoryUser?.username ||
      offlineUser?.username ||
      onlineUser?.userHandle ||
      null;

  const avatarLink = isGroup
    ? currentGroup?.avatar || "👥"
    : convUser?.avatarLink ||
      friendUser?.avatarLink ||
      directoryUser?.avatarLink ||
      offlineUser?.avatarLink ||
      onlineUser?.avatarLink ||
      "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

  const handleBack = () => {
    if (setSelectedUserId) setSelectedUserId(null);
    if (setSelectedGroupId) setSelectedGroupId(null);
  };

  return (
    <>
      <header className="relative w-full bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-sweet-sm z-30 flex-shrink-0 select-none">
        <div className="w-full min-h-[58px] sm:min-h-[64px] px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Left area: Back Button + Avatar + Title & Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="md:hidden w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] flex items-center justify-center p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-2xl hover:bg-cream-100 transition-colors text-plum-600 hover:text-plum-900 active:scale-95 flex-shrink-0 focus:outline-none"
              title="Back to conversations"
              aria-label="Back to conversations"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>

            {/* Avatar */}
            <div
              className={`relative flex-shrink-0 ${
                isGroup ? "cursor-pointer" : ""
              }`}
              onClick={isGroup && onOpenGroupInfo ? onOpenGroupInfo : undefined}
            >
              {isGroup ? (
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-chatora-pinkLight to-chatora-peachLight border border-chatora-pink/30 flex items-center justify-center text-lg sm:text-xl shadow-sweet-sm active:scale-95 transition-transform"
                  title="View Group Info"
                >
                  {avatarLink}
                </div>
              ) : (
                <>
                  <img
                    src={avatarLink}
                    alt={fullName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-cream-100 border border-border-subtle p-0.5"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white shadow-sm ${
                      isOnline
                        ? "bg-emerald-400 ring-2 ring-emerald-400/20"
                        : "bg-plum-300"
                    }`}
                  ></div>
                </>
              )}
            </div>

            {/* Title & Info Details */}
            <div
              className={`min-w-0 flex-1 flex flex-col justify-center ${
                isGroup ? "cursor-pointer" : ""
              }`}
              onClick={isGroup && onOpenGroupInfo ? onOpenGroupInfo : undefined}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <h2
                  id="chat-header-title"
                  className="font-extrabold text-plum-900 capitalize leading-tight truncate text-xs sm:text-sm md:text-base hover:text-chatora-pink transition-colors"
                >
                  {fullName}
                </h2>
                {usernameHandle && (
                  <span className="text-[11px] sm:text-xs text-chatora-pink font-semibold truncate hidden xs:inline">
                    @{usernameHandle}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 min-w-0 text-[11px] sm:text-xs">
                {isGroup ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-plum-500 font-medium min-w-0">
                    <span className="whitespace-nowrap flex-shrink-0 font-semibold text-plum-600">
                      {currentGroup?.members?.length || 0} members
                    </span>
                    <span className="text-plum-300 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenGroupInfo) onOpenGroupInfo();
                      }}
                      className="text-[10px] sm:text-[11px] text-chatora-pink font-bold hover:underline truncate text-left focus:outline-none"
                    >
                      Click for Info ✨
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      {isOnline ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="text-emerald-600 font-bold">Online</span>
                        </>
                      ) : (
                        <span className="text-plum-400 font-medium">Offline</span>
                      )}
                    </div>

                    {relationshipStatus === "FRIENDS" && (
                      <>
                        <span className="text-plum-300 text-xs">•</span>
                        <span className="text-[10px] sm:text-[11px] text-chatora-pink font-bold bg-chatora-pinkLight px-1.5 sm:px-2 py-0.2 rounded-full border border-chatora-pink/20 truncate">
                          Friends 💕
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right actions: Chaos Mode Button + Three-dot Menu */}
          <div className="relative flex items-center gap-1 sm:gap-2 text-plum-400 flex-shrink-0">
            {onOpenChaos && (isGroup || relationshipStatus === "FRIENDS") && (
              <button
                type="button"
                onClick={onOpenChaos}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#FFB3C6] to-[#C4B5FD] hover:from-[#FFA3BA] hover:to-[#B4A2F8] text-plum-900 border border-chatora-pink/30 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 transition-all shadow-sweet-sm focus:outline-none active:scale-95 flex-shrink-0"
                title="Chaos Mode 🌪️"
                aria-label="Open Chaos Mode"
              >
                <span className="text-sm sm:text-base">🌪️</span>
                <span className="hidden xs:inline sm:inline">Chaos</span>
                <span className="hidden sm:inline">✨</span>
              </button>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] flex items-center justify-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl hover:bg-cream-100 transition-colors text-plum-600 hover:text-plum-900 active:scale-95 flex-shrink-0 focus:outline-none"
              title="Chat options"
              aria-label="Chat options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 top-11 sm:top-12 w-52 sm:w-56 bg-white border border-border-subtle rounded-3xl shadow-sweet-lg py-2 z-50 text-sm animate-in fade-in zoom-in-95 duration-150">
                  {isGroup ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (onOpenGroupInfo) onOpenGroupInfo();
                        }}
                        className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-cream-100 text-plum-800 hover:text-plum-950 transition-colors flex items-center gap-2.5 font-medium rounded-2xl"
                      >
                        <span className="text-base">ℹ️</span>
                        Group Info
                      </button>

                      {onOpenChaos && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onOpenChaos();
                          }}
                          className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-cream-100 text-chatora-pink hover:text-chatora-pinkHover transition-colors flex items-center gap-2.5 font-bold rounded-2xl"
                        >
                          <span className="text-base">🌪️</span>
                          Chaos Mode
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (onLeaveGroup) onLeaveGroup(selectedGroupId);
                        }}
                        className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2.5 font-bold rounded-2xl"
                      >
                        <span className="text-base">🚪</span>
                        Leave Group
                      </button>

                      <div className="h-px bg-border-subtle my-1.5 mx-2"></div>

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowConfirmDelete(true);
                        }}
                        className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2.5 font-bold rounded-2xl"
                      >
                        <span className="text-base">🗑</span>
                        Delete conversation
                      </button>
                    </>
                  ) : (
                  <>
                    {relationshipStatus === "FRIENDS" && onOpenChaos && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onOpenChaos();
                          }}
                          className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-cream-100 text-chatora-pink hover:text-chatora-pinkHover transition-colors flex items-center gap-2.5 font-bold rounded-2xl"
                        >
                          <span className="text-base">🌪️</span>
                          Chaos Mode
                        </button>
                        <div className="h-px bg-border-subtle my-1.5 mx-2"></div>
                      </>
                    )}
                    {relationshipStatus === "FRIENDS" && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowConfirmUnfriend(true);
                        }}
                        className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-cream-100 text-plum-700 hover:text-plum-900 transition-colors flex items-center gap-2.5 font-medium rounded-2xl"
                      >
                        <span className="text-base">👋</span>
                        Unfriend
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowConfirmBlock(true);
                      }}
                      className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2.5 font-medium rounded-2xl"
                    >
                      <span className="text-base">🚫</span>
                      Block User
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowConfirmDelete(true);
                      }}
                      className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2.5 font-bold rounded-2xl"
                    >
                      <span className="text-base">🗑</span>
                      Delete conversation
                    </button>
                  </>
                )}

                <div className="h-px bg-border-subtle my-1.5 mx-2"></div>

                <button
                  onClick={() => {
                    handleBack();
                    setShowMenu(false);
                  }}
                  className="w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 hover:bg-cream-100 text-plum-500 hover:text-plum-900 transition-colors flex items-center gap-2.5 font-medium rounded-2xl"
                >
                  <span className="text-base">✕</span>
                  Close Conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

      {/* Delete Conversation Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-500 text-lg shadow-sweet-sm">
              🗑
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Delete conversation?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
              {isGroup
                ? "This will clear group messages from your view. The group will continue to exist for other members."
                : "This will remove all messages from your chat. The other person will still have their copy."}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(false);
                  if (onDeleteConversation) {
                    onDeleteConversation(selectedGroupId || selectedUserId);
                  }
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sweet-sm active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfriend Confirmation Modal */}
      {!isGroup && showConfirmUnfriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-amber-500 text-lg shadow-sweet-sm">
              👋
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Unfriend {fullName}?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
              You will no longer be able to message each other unless you become friends again.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmUnfriend(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmUnfriend(false);
                  if (onUnfriend) onUnfriend(selectedUserId);
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sweet-sm active:scale-95"
              >
                Unfriend 👋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {!isGroup && showConfirmBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-500 text-lg shadow-sweet-sm">
              🚫
            </div>
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Block {fullName}?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
              Blocking will prevent them from sending you friend requests and messages.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmBlock(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmBlock(false);
                  if (onBlockUser) onBlockUser(selectedUserId);
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sweet-sm active:scale-95"
              >
                Block User 🚫
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
