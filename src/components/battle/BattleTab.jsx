import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Trophy, Lock, Loader2, Clock } from 'lucide-react';
import BattleArena from './BattleArena';
import BattleInvitePopup from './BattleInvitePopup';
import BattleLeaderboard from './BattleLeaderboard';
import BattleHistory from './BattleHistory';

const BATTLE_QUESTIONS_COUNT = 5;

function generateQuestions(topic) {
  // Fallback generic questions if no topic questions available
  return [
    { question_text: `What is 12 × 8?`, options: ['86', '96', '106', '76'], correct_index: 1 },
    { question_text: `What is 144 ÷ 12?`, options: ['11', '13', '12', '14'], correct_index: 2 },
    { question_text: `What is 15² ?`, options: ['200', '225', '215', '235'], correct_index: 1 },
    { question_text: `What is 7 × 9?`, options: ['54', '56', '63', '72'], correct_index: 2 },
    { question_text: `What is √64?`, options: ['6', '7', '9', '8'], correct_index: 3 },
  ];
}

export default function BattleTab({ classId, classData, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [activeBattle, setActiveBattle] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [tab, setTab] = useState('lobby'); // 'lobby' | 'leaderboard' | 'history'

  const battleEnabled = classData?.battle_mode_enabled !== false; // default true unless explicitly disabled

  const { data: classStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['classStudentsForBattle', classId, classData?.student_emails?.join(',')],
    queryFn: async () => {
      // Use student_emails directly from classData prop to avoid extra fetch
      const emails = classData?.student_emails || [];
      if (!emails.length) {
        // Fallback: re-fetch class
        const classes = await base44.entities.Class.filter({ id: classId });
        const cls = classes[0];
        if (!cls?.student_emails?.length) return [];
        const allUsers = await base44.entities.User.list();
        console.log('[BattleTab] Fetched students (fallback):', cls.student_emails, 'users found:', allUsers.filter(u => cls.student_emails.includes(u.email)).length);
        return allUsers.filter(u => cls.student_emails.includes(u.email));
      }
      const allUsers = await base44.entities.User.list();
      const result = allUsers.filter(u => emails.includes(u.email));
      console.log('[BattleTab] class_id:', classId, 'student_emails:', emails, 'matched users:', result.length);
      return result;
    },
    enabled: !!classId,
    staleTime: 30000
  });

  // Subscribe to BattleSession for incoming invites and active battles
  useEffect(() => {
    if (!user?.email || !classId) return;

    // Initial check for pending invites or active battle for me
    base44.entities.BattleSession.filter({ class_id: classId, opponent_email: user.email, status: 'pending' })
      .then(sessions => {
        if (sessions.length > 0) setIncomingInvite(sessions[0]);
      });

    base44.entities.BattleSession.filter({ class_id: classId })
      .then(sessions => {
        const mine = sessions.find(s =>
          (s.challenger_email === user.email || s.opponent_email === user.email) &&
          ['active', 'question', 'round_result'].includes(s.status)
        );
        if (mine) setActiveBattle(mine);

        const myPending = sessions.find(s =>
          s.challenger_email === user.email && s.status === 'pending'
        );
        if (myPending) setPendingInvite(myPending);
      });

    const unsub = base44.entities.BattleSession.subscribe(event => {
      const s = event.data;
      if (!s || s.class_id !== classId) return;

      const iAmInvolved = s.challenger_email === user.email || s.opponent_email === user.email;
      if (!iAmInvolved) return;

      // Incoming invite for me (opponent)
      if (s.opponent_email === user.email && s.status === 'pending') {
        console.log('[BattleTab] Incoming invite received from', s.challenger_name);
        setIncomingInvite(s);
        return;
      }

      // Battle accepted → both players start
      if (s.status === 'question') {
        console.log('[BattleTab] Battle started, entering arena');
        setPendingInvite(null);
        setIncomingInvite(null);
        setActiveBattle(s);
        return;
      }

      // Invite declined → notify challenger
      if (s.challenger_email === user.email && s.status === 'declined') {
        setPendingInvite(null);
        queryClient.invalidateQueries(['battleWins', classId]);
        return;
      }

      // Active/round_result updates
      if (['active', 'round_result'].includes(s.status)) {
        setActiveBattle(s);
      }
    });

    return () => unsub();
  }, [user?.email, classId]);

  const challengeMutation = useMutation({
    mutationFn: async (opponent) => {
      // Generate questions
      const questions = generateQuestions();
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

  // Toggle battle mode (teacher only)
  const toggleMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Class.update(classId, { battle_mode_enabled: !battleEnabled });
    },
    onSuccess: () => queryClient.invalidateQueries(['class', classId])
  });

  // Active battle screen
  if (activeBattle) {
    return <BattleArena session={activeBattle} user={user} onExit={handleExitBattle} />;
  }

  return (
    <div className="space-y-6">
      {/* Incoming invite popup */}
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
        )}
      </div>

      {/* DISABLED STATE */}
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
          <div className="flex gap-2">
            <button
              onClick={() => setTab('lobby')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'lobby' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              ⚔️ Challenge
            </button>
            <button
              onClick={() => setTab('leaderboard')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'leaderboard' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              🏆 Leaderboard
            </button>
            {!isTeacher && (
              <button
                onClick={() => setTab('history')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'history' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                📜 My History
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'lobby' && (
              <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                {/* Pending invite sent */}
                {pendingInvite && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-5 rounded-2xl border-2 border-orange-500/50 bg-orange-500/10 text-center"
                  >
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
                      className="mt-3 text-xs text-slate-500 hover:text-red-400 underline"
                    >
                      Cancel challenge
                    </button>
                  </motion.div>
                )}

                {/* Student grid */}
                <p className="text-slate-400 text-sm mb-4">
                  {isTeacher ? 'Students in this class:' : 'Choose an opponent to challenge:'}
                </p>
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
                  </div>
                ) : classStudents.filter(s => s.email !== user.email).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    {classData?.student_emails?.length > 1
                      ? 'Loading student profiles…'
                      : 'No other students enrolled yet'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {classStudents
                      .filter(s => s.email !== user.email)
                      .map(student => (
                        <StudentBattleCard
                          key={student.id || student.email}
                          student={student}
                          classId={classId}
                          isTeacher={isTeacher}
                          disabled={!!pendingInvite || challengeMutation.isPending}
                          onChallenge={() => {
                            if (isTeacher) return;
                            console.log('[BattleTab] Invite sent to:', student.email);
                            challengeMutation.mutate(student);
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
      whileTap={!disabled && !isTeacher ? { scale: 0.97 } : {}}
    >
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xl font-black mx-auto mb-3 shadow-lg group-hover:shadow-red-500/40 transition-shadow overflow-hidden">
        {student.avatar_url ? (
          <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>
      <p className="text-white font-bold text-sm truncate">{displayName}</p>
      <div className="flex items-center justify-center gap-2 mt-1">
        <p className="text-amber-400 text-xs font-semibold">
          ⚔️ {wins.length} {wins.length === 1 ? 'win' : 'wins'}
        </p>
        {coins > 0 && (
          <p className="text-yellow-400 text-xs font-semibold">🪙 {coins}</p>
        )}
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