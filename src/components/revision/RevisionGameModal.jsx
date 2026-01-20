import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Heart, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * RevisionGameModal - Simple level-based game with revision questions
 * 
 * Game mechanics:
 * - Player navigates through levels collecting stars
 * - When player hits an obstacle, they must answer a revision question
 * - Correct answer: continue playing
 * - Wrong answer: lose a life
 * - 3 lives total, game ends when all lives lost or level complete
 * 
 * Questions come from the uploaded revision content.
 */
export default function RevisionGameModal({ questions, subject, onClose, onComplete }) {
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState('playing'); // playing, question, gameover, victory
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [stars, setStars] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  const GRID_SIZE = 6;

  // Initialize level
  useEffect(() => {
    initLevel();
  }, [level]);

  const initLevel = () => {
    // Generate random stars and obstacles based on level
    const newStars = [];
    const newObstacles = [];
    const starCount = 3 + level;
    const obstacleCount = 2 + level;

    for (let i = 0; i < starCount; i++) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      } while ((pos.x === 1 && pos.y === 1) || newStars.some(s => s.x === pos.x && s.y === pos.y));
      newStars.push(pos);
    }

    for (let i = 0; i < obstacleCount; i++) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      } while (
        (pos.x === 1 && pos.y === 1) || 
        newStars.some(s => s.x === pos.x && s.y === pos.y) ||
        newObstacles.some(o => o.x === pos.x && o.y === pos.y)
      );
      newObstacles.push(pos);
    }

    setStars(newStars);
    setObstacles(newObstacles);
    setPlayerPos({ x: 1, y: 1 });
  };

  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== 'playing') return;

    const newX = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + dx));
    const newY = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + dy));
    
    setPlayerPos({ x: newX, y: newY });

    // Check for star collection
    const starIndex = stars.findIndex(s => s.x === newX && s.y === newY);
    if (starIndex !== -1) {
      setStars(prev => prev.filter((_, i) => i !== starIndex));
      setScore(prev => prev + 10);
      
      // Check if all stars collected
      if (stars.length === 1) {
        if (level < 3) {
          setLevel(prev => prev + 1);
        } else {
          setGameState('victory');
        }
      }
    }

    // Check for obstacle hit
    const hitObstacle = obstacles.some(o => o.x === newX && o.y === newY);
    if (hitObstacle) {
      // Trigger question
      if (questionIndex < questions.length) {
        setCurrentQuestion(questions[questionIndex]);
        setQuestionIndex(prev => prev + 1);
        setGameState('question');
      }
    }
  }, [gameState, playerPos, stars, obstacles, questions, questionIndex, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      switch (e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, gameState]);

  const checkQuestionAnswer = () => {
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim() ||
      (currentQuestion.options && answer === currentQuestion.correct_answer);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setScore(prev => prev + 20);
      // Remove the obstacle that was hit
      setObstacles(prev => prev.filter(o => !(o.x === playerPos.x && o.y === playerPos.y)));
    } else {
      setWrongAnswers(prev => prev + 1);
      const newLives = lives - 1;
      setLives(newLives);
      // Move player back
      setPlayerPos({ x: 1, y: 1 });
      
      if (newLives <= 0) {
        setGameState('gameover');
        return;
      }
    }

    setAnswer('');
    setCurrentQuestion(null);
    setGameState('playing');
  };

  const handleComplete = () => {
    onComplete({
      score,
      level,
      correctAnswers,
      wrongAnswers,
      livesRemaining: lives
    });
  };

  // Render game grid
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isPlayer = playerPos.x === x && playerPos.y === y;
        const isStar = stars.some(s => s.x === x && s.y === y);
        const isObstacle = obstacles.some(o => o.x === x && o.y === y);

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`w-10 h-10 border border-slate-200 flex items-center justify-center text-lg
              ${isPlayer ? 'bg-indigo-500' : ''}
              ${isStar ? 'bg-yellow-100' : ''}
              ${isObstacle ? 'bg-red-100' : ''}
            `}
          >
            {isPlayer && '🧑‍🎓'}
            {isStar && !isPlayer && '⭐'}
            {isObstacle && !isPlayer && '❓'}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">
            {subject} Revision Game - Level {level}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart 
                key={i} 
                className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-300'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold">{score}</span>
          </div>
        </div>

        {/* Game States */}
        {gameState === 'playing' && (
          <>
            {/* Game Grid */}
            <div className="flex justify-center mb-4">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {renderGrid()}
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex flex-col items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => movePlayer(0, -1)}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => movePlayer(-1, 0)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => movePlayer(0, 1)}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => movePlayer(1, 0)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-slate-500 mt-4">
              Collect ⭐ stars and avoid ❓ question blocks. Use arrow keys or buttons to move.
            </p>
          </>
        )}

        {gameState === 'question' && currentQuestion && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="font-medium text-slate-800 mb-1">Answer to continue!</p>
              <p className="text-slate-700">{currentQuestion.question}</p>
            </div>

            {currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswer(opt.id || opt)}
                    className={`w-full p-3 rounded-xl border-2 text-left ${
                      answer === (opt.id || opt) 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt.text || opt}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="Type your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && answer.trim() && checkQuestionAnswer()}
              />
            )}

            <Button 
              onClick={checkQuestionAnswer}
              disabled={!answer.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-600"
            >
              Submit Answer
            </Button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">😢</p>
            <h4 className="text-xl font-bold text-slate-800 mb-2">Game Over!</h4>
            <p className="text-slate-600 mb-4">Final Score: {score}</p>
            <p className="text-sm text-slate-500 mb-6">
              Correct: {correctAnswers} | Wrong: {wrongAnswers}
            </p>
            <Button onClick={handleComplete} className="bg-indigo-500 hover:bg-indigo-600">
              Back to Chat
            </Button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">🎉</p>
            <h4 className="text-xl font-bold text-slate-800 mb-2">You Won!</h4>
            <p className="text-slate-600 mb-4">Final Score: {score}</p>
            <p className="text-sm text-slate-500 mb-6">
              Correct: {correctAnswers} | Wrong: {wrongAnswers}
            </p>
            <Button onClick={handleComplete} className="bg-indigo-500 hover:bg-indigo-600">
              Back to Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}