import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Deterministic question generators for maths topics
class QuestionGenerator {
  // Seeded random for reproducibility
  static seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  static generateFractionsQuestions(lessonId, topicId, seed = 1) {
    const questions = [];
    const types = ['simplify', 'add', 'subtract', 'multiply', 'divide', 'compare', 'equivalent'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'simplify') {
        const nums = [[6, 8], [10, 15], [12, 18], [9, 12], [15, 25], [20, 30]];
        const [num, den] = nums[Math.floor(rand * nums.length)];
        const gcd = QuestionGenerator.gcd(num, den);
        question = {
          prompt: `Simplify the fraction ${num}/${den}`,
          correct_answer: `${num / gcd}/${den / gcd}`,
          allowed_forms: ['fraction'],
          type: 'fraction',
          explanation: `Divide both numerator and denominator by ${gcd}: ${num}/${den} = ${num / gcd}/${den / gcd}`
        };
      } else if (type === 'add') {
        const pairs = [[1, 2], [1, 3], [2, 5], [3, 4]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const num = a + b;
        const den = a === b ? a : a * b;
        question = {
          prompt: `Add the fractions: 1/${a} + 1/${b}`,
          correct_answer: `${num}/${den}`,
          allowed_forms: ['fraction', 'decimal'],
          type: 'fraction',
          explanation: `Common denominator is ${den}. 1/${a} + 1/${b} = ${num}/${den}`
        };
      } else if (type === 'subtract') {
        const pairs = [[3, 4], [5, 6], [7, 8], [2, 3]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        question = {
          prompt: `Subtract: ${a}/${b} - 1/4`,
          correct_answer: `${(a * 4 - b) / (b * 4)}`,
          allowed_forms: ['fraction', 'decimal'],
          type: 'fraction',
          explanation: `Convert to common denominator: ${a}/${b} - 1/4 = ${a * 4}/${b * 4} - ${b}/${b * 4} = ${a * 4 - b}/${b * 4}`
        };
      } else if (type === 'multiply') {
        const pairs = [[1, 2], [2, 3], [3, 5], [1, 4]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const pairs2 = [[2, 3], [3, 4], [1, 2], [2, 5]];
        const [c, d] = pairs2[Math.floor((rand + 0.5) * pairs2.length)];
        const numRes = a * c;
        const denRes = b * d;
        const gcd = QuestionGenerator.gcd(numRes, denRes);
        question = {
          prompt: `Multiply: ${a}/${b} × ${c}/${d}`,
          correct_answer: `${numRes / gcd}/${denRes / gcd}`,
          allowed_forms: ['fraction'],
          type: 'fraction',
          explanation: `Multiply numerators and denominators: ${a}/${b} × ${c}/${d} = ${numRes}/${denRes} = ${numRes / gcd}/${denRes / gcd}`
        };
      } else if (type === 'divide') {
        const pairs = [[1, 2], [2, 3], [3, 4]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const pairs2 = [[1, 3], [2, 5], [1, 4]];
        const [c, d] = pairs2[Math.floor((rand + 0.3) * pairs2.length)];
        const numRes = a * d;
        const denRes = b * c;
        const gcd = QuestionGenerator.gcd(numRes, denRes);
        question = {
          prompt: `Divide: ${a}/${b} ÷ ${c}/${d}`,
          correct_answer: `${numRes / gcd}/${denRes / gcd}`,
          allowed_forms: ['fraction'],
          type: 'fraction',
          explanation: `Divide by multiplying by reciprocal: ${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${numRes / gcd}/${denRes / gcd}`
        };
      } else if (type === 'compare') {
        const fracs = [[1, 2], [2, 3], [3, 4], [1, 3]];
        const [a, b] = fracs[Math.floor(rand * fracs.length)];
        const [c, d] = fracs[Math.floor((rand + 0.2) * fracs.length)];
        const aVal = a / b;
        const cVal = c / d;
        const greater = aVal > cVal ? `${a}/${b}` : `${c}/${d}`;
        question = {
          prompt: `Which is larger: ${a}/${b} or ${c}/${d}?`,
          correct_answer: greater,
          allowed_forms: ['fraction'],
          type: 'fraction',
          explanation: `${a}/${b} = ${aVal.toFixed(2)}, ${c}/${d} = ${cVal.toFixed(2)}. ${greater} is larger.`
        };
      } else if (type === 'equivalent') {
        const base = [[1, 2], [2, 3], [3, 4]];
        const [num, den] = base[Math.floor(rand * base.length)];
        const mult = Math.floor(rand * 4) + 2;
        question = {
          prompt: `${num}/${den} = ?/${den * mult}`,
          correct_answer: `${num * mult}`,
          allowed_forms: ['integer'],
          type: 'fraction',
          explanation: `Multiply numerator by ${mult}: ${num}/${den} = ${num * mult}/${den * mult}`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['fractions', type];
      questions.push(question);
    }
    return questions;
  }

  static generateDecimalsQuestions(lessonId, topicId, seed = 2) {
    const questions = [];
    const types = ['round', 'add', 'subtract', 'multiply', 'divide', 'compare', 'place_value'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'round') {
        const values = [3.456, 7.832, 2.671, 9.145, 5.739];
        const val = values[Math.floor(rand * values.length)];
        const dp = Math.floor(rand * 2) + 1;
        const rounded = parseFloat(val.toFixed(dp));
        question = {
          prompt: `Round ${val} to ${dp} decimal place${dp > 1 ? 's' : ''}`,
          correct_answer: `${rounded}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${val} rounded to ${dp} dp is ${rounded}`
        };
      } else if (type === 'add') {
        const pairs = [[1.5, 2.3], [3.2, 1.8], [4.7, 2.1]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const result = (a + b).toFixed(1);
        question = {
          prompt: `Add: ${a} + ${b}`,
          correct_answer: `${result}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${a} + ${b} = ${result}`
        };
      } else if (type === 'subtract') {
        const pairs = [[5.7, 2.3], [8.4, 3.2], [6.9, 1.5]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const result = (a - b).toFixed(1);
        question = {
          prompt: `Subtract: ${a} - ${b}`,
          correct_answer: `${result}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${a} - ${b} = ${result}`
        };
      } else if (type === 'multiply') {
        const pairs = [[2.5, 4], [3.2, 2], [1.5, 6]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const result = (a * b).toFixed(1);
        question = {
          prompt: `Multiply: ${a} × ${b}`,
          correct_answer: `${result}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${a} × ${b} = ${result}`
        };
      } else if (type === 'divide') {
        const pairs = [[6.4, 2], [9.6, 3], [7.5, 2.5]];
        const [a, b] = pairs[Math.floor(rand * pairs.length)];
        const result = (a / b).toFixed(1);
        question = {
          prompt: `Divide: ${a} ÷ ${b}`,
          correct_answer: `${result}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${a} ÷ ${b} = ${result}`
        };
      } else if (type === 'compare') {
        const values = [[0.5, 0.6], [0.75, 0.7], [0.33, 0.3]];
        const [a, b] = values[Math.floor(rand * values.length)];
        question = {
          prompt: `Which is larger: ${a} or ${b}?`,
          correct_answer: `${Math.max(a, b)}`,
          allowed_forms: ['decimal'],
          type: 'decimal',
          explanation: `${a} = ${a}, ${b} = ${b}. ${Math.max(a, b)} is larger.`
        };
      } else if (type === 'place_value') {
        const nums = [3.456, 7.821, 2.594];
        const num = nums[Math.floor(rand * nums.length)];
        const places = ['tenths', 'hundredths', 'thousandths'];
        const placeIdx = Math.floor(rand * places.length);
        const digits = num.toString().split('.')[1].split('');
        const digit = digits[placeIdx];
        question = {
          prompt: `What digit is in the ${places[placeIdx]} place in ${num}?`,
          correct_answer: `${digit}`,
          allowed_forms: ['integer'],
          type: 'decimal',
          explanation: `In ${num}, the ${places[placeIdx]} digit is ${digit}`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['decimals', type];
      questions.push(question);
    }
    return questions;
  }

  static generatePercentagesQuestions(lessonId, topicId, seed = 3) {
    const questions = [];
    const types = ['percent_of', 'fraction_to_percent', 'percent_to_fraction', 'increase', 'decrease', 'compare'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'percent_of') {
        const values = [[25, 100], [50, 200], [10, 50], [20, 80]];
        const [pct, total] = values[Math.floor(rand * values.length)];
        const result = (pct / 100) * total;
        question = {
          prompt: `What is ${pct}% of ${total}?`,
          correct_answer: `${result}`,
          allowed_forms: ['integer', 'decimal'],
          type: 'percentage',
          explanation: `${pct}% of ${total} = ${pct}/100 × ${total} = ${result}`
        };
      } else if (type === 'fraction_to_percent') {
        const fracs = [[1, 2], [1, 4], [3, 4], [1, 5]];
        const [num, den] = fracs[Math.floor(rand * fracs.length)];
        const pct = (num / den) * 100;
        question = {
          prompt: `Convert ${num}/${den} to a percentage`,
          correct_answer: `${pct}`,
          allowed_forms: ['integer', 'decimal'],
          type: 'percentage',
          explanation: `${num}/${den} = ${num / den} = ${pct}%`
        };
      } else if (type === 'percent_to_fraction') {
        const percents = [50, 25, 75, 20];
        const pct = percents[Math.floor(rand * percents.length)];
        const gcd = QuestionGenerator.gcd(pct, 100);
        question = {
          prompt: `Convert ${pct}% to a fraction in lowest terms`,
          correct_answer: `${pct / gcd}/${100 / gcd}`,
          allowed_forms: ['fraction'],
          type: 'percentage',
          explanation: `${pct}% = ${pct}/100 = ${pct / gcd}/${100 / gcd}`
        };
      } else if (type === 'increase') {
        const bases = [100, 80, 60, 50];
        const base = bases[Math.floor(rand * bases.length)];
        const pctInc = Math.floor(rand * 3) * 10 + 10; // 10, 20, or 30
        const result = base + (base * pctInc / 100);
        question = {
          prompt: `Increase ${base} by ${pctInc}%`,
          correct_answer: `${result}`,
          allowed_forms: ['integer', 'decimal'],
          type: 'percentage',
          explanation: `${base} + (${base} × ${pctInc}%) = ${base} + ${base * pctInc / 100} = ${result}`
        };
      } else if (type === 'decrease') {
        const bases = [100, 80, 60, 50];
        const base = bases[Math.floor(rand * bases.length)];
        const pctDec = Math.floor(rand * 3) * 10 + 10; // 10, 20, or 30
        const result = base - (base * pctDec / 100);
        question = {
          prompt: `Decrease ${base} by ${pctDec}%`,
          correct_answer: `${result}`,
          allowed_forms: ['integer', 'decimal'],
          type: 'percentage',
          explanation: `${base} - (${base} × ${pctDec}%) = ${base} - ${base * pctDec / 100} = ${result}`
        };
      } else if (type === 'compare') {
        const values = [[50, 45], [30, 25], [80, 75]];
        const [a, b] = values[Math.floor(rand * values.length)];
        question = {
          prompt: `Which is larger: ${a}% or ${b}%?`,
          correct_answer: `${Math.max(a, b)}%`,
          allowed_forms: ['percentage'],
          type: 'percentage',
          explanation: `${Math.max(a, b)}% is larger than ${Math.min(a, b)}%`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['percentages', type];
      questions.push(question);
    }
    return questions;
  }

  static generateRatioQuestions(lessonId, topicId, seed = 4) {
    const questions = [];
    const types = ['simplify', 'scale', 'share', 'compare'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'simplify') {
        const ratios = [[6, 8], [10, 15], [4, 6], [12, 18]];
        const [a, b] = ratios[Math.floor(rand * ratios.length)];
        const gcd = QuestionGenerator.gcd(a, b);
        question = {
          prompt: `Simplify the ratio ${a}:${b}`,
          correct_answer: `${a / gcd}:${b / gcd}`,
          allowed_forms: ['ratio'],
          type: 'ratio',
          explanation: `Divide both by ${gcd}: ${a}:${b} = ${a / gcd}:${b / gcd}`
        };
      } else if (type === 'scale') {
        const bases = [[2, 3], [3, 4], [1, 5]];
        const [a, b] = bases[Math.floor(rand * bases.length)];
        const scale = Math.floor(rand * 3) + 2;
        question = {
          prompt: `If the ratio is ${a}:${b}, what is it when scaled by ${scale}?`,
          correct_answer: `${a * scale}:${b * scale}`,
          allowed_forms: ['ratio'],
          type: 'ratio',
          explanation: `Multiply both parts by ${scale}: ${a}:${b} = ${a * scale}:${b * scale}`
        };
      } else if (type === 'share') {
        const total = 100;
        const ratios = [[1, 1], [2, 1], [3, 2]];
        const [a, b] = ratios[Math.floor(rand * ratios.length)];
        const sumParts = a + b;
        const share1 = (a / sumParts) * total;
        const share2 = (b / sumParts) * total;
        question = {
          prompt: `Share ${total} in the ratio ${a}:${b}. What is the first share?`,
          correct_answer: `${share1}`,
          allowed_forms: ['integer', 'decimal'],
          type: 'ratio',
          explanation: `First share = ${a}/${sumParts} × ${total} = ${share1}`
        };
      } else if (type === 'compare') {
        const pairs = [['2:3', 3, 2], ['1:2', 4, 2], ['3:4', 6, 4]];
        const [ratioStr, num1, num2] = pairs[Math.floor(rand * pairs.length)];
        question = {
          prompt: `Is the ratio ${num1}:${num2} equivalent to ${ratioStr}?`,
          correct_answer: `Yes`,
          allowed_forms: ['text'],
          type: 'ratio',
          explanation: `${num1}:${num2} simplified = ${ratioStr} ✓`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['ratio', type];
      questions.push(question);
    }
    return questions;
  }

  static generateAlgebraQuestions(lessonId, topicId, seed = 5) {
    const questions = [];
    const types = ['solve_linear', 'substitute', 'expand', 'simplify'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'solve_linear') {
        const values = [[2, 10], [3, 15], [5, 25], [4, 12]];
        const [coeff, result] = values[Math.floor(rand * values.length)];
        const xVal = result / coeff;
        question = {
          prompt: `Solve: ${coeff}x = ${result}`,
          correct_answer: `${xVal}`,
          allowed_forms: ['integer', 'fraction', 'decimal'],
          type: 'algebra',
          explanation: `x = ${result}/${coeff} = ${xVal}`
        };
      } else if (type === 'substitute') {
        const xVals = [2, 3, 4, 5];
        const x = xVals[Math.floor(rand * xVals.length)];
        const a = Math.floor(rand * 3) + 1;
        const b = Math.floor(rand * 5) + 1;
        const result = a * x + b;
        question = {
          prompt: `If x = ${x}, find ${a}x + ${b}`,
          correct_answer: `${result}`,
          allowed_forms: ['integer'],
          type: 'algebra',
          explanation: `${a}(${x}) + ${b} = ${a * x} + ${b} = ${result}`
        };
      } else if (type === 'expand') {
        const pairs = [[2, 5], [3, 4], [2, 3]];
        const [coeff, x] = pairs[Math.floor(rand * pairs.length)];
        const const1 = Math.floor(rand * 4) + 1;
        const expanded = `${coeff}x + ${coeff * const1}`;
        question = {
          prompt: `Expand: ${coeff}(x + ${const1})`,
          correct_answer: expanded,
          allowed_forms: ['expression'],
          type: 'algebra',
          explanation: `${coeff}(x + ${const1}) = ${coeff}x + ${coeff * const1}`
        };
      } else if (type === 'simplify') {
        const terms = [[3, 2, 5], [4, 1, 5], [2, 3, 5]];
        const [a, b, c] = terms[Math.floor(rand * terms.length)];
        const simplified = a + b;
        question = {
          prompt: `Simplify: ${a}x + ${b}x - ${c}x`,
          correct_answer: `${simplified - c}x`,
          allowed_forms: ['expression'],
          type: 'algebra',
          explanation: `(${a} + ${b} - ${c})x = ${simplified - c}x`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['algebra', type];
      questions.push(question);
    }
    return questions;
  }

  static generateIndicesQuestions(lessonId, topicId, seed = 6) {
    const questions = [];
    const types = ['powers', 'roots', 'zero_power', 'multiply_powers'];
    const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];

    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const rand = QuestionGenerator.seededRandom(seed + i);

      let question = {};

      if (type === 'powers') {
        const bases = [2, 3, 4, 5, 10];
        const base = bases[Math.floor(rand * bases.length)];
        const exp = Math.floor(rand * 3) + 2; // 2, 3, or 4
        const result = Math.pow(base, exp);
        question = {
          prompt: `Calculate: ${base}^${exp}`,
          correct_answer: `${result}`,
          allowed_forms: ['integer'],
          type: 'indices',
          explanation: `${base}^${exp} = ${base} × ${base}${exp > 2 ? ` × ${base}`.repeat(exp - 2) : ''} = ${result}`
        };
      } else if (type === 'roots') {
        const pairs = [[4, 2], [9, 3], [16, 4], [25, 5], [100, 10]];
        const [num, root] = pairs[Math.floor(rand * pairs.length)];
        question = {
          prompt: `Calculate: √${num}`,
          correct_answer: `${root}`,
          allowed_forms: ['integer'],
          type: 'indices',
          explanation: `√${num} = ${root} (because ${root}² = ${num})`
        };
      } else if (type === 'zero_power') {
        const bases = [2, 3, 5, 7];
        const base = bases[Math.floor(rand * bases.length)];
        question = {
          prompt: `Calculate: ${base}^0`,
          correct_answer: `1`,
          allowed_forms: ['integer'],
          type: 'indices',
          explanation: `Any number to the power of 0 equals 1. ${base}^0 = 1`
        };
      } else if (type === 'multiply_powers') {
        const bases = [2, 3, 4];
        const base = bases[Math.floor(rand * bases.length)];
        const exp1 = Math.floor(rand * 2) + 2;
        const exp2 = Math.floor(rand * 2) + 1;
        const result = exp1 + exp2;
        question = {
          prompt: `Simplify: ${base}^${exp1} × ${base}^${exp2}`,
          correct_answer: `${base}^${result}`,
          allowed_forms: ['expression'],
          type: 'indices',
          explanation: `When multiplying powers with the same base, add exponents: ${base}^${exp1} × ${base}^${exp2} = ${base}^${result}`
        };
      }

      question.difficulty = difficulty;
      question.tags = ['indices', type];
      questions.push(question);
    }
    return questions;
  }

  static gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (!user || (user.role !== 'admin' && user.user_type !== 'admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all lessons
    let allLessons = await base44.entities.Lesson.list();
    if (!allLessons) allLessons = [];
    
    if (allLessons.length === 0) {
      return Response.json({ 
        success: true,
        error: 'No lessons found',
        totalLessons: 0,
        totalQuestionsCreated: 0,
        lessonStats: []
      }, { status: 200 });
    }

    // Get all topics for mapping
    let allTopics = await base44.entities.Topic.list();
    if (!allTopics) allTopics = [];
    
    const topicMap = {};
    allTopics.forEach(t => topicMap[t.id] = t);

    let totalCreated = 0;
    const lessonStats = [];

    // Seed questions for each lesson
    for (const lesson of (allLessons || [])) {
      if (!lesson.topic_id) continue;

      const topicName = topicMap[lesson.topic_id]?.name || '';
      let generator;

      // Pick generator based on topic name
      if (topicName.toLowerCase().includes('fraction')) {
        generator = QuestionGenerator.generateFractionsQuestions;
      } else if (topicName.toLowerCase().includes('decimal')) {
        generator = QuestionGenerator.generateDecimalsQuestions;
      } else if (topicName.toLowerCase().includes('percent')) {
        generator = QuestionGenerator.generatePercentagesQuestions;
      } else if (topicName.toLowerCase().includes('ratio')) {
        generator = QuestionGenerator.generateRatioQuestions;
      } else if (topicName.toLowerCase().includes('algebra')) {
        generator = QuestionGenerator.generateAlgebraQuestions;
      } else if (topicName.toLowerCase().includes('indice')) {
        generator = QuestionGenerator.generateIndicesQuestions;
      } else {
        // Default to fractions
        generator = QuestionGenerator.generateFractionsQuestions;
      }

      // Generate questions
      const questions = generator.call(QuestionGenerator, lesson.id, lesson.topic_id, lesson.id.charCodeAt(0));

      // Create each question
      if (!questions || !Array.isArray(questions)) {
        console.warn(`Generator returned invalid questions for lesson ${lesson.id}`);
        continue;
      }

      for (const q of questions) {
        await base44.entities.QuestionBankItem.create({
          subject_id: topicMap[lesson.topic_id]?.subject_id,
          topic_id: lesson.topic_id,
          lesson_id: lesson.id,
          type: q.type,
          prompt: q.prompt,
          correct_answer: q.correct_answer,
          allowed_forms: q.allowed_forms,
          difficulty: q.difficulty,
          tags: q.tags,
          explanation: q.explanation,
          teacher_email: user.email,
          is_active: true
        });
      }

      totalCreated += questions.length;
      lessonStats.push({
        lessonId: lesson.id,
        lessonName: lesson.title,
        topicName,
        questionCount: questions.length
      });
    }

    return Response.json({
      success: true,
      totalLessons: allLessons.length,
      totalQuestionsCreated: totalCreated,
      lessonStats
    });
  } catch (error) {
    console.error('Seed error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});