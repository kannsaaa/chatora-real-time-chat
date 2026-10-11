// OnlineUserList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Contact from "./Contact";
import ConversationContextMenu from "./ConversationContextMenu";
import DeleteConversationModal from "./DeleteConversationModal";

const OnlineUsersList = ({
  onlinePeople = {},
  offlinePeople = {},
  selectedUserId,
  setSelectedUserId,
  selectedGroupId = null,
  onSelectGroup,
  groups = [],
  onOpenCreateGroup,
  allPeople = [],
  conversations = [],
  onTogglePin,
  onToggleMute,
  onToggleUnread,
  onDeleteConversation,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    targetUser: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetUser: null,
    isDeleting: false,
  });

  // Ensure active selected conversation is represented if not already in list
  const activeConversations = [...conversations];
  if (
    selectedUserId &&
    !activeConversations.some(
      (c) => String(c.userId) === String(selectedUserId)
    )
  ) {
    const person = allPeople.find(
      (p) => String(p._id) === String(selectedUserId)
    );
    const onlineP = onlinePeople[selectedUserId];
    const offlineP = offlinePeople[selectedUserId];
    if (person || onlineP || offlineP) {
      activeConversations.unshift({
        _id: selectedUserId,
        userId: selectedUserId,
        firstName:
          person?.firstName || offlineP?.firstName || onlineP?.username || "",
        lastName: person?.lastName || offlineP?.lastName || "",
        username:
          person?.username ||
          offlineP?.username ||
          onlineP?.userHandle ||
          "",
        avatarLink:
          person?.avatarLink ||
          offlineP?.avatarLink ||
          onlineP?.avatarLink ||
          "",
        isPinned: false,
        isMuted: false,
        isUnread: false,
        lastMessage: null,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Filter conversations and groups by search term
  const cleanSearch = searchTerm.trim().toLowerCase();
  const strippedSearch = cleanSearch.replace(/^@/, "");

  const filteredConversations = activeConversations.filter((conv) => {
    if (!cleanSearch) return true;
    const fullName = `${conv.firstName || ""} ${conv.lastName || ""}`
      .trim()
      .toLowerCase();
    const username = (conv.username || "").toLowerCase();
    const handle = (conv.userHandle || conv.username || "").toLowerCase();
    const lastMsgText = (conv.lastMessage?.text || "").toLowerCase();

    return (
      fullName.includes(cleanSearch) ||
      username.includes(cleanSearch) ||
      handle.includes(strippedSearch) ||
      lastMsgText.includes(cleanSearch)
    );
  });

  const filteredGroups = (groups || []).filter((g) => {
    if (!cleanSearch) return true;
    const gName = (g.name || "").toLowerCase();
    const lastMsgText = (g.lastMessage?.text || "").toLowerCase();
    const lastSender = (
      g.lastMessage?.sender?.firstName ||
      g.lastMessage?.sender?.username ||
      ""
    ).toLowerCase();

    return (
      gName.includes(cleanSearch) ||
      lastMsgText.includes(cleanSearch) ||
      lastSender.includes(cleanSearch)
    );
  });

  // Separate into pinned and unpinned
  const pinnedConversations = filteredConversations.filter(
    (conv) => conv.isPinned
  );
  const unpinnedConversations = filteredConversations.filter(
    (conv) => !conv.isPinned
  );

  const pinnedGroups = filteredGroups.filter((g) => g.isPinned);
  const unpinnedGroups = filteredGroups.filter((g) => !g.isPinned);

  // Online count among conversations
  const onlineCount = activeConversations.filter(
    (c) => !!onlinePeople[c.userId]
  ).length;

  const handleOpenContextMenu = (position, targetUser) => {
    setContextMenu({
      isOpen: true,
      position,
      targetUser,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      targetUser: null,
    });
  };

  const handleOpenDeleteModal = (targetUser) => {
    handleCloseContextMenu();
    setDeleteModal({
      isOpen: true,
      targetUser,
      isDeleting: false,
    });
  };

  const handleCloseDeleteModal = () => {
    if (deleteModal.isDeleting) return;
    setDeleteModal({
      isOpen: false,
      targetUser: null,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.targetUser) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      if (onDeleteConversation) {
        await onDeleteConversation(
          deleteModal.targetUser.userId || deleteModal.targetUser._id
        );
      }
      setDeleteModal({
        isOpen: false,
        targetUser: null,
        isDeleting: false,
      });
    } catch (err) {
      console.error("Delete conversation failed:", err);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const renderContactItem = (conv) => {
    const isOnline = Boolean(onlinePeople[conv.userId]);
    const fullName = `${conv.firstName || ""} ${conv.lastName || ""}`.trim();
    const displayName =
      fullName ||
      conv.username ||
      (onlinePeople[conv.userId]?.username) ||
      "User";

    return (
      <Contact
        key={`user-${conv.userId}`}
        userId={conv.userId}
        username={displayName}
        userHandle={conv.username || conv.userHandle}
        selectedUserId={selectedUserId}
        setSelectedUserId={(id) => {
          handleCloseContextMenu();
          if (setSelectedUserId) setSelectedUserId(id);
        }}
        isOnline={isOnline}
        avatarLink={conv.avatarLink}
        isPinned={conv.isPinned}
        isMuted={conv.isMuted}
        isUnread={conv.isUnread}
        lastMessage={conv.lastMessage}
        updatedAt={conv.updatedAt}
        isGroup={false}
        onContextMenu={(pos, user) => handleOpenContextMenu(pos, user)}
        onOptionsClick={(pos, user) => handleOpenContextMenu(pos, user)}
        onLongPress={(pos, user) => handleOpenContextMenu(pos, user)}
      />
    );
  };

  const renderGroupItem = (grp) => {
    return (
      <Contact
        key={`group-${grp._id}`}
        userId={grp._id}
        username={grp.name}
        selectedUserId={selectedGroupId}
        setSelectedUserId={(id) => {
          handleCloseContextMenu();
          if (onSelectGroup) onSelectGroup(id);
        }}
        isOnline={false}
        avatarLink={grp.avatar || "👥"}
        isPinned={grp.isPinned}
        isMuted={grp.isMuted}
        isUnread={grp.isUnread}
        lastMessage={grp.lastMessage}
        updatedAt={grp.updatedAt}
        isGroup={true}
        memberCount={grp.members?.length || 0}
        onContextMenu={(pos, user) =>
          handleOpenContextMenu(pos, { ...user, isGroup: true })
        }
        onOptionsClick={(pos, user) =>
          handleOpenContextMenu(pos, { ...user, isGroup: true })
        }
        onLongPress={(pos, user) =>
          handleOpenContextMenu(pos, { ...user, isGroup: true })
        }
      />
    );
  };

  const isAnyChatSelected = Boolean(selectedUserId || selectedGroupId);

  return (
    <section
      className={`${
        isAnyChatSelected ? "hidden md:flex" : "flex"
      } w-full md:w-80 lg:w-[340px] flex-col bg-white border-r border-border-subtle h-screen select-none flex-shrink-0 z-20 relative shadow-sweet-sm`}
    >
      {/* Header & Search */}
      <div className="p-4 border-b border-border-subtle flex flex-col gap-3.5 bg-cream-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-plum-900 tracking-tight">
              Messages
            </h2>
            <span className="text-xs bg-cream-200 text-plum-700 font-bold px-2 py-0.5 rounded-full border border-border-subtle">
              {activeConversations.length + (groups || []).length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onlineCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-bold text-emerald-600">
                  {onlineCount} online
                </span>
              </div>
            )}

            {onOpenCreateGroup && (
              <button
                type="button"
                id="open-create-group-btn"
                onClick={onOpenCreateGroup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-chatora-pinkLight hover:bg-chatora-pink text-chatora-pink hover:text-white border border-chatora-pink/30 hover:border-chatora-pink text-xs font-bold transition-all shadow-sweet-sm active:scale-95"
                title="Create Group"
                aria-label="Create Group"
              >
                <span className="text-sm font-extrabold leading-none">+</span>
                <span>Group ✨</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-plum-500">
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
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search conversations & groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-cream-50 text-sm text-plum-900 border border-border-subtle rounded-2xl pl-10 pr-9 py-2.5 focus:outline-none focus:bg-white focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 transition-all placeholder-plum-500 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-plum-500 hover:text-plum-900"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
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

      {/* Conversations list */}
      <ul className="flex-1 overflow-y-auto p-2.5 space-y-1 list-none m-0 pb-20 md:pb-4">
        {/* Pinned section if present */}
        {(pinnedConversations.length > 0 || pinnedGroups.length > 0) && (
          <>
            <div className="px-2 pt-1.5 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-plum-600">
                📌 PINNED ({pinnedConversations.length + pinnedGroups.length})
              </span>
            </div>
            {pinnedGroups.map(renderGroupItem)}
            {pinnedConversations.map(renderContactItem)}
          </>
        )}

        {/* Groups section */}
        {unpinnedGroups.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-chatora-pink flex items-center gap-1.5">
                <span>👥</span> GROUPS ({unpinnedGroups.length})
              </span>
            </div>
            {unpinnedGroups.map(renderGroupItem)}
          </>
        )}

        {/* Direct messages section */}
        {unpinnedConversations.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-plum-600">
                💬 DIRECT CHATS ({unpinnedConversations.length})
              </span>
            </div>
            {unpinnedConversations.map(renderContactItem)}
          </>
        )}

        {/* Empty state */}
        {filteredConversations.length === 0 && filteredGroups.length === 0 && (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 border border-border-subtle flex items-center justify-center mx-auto mb-3 text-2xl">
              💬
            </div>
            <p className="text-sm font-bold text-plum-900">
              {searchTerm
                ? `No conversations match "${searchTerm}"`
                : "No conversations yet"}
            </p>
            <p className="text-xs text-plum-600 mt-1 font-medium mb-4">
              {searchTerm
                ? "Try checking your spelling or search another name."
                : "Find someone interesting and start talking."}
            </p>
            {!searchTerm && (
              <Link
                to="/people"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-chatora-pink to-chatora-peach text-white text-xs font-bold shadow-sweet-pink hover:opacity-95 transition-all active:scale-95"
              >
                <span>Find People 💕</span>
              </Link>
            )}
          </div>
        )}
      </ul>

      {/* Context Menu Component */}
      {contextMenu.isOpen && (
        <ConversationContextMenu
          position={contextMenu.position}
          targetUser={contextMenu.targetUser}
          onClose={handleCloseContextMenu}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleUnread={onToggleUnread}
          onOpenDeleteModal={handleOpenDeleteModal}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConversationModal
        isOpen={deleteModal.isOpen}
        targetUser={deleteModal.targetUser}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteModal.isDeleting}
      />
    </section>
  );
};

export default OnlineUsersList;
