import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { generateReport } from "../utils/reportGenerator.js";

// --- Dynamic Data Helpers ---

const GAME_PRETTY_NAMES = {
  CerebralCarGame: 'Cerebral Racer',
  EmotionGame: 'Emotion Explorer',
  LetterMatchingGame: 'Letter Matching',
  MemoryGridGame: 'Memory Grid',
  TypingAdventureGame: 'Typing Adventure',
  DiagnosticRecorder: 'Focus Challenge',
};

const SKILL_DOMAIN_MAP = {
  LetterMatchingGame: { label: 'Reading', color: 'bg-bingo-coral' },
  MemoryGridGame: { label: 'Logic/Memory', color: 'bg-bingo-mint' },
  EmotionGame: { label: 'Communication', color: 'bg-bingo-blue' },
  DiagnosticRecorder: { label: 'Focus', color: 'bg-bingo-lavender' },
  CerebralCarGame: { label: 'Motor Skills', color: 'bg-bingo-yellow' },
  TypingAdventureGame: { label: 'Typing', color: 'bg-bingo-coral' },
};

function loadSessions() {
  try {
    const raw = localStorage.getItem('prism_sessions_default');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function formatSessionDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayName}, ${timeStr}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
}

function computeSummaryStats(sessions) {
  if (sessions.length === 0) {
    return [
      { title: 'Overall Progress', value: '—', sub: 'No data yet', color: 'from-bingo-blue/40 to-bingo-blue/10', iconType: 'progress' },
      { title: 'Skills Mastered', value: '0', sub: 'Play games to begin', color: 'from-bingo-mint/40 to-bingo-mint/10', iconType: 'trend' },
      { title: 'Focus Area', value: '—', sub: 'Not assessed', color: 'from-bingo-yellow/60 to-bingo-yellow/20', iconType: 'focus' },
      { title: 'Time Spent', value: '0m', sub: 'Daily avg: 0m', color: 'from-bingo-lavender/40 to-bingo-lavender/10', iconType: 'time' },
    ];
  }

  // Latest session per game
  const latestByGame = {};
  sessions.forEach(s => {
    if (!latestByGame[s.gameId] || new Date(s.timestamp) > new Date(latestByGame[s.gameId].timestamp)) {
      latestByGame[s.gameId] = s;
    }
  });
  const latestSessions = Object.values(latestByGame);

  // 1. Overall Progress = avg composite
  const composites = latestSessions.map(s => s.scoredResult?.composite || 0);
  const avgComposite = composites.length ? Math.round(composites.reduce((a, b) => a + b, 0) / composites.length) : 0;

  // Week comparison
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const thisWeek = sessions.filter(s => new Date(s.timestamp) >= oneWeekAgo);
  const lastWeek = sessions.filter(s => new Date(s.timestamp) >= twoWeeksAgo && new Date(s.timestamp) < oneWeekAgo);
  const thisWeekAvg = thisWeek.length ? thisWeek.reduce((a, s) => a + (s.scoredResult?.composite || 0), 0) / thisWeek.length : 0;
  const lastWeekAvg = lastWeek.length ? lastWeek.reduce((a, s) => a + (s.scoredResult?.composite || 0), 0) / lastWeek.length : 0;
  const weekDiff = Math.round(thisWeekAvg - lastWeekAvg);
  const weekSub = weekDiff >= 0 ? `+${weekDiff}% this week` : `${weekDiff}% this week`;

  // 2. Skills Mastered = count of games with riskLevel 'Low'
  const mastered = latestSessions.filter(s => s.scoredResult?.riskLevel === 'Low').length;

  // 3. Focus Area = domain with lowest composite
  let worstSession = latestSessions[0];
  latestSessions.forEach(s => {
    if ((s.scoredResult?.composite || 0) < (worstSession?.scoredResult?.composite || 0)) {
      worstSession = s;
    }
  });
  const focusDomain = worstSession?.scoredResult?.domain || 'Unknown';
  const focusLabel = focusDomain.replace(/([A-Z])/g, ' $1').trim();

  // 4. Time Spent = sessions × 2 min avg
  const totalMins = sessions.length * 2;
  const uniqueDays = new Set(sessions.map(s => new Date(s.timestamp).toDateString())).size;
  const dailyAvg = uniqueDays > 0 ? Math.round(totalMins / uniqueDays) : 0;
  const timeValue = totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`;

  return [
    { title: 'Overall Progress', value: `${avgComposite}%`, sub: weekSub, color: 'from-bingo-blue/40 to-bingo-blue/10', iconType: 'progress' },
    { title: 'Skills Mastered', value: String(mastered), sub: `of ${latestSessions.length} assessed`, color: 'from-bingo-mint/40 to-bingo-mint/10', iconType: 'trend' },
    { title: 'Focus Area', value: focusLabel, sub: 'needs support', color: 'from-bingo-yellow/60 to-bingo-yellow/20', iconType: 'focus', isSoftWarning: true },
    { title: 'Time Spent', value: timeValue, sub: `Daily avg: ${dailyAvg}m`, color: 'from-bingo-lavender/40 to-bingo-lavender/10', iconType: 'time' },
  ];
}

function computeSkillBreakdown(sessions) {
  const latestByGame = {};
  sessions.forEach(s => {
    if (!latestByGame[s.gameId] || new Date(s.timestamp) > new Date(latestByGame[s.gameId].timestamp)) {
      latestByGame[s.gameId] = s;
    }
  });

  return Object.entries(SKILL_DOMAIN_MAP).map(([gameId, config]) => {
    const session = latestByGame[gameId];
    return {
      label: config.label,
      value: session ? (session.scoredResult?.composite || 0) : null,
      color: config.color,
      assessed: !!session,
    };
  });
}

function computeRecentActivity(sessions) {
  return sessions
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map((s, i) => ({
      id: i + 1,
      date: formatSessionDate(s.timestamp),
      activity: GAME_PRETTY_NAMES[s.gameId] || s.gameId,
      score: `${s.scoredResult?.composite || 0}/100`,
      time: '~2m',
      status: 'Completed',
    }));
}

const CHILD_PROFILE = {
  name: "Leo",
  age: 7,
  grade: "2nd Grade",
  style: "Visual Learner",
  strength: "Pattern Recognition",
  goal: "Social Referencing",
  mood: "Calm & Focused",
};

// --- Existing Mock Data (Preserved) ---

const COMMUNITIES = [
  { id: 1, name: "2-4 Years (Girls) - Autism", members: 1240 },
  { id: 2, name: "2-4 Years (Boys) - Autism", members: 3400 },
  { id: 3, name: "Non-verbal Support", members: 890 },
  { id: 4, name: "Sensory Processing", members: 1560 },
  { id: 5, name: "Speech Delay Heroes", members: 2100 },
];

const VENT_POSTS = [
  { id: 1, text: "Some days are just hard. The sensory overload was real today, but we made it through.", time: "2h ago", likes: 12 },
  { id: 2, text: "Small win: We tried a new food today and no meltdown! Celebrating the little things.", time: "5h ago", likes: 45 },
  { id: 3, text: "Exhausted but hopeful. The new routine seems to be helping with sleep.", time: "1d ago", likes: 28 },
];

const ACTIVITY_PLANS = []; // kept for backward compat, no longer used

const FAQS = [
  { id: 1, question: "How do I customize an activity plan?", answer: "You can create a custom plan by clicking the '+' button in the Recommended Plans section." },
  { id: 2, question: "Are these activities suitable for all ages?", answer: "The activities are designed for children aged 2-7, but can be adapted for other ages." },
  { id: 3, question: "Can I track my child's progress?", answer: "Yes, the Dashboard Overview shows detailed progress tracking and skill breakdowns." },
  { id: 4, question: "How do I join a community?", answer: "Go to the Community Pod tab and click 'Join' on any community that interests you." },
];

const THERAPISTS = [
  { id: 1, name: "Dr. Sarah Miller", role: "Occupational Therapist", rating: 4.9, location: "New York, NY", isOnline: true },
  { id: 2, name: "Mark Wilson", role: "Speech Therapist", rating: 4.8, location: "Brooklyn, NY", isOnline: false },
  { id: 3, name: "Emily Chen", role: "Child Psychologist", rating: 5.0, location: "Online", isOnline: true },
  { id: 4, name: "David Ross", role: "Behavioral Therapist", rating: 4.7, location: "Queens, NY", isOnline: false },
];

// --- SVG Icons Components ---

function IconTrendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  );
}

function IconTime() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function IconFocus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}


// --- Sub-Components ---

function SummaryCard({ title, value, sub, color, iconType, isSoftWarning }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative overflow-hidden rounded-3xl p-5 shadow-sm border border-white/50 bg-gradient-to-br ${color} flex flex-col justify-between min-h-[140px]`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className={`p-2 rounded-full bg-white/40 text-slate-700`}>
          {iconType === 'trend' && <IconTrendUp />}
          {iconType === 'time' && <IconTime />}
          {iconType === 'focus' && <IconFocus />}
          {iconType === 'progress' && (
            <div className="w-5 h-5 rounded-full border-2 border-slate-700 border-t-transparent animate-spin-slow" />
          )}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className={`text-xs mt-1 font-medium ${isSoftWarning ? 'text-amber-700' : 'text-slate-600'}`}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

function LearningChart() {
  // Simple SVG Line Chart
  const points = [20, 45, 35, 60, 55, 80, 75, 90];
  const width = 100; // viewbox units
  const height = 50;

  // Create path
  let pathD = `M 0 ${height - points[0] / 2}`;
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - (p / 2);
    pathD += ` L ${x} ${y}`;
  });

  return (
    <div className="w-full h-48 sm:h-64 relative bg-white rounded-2xl p-4 flex items-end overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-4 flex flex-col justify-between text-[10px] text-slate-300 pointer-events-none">
        <div className="border-b border-slate-100 w-full h-0"></div>
        <div className="border-b border-slate-100 w-full h-0"></div>
        <div className="border-b border-slate-100 w-full h-0"></div>
        <div className="border-b border-slate-100 w-full h-0"></div>
      </div>

      {/* The Line */}
      <svg className="w-full h-full relative z-10" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8F2E2" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C8F2E2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#lineGrad)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Axis Labels */}
      <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] text-slate-400">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
        <span>Week 4</span>
      </div>
    </div>
  );
}

function SkillBarChart({ skills }) {
  if (!skills || skills.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No skill data yet. Complete games to see breakdown.</p>;
  }
  return (
    <div className="space-y-4 pt-4">
      {skills.map((skill, idx) => (
        <div key={idx} className="group">
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>{skill.label}</span>
            <span>{skill.assessed ? `${skill.value}%` : 'Not assessed'}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            {skill.assessed ? (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${skill.value}%` }}
                transition={{ duration: 1, delay: idx * 0.1 }}
                className={`h-full rounded-full ${skill.color} opacity-80 group-hover:opacity-100 transition-opacity`}
              />
            ) : (
              <div className="h-full rounded-full bg-slate-200 w-full opacity-40" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChildSnapshotCard() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col items-center text-center h-full">
      <div className="mb-4 relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-bingo-yellow via-bingo-coral to-bingo-lavender p-1">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-slate-800">
            {CHILD_PROFILE.name[0]}
          </div>
        </div>
        <div className="absolute bottom-0 right-0 bg-emerald-400 w-5 h-5 rounded-full border-2 border-white"></div>
      </div>

      <h3 className="text-xl font-bold text-slate-900">{CHILD_PROFILE.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{CHILD_PROFILE.age} Years • {CHILD_PROFILE.grade}</p>

      <div className="w-full space-y-3 text-left bg-slate-50 rounded-2xl p-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Learning Style</span>
          <span className="text-slate-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">Visual</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Strength</span>
          <span className="text-slate-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">{CHILD_PROFILE.strength}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Daily Goal</span>
          <span className="text-slate-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">{CHILD_PROFILE.goal}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 w-full">
        {/* Mood Trend hidden — no real mood data available */}
      </div>
    </div>
  );
}

function RecentActivityTable({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        <p>No activity recorded yet. Complete games in Child Mode to see results here.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {activities.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{item.date}</td>
              <td className="px-4 py-3">{item.activity}</td>
              <td className="px-4 py-3 font-semibold text-slate-700">{item.score}</td>
              <td className="px-4 py-3 text-slate-500">{item.time}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  <IconCheck />
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Dashboard Views ---

function CommunityPod() {
  const [subTab, setSubTab] = useState('communities'); // 'communities' | 'vent'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('communities')}
          className={`pb-2 px-1 text-sm font-semibold transition-colors ${subTab === 'communities' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Communities
        </button>
        <button
          onClick={() => setSubTab('vent')}
          className={`pb-2 px-1 text-sm font-semibold transition-colors ${subTab === 'vent' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Anonymous Vent Journal
        </button>
      </div>

      {subTab === 'communities' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {COMMUNITIES.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-shadow">
              <div>
                <h4 className="font-bold text-slate-800">{c.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{c.members.toLocaleString()} members</p>
              </div>
              <button className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">
                Join
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'vent' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Write a Vent (Anonymous)</label>
            <textarea
              className="w-full border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 min-h-[100px]"
              placeholder="Share your thoughts anonymously... This is a safe, judgment-free space."
            ></textarea>
            <div className="flex justify-end mt-3">
              <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                Post Anonymously
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Recent Community Vents</h3>
            <div className="space-y-4">
              {VENT_POSTS.map(post => (
                <div key={post.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-slate-800 text-sm mb-3 italic">"{post.text}"</p>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{post.time}</span>
                    <span className="flex items-center gap-1">❤️ {post.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Shared Gemini API helper ---

const GEMINI_CHAT_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt, systemInstruction) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
  if (!apiKey) throw new Error('No API key configured');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(`${GEMINI_CHAT_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

// --- Dynamic Activity Plans ---

const WELLNESS_ACTIVITIES = [
  { title: 'Stay Hydrated 💧', desc: 'Remind your child to drink water every hour. Hydration supports focus and energy!', duration: '1 min' },
  { title: 'Movement Break 🏃', desc: '10 minutes of outdoor play or dancing — great for sensory regulation and mood.', duration: '10 mins' },
  { title: 'Read Together 📖', desc: 'A 15-minute bedtime story builds bonding, vocabulary, and calm wind-down routines.', duration: '15 mins' },
  { title: 'Deep Breathing 🌬️', desc: 'Practice 2 minutes of slow belly breathing together. Try "smell the flower, blow the candle".', duration: '2 mins' },
];

function ActivityPlans() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    generateActivities();
  }, []);

  const generateActivities = async () => {
    setLoading(true);
    setError('');
    setBanner(null);

    const sessions = loadSessions();

    // No sessions → empty state
    if (sessions.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    // Get latest per game
    const latestByGame = {};
    sessions.forEach(s => {
      if (!latestByGame[s.gameId] || new Date(s.timestamp) > new Date(latestByGame[s.gameId].timestamp)) {
        latestByGame[s.gameId] = s;
      }
    });
    const latest = Object.values(latestByGame);
    const allLow = latest.every(s => s.scoredResult?.riskLevel === 'Low');

    if (allLow) {
      setBanner(`Great news! ${CHILD_PROFILE.name} is developing wonderfully. Here are some healthy habit activities to keep up the good work!`);
      setActivities(WELLNESS_ACTIVITIES);
      setLoading(false);
      return;
    }

    // Find weakest domain
    let weakest = latest[0];
    latest.forEach(s => {
      if ((s.scoredResult?.composite || 100) < (weakest?.scoredResult?.composite || 100)) weakest = s;
    });
    const weakDomain = weakest?.scoredResult?.domain || 'general development';

    try {
      const prompt = `Suggest 4 short home activities (5-20 mins each) for a parent to do with their ${CHILD_PROFILE.age} year old child who shows ${weakDomain} challenges. Activities should be fun, not clinical. Return ONLY valid JSON array, no markdown: [{"title": "...", "description": "...", "duration": "..."}]`;
      const response = await callGemini(prompt);

      // Parse JSON from response
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setActivities(parsed.map(a => ({ title: a.title, desc: a.description, duration: a.duration })));
      } else {
        throw new Error('Could not parse activities');
      }
    } catch (err) {
      console.error('[ActivityPlans] Error:', err);
      setError('Could not generate personalized activities. Showing general suggestions.');
      setActivities(WELLNESS_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  };

  // No sessions empty state
  const sessions = loadSessions();
  if (!loading && sessions.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl p-10 shadow-soft border border-slate-100 text-center">
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Screening Data Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Play some games in Child Mode first to get personalized activity recommendations!
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {FAQS.map(faq => (
              <div key={faq.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h4>
                <p className="text-sm text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-lg font-bold text-slate-900">Recommended Plans</h3>

      {banner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 flex items-start gap-3">
          <span className="text-xl">🌟</span>
          <p>{banner}</p>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activities.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 group-hover:text-bingo-blue transition-colors">{plan.title}</h4>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-medium">{plan.duration}</span>
              </div>
              <p className="text-sm text-slate-500">{plan.desc}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <div key={faq.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h4>
              <p className="text-sm text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chatbot() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm Mr. Bingo Assistant 🎉 I know about your child's screening results and I'm here to help with parenting tips, game suggestions, IEP guidance, and emotional support. What's on your mind?", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Build system prompt with child context
  const buildSystemPrompt = () => {
    let systemPrompt = `You are Mr. Bingo Assistant, a warm and supportive AI helper for parents of neurodivergent children. You help with parenting tips, IEP guidance, game suggestions, and emotional support. Keep responses concise (2-3 paragraphs max), friendly, and non-clinical. Always be encouraging.\n\nChild Profile: ${CHILD_PROFILE.name}, ${CHILD_PROFILE.age} years old, ${CHILD_PROFILE.grade}.`;

    const sessions = loadSessions();
    if (sessions.length > 0) {
      const latestByGame = {};
      sessions.forEach(s => {
        if (!latestByGame[s.gameId] || new Date(s.timestamp) > new Date(latestByGame[s.gameId].timestamp)) {
          latestByGame[s.gameId] = s;
        }
      });
      const latest = Object.values(latestByGame);
      const riskSummary = latest.map(s => {
        const name = GAME_PRETTY_NAMES[s.gameId] || s.gameId;
        const r = s.scoredResult;
        return `${name}: ${r?.domain} — ${r?.riskLevel} risk (${r?.composite}/100, ${r?.percentile}th percentile)`;
      }).join('; ');
      systemPrompt += `\n\nScreening results: ${riskSummary}.\nUse this data to personalize your advice. If a parent asks about their child's performance, reference these specific results.`;
    }

    return systemPrompt;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setInput("");
    setIsTyping(true);

    try {
      // Build conversation context (last 6 messages for context window)
      const recentMessages = messages.slice(-6).map(m => m.text).join('\n');
      const fullPrompt = `${recentMessages}\nUser: ${userText}\n\nRespond helpfully and concisely.`;

      const response = await callGemini(fullPrompt, buildSystemPrompt());
      setMessages(prev => [...prev, { id: Date.now() + 1, text: response || "I'm here to help! Could you tell me more about what you need?", sender: 'bot' }]);
    } catch (err) {
      console.error('[Chatbot] Gemini error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I'm having a little trouble connecting right now 😊 In the meantime, feel free to check the Activity Plans tab for personalized suggestions, or try asking me again in a moment!",
        sender: 'bot'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[500px] flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-slate-900 p-4 text-white">
        <h3 className="font-bold">Mr. Bingo Assistant</h3>
        <p className="text-xs text-slate-300">Powered by AI • Knows your child's screening results</p>
      </div>
      <div className="flex-1 p-4 bg-slate-50 overflow-y-auto space-y-4 soft-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs flex-shrink-0">MB</div>
            )}
            <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[80%] border ${msg.sender === 'user'
              ? 'bg-bingo-blue/20 text-slate-800 rounded-tr-none border-bingo-blue/30'
              : 'bg-white text-slate-700 rounded-tl-none border-slate-100'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs flex-shrink-0">MB</div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your question..."
            className="flex-1 border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function TherapistBooking() {
  const [mode, setMode] = useState('online'); // 'online' | 'offline'
  const [location, setLocation] = useState('');

  const filteredTherapists = THERAPISTS.filter(t => {
    if (mode === 'online') return t.isOnline;
    if (mode === 'offline') return !t.isOnline;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setMode('online')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'online' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Online
          </button>
          <button
            onClick={() => setMode('offline')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'offline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Offline (In-Person)
          </button>
        </div>

        {mode === 'offline' && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Enter Zip Code or City"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredTherapists.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center hover:border-bingo-blue transition-colors group">
            <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-500">
                {t.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{t.name}</h4>
                <p className="text-xs text-slate-500">{t.role} • ⭐ {t.rating}</p>
                <p className="text-xs text-slate-400 mt-0.5">{mode === 'offline' ? `📍 ${t.location}` : '🌐 Virtual Session'}</p>
              </div>
            </div>
            <button className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors">
              Book Now
            </button>
          </div>
        ))}
        {filteredTherapists.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No therapists found for this mode. Try switching filters.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main/Analytics View (The Redesign) ---

// --- Clinical Scores View ---

const GAME_LABELS = {
  CerebralCarGame: { label: 'Cerebral Racer', icon: '🏎️', domain: 'Motor Coordination' },
  EmotionGame: { label: 'Emotion Explorer', icon: '🧐', domain: 'Emotion Recognition' },
  LetterMatchingGame: { label: 'Dyslexia Screening', icon: '🧩', domain: 'Letter Processing' },
  MemoryGridGame: { label: 'Memory Grid', icon: '🧠', domain: 'Spatial Memory' },
  TypingAdventureGame: { label: 'Typing Hero', icon: '⌨️', domain: 'Attention' },
  DiagnosticRecorder: { label: 'Focus Diagnostic', icon: '👁️', domain: 'Attention (Focus)' },
};

const RISK_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-rose-100 text-rose-700 border-rose-200',
};

const RISK_BAR_COLORS = {
  Low: 'bg-emerald-500',
  Moderate: 'bg-amber-500',
  High: 'bg-rose-500',
};

function ClinicalScoresView() {
  const [sessions, setSessions] = useState([]);
  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    const storageKey = 'prism_sessions_default';
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSessions(parsed);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }, []);

  // Get the latest session per game
  const latestByGame = {};
  sessions.forEach(s => {
    if (!latestByGame[s.gameId] || new Date(s.timestamp) > new Date(latestByGame[s.gameId].timestamp)) {
      latestByGame[s.gameId] = s;
    }
  });

  const gameEntries = Object.values(latestByGame);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setReportError('');
    setReportText('');
    try {
      const text = await generateReport(CHILD_PROFILE, gameEntries);
      setReportText(text);
    } catch (err) {
      setReportError('Failed to generate report. Please check your API key and try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (gameEntries.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-soft border border-slate-100 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">No Clinical Data Yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Once your child completes games in Child Mode, their scored results will appear here with per-domain breakdowns and risk assessments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Per-game sub-scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gameEntries.map((session) => {
          const gameInfo = GAME_LABELS[session.gameId] || { label: session.gameId, icon: '🎮', domain: 'Unknown' };
          const result = session.scoredResult || {};
          const riskLevel = result.riskLevel || 'Low';
          const subScores = result.subScores || {};

          return (
            <motion.div
              key={session.gameId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{gameInfo.icon}</span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{gameInfo.label}</h4>
                    <p className="text-xs text-slate-400">{gameInfo.domain}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${RISK_COLORS[riskLevel]}`}>
                  {riskLevel} Risk
                </span>
              </div>

              {/* Composite score bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Composite Score</span>
                  <span>{result.composite || 0}/100</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, result.composite || 0)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${RISK_BAR_COLORS[riskLevel]}`}
                  />
                </div>
              </div>

              {/* Percentile */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>Percentile: <strong className="text-slate-700">{result.percentile || 50}th</strong></span>
                {result.clinicalFlag && (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    ⚠ Clinical Flag
                  </span>
                )}
              </div>

              {/* Sub-scores */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                {Object.entries(subScores).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-semibold text-slate-700">
                      {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : String(value)}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                Last tested: {new Date(session.timestamp).toLocaleDateString()}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Generate Report Button */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Clinical Summary</h3>
            <p className="text-xs text-slate-500">Generate a parent-friendly narrative report using AI</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${isGenerating
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02]'
              }`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              '✨ Generate Report'
            )}
          </button>
        </div>

        {reportError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
            {reportError}
          </div>
        )}

        {reportText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-6 border border-slate-200"
          >
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
              {reportText.split('\n\n').map((paragraph, i) => (
                <p key={i} className={`mb-3 ${paragraph.includes('DISCLAIMER') || paragraph.includes('⚠️')
                  ? 'text-xs text-slate-400 italic border-t border-slate-200 pt-3 mt-4'
                  : ''
                  }`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


function AnalyticsView() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const summaryStats = computeSummaryStats(sessions);
  const skillBreakdown = computeSkillBreakdown(sessions);
  const recentActivity = computeRecentActivity(sessions);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Top Section – Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat, idx) => (
          <SummaryCard key={idx} {...stat} />
        ))}
      </div>

      {/* Clinical Scores Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-slate-900">Clinical Screening Results</h3>
        <p className="text-xs text-slate-500 mb-4">Per-game sub-scores from your child's latest play sessions</p>
        <ClinicalScoresView />
      </div>

      {/* Main Section (Charts + Snapshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Learning Progress</h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Last 30 Days</span>
            </div>
            <LearningChart />
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Skill Breakdown</h3>
            <SkillBarChart skills={skillBreakdown} />
          </div>
        </div>

        {/* Right Column (Child Snapshot) */}
        <div className="lg:col-span-1">
          <ChildSnapshotCard />
        </div>
      </div>

      {/* Bottom Section - Recent Activity Table */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
        <RecentActivityTable activities={recentActivity} />
      </div>
    </motion.div>
  );
}

// --- Main Layout Component ---

export function ParentDashboard() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'community', 'plans', 'chatbot', 'booking'

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'analytics': return "Dashboard Overview";
      case 'community': return "Community Pod";
      case 'plans': return "Activity Plans";
      case 'chatbot': return "Mr. Bingo Assistant";
      case 'booking': return "Book a Therapist";
      default: return "";
    }
  };

  return (
    <section
      aria-label="Parent and therapist dashboard"
      className="relative max-w-7xl mx-auto px-4 py-8 pb-16 lg:py-12"
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-4xl shadow-soft border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[800px]">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-100 bg-gradient-to-b from-slate-50/80 to-white/80 p-6 flex flex-col">
          <div className="pb-8 border-b border-slate-100 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                Parent Mode
              </p>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                Dashboard
              </h2>
            </div>
            <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
              MB
            </span>
          </div>

          <nav className="space-y-2 flex-1">
            <SidebarBtn
              isActive={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              label="Overview"
              icon={<IconChart />}
            />
            <SidebarBtn
              isActive={activeTab === 'community'}
              onClick={() => setActiveTab('community')}
              label="Community Pod"
              icon={<IconUser />}
            />
            <SidebarBtn
              isActive={activeTab === 'plans'}
              onClick={() => setActiveTab('plans')}
              label="Activity Plans"
              icon={<IconCheck />}
            />
            <SidebarBtn
              isActive={activeTab === 'chatbot'}
              onClick={() => setActiveTab('chatbot')}
              label="AI Assistant"
              icon={<IconFocus />}
            />
            <SidebarBtn
              isActive={activeTab === 'booking'}
              onClick={() => setActiveTab('booking')}
              label="Book Therapist"
              icon={<IconTime />}
              isLast
            />
          </nav>

          <div className="pt-6 border-t border-slate-100 text-xs text-slate-400">
            <p>Mr. Bingo v1.2</p>
            <p className="mt-1">Secure &amp; Private</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-slate-50/50 p-6 lg:p-10 overflow-y-auto soft-scrollbar">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {getTabLabel(activeTab)}
            </h1>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </span>
              <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors">
                <span className="sr-only">Notifications</span>
                <IconBell />
              </button>
            </div>
          </header>

          {/* Tab Content */}
          <div className="min-h-full">
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'community' && <CommunityPod />}
            {activeTab === 'plans' && <ActivityPlans />}
            {activeTab === 'chatbot' && <Chatbot />}
            {activeTab === 'booking' && <TherapistBooking />}
          </div>

        </main>
      </div>
    </section>
  );
}

function SidebarBtn({ isActive, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 group ${isActive
        ? 'bg-slate-900 text-white shadow-soft translate-x-1'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
        {icon}
      </span>
      {label}
    </button>
  );
}
