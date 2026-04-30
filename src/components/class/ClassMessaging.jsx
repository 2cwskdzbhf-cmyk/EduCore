import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, HelpCircle, Users, MessageCircle, ChevronLeft } from 'lucide-react';

const TABS = [
  { id: 'class', label: 'Class Chat', icon: MessageCircle },
  { id: 'qa', label: 'Q&A', icon: HelpCircle },
  { id: 'dm', label: 'Direct Messages', icon: Users },
];

function Avatar({ name, email, size = 8 }) {
  const letter = (name || email || '?').charAt(0).toUpperCase();
  const colors = ['from-purple-500 to-blue-500', 'from-red-500 to-orange-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-yellow-500', 'from-pink-500 to-rose-500'];
  const color = colors[(letter.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0 text-sm`}>
      {letter}
    </div>
  );
}

const REACTIONS = ['👍', '🔥', '😂', '❤️', '🎯'];

function MessageBubble({ msg, isOwn, isTeacher, onReact }) {
  const [showReactions, setShowReactions] = useState(false);
  const isQuestion = msg.message_type === 'question';
  const senderName = msg.sender_name || msg.sender_email?.split('@')[0] || 'Unknown';
  const reactions = msg.reactions || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isOwn && <Avatar name={senderName} email={msg.sender_email} size={8} />}
      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isOwn && (
          <p className="text-xs text-slate-400 px-1">
            {senderName}
            {msg.sender_type === 'teacher' && (
              <span className="ml-1.5 text-purple-400 font-semibold">· Teacher</span>
            )}
          </p>
        )}
        <div className="relative">
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-sm'
              : isQuestion
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-tl-sm'
              : msg.sender_type === 'teacher'
              ? 'bg-purple-500/15 border border-purple-500/30 text-white rounded-tl-sm'
              : 'bg-white/8 border border-white/10 text-slate-100 rounded-tl-sm'
          }`}>
            {isQuestion && !isOwn && <p className="text-amber-400 text-xs font-bold mb-1">❓ Question</p>}
            {msg.content}
          </div>

          {/* React button */}
          <button
            onClick={() => setShowReactions(r => !r)}
            className={`absolute -bottom-1 ${isOwn ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white text-xs p-1`}
          >
            😊
          </button>

          {/* Reaction picker */}
          {showReactions && (
            <div className={`absolute bottom-6 ${isOwn ? 'right-0' : 'left-0'} bg-slate-800 border border-white/10 rounded-2xl px-2 py-1.5 flex gap-1 z-10 shadow-xl`}>
              {REACTIONS.map(r => (
                <button key={r} onClick={() => { onReact(msg.id, r); setShowReactions(false); }}
                  className="text-lg hover:scale-125 transition-transform p-0.5">{r}</button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction counts */}
        {Object.keys(reactions).length > 0 && (
          <div className={`flex gap-1 flex-wrap px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactions).map(([emoji, count]) => count > 0 && (
              <span key={emoji} className="text-xs bg-white/10 border border-white/10 rounded-full px-1.5 py-0.5">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-600 px-1">
          {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

export default function ClassMessaging({ classId, user, classData }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [tab, setTab] = useState('class');
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const isTeacher = user?.user_type === 'teacher' || user?.role === 'teacher';

  const { data: messages = [] } = useQuery({
    queryKey: ['classMessages', classId],
    queryFn: () => base44.entities.ClassMessage.filter({ class_id: classId }, '-created_date', 200),
    enabled: !!classId,
    refetchInterval: 3000
  });

  const sendMutation = useMutation({
    mutationFn: async (msgData) => {
      return base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email.split('@')[0],
        sender_type: user.user_type || 'student',
        ...msgData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classMessages', classId]);
      setMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, tab, selectedStudent]);

  const handleReact = async (msgId, emoji) => {
    const msg = [...classMessages, ...qaMessages, ...dmMessages].find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    await base44.entities.ClassMessage.update(msgId, { reactions });
    queryClient.invalidateQueries(['classMessages', classId]);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    if (tab === 'class') {
      sendMutation.mutate({ message_type: 'chat', content: message, recipient_email: null });
    } else if (tab === 'qa') {
      sendMutation.mutate({ message_type: 'question', content: message, recipient_email: null });
    } else if (tab === 'dm' && selectedStudent) {
      sendMutation.mutate({ message_type: 'reply', content: message, recipient_email: selectedStudent.email });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Filter messages per tab
  const classMessages = messages
    .filter(m => m.message_type === 'chat')
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const qaMessages = messages
    .filter(m => m.message_type === 'question')
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const dmMessages = selectedStudent
    ? messages
        .filter(m =>
          m.message_type === 'reply' &&
          ((m.sender_email === user.email && m.recipient_email === selectedStudent.email) ||
           (m.sender_email === selectedStudent.email && m.recipient_email === user.email))
        )
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const studentEmails = classData?.student_emails || [];

  const placeholderText = tab === 'class'
    ? 'Message the class…'
    : tab === 'qa'
    ? 'Ask a question…'
    : selectedStudent
    ? `Message ${selectedStudent.name}…`
    : '';

  const canSend = message.trim().length > 0 && (tab !== 'dm' || !!selectedStudent);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[500px] rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 backdrop-blur-xl">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-white/10 bg-slate-950/60">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedStudent(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2 ${
              tab === t.id
                ? 'border-purple-500 text-white bg-white/5'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* DM student selector */}
      {tab === 'dm' && !selectedStudent && (
        <div className="flex-1 p-6">
          <p className="text-slate-400 text-sm mb-4 font-medium">Choose someone to message:</p>
          <div className="space-y-2">
            {isTeacher
              ? studentEmails.map(email => (
                  <button key={email}
                    onClick={() => setSelectedStudent({ email, name: email.split('@')[0] })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
                  >
                    <Avatar name={email.split('@')[0]} email={email} size={8} />
                    <span className="text-white font-medium">{email.split('@')[0]}</span>
                    <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-white ml-auto rotate-180 transition-colors" />
                  </button>
                ))
              : (
                <button
                  onClick={() => setSelectedStudent({ email: classData?.teacher_email, name: 'Teacher' })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-400/50 transition-all text-left group"
                >
                  <Avatar name="T" email={classData?.teacher_email} size={8} />
                  <div>
                    <span className="text-white font-medium block">Teacher</span>
                    <span className="text-slate-400 text-xs">{classData?.teacher_email}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-white ml-auto rotate-180 transition-colors" />
                </button>
              )
            }
            {!isTeacher && studentEmails.filter(e => e !== user.email).map(email => (
              <button key={email}
                onClick={() => setSelectedStudent({ email, name: email.split('@')[0] })}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
              >
                <Avatar name={email.split('@')[0]} email={email} size={8} />
                <span className="text-white font-medium">{email.split('@')[0]}</span>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-white ml-auto rotate-180 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DM header when student selected */}
      {tab === 'dm' && selectedStudent && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <button onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Avatar name={selectedStudent.name} email={selectedStudent.email} size={8} />
          <div>
            <p className="text-white font-semibold text-sm">{selectedStudent.name}</p>
            <p className="text-slate-500 text-xs">{selectedStudent.email}</p>
          </div>
        </div>
      )}

      {/* Messages area */}
      {(tab !== 'dm' || selectedStudent) && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'qa' && (
            <div className="text-center py-2">
              <span className="text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-full">Questions are visible to everyone</span>
            </div>
          )}

          {(tab === 'class' ? classMessages : tab === 'qa' ? qaMessages : dmMessages).map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_email === user.email}
              isTeacher={isTeacher}
              onReact={handleReact}
            />
          ))}

          {(tab === 'class' ? classMessages : tab === 'qa' ? qaMessages : dmMessages).length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-3xl mb-3">{tab === 'qa' ? '❓' : '💬'}</p>
              <p className="font-medium text-slate-500">No messages yet</p>
              <p className="text-sm mt-1">Be the first to {tab === 'qa' ? 'ask a question' : 'say something'}!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      {(tab !== 'dm' || selectedStudent) && (
        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-slate-950/60">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                rows={1}
                className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/60 focus:bg-white/10 transition-all min-h-[44px] max-h-32"
                style={{ lineHeight: '1.5' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend || sendMutation.isPending}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white transition-all hover:from-purple-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-purple-500/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}