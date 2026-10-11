import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

const Hero = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden py-12 sm:py-20 lg:py-24 bg-cream-100 select-none">
      {/* Background ambient sweet pastel lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-chatora-pink/15 rounded-full blur-[100px] pointer-events-none -z-0"></div>
      <div className="absolute top-1/2 right-1/4 w-[450px] h-[350px] bg-chatora-peach/20 rounded-full blur-[100px] pointer-events-none -z-0"></div>
      <div className="absolute bottom-10 left-1/2 w-[400px] h-[250px] bg-chatora-lavender/15 rounded-full blur-[90px] pointer-events-none -z-0"></div>

      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-chatora-pink/20 text-chatora-pink text-xs font-bold mb-6 shadow-sweet-sm backdrop-blur-md">
              <span className="text-sm">💬</span>
              <span>Talk. Laugh. Connect.</span>
              <span className="w-1.5 h-1.5 rounded-full bg-chatora-pink animate-pulse"></span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-plum-900 leading-[1.15] mb-6">
              Where conversations <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-chatora-pink via-[#FF7E9C] to-chatora-peach">
                get interesting ✨
              </span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-plum-600 leading-relaxed mb-8 font-medium">
              Find your people. Start conversations. Make them memorable. Cute, fast real-time social chat with group banter, playful Chaos Mode, and zero awkward silences.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              {isAuthenticated ? (
                <Link
                  to="/chathome"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 rounded-2xl shadow-sm hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC] transition-all active:scale-95"
                >
                  Enter Chat Home 💬
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-extrabold text-plum-900 bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 rounded-2xl shadow-sm hover:shadow-sweet-pink hover:from-[#FFA3BA] hover:to-[#FFBDAC] transition-all active:scale-95"
                  >
                    Start Chatting ✨
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-sm font-bold text-plum-800 bg-white border border-border-subtle rounded-2xl hover:bg-cream-200 transition-all shadow-sweet-sm"
                  >
                    Log In
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-border-subtle w-full flex flex-wrap justify-center lg:justify-start gap-6 text-xs text-plum-500 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Sub-millisecond WebSocket delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-chatora-pink"></span>
                <span>Persistent message history</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-chatora-lavender"></span>
                <span>Signature 🌪️ Chaos Mode</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sweet Chaos Chat Mockup */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="w-full max-w-md bg-white border border-border-subtle rounded-3xl p-5 shadow-sweet-lg backdrop-blur-xl relative">
              {/* Decorative mini badge */}
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-chatora-pinkLight border border-chatora-pink/30 text-chatora-pink text-[11px] font-bold shadow-sm flex items-center gap-1">
                <span>💕</span>
                <span>Sweet Chaos</span>
              </div>

              {/* Mock Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kanika"
                      alt="Kanika"
                      className="w-10 h-10 rounded-full bg-cream-200 p-0.5 border border-chatora-pink/30"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-plum-900">Kanika Rathore</h3>
                    <p className="text-[11px] text-plum-500 font-semibold">@kanika • Online 💕</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-chatora-lavenderLight text-chatora-lavender border border-chatora-lavender/30">
                  🌪️ Chaos Chat
                </span>
              </div>

              {/* Mock Chat Bubbles */}
              <div className="space-y-3.5 py-2">
                <div className="flex flex-col items-start">
                  <div className="bg-cream-100 border border-border-subtle text-plum-800 text-xs sm:text-sm p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sweet-sm">
                    hiiii 😭💕 are we ready to cause some chaos tonight?
                  </div>
                  <span className="text-[11px] text-plum-500 mt-1 ml-1 font-semibold">8:41 PM</span>
                </div>

                <div className="flex flex-col items-end">
                  <div className="bg-gradient-to-r from-chatora-pink to-chatora-peach text-white text-xs sm:text-sm p-3.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed shadow-sweet-pink font-medium">
                    always! 😂 picking a spicy Chaos Mode question right now ✨
                  </div>
                  <span className="text-[11px] text-plum-500 mt-1 mr-1 font-semibold">8:42 PM ✓✓</span>
                </div>

                <div className="bg-cream-50 border border-chatora-lavender/40 rounded-2xl p-3 shadow-sweet-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold text-chatora-lavender mb-1">
                    <span>💭 RANDOM QUESTION</span>
                    <span>🎲</span>
                  </div>
                  <p className="text-xs text-plum-800 font-semibold">
                    "What is something you secretly want to try but haven't told anyone yet?"
                  </p>
                </div>
              </div>

              {/* Mock Chat Input */}
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-xl bg-cream-200 border border-border-subtle flex items-center justify-center text-sm hover:scale-105 transition-transform"
                  title="Chaos Mode"
                >
                  🌪️
                </button>
                <div className="flex-1 bg-cream-100 border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-plum-500 flex items-center justify-between">
                  <span>Type a sweet message...</span>
                  <span className="text-[10px] bg-white text-plum-400 px-1.5 py-0.5 rounded border border-border-subtle font-medium">Enter</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-chatora-pink to-chatora-peach text-white flex items-center justify-center shadow-sweet-pink">
                  <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
