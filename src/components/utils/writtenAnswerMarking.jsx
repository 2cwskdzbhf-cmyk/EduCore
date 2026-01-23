// Utility for marking written answer questions with fuzzy keyword matching

const preprocessText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove punctuation
};

const calculateSimilarity = (str1, str2) => {
  // Levenshtein distance for fuzzy matching
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  
  const distance = costs[shorter.length];
  return (longer.length - distance) / longer.length;
};

const matchKeyword = (studentAnswer, keyword, threshold = 0.75) => {
  const processedAnswer = preprocessText(studentAnswer);
  const processedKeyword = preprocessText(keyword);
  
  if (!processedAnswer || !processedKeyword) return false;
  
  // Exact substring match (either direction)
  if (processedAnswer.includes(processedKeyword) || processedKeyword.includes(processedAnswer)) {
    return true;
  }
  
  // Split into words for partial matching
  const answerWords = processedAnswer.split(' ');
  const keywordWords = processedKeyword.split(' ');
  
  // Check if all keyword words are found in answer
  const allWordsMatch = keywordWords.every(kw => 
    answerWords.some(aw => {
      // Exact word match
      if (aw === kw) return true;
      // Fuzzy word match
      if (calculateSimilarity(aw, kw) >= threshold) return true;
      return false;
    })
  );
  
  if (allWordsMatch) return true;
  
  // Fuzzy match on full phrases
  if (calculateSimilarity(processedAnswer, processedKeyword) >= threshold) {
    return true;
  }
  
  return false;
};

export const markWrittenAnswer = (studentAnswer, answerKeywords, threshold = 0.75) => {
  if (!studentAnswer || !answerKeywords || answerKeywords.length === 0) {
    return {
      isCorrect: false,
      matchedKeywords: []
    };
  }
  
  const matchedKeywords = [];
  
  for (const keyword of answerKeywords) {
    if (matchKeyword(studentAnswer, keyword, threshold)) {
      matchedKeywords.push(keyword);
    }
  }
  
  return {
    isCorrect: matchedKeywords.length > 0,
    matchedKeywords
  };
};

export const markWrittenWorking = (studentWorking, workingKeywords, requireAll = true, threshold = 0.75) => {
  if (!studentWorking || !workingKeywords || workingKeywords.length === 0) {
    return {
      isValid: false,
      matchedKeywords: []
    };
  }
  
  const matchedKeywords = [];
  
  for (const keyword of workingKeywords) {
    if (matchKeyword(studentWorking, keyword, threshold)) {
      matchedKeywords.push(keyword);
    }
  }
  
  const isValid = requireAll 
    ? matchedKeywords.length === workingKeywords.length
    : matchedKeywords.length > 0;
  
  return {
    isValid,
    matchedKeywords,
    requiredCount: workingKeywords.length,
    matchedCount: matchedKeywords.length
  };
};

export const calculateWrittenQuestionScore = (answerResult, workingResult, requireWorking = false) => {
  if (!requireWorking) {
    return answerResult.isCorrect ? 1 : 0;
  }
  
  // If working is required, both must be correct
  if (answerResult.isCorrect && workingResult.isValid) {
    return 1;
  }
  
  // Optional: partial credit
  // if (answerResult.isCorrect) return 0.5;
  // if (workingResult.isValid) return 0.25;
  
  return 0;
};