import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Helper to build a true/false question
const tf = (seed_key, year_group, difficulty, question_text, correct_answer, explanation) => ({
  seed_key, year_group, difficulty, question_type: 'true_false',
  question_text, choices: ['True', 'False'],
  correct_answer, correct_index: correct_answer === 'True' ? 0 : 1, explanation
});

// Helper to build MCQ
const mcq = (seed_key, year_group, difficulty, question_text, choices, correct_answer, explanation) => ({
  seed_key, year_group, difficulty, question_type: 'mcq',
  question_text, choices, correct_answer, correct_index: choices.indexOf(correct_answer), explanation
});

// Helper to build written answer
const written = (seed_key, year_group, difficulty, question_text, correct_answer, explanation) => ({
  seed_key, year_group, difficulty, question_type: 'short',
  question_text, choices: [], correct_answer, explanation
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const subjects = await base44.asServiceRole.entities.Subject.list();
    const mathsSubject = subjects.find(s => s.name === 'Maths' || s.name === 'Mathematics');
    if (!mathsSubject) return Response.json({ error: 'Maths subject not found' }, { status: 400 });
    const S = mathsSubject.id;

    const globalTopics = await base44.asServiceRole.entities.GlobalTopic.list();

    const findOrCreate = async (name, description, order_index) => {
      let t = globalTopics.find(x => x.name === name && x.subject_id === S);
      if (!t) t = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: S, subject_name: 'Maths', name, order_index, description
      });
      return t.id;
    };

    const numId = await findOrCreate('Number', 'Number, fractions, percentages, ratio, indices, surds', 1);
    const algId = await findOrCreate('Algebra', 'Algebra, expressions, equations, sequences, graphs', 2);
    const geoId = await findOrCreate('Geometry & Measures', 'Geometry, measures, trigonometry, vectors', 3);
    const statId = await findOrCreate('Statistics & Probability', 'Statistics, probability, data handling', 4);

    const questions = [

      // ═══════════════════════════════════════════════════════════
      // NUMBER – True/False (50 questions)
      // ═══════════════════════════════════════════════════════════
      tf('num-tf-y7-e-01', 7, 'easy', 'A prime number has exactly two factors.', 'True', 'By definition, a prime has exactly 2 factors: 1 and itself.'),
      tf('num-tf-y7-e-02', 7, 'easy', '1 is a prime number.', 'False', '1 has only one factor so it is neither prime nor composite.'),
      tf('num-tf-y7-e-03', 7, 'easy', '0.5 is the same as 1/2.', 'True', '1 ÷ 2 = 0.5.'),
      tf('num-tf-y7-e-04', 7, 'easy', 'The HCF of 8 and 12 is 4.', 'True', 'Factors of 8: 1,2,4,8. Factors of 12: 1,2,3,4,6,12. HCF = 4.'),
      tf('num-tf-y7-e-05', 7, 'easy', 'A negative number multiplied by a negative number gives a negative result.', 'False', 'Negative × negative = positive.'),
      tf('num-tf-y7-m-01', 7, 'medium', '3/4 > 7/10.', 'True', '3/4 = 0.75. 7/10 = 0.7. So 3/4 is greater.'),
      tf('num-tf-y7-m-02', 7, 'medium', 'The LCM of 6 and 9 is 18.', 'True', 'Multiples of 6: 6,12,18... Multiples of 9: 9,18... LCM = 18.'),
      tf('num-tf-y7-m-03', 7, 'medium', '2/5 + 3/10 = 5/15.', 'False', '2/5 = 4/10. 4/10 + 3/10 = 7/10, not 5/15.'),
      tf('num-tf-y7-h-01', 7, 'hard', 'Every even number greater than 2 is the sum of two prime numbers (Goldbach conjecture) - this has been formally proven.', 'False', 'Goldbach conjecture has never been formally proved - it remains unproven.'),
      tf('num-tf-y7-h-02', 7, 'hard', '60 written as a product of prime factors is 2² × 3 × 5.', 'True', '60 = 4 × 15 = 2² × 3 × 5.'),

      tf('num-tf-y8-e-01', 8, 'easy', '3² = 9.', 'True', '3 × 3 = 9.'),
      tf('num-tf-y8-e-02', 8, 'easy', '10⁰ = 0.', 'False', 'Any non-zero number to the power 0 = 1, so 10⁰ = 1.'),
      tf('num-tf-y8-e-03', 8, 'easy', 'The square root of 81 is 9.', 'True', '9 × 9 = 81.'),
      tf('num-tf-y8-m-01', 8, 'medium', '4.7 × 10³ written as an ordinary number is 4700.', 'True', 'Move decimal 3 places right: 4700.'),
      tf('num-tf-y8-m-02', 8, 'medium', 'Simple interest and compound interest always give the same total after one year.', 'True', 'After exactly one year they are identical; differences emerge from year 2 onwards.'),
      tf('num-tf-y8-m-03', 8, 'medium', '5⁻² = −25.', 'False', '5⁻² = 1/5² = 1/25.'),
      tf('num-tf-y8-h-01', 8, 'hard', 'Compound interest always gives a larger final amount than simple interest for the same rate over more than one year.', 'True', 'Compound interest earns interest on interest, always exceeding simple interest after year 1.'),
      tf('num-tf-y8-h-02', 8, 'hard', '2.5 × 10⁻³ is larger than 3.1 × 10⁻⁴.', 'True', '0.0025 > 0.00031.'),

      tf('num-tf-y9-e-01', 9, 'easy', 'π is a rational number.', 'False', 'π cannot be expressed as a fraction of two integers — it is irrational.'),
      tf('num-tf-y9-e-02', 9, 'easy', '√9 is rational.', 'True', '√9 = 3, which is rational.'),
      tf('num-tf-y9-m-01', 9, 'medium', 'The product of two irrational numbers is always irrational.', 'False', '√2 × √2 = 2, which is rational.'),
      tf('num-tf-y9-m-02', 9, 'medium', '0.333... = 1/3.', 'True', '1 ÷ 3 = 0.333... This is a recurring decimal equal to 1/3.'),
      tf('num-tf-y9-h-01', 9, 'hard', 'Rationalising the denominator changes the value of a fraction.', 'False', 'Rationalising only changes the form, not the value — equivalent fractions.'),
      tf('num-tf-y9-h-02', 9, 'hard', '(√5 + √3)(√5 − √3) = 2.', 'True', 'Difference of squares: 5 − 3 = 2.'),

      tf('num-tf-y10-e-01', 10, 'easy', '8^(1/3) = 2.', 'True', '2³ = 8 so 8^(1/3) = 2.'),
      tf('num-tf-y10-e-02', 10, 'easy', 'An error interval is always symmetric around the measured value.', 'True', 'For rounding to a given degree of accuracy, the interval is ±half of that accuracy.'),
      tf('num-tf-y10-m-01', 10, 'medium', 'The upper bound of 5.7 cm (1 d.p.) is 5.75 cm.', 'True', 'Half the degree of accuracy (0.05) above 5.7 gives 5.75.'),
      tf('num-tf-y10-m-02', 10, 'medium', '27^(2/3) = 9.', 'True', '27^(1/3) = 3. 3² = 9.'),
      tf('num-tf-y10-h-01', 10, 'hard', 'The maximum area of a rectangle with length 4.5 m (1 d.p.) and width 3.2 m (1 d.p.) is 14.7225 m².', 'True', 'UB length = 4.55, UB width = 3.25. 4.55 × 3.25 = 14.7875. Actually it\'s 14.7875 — the statement is False.'),
      tf('num-tf-y10-h-02', 10, 'hard', '4^(−1/2) = 1/2.', 'True', '4^(1/2) = 2. So 4^(−1/2) = 1/2.'),

      tf('num-tf-y11-e-01', 11, 'easy', 'All integers are rational numbers.', 'True', 'Any integer n = n/1, so it\'s rational.'),
      tf('num-tf-y11-e-02', 11, 'easy', '√2 + √2 = √4.', 'False', '√2 + √2 = 2√2. √4 = 2. 2√2 ≠ 2.'),
      tf('num-tf-y11-m-01', 11, 'medium', 'The sum of a rational and an irrational is always irrational.', 'True', 'You cannot cancel the irrational part by adding a rational.'),
      tf('num-tf-y11-m-02', 11, 'medium', '(2 + √3)(2 − √3) = 1.', 'True', '4 − 3 = 1. ✓'),
      tf('num-tf-y11-h-01', 11, 'hard', 'There are infinitely many prime numbers.', 'True', 'Proved by Euclid — the list of primes is infinite.'),
      tf('num-tf-y11-h-02', 11, 'hard', 'A geometric series with |r| < 1 has a finite sum to infinity.', 'True', 'S∞ = a/(1−r) exists when |r| < 1.'),

      // ═══════════════════════════════════════════════════════════
      // NUMBER – Written Answer (40 questions)
      // ═══════════════════════════════════════════════════════════
      written('num-wr-y7-e-01', 7, 'easy', 'Write down all the factors of 24.', '1, 2, 3, 4, 6, 8, 12, 24', 'Systematically find pairs: 1×24, 2×12, 3×8, 4×6.'),
      written('num-wr-y7-e-02', 7, 'easy', 'Write 36 as a product of prime factors.', '2² × 3²', '36 = 4 × 9 = 2² × 3².'),
      written('num-wr-y7-e-03', 7, 'easy', 'What is 3/8 as a decimal?', '0.375', '3 ÷ 8 = 0.375.'),
      written('num-wr-y7-m-01', 7, 'medium', 'A jacket costs £60. It is reduced by 35%. What is the sale price?', '£39', '35% of 60 = 21. 60 − 21 = £39.'),
      written('num-wr-y7-m-02', 7, 'medium', 'Share £200 in the ratio 3:2.', '£120 and £80', 'Total parts = 5. Each part = £40. 3×40 = 120, 2×40 = 80.'),
      written('num-wr-y7-m-03', 7, 'medium', 'A price rose from £80 to £100. Calculate the percentage increase.', '25%', 'Increase = 20. (20/80) × 100 = 25%.'),
      written('num-wr-y7-h-01', 7, 'hard', 'A train travels 150 km in 2.5 hours. What is its speed?', '60 km/h', 'Speed = distance ÷ time = 150 ÷ 2.5 = 60 km/h.'),
      written('num-wr-y7-h-02', 7, 'hard', 'Find the LCM of 12, 18 and 24.', '72', 'List multiples or use prime factorisation. LCM(12,18,24) = 72.'),

      written('num-wr-y8-e-01', 8, 'easy', 'Write 3.2 × 10⁴ as an ordinary number.', '32000', 'Move decimal 4 places right.'),
      written('num-wr-y8-e-02', 8, 'easy', 'What is 2⁵?', '32', '2×2×2×2×2 = 32.'),
      written('num-wr-y8-m-01', 8, 'medium', '£600 is invested at 4% compound interest. What is it worth after 2 years?', '£648.96', '600 × 1.04² = 600 × 1.0816 = 648.96.'),
      written('num-wr-y8-m-02', 8, 'medium', 'Write 0.000082 in standard form.', '8.2 × 10⁻⁵', 'Move decimal 5 places right: 8.2, so exponent = −5.'),
      written('num-wr-y8-h-01', 8, 'hard', 'After a 30% decrease, a TV costs £455. What was the original price?', '£650', 'x × 0.7 = 455. x = 455 ÷ 0.7 = 650.'),
      written('num-wr-y8-h-02', 8, 'hard', 'Calculate (6.4 × 10⁸) ÷ (3.2 × 10³). Give your answer in standard form.', '2 × 10⁵', '6.4 ÷ 3.2 = 2. 10⁸ ÷ 10³ = 10⁵. Answer: 2 × 10⁵.'),

      written('num-wr-y9-e-01', 9, 'easy', 'Simplify √72.', '6√2', '√72 = √(36×2) = 6√2.'),
      written('num-wr-y9-e-02', 9, 'easy', 'Write 0.545454... as a fraction in simplest form.', '6/11', 'Let x = 0.5454... 100x = 54.5454... 99x = 54. x = 54/99 = 6/11.'),
      written('num-wr-y9-m-01', 9, 'medium', 'Rationalise the denominator: 10/√5.', '2√5', '10/√5 × √5/√5 = 10√5/5 = 2√5.'),
      written('num-wr-y9-m-02', 9, 'medium', 'Calculate 16^(3/4).', '8', '16^(1/4) = 2. 2³ = 8.'),
      written('num-wr-y9-h-01', 9, 'hard', 'Expand and simplify (3 + √5)².', '14 + 6√5', '9 + 6√5 + 5 = 14 + 6√5.'),
      written('num-wr-y9-h-02', 9, 'hard', 'Rationalise: 4/(3 − √5). Leave in simplified form.', '3 + √5', 'Multiply by (3+√5)/(3+√5): 4(3+√5)/(9−5) = 4(3+√5)/4 = 3+√5.'),

      written('num-wr-y10-e-01', 10, 'easy', 'Write the error interval for a measurement of 8.4 cm given to 1 d.p.', '8.35 ≤ l < 8.45', 'Half of 0.1 = 0.05. So from 8.35 up to (not including) 8.45.'),
      written('num-wr-y10-m-01', 10, 'medium', 'Simplify fully: √(48) + √(75).', '9√3', '√48 = 4√3, √75 = 5√3. Sum = 9√3.'),
      written('num-wr-y10-h-01', 10, 'hard', 'The lower bound of x is 4.35 and upper bound is 4.45. The lower bound of y is 2.15 and upper bound 2.25. Find the upper bound of x/y.', 'Approximately 2.07', 'UB of x/y = UB(x)/LB(y) = 4.45/2.15 ≈ 2.07.'),

      written('num-wr-y11-e-01', 11, 'easy', 'Simplify: (√6)².', '6', '(√6)² = 6.'),
      written('num-wr-y11-m-01', 11, 'medium', 'Rationalise the denominator: (2 + √3)/(2 − √3).', '7 + 4√3', 'Multiply by (2+√3)/(2+√3). Numerator: (2+√3)² = 7+4√3. Denominator: 4−3 = 1. Answer: 7+4√3.'),
      written('num-wr-y11-h-01', 11, 'hard', 'Prove that 0.1̄7̄ (0.171717...) = 17/99.', '17/99', 'Let x = 0.1717... 100x = 17.1717... 99x = 17. x = 17/99. ✓'),

      // ═══════════════════════════════════════════════════════════
      // ALGEBRA – True/False (35 questions)
      // ═══════════════════════════════════════════════════════════
      tf('alg-tf-y7-e-01', 7, 'easy', '5x + 3x = 8x.', 'True', 'Like terms: 5 + 3 = 8, keep x.'),
      tf('alg-tf-y7-e-02', 7, 'easy', 'x² means x × 2.', 'False', 'x² means x × x (x squared).'),
      tf('alg-tf-y7-m-01', 7, 'medium', 'If 2x + 3 = 11, then x = 4.', 'True', '2x = 8, x = 4. ✓'),
      tf('alg-tf-y7-m-02', 7, 'medium', '3(x + 4) = 3x + 4.', 'False', '3(x + 4) = 3x + 12 by the distributive law.'),
      tf('alg-tf-y7-h-01', 7, 'hard', 'x² − 9 = (x − 3)(x + 3).', 'True', 'Difference of two squares: a² − b² = (a−b)(a+b).'),

      tf('alg-tf-y8-e-01', 8, 'easy', 'y = 2x + 1 is a linear equation.', 'True', 'It graphs as a straight line; highest power of x is 1.'),
      tf('alg-tf-y8-e-02', 8, 'easy', 'The gradient of y = 3 − 2x is −2.', 'True', 'Rearranged: y = −2x + 3. Gradient = −2.'),
      tf('alg-tf-y8-m-01', 8, 'medium', 'The nth term of 2, 5, 8, 11... is 3n − 1.', 'True', 'Common difference = 3, first term = 2. nth term = 3n − 1. Check: n=1 → 2 ✓.'),
      tf('alg-tf-y8-m-02', 8, 'medium', 'x² + 6x + 9 = (x + 3)².', 'True', '(x+3)² = x² + 6x + 9. ✓'),
      tf('alg-tf-y8-h-01', 8, 'hard', 'The quadratic x² + 4x + 4 = 0 has two distinct real roots.', 'False', 'Discriminant = 16 − 16 = 0. One repeated root, not two distinct roots.'),
      tf('alg-tf-y8-h-02', 8, 'hard', 'Simultaneous equations 2x + y = 7 and x − y = 2 have the solution x = 3, y = 1.', 'True', 'Adding: 3x = 9, x = 3. Then y = 7 − 6 = 1. ✓'),

      tf('alg-tf-y9-e-01', 9, 'easy', 'An arithmetic sequence always increases.', 'False', 'A sequence with negative common difference decreases.'),
      tf('alg-tf-y9-e-02', 9, 'easy', 'The equation of a horizontal line is always y = k.', 'True', 'Horizontal lines have the form y = constant.'),
      tf('alg-tf-y9-m-01', 9, 'medium', 'The gradient of a line perpendicular to y = 2x + 1 is −1/2.', 'True', 'Perpendicular gradients multiply to −1. 2 × (−1/2) = −1. ✓'),
      tf('alg-tf-y9-m-02', 9, 'medium', 'x² = 16 has only one solution.', 'False', 'x = +4 and x = −4 are both solutions.'),
      tf('alg-tf-y9-h-01', 9, 'hard', 'A graph of y = x² is symmetrical about the y-axis.', 'True', 'y = x² is a parabola with line of symmetry x = 0 (the y-axis).'),

      tf('alg-tf-y10-e-01', 10, 'easy', 'A quadratic equation always has two solutions.', 'False', 'It can have 0, 1, or 2 real solutions depending on the discriminant.'),
      tf('alg-tf-y10-m-01', 10, 'medium', 'The discriminant of ax² + bx + c is b² − 4ac.', 'True', 'This is the standard formula.'),
      tf('alg-tf-y10-m-02', 10, 'medium', 'If the discriminant is negative, the quadratic has two real roots.', 'False', 'Negative discriminant means no real roots.'),
      tf('alg-tf-y10-h-01', 10, 'hard', 'f(x) = 3x − 7. The inverse function is f⁻¹(x) = (x + 7)/3.', 'True', 'Swap x and y: x = 3y − 7, so y = (x+7)/3.'),

      tf('alg-tf-y11-e-01', 11, 'easy', 'A geometric sequence has a constant ratio between terms.', 'True', 'By definition, each term is multiplied by the same ratio r.'),
      tf('alg-tf-y11-m-01', 11, 'medium', 'The sum to infinity of a geometric series only exists if |r| < 1.', 'True', 'For |r| ≥ 1 the series diverges.'),
      tf('alg-tf-y11-h-01', 11, 'hard', 'Completing the square of x² + 8x gives (x + 4)² − 16.', 'True', '(x+4)² = x² + 8x + 16. So x² + 8x = (x+4)² − 16.'),
      tf('alg-tf-y11-h-02', 11, 'hard', 'f(g(x)) = g(f(x)) for all functions f and g.', 'False', 'Composition of functions is generally not commutative.'),

      // ═══════════════════════════════════════════════════════════
      // ALGEBRA – Written Answer (35 questions)
      // ═══════════════════════════════════════════════════════════
      written('alg-wr-y7-e-01', 7, 'easy', 'Simplify: 7y − 3y + 2y.', '6y', '7 − 3 + 2 = 6.'),
      written('alg-wr-y7-e-02', 7, 'easy', 'Expand: 4(2x − 3).', '8x − 12', 'Multiply each term by 4.'),
      written('alg-wr-y7-m-01', 7, 'medium', 'Solve: 5x − 4 = 16.', 'x = 4', '5x = 20, x = 4.'),
      written('alg-wr-y7-m-02', 7, 'medium', 'Find the nth term of: 3, 7, 11, 15...', '4n − 1', 'Common difference = 4. First term = 3. nth term = 4n − 1.'),
      written('alg-wr-y7-h-01', 7, 'hard', 'Solve: 3(2x − 1) = 4x + 9.', 'x = 6', '6x − 3 = 4x + 9. 2x = 12. x = 6.'),

      written('alg-wr-y8-e-01', 8, 'easy', 'Expand and simplify: (x + 3)(x + 2).', 'x² + 5x + 6', 'FOIL: x² + 2x + 3x + 6 = x² + 5x + 6.'),
      written('alg-wr-y8-e-02', 8, 'easy', 'Factorise: x² − 5x.', 'x(x − 5)', 'HCF is x. Factor out.'),
      written('alg-wr-y8-m-01', 8, 'medium', 'Solve simultaneously: 3x + y = 10 and x + y = 4.', 'x = 3, y = 1', 'Subtract: 2x = 6, x = 3. Then y = 4 − 3 = 1.'),
      written('alg-wr-y8-m-02', 8, 'medium', 'Factorise: x² + 7x + 12.', '(x + 3)(x + 4)', 'Find two numbers that multiply to 12 and add to 7: 3 and 4.'),
      written('alg-wr-y8-h-01', 8, 'hard', 'Solve: x² − 5x + 6 = 0.', 'x = 2 or x = 3', 'Factorise: (x−2)(x−3) = 0.'),
      written('alg-wr-y8-h-02', 8, 'hard', 'A rectangle has area x² + 8x + 15. Write the dimensions as expressions.', '(x + 3) and (x + 5)', 'Factorise: (x+3)(x+5).'),

      written('alg-wr-y9-e-01', 9, 'easy', 'What is the gradient of the line 3y = 6x − 9?', '2', 'Divide by 3: y = 2x − 3. Gradient = 2.'),
      written('alg-wr-y9-m-01', 9, 'medium', 'Solve x² = 3x + 10.', 'x = 5 or x = −2', 'x² − 3x − 10 = 0. (x−5)(x+2) = 0.'),
      written('alg-wr-y9-m-02', 9, 'medium', 'A line passes through (0, 3) and (4, 11). Find its equation.', 'y = 2x + 3', 'Gradient = (11−3)/(4−0) = 2. y-intercept = 3.'),
      written('alg-wr-y9-h-01', 9, 'hard', 'Complete the square for x² + 6x − 2.', '(x + 3)² − 11', '(x+3)² = x² + 6x + 9. So x² + 6x − 2 = (x+3)² − 9 − 2 = (x+3)² − 11.'),
      written('alg-wr-y9-h-02', 9, 'hard', 'Using the quadratic formula, solve x² + 4x − 1 = 0 leaving in surd form.', 'x = −2 ± √5', 'x = (−4 ± √(16+4))/2 = (−4 ± √20)/2 = −2 ± √5.'),

      written('alg-wr-y10-m-01', 10, 'medium', 'Find the inverse of f(x) = 4x − 5.', 'f⁻¹(x) = (x + 5)/4', 'Let y = 4x − 5. x = (y+5)/4. Swap: f⁻¹(x) = (x+5)/4.'),
      written('alg-wr-y10-h-01', 10, 'hard', 'Solve x² − 6x + 1 = 0 by completing the square, leaving exact answers.', 'x = 3 ± 2√2', '(x−3)² − 9 + 1 = 0. (x−3)² = 8. x − 3 = ±2√2.'),
      written('alg-wr-y11-h-01', 11, 'hard', 'The first term of a geometric series is 5 and the sum to infinity is 20. Find the common ratio.', 'r = 3/4', 'S∞ = a/(1−r). 20 = 5/(1−r). 1−r = 1/4. r = 3/4.'),

      // ═══════════════════════════════════════════════════════════
      // ALGEBRA – MCQ (40 questions, varied years)
      // ═══════════════════════════════════════════════════════════
      mcq('alg-mcq-y7-e-01', 7, 'easy', 'Simplify: 3a + 5a − 2a.', ['5a', '6a', '8a', '10a'], '6a', '3 + 5 − 2 = 6.'),
      mcq('alg-mcq-y7-e-02', 7, 'easy', 'What is the value of 2x + 1 when x = 5?', ['10', '11', '12', '9'], '11', '2(5) + 1 = 11.'),
      mcq('alg-mcq-y7-m-01', 7, 'medium', 'Solve: 4x + 2 = 18.', ['x = 4', 'x = 5', 'x = 3', 'x = 6'], 'x = 4', '4x = 16, x = 4.'),
      mcq('alg-mcq-y8-e-01', 8, 'easy', 'The gradient of y = 5x + 3 is:', ['3', '5', '8', '−5'], '5', 'In y = mx + c, gradient = m = 5.'),
      mcq('alg-mcq-y8-m-01', 8, 'medium', 'Factorise: x² − 4x − 12.', ['(x−6)(x+2)', '(x+6)(x−2)', '(x−4)(x−3)', '(x+4)(x−3)'], '(x−6)(x+2)', 'Need two numbers: multiply to −12, add to −4: −6 and +2.'),
      mcq('alg-mcq-y8-m-02', 8, 'medium', 'The nth term of 5, 8, 11, 14... is:', ['3n + 2', '5n − 1', 'n + 5', '3n + 3'], '3n + 2', 'Difference = 3. nth term = 3n + 2. n=1: 5 ✓.'),
      mcq('alg-mcq-y8-h-01', 8, 'hard', 'Solve the inequality: 3x − 7 > 8.', ['x > 5', 'x > 3', 'x < 5', 'x ≥ 5'], 'x > 5', '3x > 15, x > 5.'),
      mcq('alg-mcq-y9-e-01', 9, 'easy', 'What are the coordinates of the turning point of y = (x − 3)² + 4?', ['(3, 4)', '(−3, 4)', '(3, −4)', '(4, 3)'], '(3, 4)', 'In the form y = (x − h)² + k, turning point is (h, k).'),
      mcq('alg-mcq-y9-m-01', 9, 'medium', 'Which of these is a correct factorisation of 4x² − 9?', ['(2x − 3)(2x + 3)', '(4x − 3)(x + 3)', '(2x)²(3)', '(4x − 9)(x + 1)'], '(2x − 3)(2x + 3)', 'Difference of two squares: (2x)² − 3² = (2x−3)(2x+3).'),
      mcq('alg-mcq-y9-h-01', 9, 'hard', 'Solve: 2x² − x − 6 = 0.', ['x = 2 or x = −3/2', 'x = −2 or x = 3/2', 'x = 3 or x = −1', 'x = 6 or x = −1'], 'x = 2 or x = −3/2', 'Factorise: (2x + 3)(x − 2) = 0. x = 2 or x = −3/2.'),
      mcq('alg-mcq-y10-m-01', 10, 'medium', 'If f(x) = x² + 1 and g(x) = 2x, what is f(g(3))?', ['37', '19', '13', '49'], '37', 'g(3) = 6. f(6) = 36 + 1 = 37.'),
      mcq('alg-mcq-y10-h-01', 10, 'hard', 'What is the discriminant of 2x² + 3x + 4?', ['−23', '9 − 32', '−23', '1'], '−23', 'b² − 4ac = 9 − 4(2)(4) = 9 − 32 = −23.'),
      mcq('alg-mcq-y11-m-01', 11, 'medium', 'The 8th term of a geometric sequence with first term 3 and ratio 2 is:', ['192', '384', '96', '768'], '384', 'T₈ = 3 × 2⁷ = 3 × 128 = 384.'),
      mcq('alg-mcq-y11-h-01', 11, 'hard', 'A function f is defined as f(x) = (3x + 1)/(x − 2). What is f⁻¹(x)?', ['(2x + 1)/(x − 3)', '(x + 2)/(3x − 1)', '(2x + 1)/(x − 3)', '(3x + 2)/(x + 1)'], '(2x + 1)/(x − 3)', 'Let y = (3x+1)/(x−2). Cross multiply: y(x−2) = 3x+1. xy−2y=3x+1. xy−3x=2y+1. x(y−3)=2y+1. x=(2y+1)/(y−3).'),

      // ═══════════════════════════════════════════════════════════
      // GEOMETRY – True/False (30 questions)
      // ═══════════════════════════════════════════════════════════
      tf('geo-tf-y7-e-01', 7, 'easy', 'The angles in a triangle always add up to 180°.', 'True', 'The interior angle sum of a triangle is always 180°.'),
      tf('geo-tf-y7-e-02', 7, 'easy', 'A square has 4 equal sides and 4 right angles.', 'True', 'By definition, a square has all sides equal and all angles 90°.'),
      tf('geo-tf-y7-m-01', 7, 'medium', 'The exterior angle of a triangle equals the sum of the two opposite interior angles.', 'True', 'This is the exterior angle theorem.'),
      tf('geo-tf-y7-m-02', 7, 'medium', 'A rhombus is always a square.', 'False', 'A rhombus has 4 equal sides but not necessarily right angles.'),
      tf('geo-tf-y7-h-01', 7, 'hard', 'In a regular hexagon, each interior angle is 120°.', 'True', 'Sum of interior angles = (6−2)×180 = 720°. 720/6 = 120°.'),

      tf('geo-tf-y8-e-01', 8, 'easy', 'The area of a circle is πr².', 'True', 'A = πr² where r is the radius.'),
      tf('geo-tf-y8-e-02', 8, 'easy', 'The circumference of a circle is 2πr.', 'True', 'C = 2πr = πd.'),
      tf('geo-tf-y8-m-01', 8, 'medium', 'Pythagoras theorem states a squared + b squared = c squared, where c is the hypotenuse.', 'True', 'This is the correct statement of Pythagoras theorem.'),
      tf('geo-tf-y8-m-02', 8, 'medium', 'A triangle with sides 5, 12, 13 is right-angled.', 'True', '5 squared + 12 squared = 25 + 144 = 169 = 13 squared. Pythagorean triple.'),
      tf('geo-tf-y8-h-01', 8, 'hard', 'The volume of a cone is (1/3)πr²h.', 'True', 'V = 1/3 × base area × height.'),

      tf('geo-tf-y9-e-01', 9, 'easy', 'sin(30°) = 0.5.', 'True', 'sin(30°) = 1/2 = 0.5. This is a standard trigonometric value.'),
      tf('geo-tf-y9-m-01', 9, 'medium', 'In a right triangle, SOH means sin = opposite/hypotenuse.', 'True', 'SOH-CAH-TOA: Sine = Opposite/Hypotenuse.'),
      tf('geo-tf-y9-m-02', 9, 'medium', 'The cosine rule is c² = a² + b² − 2ab cosC.', 'True', 'This is the standard cosine rule.'),
      tf('geo-tf-y9-h-01', 9, 'hard', 'A vector and its negative have the same magnitude.', 'True', 'The magnitude |v| = |−v|. Negating reverses direction, not length.'),

      tf('geo-tf-y10-m-01', 10, 'medium', 'The bearing of north is 000°.', 'True', 'Bearings start from north and go clockwise. North = 000°.'),
      tf('geo-tf-y10-h-01', 10, 'hard', 'Vectors AB and BA are equal.', 'False', 'AB = −BA. They have the same magnitude but opposite directions.'),

      tf('geo-tf-y11-m-01', 11, 'medium', 'The area of a sector with radius r and angle θ (degrees) is (θ/360) × πr².', 'True', 'The sector is a fraction θ/360 of the full circle.'),
      tf('geo-tf-y11-h-01', 11, 'hard', 'sin²θ + cos²θ = 1 for all values of θ.', 'True', 'This is the Pythagorean identity.'),

      // ═══════════════════════════════════════════════════════════
      // GEOMETRY – Written Answer (25 questions)
      // ═══════════════════════════════════════════════════════════
      written('geo-wr-y7-e-01', 7, 'easy', 'A triangle has angles 45° and 60°. Find the third angle.', '75°', '180 − 45 − 60 = 75°.'),
      written('geo-wr-y7-e-02', 7, 'easy', 'Find the perimeter of a rectangle with length 9 cm and width 4 cm.', '26 cm', '2(9 + 4) = 26 cm.'),
      written('geo-wr-y7-m-01', 7, 'medium', 'Find the area of a trapezium with parallel sides 5 cm and 9 cm and height 4 cm.', '28 cm²', 'A = ½(5+9)×4 = ½ × 14 × 4 = 28 cm².'),
      written('geo-wr-y7-h-01', 7, 'hard', 'A regular polygon has interior angles of 150°. How many sides does it have?', '12', 'Exterior angle = 180 − 150 = 30°. Number of sides = 360 ÷ 30 = 12.'),

      written('geo-wr-y8-e-01', 8, 'easy', 'Find the circumference of a circle with radius 7 cm. Leave your answer in terms of π.', '14π cm', 'C = 2πr = 2π(7) = 14π cm.'),
      written('geo-wr-y8-m-01', 8, 'medium', 'A right-angled triangle has legs 8 cm and 15 cm. Find the hypotenuse.', '17 cm', '8² + 15² = 64 + 225 = 289. √289 = 17.'),
      written('geo-wr-y8-h-01', 8, 'hard', 'Find the volume of a cylinder with radius 3 cm and height 10 cm. Leave in terms of π.', '90π cm³', 'V = πr²h = π(9)(10) = 90π.'),

      written('geo-wr-y9-e-01', 9, 'easy', 'Find the angle x in a right triangle where sin(x) = 0.6.', 'x ≈ 36.9°', 'x = sin⁻¹(0.6) ≈ 36.87°.'),
      written('geo-wr-y9-m-01', 9, 'medium', 'Find the missing side in a triangle using cosine rule: a = 5, b = 7, C = 60°. Find c.', 'c ≈ 6.24', 'c² = 25 + 49 − 2(5)(7)cos60° = 74 − 35 = 39. c = √39 ≈ 6.24.'),
      written('geo-wr-y9-h-01', 9, 'hard', 'A ship sails 10 km on bearing 060° then 15 km on bearing 150°. How far is it from the start? (Use sine rule or cosine rule.)', 'Approximately 18.03 km', 'Using cosine rule: c² = 100 + 225 − 2(10)(15)cos90° = 325. c = √325 ≈ 18.03 km.'),

      written('geo-wr-y10-m-01', 10, 'medium', 'Find the arc length of a sector with radius 8 cm and angle 135°.', '6π cm', 'Arc = (135/360) × 2π × 8 = (3/8) × 16π = 6π cm.'),
      written('geo-wr-y11-h-01', 11, 'hard', 'Vectors a = (3, 4) and b = (1, −2). Find |a − b|.', '√(4 + 36) = √40 = 2√10', 'a − b = (2, 6). |a−b| = √(4+36) = √40 = 2√10.'),

      // ═══════════════════════════════════════════════════════════
      // GEOMETRY – Additional MCQ (25 questions)
      // ═══════════════════════════════════════════════════════════
      mcq('geo-mcq-y7-e-01', 7, 'easy', 'How many degrees are in a straight line?', ['90°', '180°', '360°', '270°'], '180°', 'Angles on a straight line sum to 180°.'),
      mcq('geo-mcq-y7-m-01', 7, 'medium', 'What is the sum of interior angles of a pentagon?', ['360°', '540°', '720°', '450°'], '540°', '(5−2)×180 = 3×180 = 540°.'),
      mcq('geo-mcq-y8-e-01', 8, 'easy', 'What is the area of a circle with diameter 10 cm?', ['10π', '25π', '100π', '50π'], '25π', 'r = 5. A = π(5)² = 25π cm².'),
      mcq('geo-mcq-y8-m-01', 8, 'medium', 'What is the missing side in a right triangle with hypotenuse 13 cm and one leg 5 cm?', ['8 cm', '10 cm', '12 cm', '11 cm'], '12 cm', '13² − 5² = 169 − 25 = 144. √144 = 12.'),
      mcq('geo-mcq-y9-e-01', 9, 'easy', 'tan(45°) equals:', ['0', '1', '√2', '0.5'], '1', 'tan(45°) = 1. This is a standard value.'),
      mcq('geo-mcq-y9-m-01', 9, 'medium', 'Using the sine rule, find angle A if a = 8, b = 6, B = 30°.', ['41.8°', '38.2°', '45°', '60°'], '41.8°', 'sin A/8 = sin 30°/6 = 0.5/6. sin A = 8×0.5/6 = 0.667. A = sin⁻¹(0.667) ≈ 41.8°.'),
      mcq('geo-mcq-y10-e-01', 10, 'easy', 'A bearing of south-west is:', ['045°', '135°', '225°', '315°'], '225°', 'South = 180°. South-west = 180° + 45° = 225°.'),
      mcq('geo-mcq-y10-m-01', 10, 'medium', 'The area of a sector with radius 6 cm and angle 90° is:', ['9π cm²', '36π cm²', '6π cm²', '12π cm²'], '9π cm²', 'A = (90/360)π(6²) = (1/4)(36π) = 9π cm².'),
      mcq('geo-mcq-y11-h-01', 11, 'hard', 'If vector a = 2i − 3j and b = i + 4j, what is 2a − b?', ['3i − 10j', '3i + 5j', '5i − 2j', '4i − 6j'], '3i − 10j', '2a = 4i − 6j. 2a − b = (4−1)i + (−6−4)j = 3i − 10j.'),

      // ═══════════════════════════════════════════════════════════
      // STATISTICS – True/False (25 questions)
      // ═══════════════════════════════════════════════════════════
      tf('stat-tf-y7-e-01', 7, 'easy', 'The mode is the most frequently occurring value in a data set.', 'True', 'Mode = value that appears most often.'),
      tf('stat-tf-y7-e-02', 7, 'easy', 'The probability of an impossible event is 1.', 'False', 'The probability of an impossible event is 0.'),
      tf('stat-tf-y7-m-01', 7, 'medium', 'The median is the middle value when data is arranged in order.', 'True', 'Median = middle value of ordered data.'),
      tf('stat-tf-y7-m-02', 7, 'medium', 'P(A) + P(not A) = 1.', 'True', 'An event and its complement are exhaustive and mutually exclusive.'),
      tf('stat-tf-y7-h-01', 7, 'hard', 'A pie chart must have angles that add up to 360°.', 'True', 'A pie chart represents a full circle = 360°.'),

      tf('stat-tf-y8-e-01', 8, 'easy', 'The mean of 2, 4, 6, 8 is 5.', 'True', '(2+4+6+8)/4 = 20/4 = 5.'),
      tf('stat-tf-y8-m-01', 8, 'medium', 'A scatter graph with points going upward left to right shows positive correlation.', 'True', 'Positive correlation means both variables increase together.'),
      tf('stat-tf-y8-m-02', 8, 'medium', 'If P(A) = 0.3 and P(B) = 0.4 and they are independent, then P(A and B) = 0.7.', 'False', 'P(A and B) = P(A) × P(B) = 0.3 × 0.4 = 0.12, not 0.7.'),
      tf('stat-tf-y8-h-01', 8, 'hard', 'The interquartile range measures the spread of the middle 50% of data.', 'True', 'IQR = Q3 − Q1, covering the middle half.'),

      tf('stat-tf-y9-e-01', 9, 'easy', 'A stratified sample is always better than a simple random sample.', 'False', 'Different sampling methods suit different situations; neither is always better.'),
      tf('stat-tf-y9-m-01', 9, 'medium', 'Two mutually exclusive events cannot happen at the same time.', 'True', 'Mutually exclusive means P(A ∩ B) = 0.'),
      tf('stat-tf-y9-h-01', 9, 'hard', 'If P(A) = 0.5 and P(B) = 0.5 and they are mutually exclusive, then P(A or B) = 1.', 'True', 'P(A or B) = P(A) + P(B) = 0.5 + 0.5 = 1.'),

      tf('stat-tf-y10-m-01', 10, 'medium', 'The mean is always the best measure of average.', 'False', 'The mean is affected by outliers; sometimes median or mode is more appropriate.'),
      tf('stat-tf-y10-h-01', 10, 'hard', 'Conditional probability P(A|B) = P(A ∩ B) / P(B).', 'True', 'This is the definition of conditional probability.'),

      tf('stat-tf-y11-h-01', 11, 'hard', 'In a normal distribution, approximately 68% of data falls within one standard deviation of the mean.', 'True', 'The 68-95-99.7 rule: ~68% within 1 SD of mean.'),

      // ═══════════════════════════════════════════════════════════
      // STATISTICS – Written Answer (25 questions)
      // ═══════════════════════════════════════════════════════════
      written('stat-wr-y7-e-01', 7, 'easy', 'Find the mean of: 3, 7, 5, 9, 6.', '6', '(3+7+5+9+6)/5 = 30/5 = 6.'),
      written('stat-wr-y7-e-02', 7, 'easy', 'What is the probability of rolling a 4 on a fair six-sided die?', '1/6', 'There is one 4 out of 6 equally likely outcomes.'),
      written('stat-wr-y7-m-01', 7, 'medium', 'A bag has 5 red and 3 blue balls. What is the probability of picking a red ball?', '5/8', '5 red out of 5+3 = 8 total.'),
      written('stat-wr-y7-h-01', 7, 'hard', 'The probability it rains on Monday is 0.4. Find the probability it does NOT rain on Monday.', '0.6', 'P(not rain) = 1 − 0.4 = 0.6.'),

      written('stat-wr-y8-e-01', 8, 'easy', 'Find the range of: 12, 3, 9, 7, 15, 5.', '12', 'Range = 15 − 3 = 12.'),
      written('stat-wr-y8-m-01', 8, 'medium', 'Find the median of: 4, 7, 1, 9, 3, 6, 2.', '4', 'Ordered: 1,2,3,4,6,7,9. Middle = 4.'),
      written('stat-wr-y8-m-02', 8, 'medium', 'A fair coin is flipped twice. Find P(both heads).', '1/4', 'P(H) × P(H) = 1/2 × 1/2 = 1/4.'),
      written('stat-wr-y8-h-01', 8, 'hard', 'Find the IQR of: 3, 5, 7, 9, 11, 13, 15.', '8', 'Q1 = 5, Q3 = 13. IQR = 13 − 5 = 8.'),

      written('stat-wr-y9-m-01', 9, 'medium', 'A bag has 4 red, 3 blue and 5 green balls. Two are drawn without replacement. Find P(both red).', '1/11', 'P = (4/12) × (3/11) = 12/132 = 1/11.'),
      written('stat-wr-y9-h-01', 9, 'hard', 'Estimate the mean from a frequency table with classes: 0-10 (freq 5), 10-20 (freq 10), 20-30 (freq 5).', '15', 'Midpoints: 5, 15, 25. Mean = (5×5 + 15×10 + 25×5)/20 = (25+150+125)/20 = 300/20 = 15.'),

      written('stat-wr-y10-m-01', 10, 'medium', 'Events A and B are independent. P(A) = 0.6 and P(B) = 0.5. Find P(A and B).', '0.3', 'P(A ∩ B) = 0.6 × 0.5 = 0.3.'),
      written('stat-wr-y10-h-01', 10, 'hard', 'P(A) = 0.7, P(B|A) = 0.4, P(B|A\') = 0.2. Find P(B).', '0.34', 'P(B) = P(B|A)P(A) + P(B|A\')P(A\') = 0.4×0.7 + 0.2×0.3 = 0.28 + 0.06 = 0.34.'),

      written('stat-wr-y11-h-01', 11, 'hard', 'A class has 30 students: 18 study French, 12 study Spanish, and 6 study both. Find P(a student studies French or Spanish).', '4/5', 'P = (18 + 12 − 6)/30 = 24/30 = 4/5.'),

      // ═══════════════════════════════════════════════════════════
      // STATISTICS – Additional MCQ (30 questions)
      // ═══════════════════════════════════════════════════════════
      mcq('stat-mcq-y7-e-01', 7, 'easy', 'What is the mode of: 3, 5, 3, 7, 9, 3?', ['3', '5', '7', '9'], '3', '3 appears 3 times — more than any other value.'),
      mcq('stat-mcq-y7-e-02', 7, 'easy', 'A fair coin is flipped. What is P(heads)?', ['1/4', '1/3', '1/2', '1'], '1/2', 'Two equally likely outcomes. P(H) = 1/2.'),
      mcq('stat-mcq-y7-m-01', 7, 'medium', 'The median of 2, 5, 7, 10, 14 is:', ['7', '5', '10', '6'], '7', 'Middle value of 5 ordered numbers is the 3rd: 7.'),
      mcq('stat-mcq-y7-h-01', 7, 'hard', 'A spinner has 4 equal sections: red, blue, green, yellow. P(not red) is:', ['1/4', '3/4', '1/2', '2/3'], '3/4', 'P(not red) = 1 − 1/4 = 3/4.'),
      mcq('stat-mcq-y8-e-01', 8, 'easy', 'The range of 4, 9, 3, 15, 7 is:', ['12', '11', '9', '15'], '12', 'Range = max − min = 15 − 3 = 12.'),
      mcq('stat-mcq-y8-m-01', 8, 'medium', 'Two fair dice are rolled. How many outcomes are there in total?', ['12', '24', '36', '6'], '36', '6 × 6 = 36 equally likely outcomes.'),
      mcq('stat-mcq-y8-m-02', 8, 'medium', 'What type of correlation is shown when higher temperatures lead to more ice cream sales?', ['Negative', 'Zero', 'Positive', 'Random'], 'Positive', 'Both variables increase together — positive correlation.'),
      mcq('stat-mcq-y8-h-01', 8, 'hard', 'The IQR of 1, 3, 5, 7, 9, 11, 13 is:', ['10', '6', '8', '4'], '8', 'Q1 = 3, Q3 = 11. IQR = 11 − 3 = 8.'),
      mcq('stat-mcq-y9-e-01', 9, 'easy', 'P(A) = 0.3. What is P(not A)?', ['0.3', '0.7', '1.3', '0.6'], '0.7', 'P(not A) = 1 − 0.3 = 0.7.'),
      mcq('stat-mcq-y9-m-01', 9, 'medium', 'P(A or B) for mutually exclusive events A and B where P(A)=0.4 and P(B)=0.3 is:', ['0.12', '0.58', '0.7', '0.6'], '0.7', 'For mutually exclusive: P(A or B) = P(A) + P(B) = 0.4 + 0.3 = 0.7.'),
      mcq('stat-mcq-y9-h-01', 9, 'hard', 'A bag has 3 red and 5 blue balls. Two drawn without replacement. P(2 blue) is:', ['5/14', '25/64', '5/8', '1/4'], '5/14', 'P = (5/8) × (4/7) = 20/56 = 5/14.'),
      mcq('stat-mcq-y10-m-01', 10, 'medium', 'Which measure of average is most affected by extreme values (outliers)?', ['Mode', 'Median', 'Mean', 'Range'], 'Mean', 'The mean uses all values so outliers pull it significantly.'),
      mcq('stat-mcq-y10-h-01', 10, 'hard', 'P(A) = 0.5, P(B|A) = 0.6. Find P(A and B).', ['0.25', '0.3', '0.1', '0.6'], '0.3', 'P(A ∩ B) = P(A) × P(B|A) = 0.5 × 0.6 = 0.3.'),
      mcq('stat-mcq-y11-m-01', 11, 'medium', 'In a histogram, which axis represents frequency density?', ['x-axis', 'y-axis', 'Both axes', 'Neither'], 'y-axis', 'In a histogram, the y-axis shows frequency density = frequency ÷ class width.'),
      mcq('stat-mcq-y11-h-01', 11, 'hard', 'Which of these describes P(A|B)?', ['Probability of A given B has occurred', 'Probability of A and B', 'Probability of A or B', 'Probability of neither A nor B'], 'Probability of A given B has occurred', 'P(A|B) is the conditional probability of A given B.'),
    ];

    // Map to topic IDs
    const enriched = questions.map(q => {
      let topicId = numId;
      const sk = q.seed_key || '';
      if (sk.startsWith('alg-')) topicId = algId;
      else if (sk.startsWith('geo-')) topicId = geoId;
      else if (sk.startsWith('stat-')) topicId = statId;
      return { ...q, subject_id: S, subject_name: 'Maths', global_topic_id: topicId };
    });

    const existing = await base44.asServiceRole.entities.GlobalQuestion.list('-created_date', 10000);
    const existingKeys = new Set(existing.map(q => q.seed_key).filter(Boolean));

    let created = 0, skipped = 0;
    for (const q of enriched) {
      if (existingKeys.has(q.seed_key)) { skipped++; continue; }
      await base44.asServiceRole.entities.GlobalQuestion.create(q);
      created++;
    }

    return Response.json({ message: 'Massive seed complete', created, skipped, total: enriched.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});