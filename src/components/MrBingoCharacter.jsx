import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const floatTransition = {
  duration: 3.2,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut"
};

const waveTransition = {
  duration: 2.5,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut"
};

const bounceTransition = {
  duration: 0.8,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeOut"
};

export function MrBingoCharacter({ size = "lg" }) {
  const { isSummer } = useTheme();

  // Adjusted sizes to account for body
  const containerClass = size === "lg" ? "w-64 h-80" : "w-40 h-48";
  const headSize = size === "lg" ? "w-48 h-44" : "w-28 h-24";
  const bodySize = size === "lg" ? "w-32 h-24" : "w-20 h-14";

  // Theme colors
  const mainGradient = isSummer
    ? "from-yellow-300 via-orange-200 to-red-300"
    : "from-blue-200 via-indigo-200 to-purple-200";

  const bodyGradient = isSummer
    ? "from-orange-300 via-yellow-200 to-orange-100"
    : "from-indigo-300 via-purple-200 to-blue-200";

  const blushColor = isSummer ? "bg-rose-400/50" : "bg-pink-400/40";

  return (
    <motion.div
      aria-label="Mr. Bingo, your friendly learning buddy"
      role="img"
      className={`relative ${containerClass} flex flex-col items-center justify-end pb-4 mx-auto`}
      animate={{ y: [0, -8, 0] }}
      transition={floatTransition}
    >
      {/* Glow Effect Behind */}
      <div className={`absolute inset-0 blur-3xl opacity-40 rounded-full scale-110 ${isSummer ? "bg-yellow-200" : "bg-blue-200"}`} />

      {/* Head Group */}
      <div className="relative z-20 flex flex-col items-center">
        {/* Antenna */}
        <motion.div
          className="absolute -top-10 flex flex-col items-center gap-0.5 z-0"
          animate={{ rotate: [-5, 5, -5] }}
          transition={waveTransition}
        >
          <div className={`w-5 h-5 rounded-full shadow-sm border-2 border-white ${isSummer ? "bg-yellow-400" : "bg-indigo-400"}`} />
          <div className="w-1 h-5 bg-slate-300 rounded-full" />
        </motion.div>

        {/* Head Shape */}
        <div className={`relative ${headSize} rounded-[2.5rem] bg-gradient-to-br ${mainGradient} shadow-[0_8px_20px_rgba(0,0,0,0.1),inset_0_-4px_8px_rgba(0,0,0,0.05),inset_0_4px_12px_rgba(255,255,255,0.6)] flex items-center justify-center border-4 border-white z-20`}>

          {/* Face Container */}
          <div className="relative w-full h-full flex flex-col items-center justify-center pt-4">

            {/* Eyes */}
            <div className="flex gap-4 mb-2">
              <motion.div
                className="relative w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shadow-inner overflow-hidden"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1], delay: 1 }}
              >
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-90" />
                <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-white/50 rounded-full" />
              </motion.div>

              <motion.div
                className="relative w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shadow-inner overflow-hidden"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1], delay: 1 }}
              >
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-90" />
                <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-white/50 rounded-full" />
              </motion.div>
            </div>

            {/* Blush */}
            <div className="flex gap-10 absolute top-[3.2rem]">
              <div className={`w-5 h-3 rounded-full blur-sm ${blushColor}`} />
              <div className={`w-5 h-3 rounded-full blur-sm ${blushColor}`} />
            </div>

            {/* Mouth */}
            <div className="w-6 h-3 mt-1 rounded-b-full bg-slate-800/80 overflow-hidden relative">
              <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-4 h-3 bg-rose-400 rounded-full opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Body Group */}
      <div className="relative z-10 -mt-6">
        {/* Main Body */}
        <div className={`relative ${bodySize} rounded-[2rem] bg-gradient-to-b ${bodyGradient} shadow-md border-4 border-white flex justify-center`} />

        {/* Arms */}
        <motion.div
          className={`absolute top-4 -left-3 w-4 h-10 rounded-full border-2 border-white shadow-sm origin-top-right ${isSummer ? "bg-orange-300" : "bg-indigo-300"}`}
          animate={{ rotate: [10, -5, 10] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Waving Arm */}
        <motion.div
          className={`absolute top-2 -right-4 w-4 h-12 rounded-full border-2 border-white shadow-sm origin-bottom-left ${isSummer ? "bg-orange-300" : "bg-indigo-300"}`}
          animate={{ rotate: [-10, 25, -10] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Legs */}
        <div className="absolute -bottom-3 left-6 w-5 h-6 rounded-b-xl bg-slate-800 border-2 border-white" />
        <div className="absolute -bottom-3 right-6 w-5 h-6 rounded-b-xl bg-slate-800 border-2 border-white" />
      </div>

      {/* Shadow */}
      <div className="absolute bottom-2 w-24 h-4 bg-black/10 rounded-[100%] blur-md z-0 scale-x-150" />

    </motion.div>
  );
}
