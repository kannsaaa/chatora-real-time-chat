// ChatMessages.jsx
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const ChatMessages = ({
  messages,
  userDetails,
  selectedUserId,
  selectedGroupId = null,
  onDeleteMessageForMe,
  onUnsendMessage,
  onReply,
  onSayHi,
}) => {
  const messagesContainerRef = useRef(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [unsendTarget, setUnsendTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const longPressTimerRef = useRef(null);

  // Close menus and dialogs on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
        setUnsendTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleTouchStart = (msgKey) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMenuId(msgKey);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const getQuoteSenderName = (replyObj) => {
    if (!replyObj) return "Message";
    const replySenderId = (replyObj.sender?._id || replyObj.sender)?.toString();
    if (userDetails?._id && replySenderId === String(userDetails._id)) {
      return "You";
    }
    if (replyObj.sender?.firstName) {
      return replyObj.sender.firstName;
    }
    if (replyObj.sender?.username) {
      return replyObj.sender.username;
    }
    return "User";
  };

  const getQuoteContent = (replyObj) => {
    if (!replyObj) return "Original message unavailable";
    if (replyObj.isUnsent) return "Message unsent";
    if (replyObj.isDeletedForMe) return "Message unavailable";
    if (!replyObj.text) return "Original message unavailable";
    return replyObj.text;
  };

  const handleScrollToMessage = (targetId) => {
    if (!targetId) return;
    const targetElement = document.getElementById(`msg-${targetId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === targetId ? null : curr));
      }, 1500);
    } else {
      toast("Original message is unavailable in view", { icon: "ℹ️" });
    }
  };

  const hasActiveChat = Boolean(selectedUserId || selectedGroupId);

  return (
    <div
      className="w-full px-4 md:px-8 py-6 h-full flex flex-col relative select-text"
      ref={messagesContainerRef}
    >
      {/* Click outside backdrop for message action menus */}
      {activeMenuId && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setActiveMenuId(null)}
        ></div>
      )}

      {hasActiveChat && (
        <div className="flex flex-col gap-3.5">
          {(Array.isArray(messages) ? messages : []).map((message, index) => {
            const senderId = (message.sender?._id || message.sender)?.toString();
            const isMine = userDetails?._id
              ? senderId === String(userDetails._id)
              : false;
            const messageKey = message._id || message.id || `msg-${index}`;
            const timeStr = formatTime(message.createdAt);
            const isMenuOpen = activeMenuId === messageKey;
            const isUnsent = Boolean(message.isUnsent);
            const isHighlighted = highlightedMessageId === messageKey;

            // Group sender header: show sender name if group and not mine and not same as previous
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevSenderId = prevMessage
              ? (prevMessage.sender?._id || prevMessage.sender)?.toString()
              : null;
            const showSenderHeader =
              Boolean(selectedGroupId) &&
              !isMine &&
              (!prevMessage || prevSenderId !== senderId);

            const senderDisplayName =
              message.sender?.firstName ||
              message.sender?.username ||
              "Member";

            return (
              <div
                key={messageKey}
                id={`msg-${messageKey}`}
                className={`flex flex-col group transition-all duration-300 rounded-3xl p-1 ${
                  isHighlighted
                    ? "ring-2 ring-chatora-pink bg-chatora-pinkLight shadow-sweet-pink"
                    : ""
                } ${isMine ? "items-end" : "items-start"}`}
              >
                {showSenderHeader && (
                  <span className="text-[11px] font-bold text-chatora-pink mb-1 px-1">
                    {senderDisplayName}
                  </span>
                )}
                <div
                  className={`flex items-center gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${
                    isMine ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Message Bubble */}
                  <div
                    onTouchStart={() => handleTouchStart(messageKey)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    style={{ wordBreak: "break-word" }}
                    className={`relative px-4 py-2.5 text-[14.5px] leading-relaxed transition-all ${
                      isUnsent
                        ? isMine
                          ? "bg-cream-100 text-plum-400 border border-border-subtle rounded-3xl rounded-tr-sm italic text-xs"
                          : "bg-cream-100 text-plum-400 border border-border-subtle rounded-3xl rounded-tl-sm italic text-xs"
                        : isMine
                        ? "bg-gradient-to-r from-chatora-pink via-[#FF7E9C] to-chatora-peach text-white rounded-3xl rounded-tr-sm shadow-sweet-pink font-medium"
                        : "bg-white text-plum-900 border border-border-subtle rounded-3xl rounded-tl-sm shadow-sweet-sm font-normal"
                    }`}
                  >
                    {/* Quoted Reply Section if replying to another message */}
                    {message.replyTo && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetId =
                            message.replyTo._id || message.replyTo.id;
                          if (targetId) handleScrollToMessage(targetId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            const targetId =
                              message.replyTo._id || message.replyTo.id;
                            if (targetId) handleScrollToMessage(targetId);
                          }
                        }}
                        title="Click to jump to replied message"
                        aria-label="Jump to replied message"
                        className={`mb-2 px-3 py-1.5 rounded-2xl border cursor-pointer transition-all select-none text-left ${
                          isMine
                            ? "bg-black/15 hover:bg-black/25 border-white/20 text-white"
                            : "bg-cream-50 hover:bg-cream-100 border-border-subtle text-plum-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold mb-0.5 opacity-90">
                          <span>↩</span>
                          <span className="truncate">
                            {getQuoteSenderName(message.replyTo)}
                          </span>
                        </div>
                        <p
                          className={`text-xs truncate max-w-[220px] sm:max-w-xs md:max-w-sm ${
                            message.replyTo.isUnsent ||
                            message.replyTo.isDeletedForMe
                              ? "italic opacity-70"
                              : "opacity-95"
                          }`}
                        >
                          {getQuoteContent(message.replyTo)}
                        </p>
                      </div>
                    )}

                    {isUnsent ? (
                      <p className="italic text-xs text-plum-400 flex items-center gap-1.5 py-0.5 select-none font-medium">
                        <span className="text-sm">🚫</span>
                        <span>Message unsent</span>
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>

                  {/* Actions Trigger Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId(isMenuOpen ? null : messageKey)
                      }
                      className={`w-8 h-8 flex items-center justify-center p-1.5 rounded-xl text-plum-500 hover:text-plum-900 hover:bg-cream-200 transition-all ${
                        isMenuOpen
                          ? "opacity-100 bg-cream-200"
                          : "opacity-80 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                      }`}
                      title="Message options"
                      aria-label="Message options"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 1 0-3Z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        className={`absolute top-8 ${
                          isMine ? "right-0" : "left-0"
                        } w-36 bg-white border border-border-subtle rounded-2xl shadow-sweet-lg py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100`}
                      >
                        {!isUnsent && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (onReply) onReply(message);
                            }}
                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-1.5 hover:bg-cream-100 text-plum-800 hover:text-plum-950 flex items-center gap-2 transition-colors rounded-xl font-medium"
                          >
                            <span className="text-sm">↩</span>
                            Reply
                          </button>
                        )}

                        {isMine && !isUnsent && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setUnsendTarget(message);
                            }}
                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 flex items-center gap-2 transition-colors rounded-xl font-medium"
                          >
                            <span className="text-sm">↺</span>
                            Unsend
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeleteTarget(message);
                          }}
                          className="w-[calc(100%-8px)] mx-1 text-left px-3 py-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 flex items-center gap-2 transition-colors rounded-xl font-bold"
                        >
                          <span className="text-sm">🗑</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {timeStr && (
                  <span className="text-[11px] text-plum-500 mt-1 px-1 font-semibold flex items-center gap-1">
                    <span>{timeStr}</span>
                    {isMine && !isUnsent && (
                      <span
                        className="text-chatora-pink text-xs leading-none font-extrabold select-none"
                        title="Delivered"
                        aria-label="Delivered"
                      >
                        ✓✓
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasActiveChat && (!messages || !messages.length) && (
        <div className="flex flex-col items-center justify-center h-full my-auto text-center px-4 select-none">
          <div className="w-16 h-16 rounded-3xl bg-white border border-chatora-pink/20 flex items-center justify-center mb-4 text-3xl shadow-sweet-pink">
            💬✨
          </div>
          <h3 className="text-lg font-extrabold text-plum-900 mb-1">
            Start the conversation
          </h3>
          <p className="text-xs text-plum-600 max-w-xs leading-relaxed font-medium mb-4">
            Say something random. Ask something interesting. Cause a little chaos.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onSayHi) onSayHi();
              const inputEl = document.getElementById("chat-message-input");
              if (inputEl) inputEl.focus();
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 font-extrabold text-xs transition-all active:scale-95 flex items-center gap-1.5"
          >
            Say Hi 👋
          </button>
        </div>
      )}

      {/* Unsend Confirmation Modal */}
      {unsendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left">
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Unsend this message?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
              Everyone in this chat will no longer be able to see the message.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUnsendTarget(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToUnsend = unsendTarget._id || unsendTarget.id;
                  setUnsendTarget(null);
                  if (onUnsendMessage) onUnsendMessage(idToUnsend);
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-sweet-sm active:scale-95"
              >
                Unsend ↺
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete For Me Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left">
            <h3 className="text-base font-extrabold text-plum-900 mb-1.5">
              Delete message?
            </h3>
            <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
              This will remove the message from your chat. Other members will still have their copy.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = deleteTarget._id || deleteTarget.id;
                  setDeleteTarget(null);
                  if (onDeleteMessageForMe) onDeleteMessageForMe(idToDelete);
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sweet-sm active:scale-95"
              >
                Delete 🗑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
