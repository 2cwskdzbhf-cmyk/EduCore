import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';

/**
 * FlashcardModal - Displays flashcards in a modal overlay
 * 
 * Flashcards are generated from uploaded content by the AI.
 * Each flashcard has a front (term/question) and back (definition/answer).
 * Student clicks to flip, uses arrows to navigate.
 * Clicking outside the modal returns to chat.
 */
export default function FlashcardModal({ flashcards, onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCards, setCompletedCards] = useState(new Set());

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    // Mark current card as seen
    setCompletedCards(prev => new Set([...prev, currentIndex]));
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All cards reviewed
      onComplete(completedCards.size + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-800">
            Flashcards ({currentIndex + 1}/{flashcards.length})
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full mb-6">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div 
          className="min-h-[250px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 flex items-center justify-center cursor-pointer border-2 border-indigo-100 hover:border-indigo-300 transition-colors"
          onClick={handleFlip}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
              {isFlipped ? 'Answer' : 'Question'} - Click to flip
            </p>
            <p className="text-xl font-medium text-slate-800">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>
        </div>

        {/* Flip hint */}
        <div className="flex justify-center mt-4">
          <Button variant="ghost" size="sm" onClick={handleFlip}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Flip Card
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-slate-500">
            {completedCards.size} reviewed
          </span>

          <Button 
            onClick={handleNext}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            {currentIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}