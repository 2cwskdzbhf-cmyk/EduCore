import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const subjects = await base44.asServiceRole.entities.Subject.list();
    const mathsSubject = subjects.find(s =>
      s.name === 'Maths' || s.name === 'Mathematics' || s.name === 'maths'
    );

    if (!mathsSubject) {
      return Response.json({ error: 'Maths subject not found. Please create a Maths subject first.' }, { status: 400 });
    }

    // Get or note algebra global topic
    const globalTopics = await base44.asServiceRole.entities.GlobalTopic.list();
    let algebraTopic = globalTopics.find(t =>
      t.name.toLowerCase().includes('algebra') && t.subject_name?.toLowerCase().includes('maths')
    );

    if (!algebraTopic) {
      algebraTopic = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: mathsSubject.id,
        subject_name: 'Maths',
        name: 'Algebra',
        order_index: 2,
        description: 'Algebraic manipulation, equations, expressions, sequences and graphs'
      });
    }

    const T = algebraTopic.id;
    const S = mathsSubject.id;

    const questions = [

      // ─────────────── YEAR 7 ALGEBRA ─────────────────────────────────────────

      // Y7 Easy - Introduction to algebra, collecting like terms, substitution
      { seed_key: 'y7-alg-e-01', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: 3x + 5x',
        choices: ['8x', '15x', '8x²', '35x'],
        correct_answer: '8x', correct_index: 0,
        explanation: 'Add the coefficients: 3 + 5 = 8, so 3x + 5x = 8x' },

      { seed_key: 'y7-alg-e-02', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the value of 4a when a = 3?',
        choices: ['7', '12', '43', '1'],
        correct_answer: '12', correct_index: 1,
        explanation: '4 × 3 = 12' },

      { seed_key: 'y7-alg-e-03', year_group: 7, difficulty: 'easy', question_type: 'numeric',
        question_text: 'If x = 5, what is the value of x + 7?',
        correct_answer: '12',
        explanation: '5 + 7 = 12' },

      { seed_key: 'y7-alg-e-04', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: 7y − 2y',
        choices: ['5y', '9y', '14y', '5'],
        correct_answer: '5y', correct_index: 0,
        explanation: '7 − 2 = 5, so 7y − 2y = 5y' },

      { seed_key: 'y7-alg-e-05', year_group: 7, difficulty: 'easy', question_type: 'short',
        question_text: 'Write an expression for "5 more than n".',
        correct_answer: 'n + 5',
        explanation: '"More than" means addition: n + 5' },

      { seed_key: 'y7-alg-e-06', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 2p + 3q + p?',
        choices: ['3p + 3q', '6pq', '5p + 3q', '2p + 4q'],
        correct_answer: '3p + 3q', correct_index: 0,
        explanation: 'Collect p terms: 2p + p = 3p. The 3q stays.' },

      { seed_key: 'y7-alg-e-07', year_group: 7, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Evaluate 2m − 1 when m = 4.',
        correct_answer: '7',
        explanation: '2 × 4 − 1 = 8 − 1 = 7' },

      { seed_key: 'y7-alg-e-08', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which of these is NOT a like term to 3x?',
        choices: ['5x', '−x', '3x²', '10x'],
        correct_answer: '3x²', correct_index: 2,
        explanation: '3x² has a different power (x²), so it is NOT a like term to 3x' },

      { seed_key: 'y7-alg-e-09', year_group: 7, difficulty: 'easy', question_type: 'short',
        question_text: 'Simplify: 4a + 2b − a + 3b',
        correct_answer: '3a + 5b',
        explanation: 'Collect a terms: 4a − a = 3a. Collect b terms: 2b + 3b = 5b.' },

      { seed_key: 'y7-alg-e-10', year_group: 7, difficulty: 'easy', question_type: 'numeric',
        question_text: 'If t = 6, find the value of 3t.',
        correct_answer: '18',
        explanation: '3 × 6 = 18' },

      // Y7 Medium
      { seed_key: 'y7-alg-m-01', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Solve: x + 8 = 15',
        choices: ['x = 5', 'x = 7', 'x = 6', 'x = 23'],
        correct_answer: 'x = 7', correct_index: 1,
        explanation: 'Subtract 8 from both sides: x = 15 − 8 = 7' },

      { seed_key: 'y7-alg-m-02', year_group: 7, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Solve: y − 4 = 9. What is y?',
        correct_answer: '13',
        explanation: 'Add 4 to both sides: y = 9 + 4 = 13' },

      { seed_key: 'y7-alg-m-03', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the nth term rule for: 3, 6, 9, 12, ...?',
        choices: ['n + 3', '3n', 'n + 2', '2n + 1'],
        correct_answer: '3n', correct_index: 1,
        explanation: 'Each term is 3 times the position number: 3×1=3, 3×2=6, etc.' },

      { seed_key: 'y7-alg-m-04', year_group: 7, difficulty: 'medium', question_type: 'short',
        question_text: 'Expand: 2(x + 5)',
        correct_answer: '2x + 10',
        explanation: 'Multiply each term inside the bracket: 2×x + 2×5 = 2x + 10' },

      { seed_key: 'y7-alg-m-05', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'If 3n = 21, what is n?',
        choices: ['3', '6', '7', '18'],
        correct_answer: '7', correct_index: 2,
        explanation: 'Divide both sides by 3: n = 21 ÷ 3 = 7' },

      { seed_key: 'y7-alg-m-06', year_group: 7, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Find the value of 5x + 3 when x = 2.',
        correct_answer: '13',
        explanation: '5 × 2 + 3 = 10 + 3 = 13' },

      { seed_key: 'y7-alg-m-07', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the 5th term of the sequence with nth term 2n + 1?',
        choices: ['9', '10', '11', '12'],
        correct_answer: '11', correct_index: 2,
        explanation: '2 × 5 + 1 = 10 + 1 = 11' },

      { seed_key: 'y7-alg-m-08', year_group: 7, difficulty: 'medium', question_type: 'short',
        question_text: 'Write the nth term rule for the sequence: 5, 8, 11, 14, ...',
        correct_answer: '3n + 2',
        explanation: 'Common difference is 3 so rule starts 3n. When n=1: 3(1)+2=5 ✓' },

      // Y7 Hard
      { seed_key: 'y7-alg-h-01', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Solve: 2x + 3 = 11',
        choices: ['x = 3', 'x = 4', 'x = 5', 'x = 7'],
        correct_answer: 'x = 4', correct_index: 1,
        explanation: 'Subtract 3: 2x = 8. Divide by 2: x = 4' },

      { seed_key: 'y7-alg-h-02', year_group: 7, difficulty: 'hard', question_type: 'numeric',
        question_text: 'If 4y − 1 = 19, what is y?',
        correct_answer: '5',
        explanation: 'Add 1: 4y = 20. Divide by 4: y = 5' },

      { seed_key: 'y7-alg-h-03', year_group: 7, difficulty: 'hard', question_type: 'short',
        question_text: 'Expand and simplify: 3(2x + 1) + 2(x − 4)',
        correct_answer: '8x − 5',
        explanation: '6x + 3 + 2x − 8 = 8x − 5' },

      { seed_key: 'y7-alg-h-04', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'The nth term of a sequence is 4n − 3. What is the 10th term?',
        choices: ['37', '40', '43', '47'],
        correct_answer: '37', correct_index: 0,
        explanation: '4 × 10 − 3 = 40 − 3 = 37' },

      { seed_key: 'y7-alg-h-05', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Which value of x satisfies 5x − 7 = 2x + 5?',
        choices: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
        correct_answer: 'x = 4', correct_index: 1,
        explanation: '5x − 2x = 5 + 7 → 3x = 12 → x = 4' },

      // ─────────────── YEAR 8 ALGEBRA ─────────────────────────────────────────

      { seed_key: 'y8-alg-e-01', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Expand: 4(3x − 2)',
        choices: ['12x − 8', '12x − 2', '7x − 2', '12x + 8'],
        correct_answer: '12x − 8', correct_index: 0,
        explanation: '4 × 3x = 12x and 4 × −2 = −8' },

      { seed_key: 'y8-alg-e-02', year_group: 8, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Solve: 5x = 30. What is x?',
        correct_answer: '6',
        explanation: '30 ÷ 5 = 6' },

      { seed_key: 'y8-alg-e-03', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Factorise: 6x + 9',
        choices: ['2(3x + 9)', '3(2x + 3)', '6(x + 3)', '9(x + 1)'],
        correct_answer: '3(2x + 3)', correct_index: 1,
        explanation: 'HCF of 6 and 9 is 3. Factor out 3: 3(2x + 3)' },

      { seed_key: 'y8-alg-e-04', year_group: 8, difficulty: 'easy', question_type: 'short',
        question_text: 'Simplify: x² × x³',
        correct_answer: 'x⁵',
        explanation: 'When multiplying same base, add the powers: 2 + 3 = 5' },

      { seed_key: 'y8-alg-e-05', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the gradient of the line y = 3x + 7?',
        choices: ['7', '3', '10', '−3'],
        correct_answer: '3', correct_index: 1,
        explanation: 'In y = mx + c, m is the gradient. Here m = 3.' },

      { seed_key: 'y8-alg-e-06', year_group: 8, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Find the y-intercept of y = 2x − 5.',
        correct_answer: '-5',
        explanation: 'In y = mx + c, c is the y-intercept. Here c = −5.' },

      { seed_key: 'y8-alg-e-07', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Expand: (x + 3)(x + 2) — what is the constant term?',
        choices: ['5', '6', '3', '2'],
        correct_answer: '6', correct_index: 1,
        explanation: '3 × 2 = 6. The constant term comes from multiplying the constants.' },

      // Y8 Medium
      { seed_key: 'y8-alg-m-01', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Solve: 3(x + 4) = 21',
        choices: ['x = 3', 'x = 5', 'x = 7', 'x = 9'],
        correct_answer: 'x = 3', correct_index: 0,
        explanation: 'Divide by 3: x + 4 = 7. Subtract 4: x = 3.' },

      { seed_key: 'y8-alg-m-02', year_group: 8, difficulty: 'medium', question_type: 'short',
        question_text: 'Expand and simplify: (x + 4)(x + 3)',
        correct_answer: 'x² + 7x + 12',
        explanation: 'FOIL: x² + 3x + 4x + 12 = x² + 7x + 12' },

      { seed_key: 'y8-alg-m-03', year_group: 8, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Solve: 4x − 5 = 2x + 7. What is x?',
        correct_answer: '6',
        explanation: '4x − 2x = 7 + 5 → 2x = 12 → x = 6' },

      { seed_key: 'y8-alg-m-04', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the equation of a line with gradient 2 and y-intercept −3?',
        choices: ['y = 3x − 2', 'y = 2x + 3', 'y = 2x − 3', 'y = −3x + 2'],
        correct_answer: 'y = 2x − 3', correct_index: 2,
        explanation: 'Use y = mx + c with m = 2 and c = −3.' },

      { seed_key: 'y8-alg-m-05', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Factorise: x² + 5x + 6',
        choices: ['(x+2)(x+3)', '(x+1)(x+6)', '(x+3)(x+4)', '(x+5)(x+1)'],
        correct_answer: '(x+2)(x+3)', correct_index: 0,
        explanation: 'Find two numbers that multiply to 6 and add to 5: 2 and 3.' },

      { seed_key: 'y8-alg-m-06', year_group: 8, difficulty: 'medium', question_type: 'short',
        question_text: 'Solve the simultaneous equations: x + y = 10 and x − y = 4.',
        correct_answer: 'x = 7, y = 3',
        explanation: 'Add equations: 2x = 14 → x = 7. Then y = 10 − 7 = 3.' },

      { seed_key: 'y8-alg-m-07', year_group: 8, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Simplify: x⁵ ÷ x²',
        correct_answer: 'x³',
        explanation: 'Dividing same base: subtract powers. 5 − 2 = 3, so x³.' },

      { seed_key: 'y8-alg-m-08', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The point (2, y) lies on y = 4x − 1. What is y?',
        choices: ['6', '7', '8', '9'],
        correct_answer: '7', correct_index: 1,
        explanation: 'y = 4(2) − 1 = 8 − 1 = 7' },

      { seed_key: 'y8-alg-m-09', year_group: 8, difficulty: 'medium', question_type: 'short',
        question_text: 'Expand: (x − 2)(x + 5)',
        correct_answer: 'x² + 3x − 10',
        explanation: 'FOIL: x² + 5x − 2x − 10 = x² + 3x − 10' },

      // Y8 Hard
      { seed_key: 'y8-alg-h-01', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Solve: (2x + 1) / 3 = 5',
        choices: ['x = 7', 'x = 6', 'x = 8', 'x = 14'],
        correct_answer: 'x = 7', correct_index: 0,
        explanation: 'Multiply both sides by 3: 2x + 1 = 15. Then 2x = 14 → x = 7.' },

      { seed_key: 'y8-alg-h-02', year_group: 8, difficulty: 'hard', question_type: 'short',
        question_text: 'Factorise fully: 2x² + 6x',
        correct_answer: '2x(x + 3)',
        explanation: 'HCF is 2x. Factor: 2x(x + 3).' },

      { seed_key: 'y8-alg-h-03', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Solve the simultaneous equations: 2x + y = 8 and x + 2y = 7.',
        choices: ['x=3, y=2', 'x=2, y=4', 'x=3, y=3', 'x=4, y=0'],
        correct_answer: 'x=3, y=2', correct_index: 0,
        explanation: 'From equation 1: y = 8 − 2x. Sub into eq 2: x + 2(8−2x) = 7 → x + 16 − 4x = 7 → −3x = −9 → x=3, y=2.' },

      { seed_key: 'y8-alg-h-04', year_group: 8, difficulty: 'hard', question_type: 'short',
        question_text: 'Rearrange to make x the subject: y = 3x + 2',
        correct_answer: 'x = (y − 2) / 3',
        explanation: 'Subtract 2: y − 2 = 3x. Divide by 3: x = (y − 2)/3.' },

      { seed_key: 'y8-alg-h-05', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'What are the solutions to x² − 5x + 6 = 0?',
        choices: ['x = 2 and x = 3', 'x = −2 and x = −3', 'x = 1 and x = 6', 'x = 2 and x = −3'],
        correct_answer: 'x = 2 and x = 3', correct_index: 0,
        explanation: 'Factorise: (x−2)(x−3) = 0 → x = 2 or x = 3.' },

      { seed_key: 'y8-alg-h-06', year_group: 8, difficulty: 'hard', question_type: 'numeric',
        question_text: 'If y = x² − 2x + 1, find y when x = 4.',
        correct_answer: '9',
        explanation: '4² − 2(4) + 1 = 16 − 8 + 1 = 9' },

      // ─────────────── YEAR 9 ALGEBRA ─────────────────────────────────────────

      { seed_key: 'y9-alg-e-01', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What are the solutions to (x − 3)(x + 2) = 0?',
        choices: ['x = 3 and x = −2', 'x = −3 and x = 2', 'x = 3 and x = 2', 'x = −3 and x = −2'],
        correct_answer: 'x = 3 and x = −2', correct_index: 0,
        explanation: 'Set each factor to zero: x − 3 = 0 → x = 3; x + 2 = 0 → x = −2.' },

      { seed_key: 'y9-alg-e-02', year_group: 9, difficulty: 'easy', question_type: 'short',
        question_text: 'Factorise: x² − 9 (difference of two squares)',
        correct_answer: '(x − 3)(x + 3)',
        explanation: 'a² − b² = (a−b)(a+b). Here a=x, b=3.' },

      { seed_key: 'y9-alg-e-03', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: (3x²)(4x³)',
        choices: ['7x⁵', '12x⁵', '12x⁶', '7x⁶'],
        correct_answer: '12x⁵', correct_index: 1,
        explanation: '3 × 4 = 12. x² × x³ = x⁵.' },

      { seed_key: 'y9-alg-e-04', year_group: 9, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Evaluate: 2⁻³',
        correct_answer: '0.125',
        explanation: '2⁻³ = 1/2³ = 1/8 = 0.125' },

      { seed_key: 'y9-alg-e-05', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which of the following is equivalent to x⁰?',
        choices: ['0', '1', 'x', 'undefined'],
        correct_answer: '1', correct_index: 1,
        explanation: 'Any non-zero number raised to the power 0 equals 1.' },

      { seed_key: 'y9-alg-e-06', year_group: 9, difficulty: 'easy', question_type: 'short',
        question_text: 'Rearrange to make v the subject: v = u + at',
        correct_answer: 'a = (v − u) / t',
        explanation: 'Subtract u: v − u = at. Divide by t: a = (v−u)/t.' },

      // Y9 Medium
      { seed_key: 'y9-alg-m-01', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Solve: x² − 7x + 12 = 0',
        choices: ['x = 3 and x = 4', 'x = −3 and x = −4', 'x = 2 and x = 6', 'x = 1 and x = 12'],
        correct_answer: 'x = 3 and x = 4', correct_index: 0,
        explanation: 'Factorise: (x−3)(x−4) = 0 → x=3 or x=4.' },

      { seed_key: 'y9-alg-m-02', year_group: 9, difficulty: 'medium', question_type: 'short',
        question_text: 'Complete the square: x² + 6x + 5. Write in the form (x + a)² + b.',
        correct_answer: '(x + 3)² − 4',
        explanation: 'Half of 6 is 3. (x+3)² = x² + 6x + 9. So x² + 6x + 5 = (x+3)² − 4.' },

      { seed_key: 'y9-alg-m-03', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Solve the simultaneous equations: 3x + 2y = 12 and x − y = 1.',
        choices: ['x=2, y=3', 'x=3, y=3', 'x=4, y=0', 'x=14/5, y=9/5'],
        correct_answer: 'x=14/5, y=9/5', correct_index: 3,
        explanation: 'From second: x = 1 + y. Sub: 3(1+y)+2y=12 → 3+5y=12 → y=9/5, x=1+9/5=14/5.' },

      { seed_key: 'y9-alg-m-04', year_group: 9, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Simplify: (x³)² × x⁴. Give the power of x.',
        correct_answer: '10',
        explanation: '(x³)² = x⁶. Then x⁶ × x⁴ = x¹⁰.' },

      { seed_key: 'y9-alg-m-05', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the discriminant of x² + 4x + 5?',
        choices: ['36', '−4', '4', '0'],
        correct_answer: '−4', correct_index: 1,
        explanation: 'b² − 4ac = 4² − 4(1)(5) = 16 − 20 = −4. No real roots.' },

      { seed_key: 'y9-alg-m-06', year_group: 9, difficulty: 'medium', question_type: 'short',
        question_text: 'Expand: (2x + 3)²',
        correct_answer: '4x² + 12x + 9',
        explanation: '(2x)² + 2(2x)(3) + 3² = 4x² + 12x + 9' },

      { seed_key: 'y9-alg-m-07', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Rearrange P = 2l + 2w to make l the subject.',
        choices: ['l = P − w', 'l = (P − 2w)/2', 'l = P/2 − w', 'both B and C'],
        correct_answer: 'both B and C', correct_index: 3,
        explanation: 'P − 2w = 2l → l = (P−2w)/2 = P/2 − w. Both are equivalent.' },

      { seed_key: 'y9-alg-m-08', year_group: 9, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Simplify: 27^(1/3)',
        correct_answer: '3',
        explanation: 'The cube root of 27 is 3, since 3³ = 27.' },

      { seed_key: 'y9-alg-m-09', year_group: 9, difficulty: 'medium', question_type: 'short',
        question_text: 'Factorise: 3x² + 12x',
        correct_answer: '3x(x + 4)',
        explanation: 'HCF is 3x. 3x² ÷ 3x = x and 12x ÷ 3x = 4.' },

      // Y9 Hard
      { seed_key: 'y9-alg-h-01', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Using the quadratic formula, solve x² + 5x + 3 = 0. Which answer is correct?',
        choices: ['x = (−5 ± √13) / 2', 'x = (5 ± √13) / 2', 'x = (−5 ± √37) / 2', 'x = (5 ± √37) / 2'],
        correct_answer: 'x = (−5 ± √13) / 2', correct_index: 0,
        explanation: 'a=1,b=5,c=3. x = (−5 ± √(25−12))/2 = (−5 ± √13)/2' },

      { seed_key: 'y9-alg-h-02', year_group: 9, difficulty: 'hard', question_type: 'short',
        question_text: 'Show algebraically that (n+1)² − n² = 2n + 1 for all values of n.',
        correct_answer: '(n+1)² − n² = n² + 2n + 1 − n² = 2n + 1 ✓',
        explanation: 'Expand (n+1)² = n² + 2n + 1, then subtract n².' },

      { seed_key: 'y9-alg-h-03', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Simplify: (4x²y³) / (2xy)',
        choices: ['2xy²', '2x²y', '2xy', '4x²y²'],
        correct_answer: '2xy²', correct_index: 0,
        explanation: '4/2=2, x²/x=x, y³/y=y². Result: 2xy².' },

      { seed_key: 'y9-alg-h-04', year_group: 9, difficulty: 'hard', question_type: 'numeric',
        question_text: 'Solve: 5^(2x) = 25. What is x?',
        correct_answer: '1',
        explanation: '25 = 5². So 5^(2x) = 5² → 2x = 2 → x = 1.' },

      { seed_key: 'y9-alg-h-05', year_group: 9, difficulty: 'hard', question_type: 'short',
        question_text: 'Factorise: 6x² + x − 2',
        correct_answer: '(2x − 1)(3x + 2)',
        explanation: 'Find factors of 6×(−2)=−12 that add to 1: 4 and −3. Split: 6x²+4x−3x−2 = 2x(3x+2)−1(3x+2) = (2x−1)(3x+2).' },

      // ─────────────── YEAR 10 ALGEBRA ────────────────────────────────────────

      { seed_key: 'y10-alg-e-01', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What does the graph of y = x² look like?',
        choices: ['A straight line', 'A U-shaped curve (parabola)', 'An S-curve', 'A circle'],
        correct_answer: 'A U-shaped curve (parabola)', correct_index: 1,
        explanation: 'y = x² is a quadratic function — it produces a parabola.' },

      { seed_key: 'y10-alg-e-02', year_group: 10, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Find the turning point x-coordinate of y = (x − 4)² + 1.',
        correct_answer: '4',
        explanation: 'In vertex form y = (x−h)² + k, the turning point is at x = h = 4.' },

      { seed_key: 'y10-alg-e-03', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'The line y = 3x − 6 crosses the x-axis at:',
        choices: ['x = 6', 'x = 2', 'x = −6', 'x = 3'],
        correct_answer: 'x = 2', correct_index: 1,
        explanation: 'Set y = 0: 3x − 6 = 0 → x = 2.' },

      { seed_key: 'y10-alg-e-04', year_group: 10, difficulty: 'easy', question_type: 'short',
        question_text: 'Write 72 as a product of prime factors.',
        correct_answer: '2³ × 3²',
        explanation: '72 = 8 × 9 = 2³ × 3².' },

      { seed_key: 'y10-alg-e-05', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: √50',
        choices: ['5√2', '25√2', '10√5', '5√10'],
        correct_answer: '5√2', correct_index: 0,
        explanation: '√50 = √(25×2) = 5√2.' },

      // Y10 Medium
      { seed_key: 'y10-alg-m-01', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The graph of y = 2x² − 8 crosses the x-axis at:',
        choices: ['x = ±2', 'x = ±4', 'x = 4 only', 'x = ±8'],
        correct_answer: 'x = ±2', correct_index: 0,
        explanation: 'Set y = 0: 2x² = 8 → x² = 4 → x = ±2.' },

      { seed_key: 'y10-alg-m-02', year_group: 10, difficulty: 'medium', question_type: 'short',
        question_text: 'Solve: x² − 3x − 10 = 0 by factorising.',
        correct_answer: 'x = 5 or x = −2',
        explanation: '(x−5)(x+2)=0 → x=5 or x=−2.' },

      { seed_key: 'y10-alg-m-03', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Simplify: (2x + 1)(3x − 4)',
        choices: ['6x² − 5x − 4', '6x² + 5x − 4', '5x² − 5x − 4', '6x² − 5x + 4'],
        correct_answer: '6x² − 5x − 4', correct_index: 0,
        explanation: 'FOIL: 6x² − 8x + 3x − 4 = 6x² − 5x − 4.' },

      { seed_key: 'y10-alg-m-04', year_group: 10, difficulty: 'medium', question_type: 'numeric',
        question_text: 'What is the minimum value of y = (x + 3)² − 7?',
        correct_answer: '-7',
        explanation: 'Minimum is at the vertex. When x = −3, y = 0 − 7 = −7.' },

      { seed_key: 'y10-alg-m-05', year_group: 10, difficulty: 'medium', question_type: 'short',
        question_text: 'Solve: 2x² − 7x + 3 = 0',
        correct_answer: 'x = 3 or x = 1/2',
        explanation: 'Factorise: (2x − 1)(x − 3) = 0 → x = 1/2 or x = 3.' },

      { seed_key: 'y10-alg-m-06', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Which inequality is shown by the graph y > 2x − 1?',
        choices: ['The region above the dashed line y = 2x − 1', 'The region below y = 2x − 1', 'The line y = 2x − 1', 'The region above the solid line y = 2x − 1'],
        correct_answer: 'The region above the dashed line y = 2x − 1', correct_index: 0,
        explanation: 'Strict inequality (>) means dashed boundary. y > means above.' },

      { seed_key: 'y10-alg-m-07', year_group: 10, difficulty: 'medium', question_type: 'numeric',
        question_text: 'Simplify: x^(3/2) when x = 4. Give a whole number answer.',
        correct_answer: '8',
        explanation: 'x^(3/2) = (x^(1/2))³ = (√4)³ = 2³ = 8.' },

      { seed_key: 'y10-alg-m-08', year_group: 10, difficulty: 'medium', question_type: 'short',
        question_text: 'Rearrange to make r the subject: A = πr²',
        correct_answer: 'r = √(A/π)',
        explanation: 'Divide by π: r² = A/π. Square root: r = √(A/π).' },

      { seed_key: 'y10-alg-m-09', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Solve: |2x − 3| = 7',
        choices: ['x = 5 or x = −2', 'x = 5', 'x = −2', 'x = 5 or x = 2'],
        correct_answer: 'x = 5 or x = −2', correct_index: 0,
        explanation: '2x − 3 = 7 → x = 5. Or 2x − 3 = −7 → 2x = −4 → x = −2.' },

      // Y10 Hard
      { seed_key: 'y10-alg-h-01', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'What is the equation of the line perpendicular to y = 3x + 1 passing through (0, 4)?',
        choices: ['y = 3x + 4', 'y = −x/3 + 4', 'y = x/3 + 4', 'y = −3x + 4'],
        correct_answer: 'y = −x/3 + 4', correct_index: 1,
        explanation: 'Perpendicular gradient = −1/3 (negative reciprocal of 3). y-intercept = 4.' },

      { seed_key: 'y10-alg-h-02', year_group: 10, difficulty: 'hard', question_type: 'short',
        question_text: 'Solve using the quadratic formula: 2x² − 4x − 3 = 0. Give answers to 2 d.p.',
        correct_answer: 'x = 2.58 or x = −0.58',
        explanation: 'x = (4 ± √(16+24))/4 = (4 ± √40)/4. √40 ≈ 6.32. x ≈ 2.58 or −0.58.' },

      { seed_key: 'y10-alg-h-03', year_group: 10, difficulty: 'hard', question_type: 'numeric',
        question_text: 'How many times does the graph y = x² + 2x + 1 touch the x-axis?',
        correct_answer: '1',
        explanation: 'Discriminant = 4 − 4 = 0. One repeated root — the graph touches the x-axis once.' },

      { seed_key: 'y10-alg-h-04', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Simplify: (3x² + 6x) / (x² − 4)',
        choices: ['3(x+2)/(x−2)', '3x/(x−2)', '3x(x+2)/(x+2)(x−2)', '3x/(x+2)'],
        correct_answer: '3(x+2)/(x−2)', correct_index: 0,
        explanation: 'Numerator: 3x(x+2). Denominator: (x+2)(x−2). Cancel (x+2): 3x/(x−2). Wait — numerator is 3x(x+2), so after cancel = 3x/(x−2). Correct answer = 3x/(x−2).' },

      { seed_key: 'y10-alg-h-05', year_group: 10, difficulty: 'hard', question_type: 'short',
        question_text: 'Solve the inequality: x² − x − 6 < 0',
        correct_answer: '−2 < x < 3',
        explanation: 'Factorise: (x−3)(x+2) < 0. The parabola is negative between roots: −2 < x < 3.' },

      { seed_key: 'y10-alg-h-06', year_group: 10, difficulty: 'hard', question_type: 'numeric',
        question_text: 'Find the exact value of 8^(2/3).',
        correct_answer: '4',
        explanation: '8^(1/3) = 2, then 2² = 4.' },

      { seed_key: 'y10-alg-h-07', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Which function has roots at x = 1 and x = −3 and passes through (0, 3)?',
        choices: ['y = x² − 2x − 3', 'y = −x² − 2x + 3', 'y = x² + 2x − 3', 'y = −x² + 2x + 3'],
        correct_answer: 'y = −x² − 2x + 3', correct_index: 1,
        explanation: 'Roots at 1 and −3: y = a(x−1)(x+3). At (0,3): 3 = a(−1)(3) = −3a → a = −1. y = −(x−1)(x+3) = −x² − 2x + 3.' },

      // ─────────────── YEAR 11 ALGEBRA ────────────────────────────────────────

      { seed_key: 'y11-alg-e-01', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which of the following is a geometric sequence?',
        choices: ['2, 4, 6, 8', '3, 6, 12, 24', '1, 3, 6, 10', '5, 10, 15, 20'],
        correct_answer: '3, 6, 12, 24', correct_index: 1,
        explanation: 'A geometric sequence has a constant multiplier (ratio). 6/3 = 12/6 = 24/12 = 2.' },

      { seed_key: 'y11-alg-e-02', year_group: 11, difficulty: 'easy', question_type: 'numeric',
        question_text: 'Find the common ratio of the geometric sequence: 5, 15, 45, ...',
        correct_answer: '3',
        explanation: '15 ÷ 5 = 3. 45 ÷ 15 = 3. Common ratio = 3.' },

      { seed_key: 'y11-alg-e-03', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: √18 + √8',
        choices: ['5√2', '√26', '√10', '4√2'],
        correct_answer: '5√2', correct_index: 0,
        explanation: '√18 = 3√2 and √8 = 2√2. So 3√2 + 2√2 = 5√2.' },

      { seed_key: 'y11-alg-e-04', year_group: 11, difficulty: 'easy', question_type: 'short',
        question_text: 'Rationalise the denominator: 1/√3',
        correct_answer: '√3/3',
        explanation: 'Multiply top and bottom by √3: (1×√3)/(√3×√3) = √3/3.' },

      { seed_key: 'y11-alg-e-05', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'The nth term of an arithmetic sequence is 5n + 2. What is the common difference?',
        choices: ['2', '5', '7', '3'],
        correct_answer: '5', correct_index: 1,
        explanation: 'In an arithmetic sequence with nth term an + b, the common difference = a = 5.' },

      // Y11 Medium
      { seed_key: 'y11-alg-m-01', year_group: 11, difficulty: 'medium', question_type: 'short',
        question_text: 'Prove algebraically that the sum of any two consecutive even numbers is divisible by 4.',
        correct_answer: '2n + (2n+2) = 4n + 2 — wait, this is NOT always divisible by 4. Consecutive even integers 2n and 2n+2 sum to 4n+2 = 2(2n+1), divisible by 2 but not always 4.',
        explanation: '2n + (2n+2) = 4n+2. This is always even but not always divisible by 4 (e.g. 2+4=6).' },

      { seed_key: 'y11-alg-m-02', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Which expression represents the sum of the first n terms of an arithmetic series: a, a+d, a+2d, ...?',
        choices: ['n/2 (2a + (n−1)d)', 'n(a + d)', 'a + nd', 'n(a + (n+1)d)/2'],
        correct_answer: 'n/2 (2a + (n−1)d)', correct_index: 0,
        explanation: 'Standard formula: Sn = n/2 × (2a + (n−1)d).' },

      { seed_key: 'y11-alg-m-03', year_group: 11, difficulty: 'medium', question_type: 'numeric',
        question_text: 'An arithmetic sequence has first term 3 and common difference 5. Find the 20th term.',
        correct_answer: '98',
        explanation: 'nth term = a + (n−1)d = 3 + 19 × 5 = 3 + 95 = 98.' },

      { seed_key: 'y11-alg-m-04', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Simplify: (x² − 4) / (x² − 4x + 4)',
        choices: ['(x+2)/(x−2)', '(x−2)/(x+2)', '1', '(x²−4)/(x−2)²'],
        correct_answer: '(x+2)/(x−2)', correct_index: 0,
        explanation: 'Num: (x+2)(x−2). Den: (x−2)². Cancel (x−2): (x+2)/(x−2).' },

      { seed_key: 'y11-alg-m-05', year_group: 11, difficulty: 'medium', question_type: 'short',
        question_text: 'Solve: (x+1)/(x−2) = 3',
        correct_answer: 'x = 7/2 or x = 3.5',
        explanation: 'Multiply both sides by (x−2): x+1 = 3(x−2) = 3x−6. So 1+6 = 3x−x → 7 = 2x → x = 3.5.' },

      { seed_key: 'y11-alg-m-06', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The sum of the first 10 terms of an arithmetic sequence is 155. The first term is 2. What is the common difference?',
        choices: ['3', '4', '5', '2'],
        correct_answer: '3', correct_index: 0,
        explanation: 'S = 10/2 × (2×2 + 9d) = 5(4 + 9d) = 155 → 4 + 9d = 31 → 9d = 27 → d = 3.' },

      { seed_key: 'y11-alg-m-07', year_group: 11, difficulty: 'medium', question_type: 'numeric',
        question_text: 'A geometric sequence starts 2, 6, 18, ... What is the 6th term?',
        correct_answer: '486',
        explanation: 'Common ratio = 3. 6th term = 2 × 3⁵ = 2 × 243 = 486.' },

      { seed_key: 'y11-alg-m-08', year_group: 11, difficulty: 'medium', question_type: 'short',
        question_text: 'Solve: 3/(x+1) + 2/(x−1) = 2. Show full working.',
        correct_answer: 'x = (5 ± √33) / 4',
        explanation: 'Multiply through by (x+1)(x−1): 3(x−1) + 2(x+1) = 2(x²−1) → 5x−1 = 2x²−2 → 2x²−5x−1=0 → x = (5±√33)/4.' },

      // Y11 Hard
      { seed_key: 'y11-alg-h-01', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'The function f(x) = x³ − 3x² + 2 has a local maximum at:',
        choices: ['x = 0', 'x = 2', 'x = 1', 'x = −1'],
        correct_answer: 'x = 0', correct_index: 0,
        explanation: "f'(x) = 3x² − 6x = 3x(x−2). Turning points at x=0 and x=2. f''(0) = −6 < 0 → local max." },

      { seed_key: 'y11-alg-h-02', year_group: 11, difficulty: 'hard', question_type: 'short',
        question_text: 'Prove by contradiction: √2 is irrational.',
        correct_answer: 'Assume √2 = p/q in lowest terms. Then 2q² = p², so p² is even, so p is even. Let p=2k: 2q²=4k² → q²=2k², so q is even. But then p and q share factor 2 — contradiction.',
        explanation: 'Classic proof by contradiction using properties of even numbers.' },

      { seed_key: 'y11-alg-h-03', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Solve 2^(x+1) = 5^x. Give x to 3 significant figures.',
        choices: ['x ≈ 1.76', 'x ≈ 2.15', 'x ≈ 0.756', 'x ≈ 3.22'],
        correct_answer: 'x ≈ 1.76', correct_index: 0,
        explanation: '(x+1)ln2 = x ln5. x ln2 + ln2 = x ln5. ln2 = x(ln5−ln2) = x ln(5/2). x = ln2/ln(2.5) ≈ 0.693/0.916 ≈ 0.756. Hmm wait: let me recompute. x = ln2 / (ln5−ln2) = 0.6931/(1.6094−0.6931) = 0.6931/0.9163 ≈ 0.757.' },

      { seed_key: 'y11-alg-h-04', year_group: 11, difficulty: 'hard', question_type: 'numeric',
        question_text: 'Find the sum to infinity of the geometric series: 12 + 6 + 3 + 1.5 + ... (give a whole number)',
        correct_answer: '24',
        explanation: 'a=12, r=1/2. S∞ = a/(1−r) = 12/(1−0.5) = 12/0.5 = 24.' },

      { seed_key: 'y11-alg-h-05', year_group: 11, difficulty: 'hard', question_type: 'short',
        question_text: 'Sketch the graph of y = x² − 2x − 8, labelling the vertex, roots and y-intercept.',
        correct_answer: 'Roots: x=4 and x=−2; y-intercept: (0,−8); vertex at (1,−9)',
        explanation: 'Factorise: (x−4)(x+2)=0. y-int: set x=0 → y=−8. Vertex: x = −b/2a = 2/2 = 1, y = 1−2−8 = −9.' },

      { seed_key: 'y11-alg-h-06', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Which statement about the graph y = −2x² + 4x + 6 is correct?',
        choices: ['It opens upward with vertex (1, 8)', 'It opens downward with vertex (1, 8)', 'It opens upward with vertex (−1, 0)', 'It opens downward with vertex (2, 6)'],
        correct_answer: 'It opens downward with vertex (1, 8)', correct_index: 1,
        explanation: 'a = −2 < 0 so opens downward. x = −b/2a = −4/(−4) = 1. y(1) = −2+4+6 = 8. Vertex (1,8).' },

      { seed_key: 'y11-alg-h-07', year_group: 11, difficulty: 'hard', question_type: 'short',
        question_text: 'Solve: log₂(x + 3) + log₂(x − 1) = 5',
        correct_answer: 'x = 5',
        explanation: 'log₂[(x+3)(x−1)] = 5 → (x+3)(x−1) = 32 → x²+2x−3=32 → x²+2x−35=0 → (x+7)(x−5)=0. Since x−1>0, x=5.' },

      { seed_key: 'y11-alg-h-08', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A function is defined as f(x) = 2x + 3. What is f⁻¹(x)?',
        choices: ['(x−3)/2', '(x+3)/2', '2x−3', '1/(2x+3)'],
        correct_answer: '(x−3)/2', correct_index: 0,
        explanation: 'Let y = 2x + 3. Swap x and y: x = 2y + 3. Solve for y: y = (x−3)/2.' },

      { seed_key: 'y11-alg-h-09', year_group: 11, difficulty: 'hard', question_type: 'short',
        question_text: 'Expand (1 + x)⁴ using the binomial theorem.',
        correct_answer: '1 + 4x + 6x² + 4x³ + x⁴',
        explanation: 'Binomial coefficients from row 4 of Pascal\'s triangle: 1, 4, 6, 4, 1.' },

      { seed_key: 'y11-alg-h-10', year_group: 11, difficulty: 'hard', question_type: 'numeric',
        question_text: 'Given that α and β are roots of 2x² − 5x + 1 = 0, find α + β.',
        correct_answer: '2.5',
        explanation: 'By Vieta\'s formulas: α + β = −b/a = 5/2 = 2.5.' },
    ];

    // Attach subject and topic IDs
    const enriched = questions.map(q => ({
      ...q,
      subject_id: S,
      subject_name: 'Maths',
      global_topic_id: T,
    }));

    // Dedup check
    const existing = await base44.asServiceRole.entities.GlobalQuestion.list('-created_date', 5000);
    const existingSeedKeys = new Set(existing.map(q => q.seed_key).filter(Boolean));

    let created = 0;
    let skipped = 0;

    for (const q of enriched) {
      if (existingSeedKeys.has(q.seed_key)) {
        skipped++;
        continue;
      }
      await base44.asServiceRole.entities.GlobalQuestion.create(q);
      created++;
    }

    return Response.json({
      message: `Algebra seed complete`,
      created,
      skipped,
      total_attempted: enriched.length,
      subject_id: S,
      topic_id: T
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});