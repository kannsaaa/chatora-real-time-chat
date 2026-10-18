// ChaosModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const CHAOS_MODES = [
  {
    id: "RANDOM_QUESTION",
    name: "Random Question",
    icon: "🤭",
    desc: "Thought-provoking questions to spark deep or hilarious conversations.",
    accent: "from-amber-500/10 to-orange-500/5 border-amber-200 hover:border-amber-300 text-plum-900",
  },
  {
    id: "ICEBREAKER",
    name: "Icebreaker",
    icon: "💬",
    desc: "Warm and engaging conversation starters to get to know each other.",
    accent: "from-sky-500/10 to-blue-500/5 border-sky-200 hover:border-sky-300 text-plum-900",
  },
  {
    id: "ROAST",
    name: "Roast Battle",
    icon: "🔥",
    desc: "Playful, lighthearted tech and life banter roasts. No hard feelings!",
    accent: "from-rose-500/10 to-pink-500/5 border-rose-200 hover:border-rose-300 text-plum-900",
  },
  {
    id: "WOULD_YOU_RATHER",
    name: "Would You Rather",
    icon: "🤔",
    desc: "Tough dilemmas and spicy 50/50 choices to test your values.",
    accent: "from-purple-500/10 to-pink-500/5 border-purple-200 hover:border-purple-300 text-plum-900",
  },
  {
    id: "DEBATE",
    name: "Debate",
    icon: "⚔️",
    desc: "Spicy topics with 2 opposing sides. Pick your hill to die on.",
    accent: "from-emerald-500/10 to-teal-500/5 border-emerald-200 hover:border-emerald-300 text-plum-900",
  },
  {
    id: "CHALLENGE",
    name: "Random Challenge",
    icon: "🎲",
    desc: "Harmless social mini-challenges to complete right now in chat.",
    accent: "from-fuchsia-500/10 to-pink-500/5 border-fuchsia-200 hover:border-fuchsia-300 text-plum-900",
  },
  {
    id: "QUIZ",
    name: "Quick Quiz",
    icon: "🧠",
    desc: "Rapid trivia showdown with 4 choices. Can you get it right?",
    accent: "from-yellow-500/10 to-amber-500/5 border-amber-200 hover:border-amber-300 text-plum-900",
  },
];

const ChaosModal = ({
  isOpen,
  onClose,
  selectedUserId,
  selectedGroupId = null,
  partnerName = "Friend",
  onSendToChat,
}) => {
  const [activeMode, setActiveMode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chaosData, setChaosData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleModalClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleModalClose = () => {
    setActiveMode(null);
    setChaosData(null);
    setErrorMessage(null);
    setSelectedQuizAnswer(null);
    onClose();
  };

  const handleBackToModes = () => {
    setActiveMode(null);
    setChaosData(null);
    setErrorMessage(null);
    setSelectedQuizAnswer(null);
  };

  const fetchChaosContent = async (modeId) => {
    if (!selectedUserId && !selectedGroupId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedQuizAnswer(null);

    try {
      const payload = { mode: modeId };
      if (selectedGroupId) {
        payload.groupId = selectedGroupId;
      } else {
        payload.conversationUserId = selectedUserId;
      }
      const res = await axios.post("/api/chaos/generate", payload);
      setChaosData(res.data);
    } catch (err) {
      console.error("Chaos generation failed:", err);
      const msg =
        err?.response?.data?.message ||
        "Chaos failed 😭 Please give it another shot.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMode = (mode) => {
    setActiveMode(mode);
    fetchChaosContent(mode.id);
  };

  const handleSurpriseMe = () => {
    const randomMode = CHAOS_MODES[Math.floor(Math.random() * CHAOS_MODES.length)];
    handleSelectMode(randomMode);
  };

  const handleSend = () => {
    if (!chaosData?.chatText) return;
    onSendToChat(chaosData.chatText);
    toast.success("Sent to chat! 💌");
    handleModalClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plum-950/40 backdrop-blur-sm select-none animate-in fade-in duration-200"
      onClick={handleModalClose}
      role="dialog"
      aria-modal="true"
      aria-label="Chaos Mode"
    >
      <div
        className="w-full sm:max-w-lg bg-white border border-chatora-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-sweet-lg text-left max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-chatora-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeMode ? (
              <button
                type="button"
                onClick={handleBackToModes}
                className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 -ml-1.5 rounded-xl hover:bg-cream-100 text-plum-600 hover:text-plum-950 transition-colors active:scale-95"
                title="Back to Chaos modes"
                aria-label="Back to modes"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
            ) : (
              <span className="text-2xl flex-shrink-0">🌪️</span>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-plum-900 tracking-tight flex items-center gap-1.5 truncate">
                  {activeMode ? activeMode.name : "CHAOS MODE"}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-chatora-pink/15 text-chatora-pink border border-chatora-pink/30 flex-shrink-0">
                  Sweet Chaos ✨
                </span>
              </div>
              <p className="text-xs text-plum-500 truncate">
                {activeMode
                  ? `Spice up the chat with ${partnerName} 💕`
                  : "Pick your chaos or surprise yourself"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-xl hover:bg-cream-100 text-plum-500 hover:text-plum-900 transition-colors flex-shrink-0 active:scale-95"
            aria-label="Close"
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {!activeMode ? (
            <div className="space-y-3">
              {/* Surprise Me CTA Button */}
              <button
                type="button"
                onClick={handleSurpriseMe}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#C4B5FD] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 font-extrabold text-sm active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Surprise Me</span>
                <span className="text-xs text-plum-700">(Random Chaos)</span>
              </button>

              {/* Mode Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-1">
                {CHAOS_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMode(m)}
                    className={`p-3.5 rounded-2xl bg-gradient-to-br ${m.accent} hover:shadow-sweet hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col text-left group border focus:outline-none focus:ring-2 focus:ring-chatora-pink/40`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl group-hover:scale-110 transition-transform">
                        {m.icon}
                      </span>
                      <span className="text-sm font-bold text-plum-900 tracking-tight">
                        {m.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-plum-600 leading-relaxed line-clamp-2">
                      {m.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Mode Content Card */
            <div className="py-2 flex flex-col gap-4">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-chatora-pink/10 border border-chatora-pink/30 flex items-center justify-center mb-3 animate-spin text-2xl">
                    🌪️
                  </div>
                  <p className="text-sm font-bold text-plum-900 animate-pulse">
                    Summoning sweet chaos...
                  </p>
                  <p className="text-xs text-plum-500 mt-1">
                    Mixing cute and unpredictable energy 💕
                  </p>
                </div>
              ) : errorMessage ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-cream-50 border border-chatora-coral/30">
                  <span className="text-3xl mb-2 block">😭</span>
                  <p className="text-sm font-semibold text-chatora-coral">
                    {errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchChaosContent(activeMode.id)}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-cream-100 text-plum-800 border border-chatora-border transition-all shadow-sweet"
                  >
                    Try again
                  </button>
                </div>
              ) : chaosData ? (
                <div className="space-y-4">
                  {/* Card Display */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cream-50 to-white border border-chatora-border shadow-sweet relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{activeMode.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-chatora-pink">
                        {chaosData.title || activeMode.name}
                      </span>
                    </div>

                    {/* Mode Specific Visuals */}
                    {activeMode.id === "WOULD_YOU_RATHER" &&
                    chaosData.options?.length >= 2 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-plum-900 leading-relaxed">
                          {chaosData.content}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-plum-900 text-xs font-semibold flex items-center justify-center text-center">
                            {chaosData.options[0]}
                          </div>
                          <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 text-plum-900 text-xs font-semibold flex items-center justify-center text-center">
                            {chaosData.options[1]}
                          </div>
                        </div>
                      </div>
                    ) : activeMode.id === "DEBATE" ? (
                      <div className="space-y-3">
                        <p className="text-base font-extrabold text-plum-900 tracking-tight">
                          "{chaosData.content}"
                        </p>
                        <div className="space-y-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                            <span className="font-bold text-emerald-700 mr-1.5">
                              🟢 Side A:
                            </span>
                            {chaosData.sideA}
                          </div>
                          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
                            <span className="font-bold text-sky-700 mr-1.5">
                              🔵 Side B:
                            </span>
                            {chaosData.sideB}
                          </div>
                        </div>
                      </div>
                    ) : activeMode.id === "QUIZ" ? (
                      <div className="space-y-3">
                        <p className="text-sm sm:text-base font-bold text-plum-900">
                          {chaosData.content}
                        </p>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {chaosData.options?.map((opt, idx) => {
                            const isSelected = selectedQuizAnswer === idx;
                            const isCorrect = idx === chaosData.answer;
                            const hasAnswered = selectedQuizAnswer !== null;

                            let btnStyle =
                              "bg-white hover:bg-cream-100 border-chatora-border text-plum-800";
                            if (hasAnswered) {
                              if (isCorrect) {
                                btnStyle =
                                  "bg-emerald-50 border-emerald-400 text-emerald-800 font-bold";
                              } else if (isSelected) {
                                btnStyle =
                                  "bg-rose-50 border-rose-400 text-rose-800";
                              } else {
                                btnStyle =
                                  "bg-cream-50 border-chatora-border text-plum-600 font-medium";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedQuizAnswer(idx)}
                                disabled={hasAnswered}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${btnStyle}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-cream-100 border border-chatora-border flex items-center justify-center font-bold text-[10px] text-plum-700">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span>{opt}</span>
                                </span>
                                {hasAnswered && isCorrect && (
                                  <span className="text-emerald-600 text-xs font-bold">
                                    ✓ Correct
                                  </span>
                                )}
                                {hasAnswered && isSelected && !isCorrect && (
                                  <span className="text-rose-600 text-xs font-bold">
                                    ✗ Incorrect
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {selectedQuizAnswer !== null && (
                          <div className="p-3 rounded-xl bg-cream-50 border border-chatora-border text-xs text-plum-700 mt-2">
                            <span className="font-bold text-chatora-pink block mb-0.5">
                              💡 Fun Fact:
                            </span>
                            {chaosData.explanation}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* General Question / Icebreaker / Roast / Challenge */
                      <p className="text-sm sm:text-base font-semibold font-bold text-plum-900 leading-relaxed">
                        {chaosData.content}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Actions (When active mode has content) */}
        {activeMode && !isLoading && !errorMessage && chaosData && (
          <div className="pt-3.5 mt-2 border-t border-chatora-border flex items-center justify-between gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => fetchChaosContent(activeMode.id)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-cream-100 text-plum-800 border border-chatora-border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sweet focus:outline-none"
            >
              <span>🔄</span>
              <span>Another</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB3C6] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 text-xs font-extrabold flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-chatora-pink/50 active:scale-95"
            >
              <span>💌</span>
              <span>Send to chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChaosModal;

