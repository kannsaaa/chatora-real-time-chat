// ConversationContextMenu.jsx
import React, { useEffect, useRef } from "react";

const ConversationContextMenu = ({
  position, // { x, y }
  targetUser, // { _id, userId, username, firstName, lastName, isPinned, isMuted, isUnread }
  onClose,
  onTogglePin,
  onToggleMute,
  onToggleUnread,
  onOpenDeleteModal,
}) => {
  const menuRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!targetUser || !position) return null;

  const isPinned = Boolean(targetUser.isPinned);
  const isMuted = Boolean(targetUser.isMuted);
  const isUnread = Boolean(targetUser.isUnread);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Determine viewport bounds so desktop menu never overflows or clips
  const menuWidth = 230;
  const menuHeight = 220;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

  let left = position.x;
  let top = position.y;

  // Viewport clamping
  if (left + menuWidth > viewportWidth - 10) {
    left = Math.max(10, viewportWidth - menuWidth - 12);
  }
  if (top + menuHeight > viewportHeight - 10) {
    top = Math.max(10, viewportHeight - menuHeight - 12);
  }
  if (left < 10) left = 10;
  if (top < 10) top = 10;

  const desktopStyle = {
    top: `${top}px`,
    left: `${left}px`,
  };

  const displayName =
    targetUser.isGroup
      ? targetUser.username || "Group Conversation"
      : targetUser.username
      ? `@${targetUser.username}`
      : `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
        "Conversation";

  return (
    <>
      {/* Backdrop to dismiss on click outside */}
      <div
        className="fixed inset-0 z-50 select-none bg-black/20 sm:bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context Menu Dropdown / Mobile Sheet */}
      <div
        ref={menuRef}
        style={isMobile ? undefined : desktopStyle}
        className={
          isMobile
            ? "fixed bottom-5 inset-x-4 max-w-sm mx-auto z-50 bg-white/98 backdrop-blur-md border border-border-subtle rounded-3xl shadow-sweet-lg py-2.5 text-sm text-plum-900 select-none animate-in slide-in-from-bottom duration-150"
            : "fixed z-50 w-56 bg-white/98 backdrop-blur-md border border-border-subtle rounded-3xl shadow-sweet-lg py-2 text-xs text-plum-900 select-none animate-in fade-in zoom-in-95 duration-100"
        }
        role="menu"
        aria-orientation="vertical"
        aria-label="Conversation actions"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contact Name Header */}
        <div className="px-3.5 py-1.5 border-b border-border-subtle mb-1">
          <p className="text-[11px] font-extrabold text-plum-500 uppercase tracking-wider truncate">
            {displayName}
          </p>
        </div>

        {/* 1. Pin / Unpin Conversation */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onTogglePin(targetUser);
            onClose();
          }}
          className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 rounded-2xl hover:bg-cream-100 text-plum-800 hover:text-plum-950 flex items-center gap-2.5 transition-colors focus:bg-cream-100 focus:outline-none font-medium"
        >
          {isPinned ? (
            <>
              <span className="text-sm">📌</span>
              <span>Unpin conversation</span>
            </>
          ) : (
            <>
              <span className="text-sm">📌</span>
              <span>Pin conversation</span>
            </>
          )}
        </button>

        {/* 2. Mute / Unmute Notifications */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onToggleMute(targetUser);
            onClose();
          }}
          className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 rounded-2xl hover:bg-cream-100 text-plum-800 hover:text-plum-950 flex items-center gap-2.5 transition-colors focus:bg-cream-100 focus:outline-none font-medium"
        >
          {isMuted ? (
            <>
              <span className="text-sm">🔔</span>
              <span>Unmute notifications</span>
            </>
          ) : (
            <>
              <span className="text-sm">🔕</span>
              <span>Mute notifications</span>
            </>
          )}
        </button>

        {/* 3. Mark as unread / read */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onToggleUnread(targetUser);
            onClose();
          }}
          className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 rounded-2xl hover:bg-cream-100 text-plum-800 hover:text-plum-950 flex items-center gap-2.5 transition-colors focus:bg-cream-100 focus:outline-none font-medium"
        >
          {isUnread ? (
            <>
              <span className="text-sm">✓</span>
              <span>Mark as read</span>
            </>
          ) : (
            <>
              <span className="text-sm">👀</span>
              <span>Mark as unread</span>
            </>
          )}
        </button>

        {/* Separator */}
        <div className="h-px bg-border-subtle my-1.5 mx-2" />

        {/* 4. Delete Conversation */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenDeleteModal(targetUser);
          }}
          className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 rounded-2xl hover:bg-rose-50 text-rose-500 hover:text-rose-600 flex items-center gap-2.5 transition-colors focus:bg-rose-50 focus:outline-none font-bold"
        >
          <span className="text-sm">🗑</span>
          <span>Delete conversation</span>
        </button>

        {/* Mobile-only cancel button */}
        {isMobile && (
          <>
            <div className="h-px bg-border-subtle my-1.5 mx-2" />
            <button
              type="button"
              role="menuitem"
              onClick={onClose}
              className="w-full text-center py-2 text-plum-700 hover:text-plum-950 font-bold text-xs focus:outline-none"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default ConversationContextMenu;
