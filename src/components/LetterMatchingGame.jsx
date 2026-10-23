import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Expanded Dyslexia Screening Pairs
// Using distinct "confusion groups"
const LETTER_PAIRS = [
    ['b', 'd'], ['p', 'q'], ['m', 'w'],
    ['n', 'u'], ['a', 'o'], ['c', 'e'],
    ['i', 'j'], ['f', 't']
];

const COLORS = [
    'bg-red-400', 'bg-orange-400', 'bg-amber-400',
    'bg-yellow-400', 'bg-lime-400', 'bg-green-400',
    'bg-emerald-400', 'bg-teal-400', 'bg-cyan-400',
    'bg-sky-400', 'bg-blue-400', 'bg-indigo-400',
    'bg-violet-400', 'bg-purple-400', 'bg-fuchsia-400', 'bg-pink-400', 'bg-rose-400'
];

const DIFFICULTY_LEVELS = {
    EASY: { label: 'Easy', grid: 3, pairs: 4, labelColor: 'text-green-500', borderColor: 'border-green-400' }, // 3x3 = 9 (4 pairs + 1 free)
    MEDIUM: { label: 'Medium', grid: 4, pairs: 8, labelColor: 'text-yellow-500', borderColor: 'border-yellow-400' }, // 4x4 = 16 (8 pairs)
    HARD: { label: 'Hard', grid: 5, pairs: 12, labelColor: 'text-red-500', borderColor: 'border-red-400' }, // 5x5 = 25 (12 pairs + 1 free)
};

// Mirror confusion pairs for dyslexia screening
const MIRROR_PAIR_SET = new Set(['b-d', 'd-b', 'p-q', 'q-p', 'm-w', 'w-m', 'n-u', 'u-n']);

export const LetterMatchingGame = ({ onBack, onGameEnd }) => {
    // Game State
    const [difficulty, setDifficulty] = useState(null); // 'EASY', 'MEDIUM', 'HARD' or null (menu)
    const [cards, setCards] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [mirrorErrors, setMirrorErrors] = useState(0);

    // Timer State
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef(null);

    // Timer Effect
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerRunning]);

    const startGame = (levelKey) => {
        const levelConfig = DIFFICULTY_LEVELS[levelKey];
        setDifficulty(levelKey);
        setIsGameComplete(false);
        setMatchedPairs([]);
        setSelectedIndices([]);
        setTimeElapsed(0);
        setWrongAttempts(0);
        setMirrorErrors(0);
        setIsProcessing(false);

        // Generate Cards
        let gameCards = [];
        // Shuffle PAIRS first
        const shuffledPairs = [...LETTER_PAIRS].sort(() => Math.random() - 0.5);

        // We need to fill `levelConfig.pairs` (e.g. 4, 8, 12).
        // Strategy: Pick confusion pairs (b,d) and add them BOTH as separate matchable pairs (b,b) and (d,d).
        // This ensures the confusion element is present on board.

        let selectedLetters = [];
        let slotsRemaining = levelConfig.pairs;

        for (let pair of shuffledPairs) {
            if (slotsRemaining >= 2) {
                // Add both from the pair to maximize confusion
                selectedLetters.push(pair[0]); // e.g. 'b'
                selectedLetters.push(pair[1]); // e.g. 'd'
                slotsRemaining -= 2;
            } else if (slotsRemaining === 1) {
                // Only space for one, pick random from pair
                selectedLetters.push(Math.random() < 0.5 ? pair[0] : pair[1]);
                slotsRemaining -= 1;
            } else {
                break;
            }
        }

        // If we ran out of pairs but still need slots (Hard mode might need 12 pairs, we have 8 pairs=16 letters)
        // We have enough total letters (16) to fill Hard (12).
        // Code above should work fine since 16 > 12.

        selectedLetters.forEach((letter, index) => {
            // Create Pair of IDENTIAL letters
            // Card 1
            gameCards.push({
                id: `p${index}-1`,
                content: letter,
                pairId: letter, // Match by letter content
                color: getRandomColor(),
                isFlipped: false,
                isFree: false
            });
            // Card 2
            gameCards.push({
                id: `p${index}-2`,
                content: letter, // Same letter
                pairId: letter,
                color: getRandomColor(),
                isFlipped: false,
                isFree: false
            });
        });

        // Add Free Tile if Odd Grid (Center usually)
        if (levelConfig.grid % 2 !== 0) {
            gameCards.push({
                id: 'free-tile',
                content: '⭐',
                pairId: 'free',
                color: 'bg-white',
                isFlipped: true,
                isFree: true,
                isMatched: true
            });
        }

        // Shuffle cards for position
        gameCards.sort(() => Math.random() - 0.5);
        setCards(gameCards);

        // Start Timer
        setIsTimerRunning(true);
    };

    const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

    const handleCardClick = (index) => {
        if (
            isProcessing ||
            isGameComplete ||
            cards[index].isFree ||
            matchedPairs.includes(cards[index].pairId) ||
            selectedIndices.includes(index)
        ) return;

        const newSelected = [...selectedIndices, index];
        setSelectedIndices(newSelected);

        if (newSelected.length === 2) {
            setIsProcessing(true);
            checkForMatch(newSelected);
        }
    };

    const checkForMatch = (indices) => {
        const card1 = cards[indices[0]];
        const card2 = cards[indices[1]];

        if (card1.pairId === card2.pairId) {
            // Match found
            const newMatched = [...matchedPairs, card1.pairId];
            setMatchedPairs(newMatched);
            setSelectedIndices([]);
            setIsProcessing(false);

            // Check Win Condition
            const config = DIFFICULTY_LEVELS[difficulty];
            if (newMatched.length === config.pairs) {
                handleGameComplete();
            }
        } else {
            // No Match — check for mirror confusion
            const pairKey = `${card1.content}-${card2.content}`;
            const isMirrorConfusion = MIRROR_PAIR_SET.has(pairKey);

            setTimeout(() => {
                setWrongAttempts(prev => prev + 1);
                if (isMirrorConfusion) {
                    setMirrorErrors(prev => prev + 1);
                }
                setSelectedIndices([]);
                setIsProcessing(false);
            }, 1000);
        }
    };

    const handleGameComplete = () => {
        setIsTimerRunning(false);
        setIsGameComplete(true);

        // Emit game-end metrics — read current state via functional update pattern
        setMirrorErrors(currentMirrorErrors => {
            setWrongAttempts(currentWrongAttempts => {
                setMatchedPairs(currentMatchedPairs => {
                    setTimeElapsed(currentTimeElapsed => {
                        onGameEnd?.({
                            gameId: 'LetterMatchingGame',
                            rawMetrics: {
                                timeElapsed: currentTimeElapsed,
                                wrongAttempts: currentWrongAttempts,
                                mirrorErrors: currentMirrorErrors,
                                totalPairs: currentMatchedPairs.length,
                            },
                        });
                        return currentTimeElapsed;
                    });
                    return currentMatchedPairs;
                });
                return currentWrongAttempts;
            });
            return currentMirrorErrors;
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- RENDER HELPERS ---

    if (!difficulty) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 w-full max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold text-slate-800 mb-2 text-center">Dyslexia Screening 🧩</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">
                    Find the matching confusing letter pairs! <br />
                    (e.g. match <b>'b'</b> with <b>'b'</b>)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {Object.keys(DIFFICULTY_LEVELS).map(key => {
                        const level = DIFFICULTY_LEVELS[key];
                        return (
                            <button
                                key={key}
                                onClick={() => startGame(key)}
                                className={`
                                    flex flex-col items-center justify-center p-8 rounded-3xl 
                                    bg-white border-4 shadow-xl hover:scale-105 transition-transform
                                    ${level.borderColor}
                                `}
                            >
                                <span className={`text-3xl font-black ${level.labelColor} mb-2`}>{level.label}</span>
                                <span className="text-slate-400 font-bold">{level.grid}x{level.grid} Grid</span>
                            </button>
                        );
                    })}
                </div>

                <button onClick={onBack} className="mt-12 px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">
                    Back to Menu
                </button>
            </div>
        );
    }

    const config = DIFFICULTY_LEVELS[difficulty];
    // Dynamic Grid Class
    const gridClass = config.grid === 3 ? 'grid-cols-3' : config.grid === 4 ? 'grid-cols-4' : 'grid-cols-5';

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 min-h-[80vh]">
            {/* Header */}
            <div className="flex justify-between items-center w-full mb-6 bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => setDifficulty(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                        ⬅ Back
                    </button>
                    <div>
                        <h3 className={`font-bold ${config.labelColor}`}>{config.label} Mode</h3>
                        <p className="text-xs text-slate-400">Match the pairs!</p>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time</span>
                    <span className="text-2xl font-mono font-bold text-slate-700">{formatTime(timeElapsed)}</span>
                    <span className="text-xs font-bold text-red-400 mt-1">Mistakes: {wrongAttempts}</span>
                </div>
            </div>

            {/* Game Grid */}
            <div className={`grid ${gridClass} gap-3 md:gap-4 w-full max-w-lg aspect-square`}>
                <AnimatePresence>
                    {cards.map((card, index) => {
                        const isSelected = selectedIndices.includes(index);
                        const isMatched = matchedPairs.includes(card.pairId) || card.isFree;

                        if (card.isFree) {
                            return (
                                <motion.div
                                    key={card.id}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="relative aspect-square rounded-2xl bg-slate-100 border-4 border-slate-200 flex items-center justify-center shadow-inner"
                                >
                                    <span className="text-4xl filter grayscale opacity-50">🤖</span>
                                </motion.div>
                            );
                        }

                        return (
                            <motion.button
                                key={card.id}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                    scale: isMatched ? 0.9 : 1,
                                    opacity: isMatched ? 0.5 : 1,
                                    rotate: isSelected ? [0, 5, -5, 0] : 0
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCardClick(index)}
                                disabled={isMatched}
                                className={`
                                relative aspect-square rounded-2xl flex items-center justify-center shadow-[0_6px_0_0_rgb(0,0,0,0.2)]
                                transition-colors border-2 border-white/20
                                ${card.color}
                                ${isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-100 z-10' : ''}
                            `}
                            >
                                <span className="text-4xl md:text-5xl font-black text-white drop-shadow-md">
                                    {card.content}
                                </span>
                                {isMatched && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl"
                                    >
                                        <span className="text-3xl">✅</span>
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Completion Screen Overlay */}
            {isGameComplete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl"
                    >
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Great Job!</h2>
                        <p className="text-slate-500 mb-6">You matched all the confusing letters.</p>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border-2 border-slate-100 flex justify-around">
                            <div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Time</div>
                                <div className="text-4xl font-mono font-black text-indigo-600">{formatTime(timeElapsed)}</div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Mistakes</div>
                                <div className="text-4xl font-mono font-black text-red-500">{wrongAttempts}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setDifficulty(null)} className="px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">
                                Menu
                            </button>
                            <button onClick={() => startGame(difficulty)} className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg">
                                Play Again
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
