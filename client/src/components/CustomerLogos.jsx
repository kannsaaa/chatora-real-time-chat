import React from "react";

const CustomerLogos = () => {
  const stack = [
    "React 19",
    "Vite",
    "Node.js",
    "Express",
    "Native WebSocket",
    "MongoDB",
    "TailwindCSS",
  ];

  return (
    <section className="border-t border-border-subtle py-12 bg-cream-50 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs uppercase tracking-widest text-plum-600 font-extrabold mb-6">
          Powered By Modern Full-Stack Technologies ✨
        </p>
        <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-4">
          {stack.map((tech) => (
            <div
              key={tech}
              className="px-4 py-2 rounded-2xl bg-white border border-border-subtle text-plum-700 text-xs sm:text-sm font-semibold hover:border-chatora-pink/50 hover:text-chatora-pink transition-all shadow-sweet-sm hover:scale-105"
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerLogos;
