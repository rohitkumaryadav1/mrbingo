import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GAME_DURATION_SEC = 60;

const DIFFICULTY_CONFIG = {
    EASY: { lanes: 2, obstaclesPerWave: 1, label: 'Easy', color: 'from-green-400 to-emerald-500', speed: 0.3, spawnRate: 4500, carScale: 0.5 },
    MEDIUM: { lanes: 3, obstaclesPerWave: 2, label: 'Medium', color: 'from-yellow-400 to-amber-500', speed: 0.3, spawnRate: 4000, carScale: 0.4 },
    HARD: { lanes: 4, obstaclesPerWave: 3, label: 'Hard', color: 'from-red-500 to-rose-600', speed: 0.3, spawnRate: 3500, carScale: 0.3 }
};

export const CerebralCarGame = ({ onBack, onGameEnd }) => {
    // Game State
    const [difficulty, setDifficulty] = useState(null); // 'EASY', 'MEDIUM', 'HARD'
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
    const [score, setScore] = useState({
        validDodges: 0,
        missedDodges: 0,
        collisions: 0,
        totalWaves: 0
    });

    // Player State
    const [playerLane, setPlayerLane] = useState(0);
    const [obstacles, setObstacles] = useState([]);

    // Instruction State
    const [dodgeInstruction, setDodgeInstruction] = useState(null); // { targetLane: number, active: boolean }
    const [feedback, setFeedback] = useState(null); // 'GOOD', 'CRASH'
    const [isGameOver, setIsGameOver] = useState(false);

    // Audio Refs (Placeholder)

    // Refs
    const gameLoopRef = useRef();
    const lastTimeRef = useRef();
    const playerLaneRef = useRef(playerLane);
    const dodgeTimestampsRef = useRef([]);
    const waveSpawnTimeRef = useRef(0);
    const obstaclesRef = useRef(obstacles);

    // Sync Refs
    useEffect(() => { playerLaneRef.current = playerLane; }, [playerLane]);
    useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);

    // Timer
    useEffect(() => {
        if (!isPlaying || isGameOver) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, isGameOver]);

    // Controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isPlaying || isGameOver || !difficulty) return;
            const lanes = DIFFICULTY_CONFIG[difficulty].lanes;

            if (e.key === 'ArrowLeft') {
                movePlayer(-1);
            } else if (e.key === 'ArrowRight') {
                movePlayer(1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isGameOver, difficulty]);

    const movePlayer = (direction) => {
        const lanes = DIFFICULTY_CONFIG[difficulty].lanes;
        setPlayerLane(prev => {
            const next = prev + direction;
            if (next >= 0 && next < lanes) return next;
            return prev;
        });
    };

    const startGame = (level) => {
        setDifficulty(level);
        const config = DIFFICULTY_CONFIG[level];
        // Start in middle-ish lane
        const startLane = Math.floor(config.lanes / 2);
        setPlayerLane(startLane);

        setIsPlaying(true);
        setIsGameOver(false);
        setTimeLeft(GAME_DURATION_SEC);
        setScore({ validDodges: 0, missedDodges: 0, collisions: 0, totalWaves: 0 });
        setObstacles([]);
        setDodgeInstruction(null);
        dodgeTimestampsRef.current = [];
        waveSpawnTimeRef.current = 0;
    };

    const endGame = () => {
        setIsGameOver(true);
        setIsPlaying(false);
        cancelAnimationFrame(gameLoopRef.current);

        // Emit metrics via onGameEnd callback
        setScore(currentScore => {
            const totalW = currentScore.totalWaves || 1;
            const completionRate = (totalW - currentScore.collisions) / totalW;
            onGameEnd?.({
                gameId: 'CerebralCarGame',
                rawMetrics: {
                    reactionTimeMs: [...dodgeTimestampsRef.current],
                    collisions: currentScore.collisions,
                    totalWaves: currentScore.totalWaves,
                    completionRate,
                },
            });
            return currentScore;
        });
    };

    // Game Loop
    useEffect(() => {
        if (!isPlaying || isGameOver) {
            cancelAnimationFrame(gameLoopRef.current);
            return;
        }

        let lastSpawn = 0;
        const config = DIFFICULTY_CONFIG[difficulty];

        const loop = (time) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = time - lastTimeRef.current;
            lastTimeRef.current = time;

            // Spawn Logic
            if (time - lastSpawn > config.spawnRate) {
                spawnWave();
                lastSpawn = time;
            }

            updateGameObjects();
            gameLoopRef.current = requestAnimationFrame(loop);
        };

        gameLoopRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(gameLoopRef.current);
    }, [isPlaying, isGameOver, difficulty]);

    const spawnWave = () => {
        const config = DIFFICULTY_CONFIG[difficulty];
        const lanes = config.lanes;
        const obsCount = config.obstaclesPerWave;

        // Strategy:
        // We need to spawn 'obsCount' obstacles.
        // We MUST leave at least one lane open? 
        // Logic:
        // Easy (2 lanes, 1 obs): 1 open.
        // Medium (3 lanes, 2 obs): 1 open.
        // Hard (4 lanes, 3 obs): 1 open.
        // ALWAYS 1 lane open is the standard runner rule.

        // Determination of "Safe Lane" logic
        // We want to force movement.
        // 60% chance to block CURRENT lane.

        let availableLanes = Array.from({ length: lanes }, (_, i) => i);
        let blockedLanes = [];

        // Decide which lanes to block
        // Random shuffle available
        availableLanes.sort(() => Math.random() - 0.5);

        // Take first N lanes
        for (let i = 0; i < obsCount; i++) {
            blockedLanes.push(availableLanes[i]);
        }

        const newObstacles = blockedLanes.map(lane => ({
            id: Date.now() + Math.random(),
            lane: lane,
            y: -20,
            hasCollided: false,
            instructionShown: false
        }));

        setObstacles(prev => [...prev, ...newObstacles]);
        setScore(s => ({ ...s, totalWaves: s.totalWaves + 1 }));
        waveSpawnTimeRef.current = Date.now();
    };

    const updateGameObjects = () => {
        setObstacles(prev => {
            const nextObs = [];
            const currentLane = playerLaneRef.current;
            const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.EASY;

            // Standardized Coordinates (Percentage from Top)
            const PLAYER_TOP = 75;
            const PLAYER_BOTTOM = 90;

            // 1. Analyze Field for Safety
            const blockedLanes = new Set();
            prev.forEach(o => {
                if (o.y > -30 && o.y < PLAYER_BOTTOM) {
                    blockedLanes.add(o.lane);
                }
            });

            // 2. Determine Dodge Instruction
            let foundInstruction = null;
            const isCurrentLaneDangerous = blockedLanes.has(currentLane);

            if (isCurrentLaneDangerous) {
                let nearestSafeLane = -1;
                let minDist = Infinity;

                for (let l = 0; l < config.lanes; l++) {
                    if (!blockedLanes.has(l)) {
                        const dist = Math.abs(l - currentLane);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestSafeLane = l;
                        }
                    }
                }

                if (nearestSafeLane !== -1) {
                    if (nearestSafeLane < currentLane) foundInstruction = 'LEFT';
                    else if (nearestSafeLane > currentLane) foundInstruction = 'RIGHT';
                } else {
                    foundInstruction = currentLane === 0 ? 'RIGHT' : 'LEFT';
                }
            }

            let frameCollisions = 0;

            // 3. Update & Collide
            prev.forEach(originalObs => {
                // Create a shallow copy to avoid mutating state directly
                const obs = { ...originalObs };
                obs.y += config.speed;

                const obsHeight = 15;
                const obsBottom = obs.y + obsHeight;

                const isLaneMatch = obs.lane === currentLane;
                const isVerticalOverlap = (obsBottom > PLAYER_TOP + 2) && (obs.y < PLAYER_BOTTOM - 2);

                if (isLaneMatch && isVerticalOverlap && !obs.hasCollided) {
                    obs.hasCollided = true;
                    frameCollisions++;
                }

                // Track dodges: obstacle passed player zone without collision
                if (obs.y > PLAYER_BOTTOM && !obs.hasCollided && !obs.dodgeCounted) {
                    obs.dodgeCounted = true;
                    setScore(s => ({ ...s, validDodges: s.validDodges + 1 }));
                    if (waveSpawnTimeRef.current > 0) {
                        dodgeTimestampsRef.current.push(Date.now() - waveSpawnTimeRef.current);
                    }
                }

                if (obs.y < 120) nextObs.push(obs);
            });

            // Handle Collisions (Side Effect)
            if (frameCollisions > 0) {
                // We need to update score OUTSIDE the reducer preferably, or inside?
                // setObstacles shouldn't trigger other state updates ideally, but in React events it's ok.
                // Batched updates work fine.
                setScore(s => ({ ...s, collisions: s.collisions + frameCollisions }));
                setFeedback('CRASH');
                setTimeout(() => setFeedback(null), 800);
            }

            // Update Instruction (Side Effect)
            if (isCurrentLaneDangerous && foundInstruction) {
                setDodgeInstruction({ direction: foundInstruction });
            } else {
                setDodgeInstruction(null);
            }

            return nextObs;
        });
    };

    // -- RENDERING --

    if (!difficulty) {
        return (
            <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-8 min-h-[60vh]">
                <h2 className="text-4xl font-bold text-slate-800 mb-2">Cerebral Racer 🏎️</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">
                    Choose your difficulty. Dodge the traffic!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
                    {Object.keys(DIFFICULTY_CONFIG).map(key => {
                        const level = DIFFICULTY_CONFIG[key];
                        return (
                            <button
                                key={key}
                                onClick={() => startGame(key)}
                                className={`
                                    flex flex-col items-center justify-center p-8 rounded-3xl 
                                    bg-white border-4 shadow-xl hover:scale-105 transition-transform
                                    border-slate-200
                                `}
                            >
                                <span className={`text-3xl font-black bg-gradient-to-r ${level.color} bg-clip-text text-transparent mb-2`}>{level.label}</span>
                                <div className="text-slate-400 font-bold text-sm">
                                    {level.lanes} Lanes <br />
                                    {level.obstaclesPerWave} Cars at once
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button onClick={onBack} className="px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">
                    Back to Menu
                </button>
            </div>
        );
    }

    // In-Game Render
    const config = DIFFICULTY_CONFIG[difficulty];
    const laneWidthPercent = 100 / config.lanes;

    return (
        <div className="relative w-full max-w-2xl mx-auto h-[80vh] bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700">
            {/* Road Surface */}
            <div className="absolute inset-0 flex">
                {Array.from({ length: config.lanes }).map((_, i) => (
                    <div key={i} className="h-full border-r-2 border-dashed border-white/20 relative" style={{ width: `${laneWidthPercent}%` }}>
                        {/* Lane Number (optional debugging) */}
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/10 text-4xl font-black">{i + 1}</span>
                    </div>
                ))}
            </div>

            {/* Moving Road Texture (Simulated) */}
            <RoadLines speed={config.speed} />

            {/* Obstacles */}
            {obstacles.map(obs => (
                <div
                    key={obs.id}
                    className="absolute z-10 transition-transform"
                    style={{
                        width: `${laneWidthPercent * config.carScale}%`, // Dynamic car size
                        left: `${(obs.lane * laneWidthPercent) + (laneWidthPercent / 2)}%`,
                        top: `${obs.y}%`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className={`w-full aspect-[2/3] rounded-2xl shadow-lg border-4 relative 
                        ${obs.hasCollided ? 'bg-slate-700 grayscale scale-90 rotate-12 opacity-80' : 'bg-red-500 border-red-300'}
                    `}>
                        {obs.hasCollided && (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">💥</div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 h-[20%] bg-sky-900/50 rounded-sm"></div>
                    </div>
                </div>
            ))}

            {/* Player Car */}
            <motion.div
                className="absolute bottom-20 z-20"
                animate={{
                    left: `${(playerLane * laneWidthPercent) + (laneWidthPercent / 2)}%`,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{
                    width: `${laneWidthPercent * config.carScale}%`, // Dynamic player size
                    translateX: "-50%"
                }}
            >
                <div className="w-full aspect-[2/3] bg-blue-500 rounded-2xl shadow-lg border-4 border-blue-300 relative overflow-hidden group">
                    <div className="absolute top-2 left-2 right-2 h-[20%] bg-sky-900/50 rounded-sm"></div>
                    <div className="absolute bottom-2 left-2 right-2 h-[10%] bg-red-500/80 rounded-sm"></div>
                    {/* Headlights */}
                    <div className="absolute -top-12 left-2 w-4 h-24 bg-yellow-200/40 blur-md rounded-full"></div>
                    <div className="absolute -top-12 right-2 w-4 h-24 bg-yellow-200/40 blur-md rounded-full"></div>
                </div>
            </motion.div>

            {/* GUI Layer */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-xl backdrop-blur-sm text-white">
                    <span className="text-xs opacity-80 uppercase tracking-widest">Time</span>
                    <span className="text-2xl font-mono font-bold">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </div>
                <div className="flex flex-col items-end gap-1 bg-black/40 p-2 rounded-xl backdrop-blur-sm text-white">
                    <span className="text-xs opacity-80 uppercase tracking-widest">Crashes</span>
                    <span className="text-xl font-bold text-red-500">{score.collisions}</span>
                </div>
            </div>

            {/* Feedback Overlay */}
            <AnimatePresence>
                {dodgeInstruction && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-40 left-0 right-0 z-40 flex justify-center pointer-events-none"
                    >
                        <div className="bg-white/95 backdrop-blur-xl border-4 border-indigo-600 px-10 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Dodge</div>
                            <span className="text-6xl font-black text-rose-600 tracking-wider font-mono drop-shadow-sm">{dodgeInstruction.direction}</span>
                        </div>
                    </motion.div>
                )}

                {feedback === 'CRASH' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 text-6xl"
                    >
                        💥
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between z-40 md:hidden pointer-events-auto">
                <button className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full text-4xl shadow-lg active:scale-90 transition-transform" onClick={() => movePlayer(-1)}>⬅️</button>
                <button className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full text-4xl shadow-lg active:scale-90 transition-transform" onClick={() => movePlayer(1)}>➡️</button>
            </div>

            {/* Game Over Screen */}
            {isGameOver && (
                <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-8">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center">
                        <h2 className="text-3xl font-black text-slate-800 mb-6">Race Finished! 🏁</h2>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <StatBox label="Valid Waves" value={score.totalWaves - score.collisions} color="text-indigo-600" />
                            <StatBox label="Crashes" value={score.collisions} color="text-red-600" />
                            <StatBox label="Total Waves" value={score.totalWaves} color="text-amber-500" />
                            <StatBox label="Score" value={(score.totalWaves - score.collisions) * 100} color="text-emerald-600" />
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setDifficulty(null)} className="px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">Menu</button>
                            <button onClick={() => startGame(difficulty)} className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">Race Again</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple animated lines to give speed sensation
const RoadLines = ({ speed }) => {
    const [offset, setOffset] = useState(0);
    const reqRef = useRef();

    useEffect(() => {
        let lastTime;
        const loop = (time) => {
            if (!lastTime) lastTime = time;
            const delta = time - lastTime;
            // Speed factor
            setOffset(prev => (prev + speed * 1.5) % 100);
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [speed]);

    return (
        <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 50px, rgba(255,255,255,0.5) 50px, rgba(255,255,255,0.5) 100px)',
                backgroundPosition: `0 ${offset}%`,
                backgroundSize: '100% 100px'
            }}
        />
    );
};

const StatBox = ({ label, value, color }) => (
    <div className="bg-slate-50 p-4 rounded-2xl">
        <span className="block text-xs uppercase font-bold text-slate-400 mb-1">{label}</span>
        <span className={`text-3xl font-black ${color}`}>{value}</span>
    </div>
);
