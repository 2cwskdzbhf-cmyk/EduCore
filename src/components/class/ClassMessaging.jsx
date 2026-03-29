import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Send, MessageCircle, Megaphone, HelpCircle, Users, Pin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassMessaging({ classId, user, classData }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [questionContent, setQuestionContent] = useState('');

  const { data: messages = [] } = useQuery({
    queryKey: ['classMessages', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.ClassMessage.filter({ class_id: classId }, '-created_date', 100);
    },
    enabled: !!classId,
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (msgData) => {
      return base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: user.user_type || 'student',
        ...msgData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classMessages', classId]);
      setMessage('');
      setSelectedStudent(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
    onError: () => toast.error('Failed to send message')
  });

  const sendAnnouncement = () => {
    if (!announcementContent.trim()) return;
    sendMessageMutation.mutate({
      message_type: 'announcement',
      content: announcementContent,
      recipient_email: null
    });
    setAnnouncementContent('');
  };

  const sendQuestion = () => {
    if (!questionContent.trim()) return;
    sendMessageMutation.mutate({
      message_type: 'question',
      content: questionContent,
      recipient_email: null
    });
    setQuestionContent('');
  };

  const sendPrivateMessage = () => {
    if (!message.trim() || !selectedStudent) return;
    sendMessageMutation.mutate({
      message_type: 'reply',
      content: message,
      recipient_email: selectedStudent.email
    });
  };

  const isTeacher = user?.user_type === 'teacher' || user?.role === 'teacher';
  const announcements = messages.filter(m => m.message_type === 'announcement').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const questions = messages.filter(m => m.message_type === 'question').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  
  const privateMessages = selectedStudent
    ? messages.filter(m => 
        m.message_type === 'reply' && 
        ((m.sender_email === user.email && m.recipient_email === selectedStudent.email) ||
         (m.sender_email === selectedStudent.email && m.recipient_email === user.email))
      ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  return (
    <GlassCard className="p-6 h-[600px] flex flex-col">
      <Tabs defaultValue="announcements" className="h-full flex flex-col">
        <TabsList className="bg-white/5 border border-white/10 mb-4">
          <TabsTrigger value="announcements" className="data-[state=active]:bg-white/10">
            <Megaphone className="w-4 h-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-white/10">
            <HelpCircle className="w-4 h-4 mr-2" />
            Q&A
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-white/10">
            <Users className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="flex-1 flex flex-col overflow-hidden">
          {isTeacher && (
            <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <Textarea
                placeholder="Send an announcement to your class..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                className="bg-white/5 border-white/10 text-white min-h-[80px] mb-2"
              />
              <Button
                onClick={sendAnnouncement}
                disabled={!announcementContent.trim() || sendMessageMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Send Announcement
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3">
            {announcements.length > 0 ? (
              announcements.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{msg.sender_name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(msg.created_date).toLocaleTimeString()}
                      </p>
                    </div>
                    {msg.is_pinned && <Pin className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No announcements yet</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="questions" className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <Textarea
              placeholder="Ask your teacher a question..."
              value={questionContent}
              onChange={(e) => setQuestionContent(e.target.value)}
              className="bg-white/5 border-white/10 text-white min-h-[80px] mb-2"
            />
            <Button
              onClick={sendQuestion}
              disabled={!questionContent.trim() || sendMessageMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Ask Question
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {questions.length > 0 ? (
              questions.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg border border-amber-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{msg.sender_name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(msg.created_date).toLocaleTimeString()}
                      </p>
                    </div>
                    {msg.sender_type === 'student' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-300">
                        Question
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No questions yet</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </TabsContent>

        {/* Direct Messages Tab */}
        <TabsContent value="students" className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-3 gap-2 mb-4 max-h-[120px] overflow-y-auto">
            {classData?.student_emails?.map((email) => {
              const isSelected = selectedStudent?.email === email;
              return (
                <button
                  key={email}
                  onClick={() => setSelectedStudent({ email, name: email.split('@')[0] })}
                  className={`p-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {email.split('@')[0]}
                </button>
              );
            })}
          </div>

          {selectedStudent ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 bg-white/[0.02] rounded-lg">
                {privateMessages.length > 0 ? (
                  privateMessages.map((msg) => {
                    const isOwn = msg.sender_email === user.email;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: isOwn ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            isOwn
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                              : 'bg-white/10 text-slate-100'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 text-sm text-center py-8">No messages yet</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendPrivateMessage()}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  onClick={sendPrivateMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-blue-500"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a student to start messaging
            </div>
          )}
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
}