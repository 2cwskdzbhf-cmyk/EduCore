import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { 
  ChevronLeft, 
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function AITutor() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const topicIdParam = urlParams.get('topic');
  const modeParam = urlParams.get('mode');

  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState(modeParam || 'chat');
  const [revisionTopic, setRevisionTopic] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: topic } = useQuery({
    queryKey: ['topic', topicIdParam],
    queryFn: async () => {
      if (!topicIdParam) return null;
      const topics = await base44.entities.Topic.filter({ id: topicIdParam });
      return topics[0] || null;
    },
    enabled: !!topicIdParam
  });

  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['allTopics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.QuizAttempt.filter({ student_email: user.email }, '-created_date', 10);
    },
    enabled: !!user?.email
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContextPrompt = () => {
    let context = "You are a friendly, encouraging AI tutor for secondary school students (ages 11-16). ";
    context += "Use simple language, step-by-step explanations, and relatable examples. ";
    context += "Be supportive and patient. Use emojis sparingly to keep things engaging. ";
    
    if (progress) {
      context += `\n\nStudent profile:`;
      context += `\n- Level: ${progress.level || 1}`;
      context += `\n- Total XP: ${progress.total_xp || 0}`;
      
      if (progress.strong_areas?.length > 0) {
        const strongTopicNames = progress.strong_areas
          .map(id => topics.find(t => t.id === id)?.name)
          .filter(Boolean);
        if (strongTopicNames.length > 0) {
          context += `\n- Strong areas: ${strongTopicNames.join(', ')}`;
        }
      }
      
      if (progress.weak_areas?.length > 0) {
        const weakTopicNames = progress.weak_areas
          .map(id => topics.find(t => t.id === id)?.name)
          .filter(Boolean);
        if (weakTopicNames.length > 0) {
          context += `\n- Areas needing practice: ${weakTopicNames.join(', ')}`;
        }
      }
    }

    if (topic) {
      context += `\n\nCurrent topic context: ${topic.name} - ${topic.description || ''}`;
    }

    if (quizAttempts.length > 0) {
      context += `\n\nRecent quiz performance:`;
      quizAttempts.slice(0, 3).forEach(attempt => {
        const attemptTopic = topics.find(t => t.id === attempt.topic_id);
        if (attemptTopic) {
          context += `\n- ${attemptTopic.name}: ${attempt.score}%`;
        }
      });
    }

    return context;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage) => {
      const contextPrompt = buildContextPrompt();
      
      const conversationHistory = messages.map(m => 
        `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
      ).join('\n\n');

      let fullPrompt = contextPrompt;
      if (conversationHistory) {
        fullPrompt += `\n\nConversation so far:\n${conversationHistory}`;
      }
      fullPrompt += `\n\nStudent: ${userMessage}\n\nProvide a helpful, encouraging response:`;

      if (mode === 'revision') {
        fullPrompt = contextPrompt;
        fullPrompt += `\n\nThe student wants to revise: ${revisionTopic || userMessage}`;
        fullPrompt += `\n\nCreate a mini revision session:
1. Start with a brief, clear explanation of the key concepts
2. Give 2-3 important points to remember
3. Include 1-2 practice questions at the end
4. Keep it concise and student-friendly`;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt
      });

      return response;
    }
  });

  const handleSend = async () => {
    if (!message.trim() && mode !== 'revision') return;

    const userMessage = mode === 'revision' && !message.trim() 
      ? `Help me revise: ${revisionTopic}` 
      : message;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessage('');
    setIsTyping(true);

    const response = await sendMessageMutation.mutateAsync(userMessage);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
  };

  const quickPrompts = [
    { icon: Lightbulb, text: "Explain this simply" },
    { icon: BookOpen, text: "Give me practice questions" },
    { icon: RefreshCw, text: "Try a different approach" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('StudentDashboard')} className="text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-800">AI Tutor</h1>
                <p className="text-xs text-slate-500">
                  {topic ? `Helping with ${topic.name}` : 'Ready to help'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setMode('chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'chat' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setMode('revision')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'revision' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Revision
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {mode === 'revision' ? "Let's Revise!" : "Hi! I'm your AI Tutor"}
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  {mode === 'revision' 
                    ? "Tell me what you'd like to revise and I'll create a personalized mini-lesson for you."
                    : "Ask me anything about your subjects. I'll explain concepts step by step and help you practice."}
                </p>

                {mode === 'revision' && (
                  <div className="max-w-md mx-auto mb-8">
                    <Input
                      placeholder="What would you like to revise? (e.g., fractions, algebra)"
                      value={revisionTopic}
                      onChange={(e) => setRevisionTopic(e.target.value)}
                      className="h-12"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!revisionTopic.trim() || sendMessageMutation.isPending}
                      className="mt-3 w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                    >
                      Start Revision Session
                      <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {mode === 'chat' && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      "Explain fractions simply",
                      "Help me with algebra",
                      "Give me practice questions",
                      "What are my weak areas?"
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setMessage(prompt);
                        }}
                        className="px-4 py-2 bg-white rounded-full border border-slate-200 text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' 
                          ? 'bg-indigo-500' 
                          : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block rounded-2xl px-5 py-3 ${
                          msg.role === 'user' 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-white border border-slate-100 shadow-sm'
                        }`}>
                          {msg.role === 'user' ? (
                            <p>{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm prose-slate max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  code: ({ children }) => <code className="bg-slate-100 px-1 rounded text-indigo-600">{children}</code>,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      {mode === 'chat' && (
        <div className="bg-white border-t border-slate-100 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Input
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="h-12"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isTyping}
                className="h-12 w-12 bg-indigo-500 hover:bg-indigo-600 p-0"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}