import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Send, MessageSquare, HelpCircle, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_LABELS = {
  reply: { label: 'Chat', color: 'text-slate-300', bg: '' },
  question: { label: '❓ Question', color: 'text-amber-300', bg: 'bg-amber-500/10 border border-amber-500/20' },
  announcement: { label: '📢 Announcement', color: 'text-purple-300', bg: 'bg-purple-500/10 border border-purple-500/20' },
};

/**
 * Compact real-time chat sidebar for the whiteboard tab.
 * Teachers can send chat messages or announcements.
 * Students can send chat messages or raise a question.
 */
export default function WhiteboardChat({ classId, user }) {
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const [text, setText] = useState('');
  const [msgType, setMsgType] = useState('reply'); // 'reply' | 'question' | 'announcement'

  const isTeacher = user?.user_type === 'teacher' || user?.role === 'teacher' || user?.role === 'admin';

  const { data: messages = [] } = useQuery({
    queryKey: ['whiteboardChat', classId],
    queryFn: () => base44.entities.ClassMessage.filter(
      { class_id: classId, message_type: { $in: ['reply', 'question', 'announcement'] } },
      'created_date',
      100
    ),
    enabled: !!classId,
    refetchInterval: 2000,
  });

  // Only show chat + questions + announcements (exclude old private DMs from ClassMessaging)
  const chatMessages = messages
    .filter(m => !m.recipient_email) // public only
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const sendMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email.split('@')[0],
        sender_type: isTeacher ? 'teacher' : 'student',
        message_type: msgType,
        content,
        recipient_email: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['whiteboardChat', classId]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <GlassCard className="flex flex-col h-full min-h-[500px] p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Lesson Chat</h3>
        {chatMessages.filter(m => m.message_type === 'question').length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {chatMessages.filter(m => m.message_type === 'question').length} question{chatMessages.filter(m => m.message_type === 'question').length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {chatMessages.length === 0 && (
          <p className="text-slate-500 text-xs text-center pt-8">No messages yet. Say hi! 👋</p>
        )}
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => {
            const isOwn = msg.sender_email === user.email;
            const typeStyle = TYPE_LABELS[msg.message_type] || TYPE_LABELS.reply;
            const isSpecial = msg.message_type !== 'reply';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex flex-col',
                  isSpecial ? 'w-full' : isOwn ? 'items-end' : 'items-start'
                )}
              >
                {/* Special message types: announcements & questions — full-width */}
                {isSpecial ? (
                  <div className={cn('w-full rounded-lg p-3 text-sm', typeStyle.bg)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-xs font-semibold', typeStyle.color)}>{typeStyle.label}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white leading-relaxed">{msg.content}</p>
                    <p className="text-xs text-slate-400 mt-1">— {msg.sender_name}</p>
                  </div>
                ) : (
                  /* Regular chat bubble */
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    isOwn
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-slate-100 rounded-bl-sm'
                  )}>
                    {!isOwn && (
                      <p className="text-xs font-semibold text-purple-300 mb-0.5">{msg.sender_name}</p>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 text-right">
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Message type selector */}
      <div className="flex gap-1 px-3 pt-2 flex-shrink-0">
        <button
          onClick={() => setMsgType('reply')}
          className={cn(
            'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all',
            msgType === 'reply'
              ? 'bg-white/20 border-white/30 text-white'
              : 'bg-transparent border-white/10 text-slate-400 hover:text-white'
          )}
        >
          <MessageSquare className="w-3 h-3" />
          Chat
        </button>
        <button
          onClick={() => setMsgType('question')}
          className={cn(
            'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all',
            msgType === 'question'
              ? 'bg-amber-500/30 border-amber-500/50 text-amber-200'
              : 'bg-transparent border-white/10 text-slate-400 hover:text-white'
          )}
        >
          <HelpCircle className="w-3 h-3" />
          Question
        </button>
        {isTeacher && (
          <button
            onClick={() => setMsgType('announcement')}
            className={cn(
              'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all',
              msgType === 'announcement'
                ? 'bg-purple-500/30 border-purple-500/50 text-purple-200'
                : 'bg-transparent border-white/10 text-slate-400 hover:text-white'
            )}
          >
            <Megaphone className="w-3 h-3" />
            Announce
          </button>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 px-3 py-3 flex-shrink-0">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            msgType === 'question' ? 'Ask a question…'
            : msgType === 'announcement' ? 'Send an announcement…'
            : 'Say something…'
          }
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className={cn(
            'flex-shrink-0',
            msgType === 'question' ? 'bg-amber-500 hover:bg-amber-600'
            : msgType === 'announcement' ? 'bg-purple-500 hover:bg-purple-600'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 hover:opacity-90'
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </GlassCard>
  );
}