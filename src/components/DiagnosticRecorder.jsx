import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

// --- 1. LOGIC ENGINE (Unchanged) ---
class SocialDiagnosticModule {
    constructor() {
        this.CHAR_ZONE_MIN = 0.45;
        this.CHAR_ZONE_MAX = 0.55;
        this.total_focus_time = 0.0;
        this.total_distraction_time = 0.0;
        this.current_streak = 0.0;
        this.max_streak = 0.0;
        this.LEFT_EYE = [33, 133, 468];
        this.RIGHT_EYE = [362, 263, 473];
    }

    _dist(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    _get_gaze_ratio(landmarks, indices) {
        const p1 = landmarks[indices[0]];
        const p2 = landmarks[indices[1]];
        const iris = landmarks[indices[2]];
        const eye_width = this._dist(p1, p2);
        const dist_to_center = this._dist(p1, iris);
        if (eye_width === 0) return 0.5;
        return dist_to_center / eye_width;
    }

    process(landmarks, dt) {
        if (!landmarks) return null;
        const leftRatio = this._get_gaze_ratio(landmarks, this.LEFT_EYE);
        const rightRatio = this._get_gaze_ratio(landmarks, this.RIGHT_EYE);
        const avgGaze = (leftRatio + rightRatio) / 2.0;

        let zone = "UNKNOWN";
        let isFocused = false;

        if (avgGaze >= this.CHAR_ZONE_MIN && avgGaze <= this.CHAR_ZONE_MAX) {
            zone = "CHARACTER_EYES";
            isFocused = true;
            this.total_focus_time += dt;
            this.current_streak += dt;
            if (this.current_streak > this.max_streak) this.max_streak = this.current_streak;
        } else {
            this.current_streak = 0;
            if (avgGaze < this.CHAR_ZONE_MIN) {
                zone = "DISTRACTION_LEFT";
                this.total_distraction_time += dt;
            } else {
                zone = "DISTRACTION_RIGHT";
                this.total_distraction_time += dt;
            }
        }

        return {
            gazeScore: avgGaze,
            currentZone: zone,
            isFocused: isFocused,
            currentStreak: this.current_streak,
            landmarks: landmarks
        };
    }

    getMetrics() {
        const total = this.total_focus_time + this.total_distraction_time;
        const score = total > 0 ? (this.total_focus_time / total) * 100 : 0;
        return {
            focusScore: score.toFixed(1),
            maxStreak: this.max_streak.toFixed(1),
            totalFocus: this.total_focus_time.toFixed(1),
            totalDistraction: this.total_distraction_time.toFixed(1)
        };
    }
}

// --- 2. REACT COMPONENT ---
const DiagnosticRecorder = ({ onBack, onGameEnd }) => {
    const [gameState, setGameState] = useState('loading');
    const [report, setReport] = useState(null);
    const [debugInfo, setDebugInfo] = useState({ gaze: 0, zone: 'WAITING' });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const landmarkerRef = useRef(null);
    const socialAIRef = useRef(new SocialDiagnosticModule());
    const requestRef = useRef(null);
    const lastTimeRef = useRef(0);
    const startTimeRef = useRef(0); // Track start time
    const gameStateRef = useRef('loading');
    const particlesRef = useRef([]);

    useEffect(() => {
        const initAI = async () => {
            try {
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                landmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.addEventListener("loadeddata", () => {
                        setGameState('ready');
                        gameStateRef.current = 'ready';
                    });
                    videoRef.current.play();
                }

            } catch (error) {
                console.error("Init Error:", error);
                alert("Error: " + error.message);
            }
        };

        initAI();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const startGame = () => {
        if (!landmarkerRef.current) return;
        socialAIRef.current = new SocialDiagnosticModule();
        particlesRef.current = [];
        setGameState('playing');
        gameStateRef.current = 'playing';

        const now = performance.now();
        lastTimeRef.current = now;
        startTimeRef.current = now; // Set Start Time

        loop(now);
    };

    const stopGame = () => {
        gameStateRef.current = 'result';
        setGameState('result');
        const metrics = socialAIRef.current.getMetrics();
        setReport(metrics);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // Emit parsed metrics via onGameEnd
        onGameEnd?.({
            gameId: 'DiagnosticRecorder',
            rawMetrics: {
                focusScore: parseFloat(metrics.focusScore),
                maxStreak: parseFloat(metrics.maxStreak),
                totalFocus: parseFloat(metrics.totalFocus),
                totalDistraction: parseFloat(metrics.totalDistraction),
            },
        });
    };

    const loop = (time) => {
        if (gameStateRef.current !== 'playing') return;

        // 1. Calculate Time Logic
        const dt = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const elapsedTime = (time - startTimeRef.current) / 1000;
        const timeLeft = Math.max(0, 30 - elapsedTime);

        // 2. Stop if time is up
        if (timeLeft <= 0) {
            stopGame();
            return;
        }

        // 3. MediaPipe & Logic
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && landmarkerRef.current) {
            const results = landmarkerRef.current.detectForVideo(video, time);
            let data = null;
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                data = socialAIRef.current.process(results.faceLandmarks[0], dt);
            }

            // 4. Draw Game Scene
            drawGame(canvas, video, data, time, timeLeft);

            if (data) setDebugInfo({ gaze: data.gazeScore.toFixed(3), zone: data.currentZone });
        }
        requestRef.current = requestAnimationFrame(loop);
    };

    // --- 3. VISUAL ENGINE (Black Screen + Lucid Icons) ---
    const drawGame = (canvas, video, data, time, timeLeft) => {
        const ctx = canvas.getContext('2d');

        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const w = canvas.width;
        const h = canvas.height;

        // A. DRAW BLACK BACKGROUND (Hide User)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // B. FALLING LUCID ICONS (Distractions)
        // Spawn Logic (Slightly faster spawn rate for distraction)
        if (Math.random() < 0.08) {
            const types = ['circle', 'square', 'triangle'];
            particlesRef.current.push({
                x: Math.random() * w,
                y: -30,
                size: Math.random() * 15 + 10, // Larger icons
                speed: Math.random() * 4 + 2,
                type: types[Math.floor(Math.random() * types.length)],
                color: `hsl(${Math.random() * 360}, 100%, 70%)` // Neon Colors
            });
        }

        // Draw Logic
        ctx.shadowBlur = 15; // Glow effect
        particlesRef.current.forEach((p, i) => {
            p.y += p.speed;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;

            ctx.beginPath();
            if (p.type === 'circle') {
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            } else if (p.type === 'square') {
                ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            } else if (p.type === 'triangle') {
                ctx.moveTo(p.x, p.y - p.size / 2);
                ctx.lineTo(p.x + p.size / 2, p.y + p.size / 2);
                ctx.lineTo(p.x - p.size / 2, p.y + p.size / 2);
                ctx.closePath();
            }
            ctx.fill();

            if (p.y > h) particlesRef.current.splice(i, 1);
        });
        ctx.shadowBlur = 0; // Reset glow

        // C. CENTER RED DOT (Focus Target)
        const cx = w * 0.5;
        const cy = h * 0.5;
        const pulse = Math.sin(time / 200) * 5;

        let dotColor = '#FF0000';
        let ringColor = 'rgba(255, 0, 0, 0.3)';

        // Turn Green if Focused
        if (data && data.isFocused) {
            dotColor = '#00FF00';
            ringColor = 'rgba(0, 255, 0, 0.3)';
        }

        // Draw Target
        ctx.beginPath();
        ctx.arc(cx, cy, 25 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = ringColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = dotColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        // D. TIMER & DEBUG TEXT
        // Note: We flip context horizontally for text because of the mirror transform
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);

        // Timer Text
        ctx.fillStyle = "white";
        ctx.font = "bold 24px monospace";
        ctx.fillText(`⏱️ ${timeLeft.toFixed(1)}s`, 20, 40);

        // Instructions (Subtle)
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("STARE AT THE DOT", w / 2, h - 30);

        ctx.restore();
    };

    return (
        <div className="relative h-screen w-full bg-black overflow-hidden">
            {/* 1. LAYERS */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                // Video is technically rendered but covered by canvas opacity
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-0"
            />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
            />

            {/* 2. OVERLAYS */}
            {(gameState === 'loading' || gameState === 'ready') && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
                    <h1 className="text-3xl font-bold mb-4">Focus Challenge</h1>
                    {gameState === 'loading' && (
                        <div className="animate-pulse text-yellow-400">Loading AI...</div>
                    )}
                    {gameState === 'ready' && (
                        <div className="text-center">
                            <p className="mb-6 text-gray-400">
                                The screen will turn black.<br />
                                Ignore the falling shapes.<br />
                                Keep your eyes on the <b>Red Dot</b>.
                            </p>
                            <button onClick={startGame} className="bg-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-500 shadow-lg">
                                Start 30s Test
                            </button>
                        </div>
                    )}
                </div>
            )}

            {gameState === 'result' && report && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white text-gray-900">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-96 border border-gray-200 text-center">
                        <h2 className="text-2xl font-bold mb-4">Time's Up! 🏁</h2>
                        <div className="text-6xl font-black text-blue-600 mb-2">{report.focusScore}%</div>
                        <div className="text-gray-500 mb-6">Focus Score</div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-left bg-gray-50 p-4 rounded-lg">
                            <div>Longest Streak:</div>
                            <div className="font-bold">{report.maxStreak}s</div>
                            <div>Distracted Time:</div>
                            <div className="font-bold text-red-500">{report.totalDistraction}s</div>
                        </div>

                        <button onClick={startGame} className="w-full mt-6 bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-black">
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Stop Button */}
            {gameState === 'playing' && (
                <button
                    onClick={stopGame}
                    className="absolute top-4 right-4 z-40 bg-red-600/50 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold"
                >
                    Quit
                </button>
            )}
        </div>
    );
};

export default DiagnosticRecorder;