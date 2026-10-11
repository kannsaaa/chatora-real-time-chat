import React, { useEffect } from "react";

const DeleteConversationModal = ({
  isOpen,
  targetUser,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !targetUser) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm select-none animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-sweet-lg text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-500 text-lg shadow-sweet-sm">
          🗑
        </div>

        <h3
          id="delete-modal-title"
          className="text-base font-extrabold text-plum-900 mb-1.5"
        >
          Delete conversation?
        </h3>

        <p className="text-xs text-plum-600 mb-6 leading-relaxed font-medium">
          {targetUser.isGroup
            ? "This will remove the conversation from your Messages list. Other members will still have their copy of the conversation."
            : "This will remove the conversation from your Messages list. The other person will still have their copy of the conversation."}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-plum-700 hover:text-plum-900 bg-cream-100 hover:bg-cream-200 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sweet-sm focus:outline-none disabled:opacity-50 active:scale-95"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConversationModal;
