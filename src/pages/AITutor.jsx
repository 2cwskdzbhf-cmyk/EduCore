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
import { callOpenAI } from '@/components/utils/openai';
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
  Loader2,
  Upload,
  Layers,
  HelpCircle,
  Gamepad2
} from 'lucide-react';

// Revision components
import FlashcardModal from '@/components/revision/FlashcardModal';
import QuizModal from '@/components/revision/QuizModal';
import RevisionGameModal from '@/components/revision/RevisionGameModal';
import ContentUploader from '@/components/revision/ContentUploader';

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

  // ============================================================================
  // REVISION BOT STATE
  // Tracks the revision flow: subject selection -> content upload -> activity choice
  // ============================================================================
  const [revisionState, setRevisionState] = useState({
    step: 'idle', // idle, select_subject, upload_content, choose_activity, activity_running
    subject: null,
    extractedContent: null,
    fileUrl: null,
    generatedFlashcards: null,
    generatedQuiz: null,
    generatedGameQuestions: null
  });
  
  // Modal states
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

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

  // ============================================================================
  // REVISION BOT: Start revision flow
  // ============================================================================
  const startRevisionBot = () => {
    setRevisionState({ ...revisionState, step: 'select_subject' });
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `👋 **Welcome to Revision Mode!**\n\nI'll help you revise any subject effectively. First, which subject would you like to revise?\n\nClick one of the options below or type the subject name:`
    }]);
  };

  // Subject options for revision
  const subjectOptions = ['French', 'Maths', 'Science', 'English', 'History', 'Geography'];

  // ============================================================================
  // REVISION BOT: Handle subject selection
  // ============================================================================
  const selectSubject = (subject) => {
    setRevisionState({ ...revisionState, step: 'upload_content', subject });
    setMessages(prev => [...prev, 
      { role: 'user', content: subject },
      { role: 'assistant', content: `Great choice! **${subject}** it is! 📚\n\nNow, please share the content you want to revise. You can:\n- **Paste text** (notes, vocabulary, definitions)\n- **Upload an image** (screenshot of notes, textbook page)\n\nClick the button below to upload your content:` }
    ]);
    setShowUploader(true);
  };

  // ============================================================================
  // REVISION BOT: Handle extracted content from uploader
  // Content is parsed by LLM to extract topics, vocabulary, facts, etc.
  // ============================================================================
  const handleContentExtracted = async (extractedContent, fileUrl) => {
    setShowUploader(false);
    setRevisionState({ 
      ...revisionState, 
      step: 'choose_activity', 
      extractedContent,
      fileUrl 
    });

    // Show summary of extracted content
    const summary = extractedContent.summary || 'Content extracted successfully!';
    const topicsList = extractedContent.topics?.join(', ') || 'Various topics';
    const conceptCount = (extractedContent.key_concepts?.length || 0) + (extractedContent.vocabulary?.length || 0);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ **Content Extracted!**\n\n**Topics:** ${topicsList}\n**Key concepts found:** ${conceptCount}\n**Summary:** ${summary}\n\nHow would you like to revise this content? Choose an activity:\n\n🎴 **Flashcards** - Review terms and definitions\n📝 **Quiz** - Test your knowledge\n🎮 **Game** - Learn while playing\n\nClick an option below:`
    }]);
  };

  // ============================================================================
  // REVISION BOT: Generate flashcards from extracted content
  // Converts key_concepts and vocabulary into front/back flashcard format
  // ============================================================================
  const generateFlashcards = async () => {
    const { extractedContent, subject } = revisionState;
    
    setMessages(prev => [...prev, 
      { role: 'user', content: 'Flashcards' },
      { role: 'assistant', content: '🎴 Generating flashcards from your content...' }
    ]);
    setIsTyping(true);

    try {
      // Use OpenAI to generate flashcards based on extracted content
      const flashcardsData = await callOpenAI({
        prompt: `Create flashcards for revision from this content. Each flashcard should have a front (question/term) and back (answer/definition).

Subject: ${subject}

Content to convert to flashcards:
Topics: ${JSON.stringify(extractedContent.topics || [])}
Key Concepts: ${JSON.stringify(extractedContent.key_concepts || [])}
Vocabulary: ${JSON.stringify(extractedContent.vocabulary || [])}
Facts: ${JSON.stringify(extractedContent.facts || [])}

Create 8-12 flashcards that cover the most important points.`,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" }
                },
                required: ["front", "back"],
                additionalProperties: false
              }
            }
          },
          required: ["flashcards"],
          additionalProperties: false
        }
      });

      setRevisionState(prev => ({ ...prev, generatedFlashcards: flashcardsData.flashcards }));
      setIsTyping(false);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `🎴 **${flashcardsData.flashcards?.length || 0} flashcards ready!**\n\nClick the button below to start studying. Flip each card to see the answer, then use arrows to navigate.`
        };
        return newMessages;
      });
      
      // Open flashcard modal
      setShowFlashcards(true);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setIsTyping(false);
    }
  };

  // ============================================================================
  // REVISION BOT: Generate quiz from extracted content
  // Creates multiple-choice and written questions based on content
  // ============================================================================
  const generateQuiz = async () => {
    const { extractedContent, subject } = revisionState;
    
    setMessages(prev => [...prev, 
      { role: 'user', content: 'Quiz' },
      { role: 'assistant', content: '📝 Generating quiz questions...' }
    ]);
    setIsTyping(true);

    try {
      // Consider weak skills from progress to focus questions
      const weakSkills = progress?.weak_skills || [];
      
      const quizData = await callOpenAI({
        prompt: `Create a revision quiz from this content. Mix multiple-choice and short-answer questions.

Subject: ${subject}
${weakSkills.length > 0 ? `Student weak areas to focus on: ${weakSkills.join(', ')}` : ''}

Content:
Topics: ${JSON.stringify(extractedContent.topics || [])}
Key Concepts: ${JSON.stringify(extractedContent.key_concepts || [])}
Vocabulary: ${JSON.stringify(extractedContent.vocabulary || [])}
Facts: ${JSON.stringify(extractedContent.facts || [])}

Create 6-8 questions. For multiple choice, provide 4 options with id and text fields.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  type: { type: "string", enum: ["multiple_choice", "short_answer"] },
                  options: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        text: { type: "string" }
                      },
                      required: ["id", "text"],
                      additionalProperties: false
                    } 
                  },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  skill: { type: "string" }
                },
                required: ["question", "type", "correct_answer", "explanation", "skill"],
                additionalProperties: false
              }
            }
          },
          required: ["questions"],
          additionalProperties: false
        }
      });

      setRevisionState(prev => ({ ...prev, generatedQuiz: quizData.questions }));
      setIsTyping(false);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `📝 **Quiz ready with ${quizData.questions?.length || 0} questions!**\n\nLet's test your knowledge. I'll mark your answers and give feedback.`
        };
        return newMessages;
      });
      
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setIsTyping(false);
    }
  };

  // ============================================================================
  // REVISION BOT: Generate game questions from extracted content
  // Questions are used when player hits obstacles in the game
  // ============================================================================
  const generateGameQuestions = async () => {
    const { extractedContent, subject } = revisionState;
    
    setMessages(prev => [...prev, 
      { role: 'user', content: 'Game' },
      { role: 'assistant', content: '🎮 Preparing your revision game...' }
    ]);
    setIsTyping(true);

    try {
      const gameData = await callOpenAI({
        prompt: `Create quick-fire questions for a revision game. Questions should be answerable in a few seconds.

Subject: ${subject}

Content:
Topics: ${JSON.stringify(extractedContent.topics || [])}
Key Concepts: ${JSON.stringify(extractedContent.key_concepts || [])}
Vocabulary: ${JSON.stringify(extractedContent.vocabulary || [])}
Facts: ${JSON.stringify(extractedContent.facts || [])}

Create 10-15 short questions. For multiple choice questions provide 4 options with id and text. Leave options empty array for text answer questions.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        text: { type: "string" }
                      },
                      required: ["id", "text"],
                      additionalProperties: false
                    } 
                  },
                  correct_answer: { type: "string" },
                  skill: { type: "string" }
                },
                required: ["question", "options", "correct_answer", "skill"],
                additionalProperties: false
              }
            }
          },
          required: ["questions"],
          additionalProperties: false
        }
      });

      setRevisionState(prev => ({ ...prev, generatedGameQuestions: gameData.questions }));
      setIsTyping(false);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `🎮 **Game ready!**\n\nCollect stars while avoiding obstacles. When you hit an obstacle, answer a revision question to continue!\n\nUse arrow keys or buttons to move. Good luck!`
        };
        return newMessages;
      });
      
      setShowGame(true);
    } catch (error) {
      console.error('Error generating game questions:', error);
      setIsTyping(false);
    }
  };

  // ============================================================================
  // REVISION BOT: Handle flashcard completion
  // ============================================================================
  const handleFlashcardsComplete = (cardsReviewed) => {
    setShowFlashcards(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `🎉 **Great job!** You reviewed ${cardsReviewed} flashcards.\n\nWould you like to:\n- Try the **Quiz** to test yourself\n- Play the **Game** for more practice\n- **Upload new content** to revise something else\n- Or type a question if you need help with anything!`
    }]);
  };

  // ============================================================================
  // REVISION BOT: Handle quiz completion
  // Updates StudentProgress with performance data
  // ============================================================================
  const handleQuizComplete = async (results) => {
    setShowQuiz(false);

    // Update StudentProgress with quiz results
    if (user?.email && progress) {
      const skillResults = {};
      results.results.forEach(r => {
        const skill = r.skill || 'general';
        if (!skillResults[skill]) {
          skillResults[skill] = { correct: 0, total: 0 };
        }
        skillResults[skill].total++;
        if (r.correct) skillResults[skill].correct++;
      });

      // Update skill mastery
      const updatedSkillMastery = { ...progress.skill_mastery };
      const newWeakSkills = [...(progress.weak_skills || [])];
      const newStrongSkills = [...(progress.strong_skills || [])];

      Object.entries(skillResults).forEach(([skill, data]) => {
        const percentage = (data.correct / data.total) * 100;
        updatedSkillMastery[skill] = {
          correct: (updatedSkillMastery[skill]?.correct || 0) + data.correct,
          total: (updatedSkillMastery[skill]?.total || 0) + data.total,
          mastery: percentage,
          last_practiced: new Date().toISOString()
        };

        // Update weak/strong skills
        if (percentage < 50 && !newWeakSkills.includes(skill)) {
          newWeakSkills.push(skill);
          const strongIdx = newStrongSkills.indexOf(skill);
          if (strongIdx > -1) newStrongSkills.splice(strongIdx, 1);
        } else if (percentage >= 80 && !newStrongSkills.includes(skill)) {
          newStrongSkills.push(skill);
          const weakIdx = newWeakSkills.indexOf(skill);
          if (weakIdx > -1) newWeakSkills.splice(weakIdx, 1);
        }
      });

      // Save updated progress
      await base44.entities.StudentProgress.update(progress.id, {
        skill_mastery: updatedSkillMastery,
        weak_skills: newWeakSkills,
        strong_skills: newStrongSkills,
        total_xp: (progress.total_xp || 0) + (results.correct * 5),
        today_xp: (progress.today_xp || 0) + (results.correct * 5)
      });

      // Invalidate progress query
      queryClient.invalidateQueries({ queryKey: ['studentProgress'] });
    }

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `📊 **Quiz Complete!**\n\n**Score:** ${results.correct}/${results.total} (${results.percentage}%)\n\n${results.percentage >= 80 
        ? '🌟 Excellent work! You really know this content!' 
        : results.percentage >= 60 
          ? '👍 Good effort! A bit more practice and you\'ll master it.' 
          : '💪 Keep practicing! Would you like to review the flashcards again?'}\n\nWhat would you like to do next?`
    }]);
  };

  // ============================================================================
  // REVISION BOT: Handle game completion
  // ============================================================================
  const handleGameComplete = async (results) => {
    setShowGame(false);

    // Update progress with game results
    if (user?.email && progress) {
      await base44.entities.StudentProgress.update(progress.id, {
        total_xp: (progress.total_xp || 0) + results.score,
        today_xp: (progress.today_xp || 0) + results.score
      });
      queryClient.invalidateQueries({ queryKey: ['studentProgress'] });
    }

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `🎮 **Game Over!**\n\n**Score:** ${results.score} points\n**Level reached:** ${results.level}\n**Questions correct:** ${results.correctAnswers}/${results.correctAnswers + results.wrongAnswers}\n\n${results.livesRemaining > 0 
        ? '🏆 Well played!' 
        : 'Nice try! Practice makes perfect.'}\n\nWant to play again or try a different activity?`
    }]);
  };

  // ============================================================================
  // REVISION BOT: Reset to start new revision session
  // ============================================================================
  const resetRevision = () => {
    setRevisionState({
      step: 'idle',
      subject: null,
      extractedContent: null,
      fileUrl: null,
      generatedFlashcards: null,
      generatedQuiz: null,
      generatedGameQuestions: null
    });
    setShowUploader(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============================================================================
  // BUILD PERSONALISED AI CONTEXT PROMPT
  // This function injects real student data into the AI prompt for personalisation
  // ============================================================================
  
  const buildContextPrompt = () => {
    // ----------------------------------------------------------------------------
    // SECTION 1: Base AI personality and behaviour rules
    // ----------------------------------------------------------------------------
    let context = "You are a friendly, encouraging AI tutor for secondary school students (ages 11-16). ";
    context += "Use simple language, step-by-step explanations, and relatable examples. ";
    context += "Be supportive and patient. Use emojis sparingly to keep things engaging.\n";

    // ----------------------------------------------------------------------------
    // SECTION 2: Inject student profile data (level, XP, experience)
    // This helps AI understand student's overall progress
    // ----------------------------------------------------------------------------
    if (progress) {
      context += `\n## STUDENT PROFILE DATA:`;
      context += `\n- Current Level: ${progress.level || 1}`;
      context += `\n- Total XP: ${progress.total_xp || 0}`;
      context += `\n- Current Streak: ${progress.current_streak || 0} days`;
      context += `\n- Lessons Completed: ${progress.completed_lessons?.length || 0}`;
    }

    // ----------------------------------------------------------------------------
    // SECTION 3: Inject weak areas - topics where student struggles
    // AI will simplify explanations and offer more support for these topics
    // ----------------------------------------------------------------------------
    const weakTopicNames = [];
    const weakTopicIds = progress?.weak_areas || [];
    
    if (weakTopicIds.length > 0) {
      weakTopicIds.forEach(id => {
        const t = topics.find(top => top.id === id);
        if (t) weakTopicNames.push(t.name);
      });
    }
    
    // Also check recent quiz attempts for low scores (below 60%)
    const recentLowScoreTopics = [];
    quizAttempts.forEach(attempt => {
      if (attempt.score < 60) {
        const t = topics.find(top => top.id === attempt.topic_id);
        if (t && !weakTopicNames.includes(t.name) && !recentLowScoreTopics.includes(t.name)) {
          recentLowScoreTopics.push(t.name);
        }
      }
    });

    if (weakTopicNames.length > 0 || recentLowScoreTopics.length > 0) {
      context += `\n\n## WEAK AREAS (student struggles with these - USE SIMPLER EXPLANATIONS):`;
      if (weakTopicNames.length > 0) {
        context += `\n- Identified weak topics: ${weakTopicNames.join(', ')}`;
      }
      if (recentLowScoreTopics.length > 0) {
        context += `\n- Recent low quiz scores in: ${recentLowScoreTopics.join(', ')}`;
      }
      context += `\n\n>> INSTRUCTION: For these weak areas, you MUST:`;
      context += `\n   - Break down concepts into very small steps`;
      context += `\n   - Use simpler vocabulary and more examples`;
      context += `\n   - Check understanding frequently`;
      context += `\n   - Offer encouragement and positive reinforcement`;
    }

    // ----------------------------------------------------------------------------
    // SECTION 4: Inject strong areas - topics where student excels
    // AI can provide more challenging content for these topics
    // ----------------------------------------------------------------------------
    const strongTopicNames = [];
    const strongTopicIds = progress?.strong_areas || [];
    
    if (strongTopicIds.length > 0) {
      strongTopicIds.forEach(id => {
        const t = topics.find(top => top.id === id);
        if (t) strongTopicNames.push(t.name);
      });
    }

    // Also check recent quiz attempts for high scores (80%+)
    const recentHighScoreTopics = [];
    quizAttempts.forEach(attempt => {
      if (attempt.score >= 80) {
        const t = topics.find(top => top.id === attempt.topic_id);
        if (t && !strongTopicNames.includes(t.name) && !recentHighScoreTopics.includes(t.name)) {
          recentHighScoreTopics.push(t.name);
        }
      }
    });

    if (strongTopicNames.length > 0 || recentHighScoreTopics.length > 0) {
      context += `\n\n## STRONG AREAS (student excels here - CAN GIVE HARDER CONTENT):`;
      if (strongTopicNames.length > 0) {
        context += `\n- Mastered topics: ${strongTopicNames.join(', ')}`;
      }
      if (recentHighScoreTopics.length > 0) {
        context += `\n- Recent high quiz scores in: ${recentHighScoreTopics.join(', ')}`;
      }
      context += `\n\n>> INSTRUCTION: For these strong areas, you CAN:`;
      context += `\n   - Provide more challenging practice problems`;
      context += `\n   - Introduce advanced concepts or extensions`;
      context += `\n   - Move faster through basic explanations`;
    }

    // ----------------------------------------------------------------------------
    // SECTION 5: Inject recent quiz performance data
    // Helps AI understand current confidence levels per topic
    // ----------------------------------------------------------------------------
    if (quizAttempts.length > 0) {
      context += `\n\n## RECENT QUIZ PERFORMANCE (last ${Math.min(quizAttempts.length, 5)} attempts):`;
      quizAttempts.slice(0, 5).forEach(attempt => {
        const attemptTopic = topics.find(t => t.id === attempt.topic_id);
        if (attemptTopic) {
          const scoreLevel = attempt.score >= 80 ? 'CONFIDENT' : attempt.score >= 60 ? 'DEVELOPING' : 'NEEDS SUPPORT';
          context += `\n- ${attemptTopic.name}: ${attempt.score}% (${scoreLevel})`;
        }
      });
    }

    // ----------------------------------------------------------------------------
    // SECTION 6: Inject topic mastery percentages
    // Shows AI the student's confidence level per topic
    // ----------------------------------------------------------------------------
    if (progress?.topic_mastery && Object.keys(progress.topic_mastery).length > 0) {
      context += `\n\n## TOPIC MASTERY LEVELS:`;
      Object.entries(progress.topic_mastery).forEach(([topicId, mastery]) => {
        const t = topics.find(top => top.id === topicId);
        if (t) {
          const masteryLevel = mastery >= 80 ? 'HIGH' : mastery >= 50 ? 'MEDIUM' : 'LOW';
          context += `\n- ${t.name}: ${mastery}% mastery (${masteryLevel})`;
        }
      });
    }

    // ----------------------------------------------------------------------------
    // SECTION 7: Current topic context (if student came from a specific topic/lesson)
    // ----------------------------------------------------------------------------
    if (topic) {
      const isWeakTopic = weakTopicNames.includes(topic.name) || recentLowScoreTopics.includes(topic.name);
      const isStrongTopic = strongTopicNames.includes(topic.name) || recentHighScoreTopics.includes(topic.name);
      
      context += `\n\n## CURRENT TOPIC CONTEXT: ${topic.name}`;
      context += `\n- Description: ${topic.description || 'No description'}`;
      context += `\n- Difficulty: ${topic.difficulty_level || 'unknown'}`;
      
      if (isWeakTopic) {
        context += `\n- ⚠️ This is a WEAK AREA for this student - use extra simple explanations!`;
      } else if (isStrongTopic) {
        context += `\n- ✓ This is a STRONG AREA - can provide more challenging content`;
      }
    }

    // ----------------------------------------------------------------------------
    // SECTION 8: Auto-suggest revision for weak topics
    // AI should proactively suggest revision when detecting weak areas
    // ----------------------------------------------------------------------------
    if (weakTopicNames.length > 0 || recentLowScoreTopics.length > 0) {
      const allWeakTopics = [...new Set([...weakTopicNames, ...recentLowScoreTopics])];
      context += `\n\n## AUTO-REVISION SUGGESTION:`;
      context += `\nIf the student seems unsure or asks general questions, proactively suggest revising: ${allWeakTopics.join(', ')}`;
      context += `\nYou can say something like: "I noticed you might benefit from some practice with [topic]. Would you like me to help you revise that?"`;
    }

    // ----------------------------------------------------------------------------
    // SECTION 9: Quiz protection rules
    // Prevent AI from giving direct answers during active quizzes
    // ----------------------------------------------------------------------------
    context += `\n\n## IMPORTANT RULES:`;
    context += `\n1. NEVER give direct answers to quiz questions. Instead, guide the student to find the answer themselves.`;
    context += `\n2. If a student asks for a specific quiz answer, say: "I can't give you the answer directly, but let me help you understand the concept..."`;
    context += `\n3. When helping with problems, use hints and guiding questions rather than solutions.`;
    context += `\n4. Always encourage the student and celebrate their efforts.`;

    return context;
  };

  // ============================================================================
  // SEND MESSAGE MUTATION
  // Constructs the final prompt with all personalisation data and sends to LLM
  // ============================================================================
  
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage) => {
      // Build the personalised context (includes all student data)
      const contextPrompt = buildContextPrompt();
      
      // Build conversation history for context continuity
      const conversationHistory = messages.map(m => 
        `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
      ).join('\n\n');

      let fullPrompt = contextPrompt;

      // ----------------------------------------------------------------------------
      // CHAT MODE: Normal tutoring conversation
      // ----------------------------------------------------------------------------
      if (mode === 'chat') {
        if (conversationHistory) {
          fullPrompt += `\n\n## CONVERSATION HISTORY:\n${conversationHistory}`;
        }
        
        // Check if student is asking about a weak topic - adjust response style
        const weakTopicNames = (progress?.weak_areas || [])
          .map(id => topics.find(t => t.id === id)?.name?.toLowerCase())
          .filter(Boolean);
        
        const isAskingAboutWeakTopic = weakTopicNames.some(topicName => 
          userMessage.toLowerCase().includes(topicName)
        );
        
        fullPrompt += `\n\n## STUDENT MESSAGE: "${userMessage}"`;
        
        if (isAskingAboutWeakTopic) {
          fullPrompt += `\n\n>> NOTE: Student is asking about a WEAK TOPIC. Use extra simple step-by-step explanations!`;
        }
        
        fullPrompt += `\n\nProvide a helpful, encouraging, personalised response based on this student's data above:`;
      }
      
      // ----------------------------------------------------------------------------
      // REVISION MODE: Structured revision session
      // Adapts difficulty based on student's mastery of the revision topic
      // ----------------------------------------------------------------------------
      if (mode === 'revision') {
        const revisionTopicName = revisionTopic || userMessage;
        
        // Check if this revision topic is weak or strong for the student
        const weakTopicNames = (progress?.weak_areas || [])
          .map(id => topics.find(t => t.id === id)?.name?.toLowerCase())
          .filter(Boolean);
        const strongTopicNames = (progress?.strong_areas || [])
          .map(id => topics.find(t => t.id === id)?.name?.toLowerCase())
          .filter(Boolean);
        
        const isWeakTopic = weakTopicNames.some(t => revisionTopicName.toLowerCase().includes(t));
        const isStrongTopic = strongTopicNames.some(t => revisionTopicName.toLowerCase().includes(t));
        
        fullPrompt += `\n\n## REVISION REQUEST: "${revisionTopicName}"`;
        
        if (isWeakTopic) {
          // Weak topic revision - simpler, more supportive
          fullPrompt += `\n\n>> This is a WEAK TOPIC for this student. Create an EASY revision session:`;
          fullPrompt += `\n1. Start with the most basic explanation using simple words`;
          fullPrompt += `\n2. Use everyday examples and analogies`;
          fullPrompt += `\n3. Break everything into tiny, manageable steps`;
          fullPrompt += `\n4. Give 2-3 EASY practice questions with hints`;
          fullPrompt += `\n5. Be extra encouraging and supportive`;
        } else if (isStrongTopic) {
          // Strong topic revision - more challenging
          fullPrompt += `\n\n>> This is a STRONG TOPIC for this student. Create a CHALLENGING revision session:`;
          fullPrompt += `\n1. Quick recap of key concepts (they already know basics)`;
          fullPrompt += `\n2. Introduce advanced applications or edge cases`;
          fullPrompt += `\n3. Give 2-3 CHALLENGING practice questions`;
          fullPrompt += `\n4. Include extension problems to stretch their thinking`;
        } else {
          // Normal revision
          fullPrompt += `\n\nCreate a balanced mini revision session:`;
          fullPrompt += `\n1. Start with a brief, clear explanation of the key concepts`;
          fullPrompt += `\n2. Give 2-3 important points to remember`;
          fullPrompt += `\n3. Include 2-3 practice questions at the end`;
          fullPrompt += `\n4. Keep it concise and student-friendly`;
        }
      }

      const response = await callOpenAI({
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
      {/* Modals */}
      {showFlashcards && revisionState.generatedFlashcards && (
        <FlashcardModal
          flashcards={revisionState.generatedFlashcards}
          onClose={() => setShowFlashcards(false)}
          onComplete={handleFlashcardsComplete}
        />
      )}

      {showQuiz && revisionState.generatedQuiz && (
        <QuizModal
          questions={revisionState.generatedQuiz}
          onClose={() => setShowQuiz(false)}
          onComplete={handleQuizComplete}
        />
      )}

      {showGame && revisionState.generatedGameQuestions && (
        <RevisionGameModal
          questions={revisionState.generatedGameQuestions}
          subject={revisionState.subject}
          onClose={() => setShowGame(false)}
          onComplete={handleGameComplete}
        />
      )}

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
                  {revisionState.subject 
                    ? `Revising ${revisionState.subject}` 
                    : topic 
                      ? `Helping with ${topic.name}` 
                      : 'Ready to help'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('chat'); resetRevision(); }}
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
              onClick={() => { setMode('revision'); if (revisionState.step === 'idle') startRevisionBot(); }}
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

                {/* Revision mode empty state */}
                {mode === 'revision' && revisionState.step === 'idle' && (
                  <div className="mt-6">
                    <Button
                      onClick={startRevisionBot}
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Revision Session
                    </Button>
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
                {/* Revision Bot: Subject Selection Buttons */}
                {mode === 'revision' && revisionState.step === 'select_subject' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {subjectOptions.map(subj => (
                      <Button
                        key={subj}
                        variant="outline"
                        onClick={() => selectSubject(subj)}
                        className="hover:bg-indigo-50 hover:border-indigo-300"
                      >
                        {subj}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Revision Bot: Content Uploader */}
                {mode === 'revision' && showUploader && (
                  <div className="mt-4">
                    <ContentUploader
                      onContentExtracted={handleContentExtracted}
                      onCancel={() => setShowUploader(false)}
                    />
                  </div>
                )}

                {/* Revision Bot: Activity Choice Buttons */}
                {mode === 'revision' && revisionState.step === 'choose_activity' && !showFlashcards && !showQuiz && !showGame && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={generateFlashcards}
                      disabled={isTyping}
                      className="hover:bg-yellow-50 hover:border-yellow-300"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Flashcards
                    </Button>
                    <Button
                      variant="outline"
                      onClick={generateQuiz}
                      disabled={isTyping}
                      className="hover:bg-blue-50 hover:border-blue-300"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Quiz
                    </Button>
                    <Button
                      variant="outline"
                      onClick={generateGameQuestions}
                      disabled={isTyping}
                      className="hover:bg-green-50 hover:border-green-300"
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      Game
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { resetRevision(); startRevisionBot(); }}
                      className="text-slate-500"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Content
                    </Button>
                  </div>
                )}

                {/* Quick activity buttons after completing an activity */}
                {mode === 'revision' && revisionState.extractedContent && !showFlashcards && !showQuiz && !showGame && !isTyping && revisionState.step !== 'choose_activity' && revisionState.step !== 'select_subject' && revisionState.step !== 'upload_content' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {revisionState.generatedFlashcards && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFlashcards(true)}
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Flashcards
                      </Button>
                    )}
                    {revisionState.generatedQuiz && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQuiz(true)}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Quiz
                      </Button>
                    )}
                    {revisionState.generatedGameQuestions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGame(true)}
                      >
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        Game
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { resetRevision(); startRevisionBot(); }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Topic
                    </Button>
                  </div>
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