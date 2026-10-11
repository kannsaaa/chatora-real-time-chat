import React from "react";

const Features = () => {
  const featuresList = [
    {
      title: "Real-Time WebSocket Messaging",
      description:
        "Sub-second message dispatch powered by native WebSockets with strict FIFO burst ordering, instant delivery, and zero lag.",
      emoji: "⚡",
      accentBg: "bg-chatora-pinkLight text-chatora-pink border-chatora-pink/20",
    },
    {
      title: "🌪️ Signature Chaos Mode",
      description:
        "Never run out of things to talk about. Spark spicy debates, hilarious tech roasts, would-you-rather dilemmas, and trivia battles.",
      emoji: "🌪️",
      accentBg: "bg-chatora-lavenderLight text-chatora-lavender border-chatora-lavender/30",
    },
    {
      title: "👥 Group Chats & Banter",
      description:
        "Create chaotic group chats with friends, assign group avatars, mention replies, and manage members seamlessly.",
      emoji: "👥",
      accentBg: "bg-chatora-peachLight text-chatora-peach border-chatora-peach/30",
    },
    {
      title: "People Discovery & Profiles",
      description:
        "Find colleagues and friends with unique handles, bios, and personalized avatars. Send friend requests in a single click.",
      emoji: "💕",
      accentBg: "bg-chatora-pinkLight text-chatora-pink border-chatora-pink/20",
    },
    {
      title: "Privacy, Unsend & Delete",
      description:
        "Full control over your chat history with Delete-for-me, unsend for everyone, conversation muting, and pinning.",
      emoji: "🔒",
      accentBg: "bg-cream-200 text-plum-700 border-border-subtle",
    },
    {
      title: "Sweet Chaos Visual System",
      description:
        "Warm cream backgrounds, soft peach accents, tactile bouncy buttons, and lovable typography designed to make chatting feel fun again.",
      emoji: "✨",
      accentBg: "bg-amber-100 text-amber-600 border-amber-200",
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 border-t border-border-subtle bg-cream-50 select-none">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-chatora-pink/30 text-chatora-pink text-xs font-bold mb-3 shadow-sweet-sm">
            <span>✨</span>
            <span>Why You'll Love Chatora</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-plum-900 mb-4">
            Designed for genuine connection
          </h2>
          <p className="text-base text-plum-600 font-medium">
            Everything you need for playful, expressive social chat built on a robust full-stack real-time foundation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white border border-border-subtle hover:border-chatora-pink/40 rounded-3xl p-7 transition-all duration-300 hover:shadow-sweet-lg hover:-translate-y-1 group flex flex-col shadow-sweet"
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sweet-sm ${feature.accentBg}`}
              >
                {feature.emoji}
              </div>
              <h3 className="text-lg font-bold text-plum-900 mb-2 group-hover:text-chatora-pink transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-plum-600 leading-relaxed font-normal flex-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
