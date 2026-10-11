// Contact.jsx
import React, { useRef } from "react";
import Avatar from "./Avatar";

const Contact = ({
  userId,
  username,
  userHandle,
  selectedUserId,
  setSelectedUserId,
  isOnline,
  avatarLink,
  isPinned = false,
  isMuted = false,
  isUnread = false,
  lastMessage = null,
  isGroup = false,
  memberCount = null,
  updatedAt = null,
  onContextMenu,
  onOptionsClick,
  onLongPress,
}) => {
  const isSelected = selectedUserId === userId;

  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isLongPressRef = useRef(false);

  const contactData = {
    _id: userId,
    userId,
    username,
    userHandle,
    isPinned,
    isMuted,
    isUnread,
    avatarLink,
    isGroup,
    memberCount,
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
      if (onLongPress) {
        onLongPress(
          {
            clientX: touch.clientX,
            clientY: touch.clientY,
          },
          contactData
        );
      }
    }, 550);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setTimeout(() => {
      isLongPressRef.current = false;
    }, 120);
  };

  const handleClick = () => {
    if (isLongPressRef.current) return;
    setSelectedUserId(userId);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(
        {
          clientX: e.clientX,
          clientY: e.clientY,
        },
        contactData
      );
    }
  };

  const handleOptionsButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (onOptionsClick) {
      onOptionsClick(
        {
          clientX: rect.left,
          clientY: rect.bottom + 4,
        },
        contactData
      );
    }
  };

  return (
    <li
      className={`relative group flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? "bg-chatora-pinkLight border border-chatora-pink/40 shadow-sweet-sm"
          : isUnread
          ? "bg-cream-100 border border-chatora-pink/20 hover:border-chatora-pink/40 hover:bg-cream-200/80"
          : "hover:bg-cream-100/90 border border-transparent hover:border-border-subtle"
      }`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {isSelected && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-1.5 bg-gradient-to-b from-chatora-pink to-chatora-peach rounded-r-full shadow-sweet-pink"></span>
      )}

      {/* Avatar with Presence Indicator */}
      <div className="relative flex-shrink-0">
        <Avatar
          userId={userId}
          username={username}
          isOnline={isOnline}
          avatarLink={
            avatarLink ||
            (isGroup ? "👥" : "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback")
          }
        />
        {!isGroup ? (
          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
              isOnline
                ? "bg-emerald-400 ring-2 ring-emerald-400/20"
                : "bg-plum-300"
            }`}
            title={isOnline ? "Online" : "Offline"}
          ></div>
        ) : (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-tr from-chatora-pink to-chatora-peach border-2 border-white flex items-center justify-center text-[8px] text-white shadow-sm"
            title="Group"
          >
            👥
          </div>
        )}
      </div>

      {/* Contact Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <p
              className={`text-sm truncate ${
                isSelected
                  ? "text-plum-950 font-bold"
                  : isUnread
                  ? "text-plum-900 font-extrabold tracking-tight"
                  : "text-plum-800 font-semibold"
              }`}
            >
              {username}
            </p>

            {/* Pinned Icon Indicator */}
            {isPinned && (
              <span
                title="Pinned conversation"
                className="text-chatora-pink flex-shrink-0 inline-flex items-center"
                aria-label="Pinned"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 4v4l2 2v2h-7v7l-1 1-1-1v-7H2v-2l2-2V4h12z"
                  />
                </svg>
              </span>
            )}

            {/* Muted Icon Indicator */}
            {isMuted && (
              <span
                title="Notifications muted"
                className="text-plum-400 flex-shrink-0 inline-flex items-center"
                aria-label="Muted"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.143 17.082a24.255 24.255 0 0 1-5.455-1.31A8.967 8.967 0 0 1 6 9.75V9c0-.828.167-1.617.47-2.336M18 9.75V9a6 6 0 0 0-9.33-4.99m12.473 15.072L3 3m11.857 14.082a3 3 0 1 1-5.714 0"
                  />
                </svg>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Timestamp */}
            {(lastMessage?.createdAt || updatedAt) && (
              <span className="text-[11px] text-plum-500 font-semibold">
                {(() => {
                  try {
                    const d = new Date(lastMessage?.createdAt || updatedAt);
                    return isNaN(d.getTime())
                      ? ""
                      : d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                  } catch {
                    return "";
                  }
                })()}
              </span>
            )}

            {/* Unread dot */}
            {isUnread && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-chatora-pink shadow-sweet-pink flex-shrink-0 animate-pulse"
                title="Unread"
                aria-label="Unread message"
              />
            )}

            {/* Live Indicator */}
            {!isGroup && isOnline && !isUnread && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200 flex-shrink-0">
                Live
              </span>
            )}

            {/* ⋮ Action Button */}
            <button
              type="button"
              aria-label="Conversation options"
              onClick={handleOptionsButtonClick}
              className="w-8 h-8 flex items-center justify-center p-1.5 rounded-xl text-plum-500 hover:text-plum-900 hover:bg-cream-200 transition-colors opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 flex-shrink-0 active:scale-95"
              title="Conversation options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>
          </div>
        </div>

        {/* Subtitle / Message preview */}
        <div className="flex items-center justify-between gap-1">
          {(() => {
            if (lastMessage?.isUnsent) {
              return (
                <span className="text-xs truncate italic text-plum-400">
                  Message unsent
                </span>
              );
            }
            if (lastMessage?.text) {
              const textContent =
                isGroup && lastMessage.sender
                  ? `${
                      lastMessage.sender.firstName ||
                      lastMessage.sender.username ||
                      "Someone"
                    }: ${lastMessage.text}`
                  : lastMessage.text;

              return (
                <span
                  className={`text-xs truncate ${
                    isUnread
                      ? "text-plum-900 font-bold"
                      : isSelected
                      ? "text-chatora-pink font-semibold"
                      : "text-plum-600 font-medium"
                  }`}
                >
                  {textContent}
                </span>
              );
            }
            if (isGroup) {
              return (
                <span className="text-xs truncate text-plum-600 font-medium">
                  {memberCount ? `${memberCount} members` : "Group conversation"}
                </span>
              );
            }
            if (userHandle) {
              return (
                <span
                  className={`text-xs truncate font-medium ${
                    isSelected
                      ? "text-chatora-pink"
                      : isUnread
                      ? "text-plum-700 font-bold"
                      : "text-plum-600"
                  }`}
                >
                  @{userHandle}
                </span>
              );
            }
            return (
              <span
                className={`text-xs truncate ${
                  isSelected
                    ? "text-chatora-pink font-semibold"
                    : isOnline
                    ? "text-plum-700 font-medium"
                    : "text-plum-600 font-medium"
                }`}
              >
                {isOnline ? "Active now" : "Offline"}
              </span>
            );
          })()}

          {!lastMessage?.text && !isGroup && userHandle && (
            <span
              className={`text-[11px] truncate flex-shrink-0 font-medium ${
                isSelected
                  ? "text-chatora-pink"
                  : isOnline
                  ? "text-emerald-500"
                  : "text-plum-300"
              }`}
            >
              {isOnline ? "● online" : "offline"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

export default Contact;
