import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, Swords, Trophy, Users, Loader2, Play, StopCircle } from 'lucide-react';
import BattleQuestionSelector from './BattleQuestionSelector';

// Phases: 'setup' | 'lobby' | 'battling' | 'results'

export default function WholeBattle({ classId, classData, classStudents, user, onExit }) {
  const [phase, setPhase] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionResults, setSessionResults] = useState([]); // { winner, loser, winner_score, loser_score }
  const [roundNum, setRoundNum] = useState(1);

  const eligibleStudents = classStudents.filter(s => s.email);

  // Lobby: subscribe to sessions
  useEffect(() => {
    if (phase !== 'battling') return;
    const unsub = base44.entities.BattleSession.subscribe(event => {
      if (!event.data || event.data.class_id !== classId) return;
      const s = event.data;
      if (s.status === 'finished') {
        setActiveSessions(prev => prev.filter(id => id !== s.id));
        setSessionResults(prev => {
          const already = prev.find(r => r.session_id === s.id);
          if (already) return prev;
          return [...prev, {
            session_id: s.id,
            winner: s.winner_email,
            winner_score: Math.max(s.challenger_score, s.opponent_score),
            loser: s.winner_email === s.challenger_email ? s.opponent_email : s.challenger_email,
            loser_score: Math.min(s.challenger_score, s.opponent_score),
            winner_name: s.winner_email === s.challenger_email ? s.challenger_name : s.opponent_name,
            loser_name: s.winner_email === s.challenger_email ? s.opponent_name : s.challenger_name,
          }];
        });
      }
    });
    return () => unsub();
  }, [phase, classId]);

  const startBattle = async () => {
    if (questions.length === 0 || eligibleStudents.length < 2) return;
    setPhase('battling');
    setActiveSessions([]);
    setSessionResults([]);
    setRoundNum(1);

    // Shuffle and pair students
    const shuffled = [...eligibleStudents].sort(() => Math.random() - 0.5);
    const pairs = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    }

    const ids = [];
    for (const [a, b] of pairs) {
      const session = await base44.entities.BattleSession.create({
        class_id: classId,
        challenger_email: a.email,
        challenger_name: a.full_name || a.email.split('@')[0],
        opponent_email: b.email,
        opponent_name: b.full_name || b.email.split('@')[0],
        status: 'question',
        questions_json: JSON.stringify(questions),
        answers_json: '[]',
        current_question_index: 0,
        challenger_score: 0,
        opponent_score: 0,
        total_questions: questions.length,
        question_started_at: new Date().toISOString(),
      });
      ids.push(session.id);
    }
    setActiveSessions(ids);
  };

  const finishEvent = () => setPhase('results');

  // Build leaderboard from results
  const buildLeaderboard = () => {
    const map = {};
    eligibleStudents.forEach(s => {
      map[s.email] = { name: s.full_name || s.email.split('@')[0], wins: 0, points: 0 };
    });
    sessionResults.forEach(r => {
      if (map[r.winner]) { map[r.winner].wins++; map[r.winner].points += r.winner_score || 0; }
      if (map[r.loser]) { map[r.loser].points += r.loser_score || 0; }
    });
    return Object.entries(map)
      .map(([email, d]) => ({ email, ...d }))
      .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.points - a.points);
  };

  if (phase === 'setup') {
    return (
      <div className="fixed inset-0 z-[980] bg-slate-950/98 backdrop-blur-xl flex flex-col">
        <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center gap-3">
          <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-black text-xl">🏟️ Whole Class Battle</h2>
            <p className="text-slate-400 text-xs">Select questions, then start a class-wide tournament</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <BattleQuestionSelector
            classData={classData}
            opponent={null}
            onCancel={onExit}
            onConfirm={(qs) => { setQuestions(qs); setPhase('lobby'); }}
            hideSendButton
            confirmLabel="Proceed to Lobby →"
          />
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="fixed inset-0 z-[980] bg-slate-950/98 backdrop-blur-xl flex flex-col">
        <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setPhase('setup')} className="text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-white font-black text-xl">🏟️ Battle Lobby</h2>
              <p className="text-slate-400 text-xs">{questions.length} questions ready · {eligibleStudents.length} students</p>
            </div>
          </div>
          <motion.button
            onClick={startBattle}
            disabled={eligibleStudents.length < 2}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.95 }}>
            <Play className="w-4 h-4" /> Start Battle!
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-slate-400 text-sm mb-4">Students will be randomly paired when you press Start:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {eligibleStudents.map(s => (
              <div key={s.email} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black flex-shrink-0">
                  {(s.full_name || s.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{s.full_name || s.email.split('@')[0]}</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Waiting</p>
                </div>
              </div>
            ))}
          </div>
          {eligibleStudents.length < 2 && (
            <p className="text-amber-400 text-sm text-center mt-6">Need at least 2 students to start a battle.</p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'battling') {
    const totalPairs = Math.floor(eligibleStudents.length / 2);
    const done = sessionResults.length;
    return (
      <div className="fixed inset-0 z-[980] bg-slate-950/98 backdrop-blur-xl flex flex-col">
        <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-xl">⚔️ Battles in Progress</h2>
            <p className="text-slate-400 text-xs">{done}/{totalPairs} matches completed</p>
          </div>
          <button
            onClick={finishEvent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all">
            <StopCircle className="w-4 h-4" /> Finish Event
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalPairs > 0 ? `${(done / totalPairs) * 100}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-slate-400 text-sm text-center">{done === totalPairs ? '🎉 All matches complete! Press Finish to see results.' : `${totalPairs - done} match${totalPairs - done !== 1 ? 'es' : ''} still in progress...`}</p>

          {/* Results so far */}
          {sessionResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-white font-bold text-sm">Completed Matches:</p>
              {sessionResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-emerald-400 font-black text-sm">🏆 {r.winner_name}</span>
                  <span className="text-slate-500 text-xs">vs</span>
                  <span className="text-slate-400 text-sm">{r.loser_name}</span>
                  <span className="ml-auto text-amber-400 text-xs font-bold">{r.winner_score} - {r.loser_score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const leaderboard = buildLeaderboard();
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <motion.div className="fixed inset-0 z-[980] bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 flex flex-col items-center justify-start overflow-y-auto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="w-full max-w-xl px-4 py-8">
          {/* Podium top 3 */}
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
            <div className="text-6xl mb-2">🏆</div>
            <h1 className="text-4xl font-black text-white mb-1">Battle Results!</h1>
            <p className="text-slate-400">{sessionResults.length} match{sessionResults.length !== 1 ? 'es' : ''} played</p>
          </motion.div>

          {/* Podium */}
          {leaderboard.length >= 1 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd */}
              {leaderboard[1] && (
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-1">🥈</div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                    {leaderboard[1].name.charAt(0)}
                  </div>
                  <p className="text-white font-bold text-sm mt-2 max-w-[80px] text-center truncate">{leaderboard[1].name}</p>
                  <p className="text-slate-400 text-xs">{leaderboard[1].wins}W</p>
                  <div className="w-20 h-16 bg-slate-700/60 rounded-t-xl mt-2" />
                </div>
              )}
              {/* 1st */}
              <div className="flex flex-col items-center -mb-4">
                <div className="text-4xl mb-1">🥇</div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-amber-500/30">
                  {leaderboard[0].name.charAt(0)}
                </div>
                <p className="text-white font-black text-base mt-2 max-w-[90px] text-center truncate">{leaderboard[0].name}</p>
                <p className="text-amber-400 text-sm font-bold">{leaderboard[0].wins}W</p>
                <div className="w-24 h-24 bg-amber-500/20 border border-amber-500/30 rounded-t-xl mt-2" />
              </div>
              {/* 3rd */}
              {leaderboard[2] && (
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-1">🥉</div>
                  <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-700 to-orange-700 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {leaderboard[2].name.charAt(0)}
                  </div>
                  <p className="text-white font-bold text-sm mt-2 max-w-[80px] text-center truncate">{leaderboard[2].name}</p>
                  <p className="text-slate-400 text-xs">{leaderboard[2].wins}W</p>
                  <div className="w-20 h-10 bg-amber-800/40 rounded-t-xl mt-2" />
                </div>
              )}
            </motion.div>
          )}

          {/* Full rankings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="space-y-2 mb-8">
            {leaderboard.map((s, i) => (
              <div key={s.email} className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
                i === 0 ? 'border-amber-500/40 bg-amber-500/10' :
                i === 1 ? 'border-slate-400/30 bg-slate-400/10' :
                i === 2 ? 'border-amber-700/30 bg-amber-700/10' :
                'border-white/10 bg-white/5'
              }`}>
                <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}`}</span>
                <div className="flex-1">
                  <p className="text-white font-bold">{s.name}</p>
                  <p className="text-slate-400 text-xs">{s.wins} win{s.wins !== 1 ? 's' : ''} · {s.points} pts</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.button
            onClick={onExit}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-lg hover:brightness-110 transition-all shadow-xl shadow-purple-500/30">
            Back to Battle Hub
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return null;
}