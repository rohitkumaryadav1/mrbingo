import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const float = (delay = 0, distance = 18, duration = 8) => ({
  animate: { y: [0, -distance, 0] },
  transition: {
    duration,
    delay,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut"
  }
});

const CUTE_STICKERS = [
  { id: 1, icon: "✨", className: "top-10 left-10 text-yellow-300 text-2xl" },
  { id: 2, icon: "⭐", className: "top-28 right-16 text-yellow-200 text-3xl" },
  { id: 3, icon: "☁️", className: "bottom-24 left-14 text-sky-100 text-4xl" },
  { id: 4, icon: "☁️", className: "bottom-10 right-24 text-sky-100 text-4xl" },
  { id: 5, icon: "✨", className: "top-1/3 left-20 text-yellow-200 text-xl" },
  { id: 6, icon: "🎈", className: "top-2/3 right-10 text-pink-200 text-3xl" },
  { id: 7, icon: "💖", className: "top-20 left-1/4 text-pink-300/60 text-lg" },
  { id: 8, icon: "🍦", className: "bottom-1/3 right-8 text-2xl opacity-70" },
  { id: 9, icon: "⭐", className: "bottom-8 left-1/3 text-yellow-100 text-xl" },
  { id: 10, icon: "✨", className: "top-1/2 left-8 text-yellow-200 text-sm" }
];

const SUMMER_STICKERS = [
  { id: 1, icon: "🍦", className: "top-10 left-10 text-3xl" },
  { id: 2, icon: "☀️", className: "top-28 right-16 text-yellow-400 text-4xl" },
  { id: 3, icon: "🫧", className: "bottom-24 left-14 text-blue-200 text-3xl" },
  { id: 4, icon: "🫧", className: "bottom-10 right-24 text-blue-200 text-3xl" },
  { id: 5, icon: "🏖️", className: "top-1/3 left-20 text-3xl" },
  { id: 6, icon: "🍧", className: "top-2/3 right-10 text-3xl" },
  { id: 7, icon: "🦀", className: "bottom-6 left-20 text-red-300 text-2xl" },
  { id: 8, icon: "🌴", className: "top-20 right-1/4 text-green-300 text-3xl opacity-80" },
  { id: 9, icon: "🌊", className: "bottom-1/3 left-8 text-blue-300 text-2xl opacity-60" },
  { id: 10, icon: "☀️", className: "top-5 left-1/2 text-yellow-400/50 text-xl" }
];

export function FloatingBackground() {
  const { isSummer } = useTheme();

  const stickers = isSummer ? SUMMER_STICKERS : CUTE_STICKERS;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Subtle Pattern Overlay */}
      <div className={`absolute inset-0 opacity-[0.4] ${isSummer ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg==')]" : "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIvPjwvc3ZnPg==')]"} bg-repeat`} />

      {/* Theme Stickers */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isSummer ? "summer" : "cute"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {isSummer && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-0 w-full text-white/30 pointer-events-none"
            >
              <svg viewBox="0 0 1440 320" className="w-full h-auto">
                <path fill="currentColor" d="M0,256L48,250.7C96,245,192,235,288,208C384,181,480,139,576,133.3C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
              </svg>
            </motion.div>
          )}

          {stickers.map((sticker, idx) => (
            <motion.div
              key={sticker.id}
              className={`absolute ${sticker.className} opacity-60`}
              {...float(idx * 0.3, 8 + idx, 6 + idx)}
            >
              {sticker.icon}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

