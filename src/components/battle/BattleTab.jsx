import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Trophy, Lock, Loader2, ShoppingBag } from 'lucide-react';
import BattleArena from './BattleArena';
import BattleInvitePopup from './BattleInvitePopup';
import BattleLeaderboard from './BattleLeaderboard';
import BattleHistory from './BattleHistory';
import BattleItemShop from './BattleItemShop';
import BattleQuestionSelector from './BattleQuestionSelector';
import WholeBattle from './WholeBattle';

export default function BattleTab({ classId, classData, user, isTeacher, classStudents: classStudentsProp }) {
  const queryClient = useQueryClient();
  const [activeBattle, setActiveBattle] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [tab, setTab] = useState('lobby');
  const [challengingOpponent, setChallengingOpponent] = useState(null);
  const [showWholeBattle, setShowWholeBattle] = useState(false);
  const initialLoadDone = useRef(false); // prevent auto-redirect on tab open

  const battleEnabled = classData?.battle_mode_enabled !== false;
  const studentEmails = classData?.student_emails || [];

  const classStudents = studentEmails.map(email => {
    const match = classStudentsProp?.find(u => u.email === email);
    return match || { email, full_name: email.split('@')[0], id: email };
  });

  // Subscribe to BattleSession for incoming invites and active battles
  useEffect(() => {
    if (!user?.email || !classId) return;

    base44.entities.BattleSession.filter({ class_id: classId, opponent_email: user.email, status: 'pending' })
      .then(sessions => { if (sessions.length > 0) setIncomingInvite(sessions[0]); });

    base44.entities.BattleSession.filter({ class_id: classId })
      .then(sessions => {
        // Only restore active battle if user was in it (not on initial tab open)
        const myPending = sessions.find(s => s.challenger_email === user.email && s.status === 'pending');
        if (myPending) setPendingInvite(myPending);
        // Don't auto-restore activeBattle on initial load — user must explicitly re-enter
        initialLoadDone.current = true;
      });

    const unsub = base44.entities.BattleSession.subscribe(event => {
      const s = event.data;
      if (!s || s.class_id !== classId) return;
      const iAmInvolved = s.challenger_email === user.email || s.opponent_email === user.email;
      if (!iAmInvolved) return;

      if (s.opponent_email === user.email && s.status === 'pending') {
        setIncomingInvite(s);
        return;
      }
      if (s.status === 'question') {
        setPendingInvite(null);
        setIncomingInvite(null);
        setActiveBattle(s);
        return;
      }
      if (s.challenger_email === user.email && s.status === 'declined') {
        setPendingInvite(null);
        queryClient.invalidateQueries(['battleWins', classId]);
        return;
      }
      if (['active', 'round_result'].includes(s.status)) {
        setActiveBattle(s);
      }
    });

    return () => unsub();
  }, [user?.email, classId]);

  // Called after question selector confirms
  const challengeMutation = useMutation({
    mutationFn: async ({ opponent, questions }) => {
      const session = await base44.entities.BattleSession.create({
        class_id: classId,
        challenger_email: user.email,
        challenger_name: user.full_name || user.email.split('@')[0],
        opponent_email: opponent.email,
        opponent_name: opponent.full_name || opponent.email.split('@')[0],
        status: 'pending',
        questions_json: JSON.stringify(questions),
        answers_json: '[]',
        current_question_index: 0,
        challenger_score: 0,
        opponent_score: 0,
        total_questions: questions.length
      });
      setPendingInvite(session);
      setChallengingOpponent(null);
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BattleSession.update(incomingInvite.id, {
        status: 'question',
        question_started_at: new Date().toISOString()
      });
      setActiveBattle({ ...incomingInvite, status: 'question' });
      setIncomingInvite(null);
    }
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BattleSession.update(incomingInvite.id, { status: 'declined' });
      setIncomingInvite(null);
    }
  });

  const handleExitBattle = () => {
    setActiveBattle(null);
    setPendingInvite(null);
    queryClient.invalidateQueries(['battleWins', classId]);
  };

  const toggleMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Class.update(classId, { battle_mode_enabled: !battleEnabled });
    },
    onSuccess: () => queryClient.invalidateQueries(['class', classId])
  });

  // Whole class battle overlay
  if (showWholeBattle) {
    return <WholeBattle classId={classId} classData={classData} classStudents={classStudents} user={user} onExit={() => setShowWholeBattle(false)} />;
  }

  // Question selector overlay
  if (challengingOpponent) {
    return (
      <BattleQuestionSelector
        classData={classData}
        opponent={challengingOpponent}
        onCancel={() => setChallengingOpponent(null)}
        onConfirm={(questions) => challengeMutation.mutate({ opponent: challengingOpponent, questions })}
      />
    );
  }

  if (activeBattle) {
    return <BattleArena session={activeBattle} user={user} onExit={handleExitBattle} />;
  }

  const TABS = [
    { id: 'lobby', label: '⚔️ Challenge' },
    { id: 'leaderboard', label: '🏆 Leaderboard' },
    ...(!isTeacher ? [{ id: 'history', label: '📜 My History' }] : []),
    ...(!isTeacher ? [{ id: 'shop', label: '🛍️ Item Shop' }] : []),
  ];

  const tabColor = {
    lobby: 'from-red-500 to-orange-500',
    leaderboard: 'from-amber-500 to-orange-500',
    history: 'from-blue-500 to-cyan-500',
    shop: 'from-yellow-500 to-orange-500',
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {incomingInvite && (
          <BattleInvitePopup
            invite={incomingInvite}
            onAccept={acceptMutation.mutate}
            onDecline={declineMutation.mutate}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">⚔️ 1v1 Battle Mode</h2>
            <p className="text-slate-400 text-sm">Challenge classmates to a fast-paced quiz duel</p>
          </div>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWholeBattle(true)}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:brightness-110 transition-all shadow-lg shadow-purple-500/30"
            >
              🏟️ Whole Class Battle
            </button>
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                battleEnabled
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {toggleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : battleEnabled ? '✓ Battle ON' : '✗ Battle OFF'}
            </button>
          </div>
        )}
      </div>

      {!battleEnabled && !isTeacher && (
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Battle Mode Disabled</h3>
          <p className="text-slate-400">Your teacher has disabled 1v1 battles for this class.</p>
        </div>
      )}

      {(battleEnabled || isTeacher) && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  tab === t.id
                    ? `bg-gradient-to-r ${tabColor[t.id]} text-white shadow-lg`
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'lobby' && (
              <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                {pendingInvite && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-5 rounded-2xl border-2 border-orange-500/50 bg-orange-500/10 text-center">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-orange-400 font-black text-lg">Challenge Sent!</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Waiting for {pendingInvite.opponent_name || pendingInvite.opponent_email.split('@')[0]} to accept…
                    </p>
                    <button
                      onClick={async () => {
                        await base44.entities.BattleSession.update(pendingInvite.id, { status: 'cancelled' });
                        setPendingInvite(null);
                      }}
                      className="mt-3 text-xs text-slate-500 hover:text-red-400 underline">
                      Cancel challenge
                    </button>
                  </motion.div>
                )}

                <p className="text-slate-400 text-sm mb-4">
                  {isTeacher ? 'Students in this class:' : 'Choose an opponent — you\'ll select questions next:'}
                </p>

                {studentEmails.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No students enrolled in this class yet.</div>
                ) : classStudents.filter(s => s.email !== user.email).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No other students in this class to challenge.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {classStudents.filter(s => s.email !== user.email).map(student => (
                      <StudentBattleCard
                        key={student.id || student.email}
                        student={student}
                        classId={classId}
                        isTeacher={isTeacher}
                        disabled={!!pendingInvite || challengeMutation.isPending}
                        onChallenge={() => {
                          if (isTeacher) return;
                          setChallengingOpponent(student);
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <BattleLeaderboard classId={classId} studentEmails={classData?.student_emails || []} />
              </motion.div>
            )}

            {tab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <BattleHistory classId={classId} userEmail={user?.email} />
              </motion.div>
            )}

            {tab === 'shop' && !isTeacher && (
              <motion.div key="shop" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <BattleItemShop userEmail={user?.email} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function StudentBattleCard({ student, classId, isTeacher, disabled, onChallenge }) {
  const { data: wins = [] } = useQuery({
    queryKey: ['battleWinsForStudent', classId, student.email],
    queryFn: () => base44.entities.BattleWin.filter({ class_id: classId, winner_email: student.email }),
    enabled: !!classId && !!student.email
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ['studentProgressCoins', student.email],
    queryFn: () => base44.entities.StudentProgress.filter({ student_email: student.email }),
    enabled: !!student.email
  });

  const coins = progressList[0]?.battle_coins || 0;
  const displayName = student.full_name || student.email.split('@')[0];

  return (
    <motion.button
      onClick={onChallenge}
      disabled={disabled || isTeacher}
      className={`relative p-5 rounded-2xl border-2 text-center transition-all group ${
        isTeacher
          ? 'border-white/10 bg-white/5 cursor-default'
          : disabled
          ? 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
          : 'border-white/10 bg-white/5 hover:border-red-500/60 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer'
      }`}
      whileHover={!disabled && !isTeacher ? { scale: 1.03 } : {}}
      whileTap={!disabled && !isTeacher ? { scale: 0.97 } : {}}>
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xl font-black mx-auto mb-3 shadow-lg group-hover:shadow-red-500/40 transition-shadow overflow-hidden">
        {student.avatar_url ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
      </div>
      <p className="text-white font-bold text-sm truncate">{displayName}</p>
      <div className="flex items-center justify-center gap-2 mt-1">
        <p className="text-amber-400 text-xs font-semibold">⚔️ {wins.length} {wins.length === 1 ? 'win' : 'wins'}</p>
        {coins > 0 && <p className="text-yellow-400 text-xs font-semibold">🪙 {coins}</p>}
      </div>
      {!isTeacher && !disabled && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10">
          <span className="text-red-400 font-black text-sm flex items-center gap-1">
            <Swords className="w-4 h-4" /> Challenge
          </span>
        </div>
      )}
    </motion.button>
  );
}