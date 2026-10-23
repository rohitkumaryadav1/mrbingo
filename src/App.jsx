import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MrBingoCharacter } from "./components/MrBingoCharacter.jsx";
import { FloatingBackground } from "./components/FloatingBackground.jsx";
import { ChildMode } from "./components/ChildMode.jsx";
import { ParentDashboard } from "./components/ParentDashboard.jsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";

const MODES = {
  LANDING: "landing",
  CHILD: "child",
  PARENT: "parent"
};

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 }
};

function ThemeToggle() {
  const { isSummer, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-soft border border-white/60 transition-all duration-500 ${isSummer
        ? "bg-gradient-to-r from-bingo-yellow to-bingo-coral text-slate-900"
        : "bg-gradient-to-r from-bingo-lavender to-bingo-blue text-slate-800"
        }`}
    >
      <motion.span
        key={isSummer ? "sun" : "moon"}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="text-lg"
      >
        {isSummer ? "☀️" : "🧁"}
      </motion.span>
      <span>{isSummer ? "Summer Vibes" : "Cute Vibes"}</span>
    </button>
  );
}

function AppContent() {
  const [mode, setMode] = useState(MODES.LANDING);
  const { isSummer } = useTheme();

  return (
    <div className={`relative min-h-screen transition-colors duration-700 ${isSummer ? "bg-amber-50" : "bg-sky-50"
      }`}>
      <FloatingBackground />

      {/* App shell */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top nav */}
        <header className="w-full">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 pt-4 sm:pt-6">
            <button
              type="button"
              onClick={() => setMode(MODES.LANDING)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm border border-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-bingo-blue/70 transition-transform hover:scale-105 active:scale-95"
            >
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-2xl text-xl ${isSummer ? "bg-amber-100" : "bg-blue-100"}`}
                aria-hidden="true"
              >
                🧠
              </span>
              <div className="text-left">
                <p className="text-xs sm:text-sm leading-none font-extrabold text-slate-900 tracking-tight">
                  Mr. Bingo
                </p>
                <p className="text-[0.6rem] sm:text-[0.65rem] text-slate-500">
                  Gentle AI learning
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {mode === MODES.LANDING && (
              <motion.section
                key="landing"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4 }}
                aria-label="Welcome to Mr. Bingo"
              >
                <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
                  {/* Text column */}
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.7rem] font-semibold text-bingo-navy shadow-sm mb-3 border border-slate-100">
                      <span aria-hidden="true">💫</span>
                      Designed with neurodivergent kids &amp; clinicians
                    </p>
                    <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-slate-900 leading-tight mb-3">
                      A gentle, playful{" "}
                      <span className={`inline-block text-transparent bg-clip-text bg-gradient-to-r ${isSummer ? "from-amber-400 to-orange-400" : "from-blue-400 to-purple-400"}`}>
                        buddy
                      </span>{" "}
                      for curious brains.
                    </h1>
                    <p className="text-sm sm:text-base text-slate-700 max-w-xl mb-5 leading-relaxed">
                      Mr. Bingo turns everyday learning into small, predictable
                      adventures supporting autistic, ADHD, and otherwise
                      neurodivergent children with calm visuals, clear choices,
                      and gamified stars.
                    </p>

                    {/* Mode buttons */}
                    <div
                      className="flex flex-col sm:flex-row gap-3 sm:items-center"
                      aria-label="Choose your experience"
                    >
                      <motion.button
                        type="button"
                        onClick={() => setMode(MODES.CHILD)}
                        className={`inline-flex items-center justify-center gap-2 rounded-full text-slate-900 font-bold px-6 py-4 text-sm sm:text-base shadow-sm border border-white/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-bingo-yellow/60 ${isSummer ? "bg-amber-200 hover:bg-amber-300" : "bg-blue-200 hover:bg-blue-300"} transition-colors`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span aria-hidden="true" className="text-xl">

                        </span>
                        I am a Child
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => setMode(MODES.PARENT)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-slate-900 font-bold px-6 py-4 text-sm sm:text-base shadow-sm border border-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-bingo-blue/60 hover:bg-slate-50 transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span aria-hidden="true" className="text-xl">

                        </span>
                        I am a Parent / Therapist
                      </motion.button>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 text-[0.7rem] text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        No flashing lights
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-bingo-blue" />
                        Calm sounds
                      </span>
                    </div>
                  </div>

                  {/* Character column */}
                  <div className="relative flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-sm">
                      <MrBingoCharacter />

                      {/* Cloud panel behind - simplified to solid */}
                      <motion.div
                        className="absolute -z-10 inset-x-4 top-16 bottom-[1rem] rounded-[2.5rem] bg-white shadow-soft"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                      />

                      {/* Floating badges */}
                      <motion.div
                        className="absolute -left-3 sm:-left-6 top-5 rounded-3xl bg-bingo-yellow/90 px-4 py-2 shadow-soft border border-white/60 text-xs sm:text-sm font-bold text-bingo-navy flex items-center gap-1.5 backdrop-blur-md"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                        whileHover={{ scale: 1.05, rotate: -2 }}
                      >
                        <span aria-hidden="true">⭐</span>
                        Gentle rewards
                      </motion.div>

                      <motion.div
                        className="absolute -right-3 sm:-right-6 top-20 rounded-3xl bg-bingo-mint/90 px-4 py-2 shadow-soft border border-white/60 text-xs sm:text-sm font-bold text-bingo-navy flex items-center gap-1.5 backdrop-blur-md"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                      >
                        <span aria-hidden="true">🧩</span>
                        For all brains
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {mode === MODES.CHILD && (
              <motion.div
                key="child"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35 }}
              >
                <ChildMode />
              </motion.div>
            )}

            {mode === MODES.PARENT && (
              <motion.div
                key="parent"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35 }}
              >
                <ParentDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="w-full pb-6 pt-4">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-slate-500 opacity-80 hover:opacity-100 transition-opacity">
            <p>Made for neurodivergent joy, safety, and calm.</p>
            <p className="flex gap-2">
              <span>Accessible‑first UI</span>
              <span aria-hidden="true">•</span>
              <span>WCAG‑aware colour choices</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

