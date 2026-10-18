// MessageInputForm.jsx
import React from "react";

const MessageInputForm = ({
  selectedUserId,
  selectedGroupId = null,
  newMessage,
  setNewMessage,
  sendMessage,
  onOpenChaos,
  replyingTo,
  onCancelReply,
  partnerName,
  currentUserId,
}) => {
  const getReplyingSenderName = () => {
    if (!replyingTo) return "";
    const senderId = replyingTo.sender?._id || replyingTo.sender;
    if (currentUserId && String(senderId) === String(currentUserId)) {
      return "yourself";
    }
    if (replyingTo.sender?.firstName) {
      return replyingTo.sender.firstName;
    }
    return partnerName || "friend";
  };

  const getReplyingPreviewText = () => {
    if (!replyingTo) return "";
    if (replyingTo.isUnsent) return "Message unsent";
    if (replyingTo.isDeletedForMe) return "Message unavailable";
    return replyingTo.text || "";
  };

  const hasActiveChat = Boolean(selectedUserId || selectedGroupId);

  return (
    <>
      {hasActiveChat && (
        <form
          onSubmit={sendMessage}
          className="w-full max-w-5xl mx-auto p-3 md:p-4 flex flex-col select-none"
        >
          {/* Reply Banner */}
          {replyingTo && (
            <div className="mb-2 px-4 py-2.5 rounded-2xl bg-white/95 border border-chatora-pink/30 backdrop-blur-md flex items-center justify-between shadow-sweet-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-chatora-pink to-chatora-peach flex-shrink-0 shadow-sweet-pink" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-chatora-pink">
                    <span className="text-sm">↩</span>
                    <span>Replying to {getReplyingSenderName()}</span>
                  </div>
                  <p
                    className={`text-xs truncate max-w-[260px] sm:max-w-md md:max-w-xl font-medium ${
                      replyingTo.isUnsent || replyingTo.isDeletedForMe
                        ? "italic text-plum-400"
                        : "text-plum-600"
                    }`}
                  >
                    {getReplyingPreviewText()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelReply}
                title="Cancel reply"
                aria-label="Cancel reply"
                className="p-1.5 rounded-xl text-plum-400 hover:text-plum-800 hover:bg-cream-100 transition-colors flex-shrink-0 focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          )}

          <div className="w-full flex items-center">
            {onOpenChaos && (
              <button
                type="button"
                onClick={onOpenChaos}
                title="Chaos Mode 🌪️"
                aria-label="Open Chaos Mode"
                className="mr-2 sm:mr-2.5 h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 rounded-2xl bg-cream-100 hover:bg-cream-200 border border-border-subtle hover:border-chatora-pink/50 flex items-center justify-center text-lg sm:text-xl hover:scale-105 active:scale-95 transition-all shadow-sweet-sm group focus:outline-none"
              >
                <span className="group-hover:rotate-45 transition-transform duration-300">
                  🌪️
                </span>
              </button>
            )}
            <div className="relative flex-1 flex items-center">
              <input
                id="chat-message-input"
                type="text"
                className="w-full px-5 py-3.5 pr-14 rounded-2xl bg-cream-50 focus:bg-white text-sm text-plum-900 placeholder-plum-500 outline-none border border-border-subtle focus:border-chatora-pink focus:ring-2 focus:ring-chatora-pink/20 shadow-sm transition-all font-medium"
                placeholder="Type your message... (Press Enter to send)"
                value={newMessage}
                onChange={(ev) => setNewMessage(ev.target.value)}
                autoComplete="off"
                required
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!newMessage.trim()}
                title="Send message"
                aria-label="Send message"
                className="absolute right-1.5 aspect-square h-10 w-10 text-white bg-gradient-to-r from-chatora-pink via-[#FF7E9C] to-chatora-peach rounded-xl flex items-center justify-center hover:opacity-95 disabled:opacity-40 disabled:bg-cream-200 disabled:from-cream-200 disabled:to-cream-200 disabled:text-plum-400 disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-sweet-pink active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 ml-0.5"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
};

export default MessageInputForm;
