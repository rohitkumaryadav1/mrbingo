import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const TOTAL_ROUNDS = 8;

const ROUND_CONFIG = [
    { length: 3, penalty: 10 }, // Round 1
    { length: 3, penalty: 10 }, // Round 2
    { length: 4, penalty: 8 },  // Round 3
    { length: 4, penalty: 8 },  // Round 4
    { length: 5, penalty: 5 },  // Round 5
    { length: 5, penalty: 5 },  // Round 6
    { length: 6, penalty: 3 },  // Round 7
    { length: 6, penalty: 3 },  // Round 8
];

export const MemoryGridGame = ({ onBack, onGameEnd }) => {
    const [round, setRound] = useState(1);
    const [score, setScore] = useState(100);
    const [sequence, setSequence] = useState([]);
    const [playerSequence, setPlayerSequence] = useState([]);
    const [gameState, setGameState] = useState('start'); // 'start', 'demo', 'input', 'feedback', 'finished'
    const [activeTile, setActiveTile] = useState(null); // Tile currently lit up
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
    const [roundTimes, setRoundTimes] = useState([]);
    const startTimeRef = useRef(null);

    // sound effects could be added later

    useEffect(() => {
        if (gameState === 'demo') {
            playSequence();
        }
    }, [gameState]);

    // Helper to trigger start of next round
    useEffect(() => {
        // If round > 1 and state is not finished or start (initial), auto-play next round after delay
        if (round > 1 && gameState !== 'finished' && gameState !== 'start') {
            const timer = setTimeout(() => {
                startRound();
            }, 1500); // 1.5s delay before next round pattern starts
            return () => clearTimeout(timer);
        }
    }, [round]);

    const startRound = () => {
        const config = ROUND_CONFIG[round - 1];
        const newSequence = [];
        for (let i = 0; i < config.length; i++) {
            newSequence.push(Math.floor(Math.random() * TOTAL_TILES));
        }
        setSequence(newSequence);
        setPlayerSequence([]);
        setGameState('demo'); // This triggers playSequence due to useEffect
        setFeedback(null);
    };

    const playSequence = async () => {
        // Wait a bit before starting
        await new Promise(r => setTimeout(r, 500));

        for (let i = 0; i < sequence.length; i++) {
            setActiveTile(sequence[i]);
            // Slower speed: 1000ms light up
            await new Promise(r => setTimeout(r, 1000));
            setActiveTile(null);
            // Slower gap: 400ms
            await new Promise(r => setTimeout(r, 400));
        }

        setGameState('input');
        startTimeRef.current = Date.now();
    };

    const handleTileClick = (index) => {
        if (gameState !== 'input') return;

        const expectedIndex = sequence[playerSequence.length];

        if (index === expectedIndex) {
            const newPlayerSeq = [...playerSequence, index];
            setPlayerSequence(newPlayerSeq);

            if (newPlayerSeq.length === sequence.length) {
                handleRoundSuccess();
            }
        } else {
            handleRoundFailure();
        }
    };

    const handleRoundSuccess = () => {
        const endTime = Date.now();
        const timeTaken = (endTime - startTimeRef.current) / 1000;

        setRoundTimes([...roundTimes, { round, time: timeTaken, result: 'success' }]);
        // No score addition on success as requested
        // setScore(s => s + 10); 
        setFeedback('correct');
        setGameState('feedback');

        // Auto-advance
        if (round < TOTAL_ROUNDS) {
            setRound(r => r + 1);
            // useEffect [round] will trigger startRound
        } else {
            // Emit game-end metrics before transitioning
            const allTimes = [...roundTimes, { round, time: timeTaken, result: 'success' }];
            const successes = allTimes.filter(r => r.result === 'success').length;
            onGameEnd?.({
                gameId: 'MemoryGridGame',
                rawMetrics: {
                    score: score, // current score (no penalty this round)
                    roundTimes: allTimes,
                    recallAccuracy: successes / TOTAL_ROUNDS,
                    sequenceErrors: allTimes.filter(r => r.result === 'failure').length,
                },
            });
            setTimeout(() => setGameState('finished'), 1500);
        }
    };

    const handleRoundFailure = () => {
        const endTime = Date.now();
        const timeTaken = (endTime - startTimeRef.current) / 1000;
        const config = ROUND_CONFIG[round - 1];

        setScore(s => Math.max(0, s - config.penalty));
        setRoundTimes([...roundTimes, { round, time: timeTaken, result: 'failure' }]);
        setFeedback('incorrect');
        setGameState('feedback');

        // Auto-advance even on failure
        if (round < TOTAL_ROUNDS) {
            setRound(r => r + 1);
            // useEffect [round] will trigger startRound
        } else {
            // Emit game-end metrics before transitioning
            const updatedScore = Math.max(0, score - config.penalty);
            const allTimes = [...roundTimes, { round, time: timeTaken, result: 'failure' }];
            const successes = allTimes.filter(r => r.result === 'success').length;
            onGameEnd?.({
                gameId: 'MemoryGridGame',
                rawMetrics: {
                    score: updatedScore,
                    roundTimes: allTimes,
                    recallAccuracy: successes / TOTAL_ROUNDS,
                    sequenceErrors: allTimes.filter(r => r.result === 'failure').length,
                },
            });
            setTimeout(() => setGameState('finished'), 1500);
        }
    };

    if (gameState === 'start') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
                <h2 className="text-4xl font-bold text-slate-800 mb-6">Memory Grid</h2>
                <p className="text-xl text-slate-600 mb-8 max-w-md">
                    Watch the pattern of lights, then tap the squares to repeat it.
                    <br /><br />
                    8 Rounds. Get ready!
                </p>
                <button
                    onClick={startRound}
                    className="px-8 py-4 rounded-2xl bg-bingo-blue text-white font-bold text-xl shadow-lg hover:scale-105 transition-transform"
                >
                    Start Game
                </button>
                <button onClick={onBack} className="mt-8 text-slate-400 font-bold hover:text-slate-600">Back</button>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center"
            >
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-4xl font-bold text-slate-800 mb-4">Memory Master!</h2>
                <p className="text-2xl text-slate-600 mb-8">
                    Final Score: <span className="font-bold text-bingo-coral">{score}</span>
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 mb-8 w-full max-w-md max-h-60 overflow-y-auto">
                    <h3 className="font-bold text-slate-700 mb-2">Round Details</h3>
                    {roundTimes.map((rt, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                            <span>Round {rt.round} ({rt.result})</span>
                            <span className="font-mono text-slate-500">{rt.time.toFixed(1)}s</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onBack}
                        className="px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
                    >
                        Exit
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-8">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 font-bold">
                    ← Exit
                </button>
                <div className="flex gap-6 font-bold text-slate-700">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 uppercase">Round</span>
                        <span className="text-xl">{round} / {TOTAL_ROUNDS}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-400 uppercase">Score</span>
                        <span className="text-xl text-bingo-blue">{score}</span>
                    </div>
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-600 mb-6 min-h-[2rem]">
                {gameState === 'demo' && "Watch the pattern..."}
                {gameState === 'input' && "Your turn!"}
                {feedback === 'correct' && <span className="text-green-500">Correct!</span>}
                {feedback === 'incorrect' && <span className="text-orange-500">Oops! Penalty!</span>}
            </h3>

            {/* Grid */}
            <div
                className="grid grid-cols-5 gap-3 p-4 bg-slate-100 rounded-3xl shadow-inner"
                style={{ width: 'fit-content' }}
            >
                {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                    <Tile
                        key={i}
                        index={i}
                        isActive={activeTile === i}
                        onClick={() => handleTileClick(i)}
                        isInteractable={gameState === 'input'}
                    />
                ))}
            </div>

        </div>
    );
};

const Tile = ({ index, isActive, onClick, isInteractable }) => {
    return (
        <motion.div
            className={`
                w-12 h-12 sm:w-16 sm:h-16 rounded-xl cursor-pointer transition-colors duration-200
                ${isActive ? 'bg-bingo-yellow shadow-[0_0_15px_rgba(255,193,7,0.6)] scale-105 z-10' : 'bg-white shadow-sm hover:bg-slate-50'}
            `}
            onClick={onClick}
            whileTap={isInteractable ? { scale: 0.9 } : {}}
            animate={isActive ? { scale: 1.1 } : { scale: 1 }}
        />
    );
};
