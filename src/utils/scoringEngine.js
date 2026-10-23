/**
 * Clinical Scoring Engine for Mr. Bingo Screening App
 * 
 * Age-normalized baselines for ages 5-12 across 5 developmental domains.
 * Uses standard deviation from age baseline to classify risk.
 */

// ── Age-Normalized Baselines ──────────────────────────────────────────
// Each domain has { mean, sd } per age. Values are composite scores 0-100.
// Based on developmental norms for neurodivergent screening.

const AGE_BASELINES = {
    motorCoordination: {
        5: { mean: 45, sd: 15 },
        6: { mean: 50, sd: 14 },
        7: { mean: 55, sd: 13 },
        8: { mean: 60, sd: 12 },
        9: { mean: 65, sd: 11 },
        10: { mean: 70, sd: 10 },
        11: { mean: 75, sd: 9 },
        12: { mean: 80, sd: 8 },
    },
    emotionRecognition: {
        5: { mean: 40, sd: 18 },
        6: { mean: 48, sd: 16 },
        7: { mean: 55, sd: 15 },
        8: { mean: 62, sd: 14 },
        9: { mean: 68, sd: 12 },
        10: { mean: 73, sd: 11 },
        11: { mean: 78, sd: 10 },
        12: { mean: 82, sd: 9 },
    },
    letterProcessing: {
        5: { mean: 35, sd: 20 },
        6: { mean: 45, sd: 18 },
        7: { mean: 55, sd: 16 },
        8: { mean: 63, sd: 14 },
        9: { mean: 70, sd: 12 },
        10: { mean: 76, sd: 10 },
        11: { mean: 80, sd: 9 },
        12: { mean: 85, sd: 8 },
    },
    spatialMemory: {
        5: { mean: 40, sd: 16 },
        6: { mean: 48, sd: 15 },
        7: { mean: 55, sd: 14 },
        8: { mean: 62, sd: 13 },
        9: { mean: 68, sd: 12 },
        10: { mean: 73, sd: 11 },
        11: { mean: 78, sd: 10 },
        12: { mean: 82, sd: 9 },
    },
    attention: {
        5: { mean: 38, sd: 18 },
        6: { mean: 45, sd: 16 },
        7: { mean: 52, sd: 15 },
        8: { mean: 60, sd: 14 },
        9: { mean: 66, sd: 13 },
        10: { mean: 72, sd: 12 },
        11: { mean: 77, sd: 11 },
        12: { mean: 82, sd: 10 },
    },
};

// ── Game → Domain Mapping ─────────────────────────────────────────────

const GAME_CONFIG = {
    CerebralCarGame: {
        domain: 'motorCoordination',
        computeScore: (raw) => {
            // raw: { reactionTimeMs[], collisions, totalWaves, completionRate }
            const avgReaction = raw.reactionTimeMs.length > 0
                ? raw.reactionTimeMs.reduce((a, b) => a + b, 0) / raw.reactionTimeMs.length
                : 1500;
            // Reaction score: 100 for ≤300ms, 0 for ≥2000ms
            const reactionScore = Math.max(0, Math.min(100, ((2000 - avgReaction) / 1700) * 100));
            // Completion rate is already 0-1
            const completionScore = (raw.completionRate || 0) * 100;
            // Weighted composite
            return {
                composite: Math.round(reactionScore * 0.4 + completionScore * 0.6),
                subScores: {
                    avgReactionMs: Math.round(avgReaction),
                    completionRate: parseFloat((raw.completionRate || 0).toFixed(2)),
                    collisions: raw.collisions || 0,
                    totalWaves: raw.totalWaves || 0,
                },
            };
        },
    },

    EmotionGame: {
        domain: 'emotionRecognition',
        computeScore: (raw) => {
            // raw: { correctIds[], confusionPairs[], responseTimeMs[] }
            const totalQuestions = raw.correctIds.length + raw.confusionPairs.length;
            const accuracy = totalQuestions > 0 ? (raw.correctIds.length / totalQuestions) * 100 : 0;
            const avgResponse = raw.responseTimeMs.length > 0
                ? raw.responseTimeMs.reduce((a, b) => a + b, 0) / raw.responseTimeMs.length
                : 5000;
            // Response speed score: 100 for ≤1000ms, 0 for ≥8000ms
            const speedScore = Math.max(0, Math.min(100, ((8000 - avgResponse) / 7000) * 100));
            return {
                composite: Math.round(accuracy * 0.7 + speedScore * 0.3),
                subScores: {
                    accuracy: parseFloat(accuracy.toFixed(1)),
                    avgResponseMs: Math.round(avgResponse),
                    correctCount: raw.correctIds.length,
                    confusionCount: raw.confusionPairs.length,
                },
            };
        },
    },

    LetterMatchingGame: {
        domain: 'letterProcessing',
        computeScore: (raw) => {
            // raw: { timeElapsed, wrongAttempts, mirrorErrors, totalPairs }
            const errorRate = raw.totalPairs > 0 ? raw.wrongAttempts / raw.totalPairs : 1;
            const accuracyScore = Math.max(0, (1 - errorRate) * 100);
            // Speed score: 100 for ≤30s, 0 for ≥180s
            const speedScore = Math.max(0, Math.min(100, ((180 - raw.timeElapsed) / 150) * 100));
            // Mirror penalty
            const mirrorPenalty = Math.min(30, raw.mirrorErrors * 10);
            return {
                composite: Math.round(Math.max(0, accuracyScore * 0.4 + speedScore * 0.3 + (100 - mirrorPenalty) * 0.3)),
                subScores: {
                    timeElapsed: raw.timeElapsed,
                    wrongAttempts: raw.wrongAttempts,
                    mirrorErrors: raw.mirrorErrors,
                    totalPairs: raw.totalPairs,
                },
            };
        },
    },

    MemoryGridGame: {
        domain: 'spatialMemory',
        computeScore: (raw) => {
            // raw: { score, roundTimes[], recallAccuracy, sequenceErrors }
            const accuracyScore = (raw.recallAccuracy || 0) * 100;
            // Raw score is 0-100 already (starts at 100, minus penalties)
            const gameScore = raw.score || 0;
            return {
                composite: Math.round(accuracyScore * 0.5 + gameScore * 0.5),
                subScores: {
                    recallAccuracy: parseFloat((raw.recallAccuracy || 0).toFixed(2)),
                    sequenceErrors: raw.sequenceErrors || 0,
                    finalScore: raw.score || 0,
                    roundCount: raw.roundTimes ? raw.roundTimes.length : 0,
                },
            };
        },
    },

    TypingAdventureGame: {
        domain: 'attention',
        computeScore: (raw) => {
            // raw: { score, totalTimeMs, perQuestionResults[], level }
            const accuracy = (raw.score / 10) * 100;
            const totalTimeSec = (raw.totalTimeMs || 60000) / 1000;
            // Approx WPM: correct answers × avg chars / 5 / time in minutes
            const correctResults = (raw.perQuestionResults || []).filter(r => r.correct);
            const totalChars = correctResults.reduce((sum, r) => sum + (r.input || '').length, 0);
            const wpm = totalTimeSec > 0 ? (totalChars / 5) / (totalTimeSec / 60) : 0;
            // Speed score: 100 for ≥20wpm at this age range, 0 for 0wpm
            const speedScore = Math.min(100, (wpm / 20) * 100);
            return {
                composite: Math.round(accuracy * 0.6 + speedScore * 0.4),
                subScores: {
                    accuracy: parseFloat(accuracy.toFixed(1)),
                    wpm: parseFloat(wpm.toFixed(1)),
                    correctCount: raw.score,
                    totalQuestions: 10,
                    level: raw.level || 1,
                },
            };
        },
    },

    DiagnosticRecorder: {
        domain: 'attention',
        computeScore: (raw) => {
            // raw: { focusScore, maxStreak, totalFocus, totalDistraction }
            const focusPct = raw.focusScore || 0;
            const streakBonus = Math.min(20, (raw.maxStreak || 0) * 2);
            return {
                composite: Math.round(Math.min(100, focusPct * 0.8 + streakBonus)),
                subScores: {
                    focusScore: raw.focusScore,
                    maxStreak: raw.maxStreak,
                    totalFocus: raw.totalFocus,
                    totalDistraction: raw.totalDistraction,
                },
            };
        },
    },
};

// ── Helper: z-score to percentile approximation ───────────────────────

function zToPercentile(z) {
    // Approximate normal CDF using logistic approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327;
    const p = d * Math.exp(-z * z / 2) *
        (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))));
    return z > 0 ? Math.round((1 - p) * 100) : Math.round(p * 100);
}

// ── Main Scoring Function ─────────────────────────────────────────────

/**
 * Score a game session against age-normalized baselines.
 * 
 * @param {string} gameId - Game identifier (e.g. 'CerebralCarGame')
 * @param {object} rawMetrics - Raw metrics from the game
 * @param {number} ageYears - Child's age in years (5-12)
 * @returns {{ subScores, riskLevel, percentile, clinicalFlag, composite, domain }}
 */
export function scoreGame(gameId, rawMetrics, ageYears) {
    const config = GAME_CONFIG[gameId];
    if (!config) {
        console.warn(`[scoringEngine] Unknown gameId: ${gameId}`);
        return {
            subScores: {},
            riskLevel: 'Low',
            percentile: 50,
            clinicalFlag: false,
            composite: 0,
            domain: 'unknown',
        };
    }

    // Clamp age to valid range
    const age = Math.max(5, Math.min(12, Math.round(ageYears)));

    // Compute game-specific composite score
    const { composite, subScores } = config.computeScore(rawMetrics);

    // Get age baseline
    const baseline = AGE_BASELINES[config.domain][age];
    if (!baseline) {
        return { subScores, riskLevel: 'Low', percentile: 50, clinicalFlag: false, composite, domain: config.domain };
    }

    // Calculate z-score
    const zScore = (composite - baseline.mean) / baseline.sd;

    // Risk classification
    let riskLevel = 'Low';
    if (zScore < -2) riskLevel = 'High';
    else if (zScore < -1) riskLevel = 'Moderate';

    // Percentile
    const percentile = zToPercentile(zScore);

    // Clinical flag: composite more than 2 SD below mean
    const clinicalFlag = zScore < -2;

    return {
        subScores,
        riskLevel,
        percentile,
        clinicalFlag,
        composite,
        domain: config.domain,
    };
}
