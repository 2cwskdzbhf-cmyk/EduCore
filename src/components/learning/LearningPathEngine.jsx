import { base44 } from '@/api/base44Client';

/**
 * Learning Path Engine - Analyzes student performance and generates personalized recommendations
 */

export class LearningPathEngine {
  /**
   * Analyze student performance and identify weak areas
   */
  static async analyzeStudentPerformance(studentEmail, classId = null) {
    // Fetch all quiz attempts
    const filter = classId 
      ? { student_email: studentEmail, class_id: classId }
      : { student_email: studentEmail };
    
    const attempts = await base44.entities.QuizAttempt.filter(filter);
    
    if (attempts.length === 0) {
      return {
        weakTopics: [],
        weakSubtopics: [],
        strongTopics: [],
        overallAccuracy: 0,
        totalAttempts: 0
      };
    }

    // Aggregate performance by topic and subtopic
    const topicPerformance = {};
    const subtopicPerformance = {};
    
    for (const attempt of attempts) {
      // Topic-level aggregation
      if (attempt.topic_id) {
        if (!topicPerformance[attempt.topic_id]) {
          topicPerformance[attempt.topic_id] = { total: 0, correct: 0, attempts: 0 };
        }
        topicPerformance[attempt.topic_id].total += attempt.questions_answered || 0;
        topicPerformance[attempt.topic_id].correct += attempt.correct_answers || 0;
        topicPerformance[attempt.topic_id].attempts += 1;
      }

      // Analyze individual questions for subtopic performance
      if (attempt.answers && Array.isArray(attempt.answers)) {
        for (const answer of attempt.answers) {
          if (answer.subtopic_id) {
            if (!subtopicPerformance[answer.subtopic_id]) {
              subtopicPerformance[answer.subtopic_id] = { total: 0, correct: 0 };
            }
            subtopicPerformance[answer.subtopic_id].total += 1;
            if (answer.is_correct) {
              subtopicPerformance[answer.subtopic_id].correct += 1;
            }
          }
        }
      }
    }

    // Calculate accuracy for each topic
    const topicAccuracy = Object.entries(topicPerformance).map(([topicId, data]) => ({
      topicId,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      attempts: data.attempts,
      questions: data.total
    }));

    // Calculate accuracy for each subtopic
    const subtopicAccuracy = Object.entries(subtopicPerformance).map(([subtopicId, data]) => ({
      subtopicId,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      questions: data.total
    }));

    // Identify weak areas (accuracy < 60%)
    const weakTopics = topicAccuracy.filter(t => t.accuracy < 60 && t.attempts > 0);
    const weakSubtopics = subtopicAccuracy.filter(s => s.accuracy < 60 && s.questions >= 3);

    // Identify strong areas (accuracy >= 75%)
    const strongTopics = topicAccuracy.filter(t => t.accuracy >= 75);

    // Calculate overall accuracy
    const totalQuestions = attempts.reduce((sum, a) => sum + (a.questions_answered || 0), 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + (a.correct_answers || 0), 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      weakTopics: weakTopics.sort((a, b) => a.accuracy - b.accuracy),
      weakSubtopics: weakSubtopics.sort((a, b) => a.accuracy - b.accuracy),
      strongTopics: strongTopics.sort((a, b) => b.accuracy - a.accuracy),
      overallAccuracy,
      totalAttempts: attempts.length,
      recentAttempts: attempts.slice(-5)
    };
  }

  /**
   * Generate personalized quiz recommendations based on weak areas
   */
  static async generateRecommendations(studentEmail, classId = null) {
    const analysis = await this.analyzeStudentPerformance(studentEmail, classId);
    
    if (analysis.weakTopics.length === 0 && analysis.weakSubtopics.length === 0) {
      // No weak areas - recommend advanced content
      return {
        priority: 'advancement',
        message: 'Great job! You\'re performing well across all areas.',
        recommendations: await this.getAdvancedRecommendations(studentEmail, classId)
      };
    }

    // Get topics and subtopics details
    const topics = await base44.entities.Topic.list();
    const subtopics = await base44.entities.Subtopic.list();
    
    const topicMap = Object.fromEntries(topics.map(t => [t.id, t]));
    const subtopicMap = Object.fromEntries(subtopics.map(s => [s.id, s]));

    // Build recommendations
    const recommendations = [];

    // Recommend quizzes for weak topics
    for (const weakTopic of analysis.weakTopics.slice(0, 3)) {
      const topic = topicMap[weakTopic.topicId];
      if (!topic) continue;

      // Find available quizzes for this topic
      const quizSets = await base44.entities.QuizSet.filter({ 
        topic_id: weakTopic.topicId,
        status: 'published'
      });

      // Recommend easier quizzes first for struggling topics
      const difficulty = weakTopic.accuracy < 40 ? 'easy' : 'medium';

      recommendations.push({
        type: 'topic_practice',
        priority: weakTopic.accuracy < 40 ? 'high' : 'medium',
        topic: topic.name,
        topicId: topic.id,
        accuracy: Math.round(weakTopic.accuracy),
        difficulty,
        quizzes: quizSets.slice(0, 3),
        reason: `Your accuracy in ${topic.name} is ${Math.round(weakTopic.accuracy)}%. Practice will help improve!`
      });
    }

    // Recommend specific subtopic practice
    for (const weakSubtopic of analysis.weakSubtopics.slice(0, 3)) {
      const subtopic = subtopicMap[weakSubtopic.subtopicId];
      if (!subtopic) continue;

      const topic = topicMap[subtopic.topic_id];
      
      recommendations.push({
        type: 'subtopic_focus',
        priority: weakSubtopic.accuracy < 40 ? 'high' : 'medium',
        topic: topic?.name,
        subtopic: subtopic.name,
        subtopicId: subtopic.id,
        accuracy: Math.round(weakSubtopic.accuracy),
        reason: `Focus on ${subtopic.name} - ${Math.round(weakSubtopic.accuracy)}% accuracy needs improvement`
      });
    }

    return {
      priority: 'improvement',
      message: `We've identified ${analysis.weakTopics.length + analysis.weakSubtopics.length} areas for improvement`,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      overallAccuracy: Math.round(analysis.overallAccuracy)
    };
  }

  /**
   * Get advanced recommendations for high-performing students
   */
  static async getAdvancedRecommendations(studentEmail, classId) {
    const quizSets = await base44.entities.QuizSet.filter({
      status: 'published'
    });

    // Find challenging quizzes
    const hardQuizzes = quizSets.filter(q => 
      q.difficulty === 'hard' || q.description?.toLowerCase().includes('advanced')
    );

    return hardQuizzes.slice(0, 3).map(quiz => ({
      type: 'challenge',
      priority: 'low',
      quizId: quiz.id,
      title: quiz.title,
      difficulty: 'hard',
      reason: 'Challenge yourself with advanced content'
    }));
  }

  /**
   * Calculate adaptive difficulty for next quiz
   */
  static async getAdaptiveDifficulty(studentEmail, topicId) {
    const attempts = await base44.entities.QuizAttempt.filter({
      student_email: studentEmail,
      topic_id: topicId
    });

    if (attempts.length === 0) return 'medium';

    // Calculate recent performance (last 5 attempts)
    const recentAttempts = attempts.slice(-5);
    const avgAccuracy = recentAttempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / recentAttempts.length;

    // Adaptive difficulty based on performance
    if (avgAccuracy >= 80) return 'hard';
    if (avgAccuracy >= 60) return 'medium';
    return 'easy';
  }

  /**
   * Track improvement over time
   */
  static async trackProgress(studentEmail, topicId) {
    const attempts = await base44.entities.QuizAttempt.filter({
      student_email: studentEmail,
      topic_id: topicId
    });

    if (attempts.length < 2) {
      return { trend: 'insufficient_data', improvement: 0 };
    }

    // Sort by date
    const sorted = attempts.sort((a, b) => 
      new Date(a.completed_at) - new Date(b.completed_at)
    );

    // Compare first half vs second half
    const midPoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midPoint);
    const secondHalf = sorted.slice(midPoint);

    const avgFirst = firstHalf.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / secondHalf.length;

    const improvement = avgSecond - avgFirst;

    return {
      trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
      improvement: Math.round(improvement),
      currentLevel: avgSecond,
      previousLevel: avgFirst
    };
  }
}