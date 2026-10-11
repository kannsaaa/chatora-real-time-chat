import React from "react";

const Payments = () => {
  return (
    <section id="architecture" className="py-16 sm:py-24 border-t border-border-subtle bg-cream-100 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-chatora-lavender/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-chatora-lavender/30 text-chatora-lavender text-xs font-bold mb-3 uppercase tracking-wider shadow-sweet-sm">
            <span>⚡ Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-plum-900 mb-4">
            Engineered for speed, built for chaos
          </h2>
          <p className="text-base text-plum-600 leading-relaxed font-medium">
            Chatora pairs high-throughput WebSocket sockets with sequential FIFO Promise queues and resilient connection heartbeat monitors.
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white border border-border-subtle rounded-3xl p-8 flex flex-col items-center text-center shadow-sweet hover:shadow-sweet-lg transition-all duration-300 hover:-translate-y-1">
            <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-chatora-pink to-chatora-peach mb-2">
              &lt; 20ms
            </span>
            <h3 className="text-base font-bold text-plum-900 mb-1.5">
              WebSocket Latency
            </h3>
            <p className="text-xs text-plum-600 leading-relaxed">
              Native WebSocket frame transmission ensures sub-second bi-directional message delivery without polling overhead.
            </p>
          </div>

          <div className="bg-white border border-border-subtle rounded-3xl p-8 flex flex-col items-center text-center shadow-sweet hover:shadow-sweet-lg transition-all duration-300 hover:-translate-y-1">
            <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400 mb-2">
              100%
            </span>
            <h3 className="text-base font-bold text-plum-900 mb-1.5">
              Sequential FIFO Delivery
            </h3>
            <p className="text-xs text-plum-600 leading-relaxed">
              Every client connection maintains a strict sequential Promise queue to guarantee message ordering even under rapid bursts.
            </p>
          </div>

          <div className="bg-white border border-border-subtle rounded-3xl p-8 flex flex-col items-center text-center shadow-sweet hover:shadow-sweet-lg transition-all duration-300 hover:-translate-y-1">
            <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-chatora-lavender to-violet-500 mb-2">
              Zero
            </span>
            <h3 className="text-base font-bold text-plum-900 mb-1.5">
              Credential Exposure
            </h3>
            <p className="text-xs text-plum-600 leading-relaxed">
              HttpOnly JWT cookies, sanitized projection fields, and strictly validated MongoDB ObjectIds ensure complete privacy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payments;
