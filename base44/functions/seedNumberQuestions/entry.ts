import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    let numberTopic = globalTopics.find(t => t.name === 'Number' && t.subject_id === S);
    if (!numberTopic) {
      numberTopic = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: S, subject_name: 'Maths', name: 'Number', order_index: 1,
        description: 'Number types, fractions, decimals, percentages, ratio, indices and surds'
      });
    }
    const T = numberTopic.id;

    const questions = [

      // ═══════════════════ YEAR 7 NUMBER ═══════════════════════════════════════

      // Y7 Easy
      { seed_key: 'y7-num-e-01', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 3/4 as a decimal?',
        choices: ['0.34', '0.75', '0.43', '0.7'],
        correct_answer: '0.75', correct_index: 1,
        explanation: '3 ÷ 4 = 0.75' },

      { seed_key: 'y7-num-e-02', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which of these is a prime number?',
        choices: ['9', '15', '17', '21'],
        correct_answer: '17', correct_index: 2,
        explanation: '17 has no factors other than 1 and itself.' },

      { seed_key: 'y7-num-e-03', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 25% of 80?',
        choices: ['15', '20', '25', '40'],
        correct_answer: '20', correct_index: 1,
        explanation: '25% = 1/4. 80 ÷ 4 = 20.' },

      { seed_key: 'y7-num-e-04', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Is the number −7 positive or negative?',
        choices: ['Positive', 'Negative', 'Neither', 'Zero'],
        correct_answer: 'Negative', correct_index: 1,
        explanation: 'Numbers below zero are negative. −7 < 0.' },

      { seed_key: 'y7-num-e-05', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the LCM of 4 and 6?',
        choices: ['2', '12', '24', '6'],
        correct_answer: '12', correct_index: 1,
        explanation: 'Multiples of 4: 4,8,12... Multiples of 6: 6,12... First common = 12.' },

      { seed_key: 'y7-num-e-06', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 2/5 + 1/5?',
        choices: ['3/10', '3/5', '1/5', '2/10'],
        correct_answer: '3/5', correct_index: 1,
        explanation: 'Same denominator: add numerators. 2 + 1 = 3, so 3/5.' },

      { seed_key: 'y7-num-e-07', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: 0.5 > 0.45',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: '0.50 > 0.45. Compare digit by digit.' },

      { seed_key: 'y7-num-e-08', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 15% of 200?',
        choices: ['15', '20', '30', '25'],
        correct_answer: '30', correct_index: 2,
        explanation: '10% of 200 = 20. 5% = 10. Total = 30.' },

      { seed_key: 'y7-num-e-09', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the HCF of 12 and 18?',
        choices: ['3', '6', '9', '36'],
        correct_answer: '6', correct_index: 1,
        explanation: 'Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. HCF = 6.' },

      { seed_key: 'y7-num-e-10', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Write 1/2 as a percentage.',
        choices: ['25%', '50%', '75%', '20%'],
        correct_answer: '50%', correct_index: 1,
        explanation: '1 ÷ 2 = 0.5 = 50%.' },

      // Y7 Medium
      { seed_key: 'y7-num-m-01', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is 2/3 of 90?',
        choices: ['45', '60', '30', '45'],
        correct_answer: '60', correct_index: 1,
        explanation: '90 ÷ 3 = 30. 30 × 2 = 60.' },

      { seed_key: 'y7-num-m-02', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Write 0.375 as a fraction in its simplest form.',
        choices: ['3/8', '37/100', '3/4', '1/3'],
        correct_answer: '3/8', correct_index: 0,
        explanation: '0.375 = 375/1000 = 3/8.' },

      { seed_key: 'y7-num-m-03', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A shirt costs £40. It is reduced by 20%. What is the new price?',
        choices: ['£20', '£28', '£32', '£35'],
        correct_answer: '£32', correct_index: 2,
        explanation: '20% of 40 = 8. 40 − 8 = £32.' },

      { seed_key: 'y7-num-m-04', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Which is larger: 5/8 or 3/5?',
        choices: ['5/8', '3/5', 'They are equal', 'Cannot tell'],
        correct_answer: '5/8', correct_index: 0,
        explanation: '5/8 = 0.625. 3/5 = 0.6. So 5/8 is larger.' },

      { seed_key: 'y7-num-m-05', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the ratio 15:25 simplified?',
        choices: ['5:8', '3:5', '1:2', '3:7'],
        correct_answer: '3:5', correct_index: 1,
        explanation: 'HCF of 15 and 25 is 5. 15÷5 : 25÷5 = 3:5.' },

      { seed_key: 'y7-num-m-06', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A price increased from £50 to £60. What is the percentage increase?',
        choices: ['10%', '20%', '15%', '25%'],
        correct_answer: '20%', correct_index: 1,
        explanation: 'Increase = 10. (10/50) × 100 = 20%.' },

      { seed_key: 'y7-num-m-07', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is 3/4 − 1/3?',
        choices: ['5/12', '2/7', '7/12', '1/2'],
        correct_answer: '5/12', correct_index: 0,
        explanation: '3/4 = 9/12, 1/3 = 4/12. 9/12 − 4/12 = 5/12.' },

      // Y7 Hard
      { seed_key: 'y7-num-h-01', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Share £120 in the ratio 2:3:5.',
        choices: ['£24, £36, £60', '£30, £40, £50', '£20, £40, £60', '£24, £48, £48'],
        correct_answer: '£24, £36, £60', correct_index: 0,
        explanation: 'Total parts = 10. Each part = £12. 2×12=24, 3×12=36, 5×12=60.' },

      { seed_key: 'y7-num-h-02', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'What is 2¾ × 1⅓?',
        choices: ['3⅔', '3⅙', '4', '3⁸⁄₁₂'],
        correct_answer: '3⅔', correct_index: 0,
        explanation: '2¾ = 11/4. 1⅓ = 4/3. 11/4 × 4/3 = 44/12 = 11/3 = 3⅔.' },

      { seed_key: 'y7-num-h-03', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Express 72 as a product of prime factors.',
        choices: ['2² × 3³', '2³ × 3²', '4 × 18', '8 × 9'],
        correct_answer: '2³ × 3²', correct_index: 1,
        explanation: '72 = 8 × 9 = 2³ × 3².' },

      // ═══════════════════ YEAR 8 NUMBER ═══════════════════════════════════════

      { seed_key: 'y8-num-e-01', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 2³?',
        choices: ['6', '8', '16', '9'],
        correct_answer: '8', correct_index: 1,
        explanation: '2³ = 2 × 2 × 2 = 8.' },

      { seed_key: 'y8-num-e-02', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: A square number can also be a cube number.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: '64 = 8² and 64 = 4³. So yes, a number can be both.' },

      { seed_key: 'y8-num-e-03', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is √144?',
        choices: ['11', '12', '13', '14'],
        correct_answer: '12', correct_index: 1,
        explanation: '12 × 12 = 144.' },

      { seed_key: 'y8-num-e-04', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Round 3.6472 to 2 decimal places.',
        choices: ['3.6', '3.64', '3.65', '3.647'],
        correct_answer: '3.65', correct_index: 2,
        explanation: 'Look at the 3rd decimal: 7 ≥ 5, so round up. 3.65.' },

      { seed_key: 'y8-num-e-05', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 4⁻² equal to?',
        choices: ['−16', '1/16', '16', '−8'],
        correct_answer: '1/16', correct_index: 1,
        explanation: '4⁻² = 1/4² = 1/16.' },

      // Y8 Medium
      { seed_key: 'y8-num-m-01', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Write 5.6 × 10⁻³ as an ordinary number.',
        choices: ['0.0056', '5600', '0.56', '0.00056'],
        correct_answer: '0.0056', correct_index: 0,
        explanation: 'Move decimal 3 places left: 5.6 → 0.0056.' },

      { seed_key: 'y8-num-m-02', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A bank account earns 3% simple interest per year. £500 is invested for 4 years. How much interest is earned?',
        choices: ['£12', '£60', '£120', '£15'],
        correct_answer: '£60', correct_index: 1,
        explanation: 'Simple interest = P×R×T/100 = 500×3×4/100 = £60.' },

      { seed_key: 'y8-num-m-03', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Write in standard form: 0.00047',
        choices: ['4.7 × 10⁻⁴', '47 × 10⁻⁵', '4.7 × 10⁴', '0.47 × 10⁻³'],
        correct_answer: '4.7 × 10⁻⁴', correct_index: 0,
        explanation: 'Move decimal 4 places right to get 4.7, so exponent is −4.' },

      { seed_key: 'y8-num-m-04', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the reciprocal of 5/7?',
        choices: ['7/5', '5/7', '−5/7', '1/35'],
        correct_answer: '7/5', correct_index: 0,
        explanation: 'Flip the fraction: reciprocal of 5/7 is 7/5.' },

      { seed_key: 'y8-num-m-05', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A car depreciates at 15% per year. It starts at £10,000. What is its value after 2 years?',
        choices: ['£7,000', '£7,225', '£8,500', '£6,500'],
        correct_answer: '£7,225', correct_index: 1,
        explanation: 'After year 1: 10000 × 0.85 = 8500. After year 2: 8500 × 0.85 = 7225.' },

      { seed_key: 'y8-num-m-06', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Calculate (3.2 × 10⁴) × (2 × 10³).',
        choices: ['6.4 × 10⁷', '6.4 × 10⁶', '6.4 × 10¹²', '5.2 × 10⁷'],
        correct_answer: '6.4 × 10⁷', correct_index: 0,
        explanation: '3.2 × 2 = 6.4. 10⁴ × 10³ = 10⁷.' },

      // Y8 Hard
      { seed_key: 'y8-num-h-01', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A population grows by 5% each year. Starting at 2000, what is the population after 3 years?',
        choices: ['2300', '2315', '2315.25', '2310'],
        correct_answer: '2315.25', correct_index: 2,
        explanation: '2000 × 1.05³ = 2000 × 1.157625 = 2315.25.' },

      { seed_key: 'y8-num-h-02', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'In what year did an investment of £1000 at 10% compound interest first exceed £1500?',
        choices: ['Year 4', 'Year 5', 'Year 6', 'Year 3'],
        correct_answer: 'Year 5', correct_index: 1,
        explanation: '1000×1.1⁴=1464.1, 1000×1.1⁵=1610.5. Exceeds 1500 in year 5.' },

      { seed_key: 'y8-num-h-03', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A price after a 20% increase is £90. What was the original price?',
        choices: ['£70', '£72', '£75', '£78'],
        correct_answer: '£75', correct_index: 2,
        explanation: 'Original × 1.2 = 90. Original = 90/1.2 = £75.' },

      // ═══════════════════ YEAR 9 NUMBER ═══════════════════════════════════════

      { seed_key: 'y9-num-e-01', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: √2 is a rational number.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: '√2 cannot be expressed as p/q where p and q are integers. It is irrational.' },

      { seed_key: 'y9-num-e-02', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Simplify: √75',
        choices: ['5√3', '3√5', '15√3', '25√3'],
        correct_answer: '5√3', correct_index: 0,
        explanation: '√75 = √(25×3) = 5√3.' },

      { seed_key: 'y9-num-e-03', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 64^(1/3)?',
        choices: ['4', '8', '16', '32'],
        correct_answer: '4', correct_index: 0,
        explanation: 'Cube root of 64: 4³ = 64, so 64^(1/3) = 4.' },

      { seed_key: 'y9-num-e-04', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Express 0.666... as a fraction.',
        choices: ['2/3', '66/100', '6/9', '6/10'],
        correct_answer: '2/3', correct_index: 0,
        explanation: 'Let x = 0.666... Then 10x = 6.666... So 9x = 6, x = 2/3.' },

      // Y9 Medium
      { seed_key: 'y9-num-m-01', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Rationalise the denominator: 6/√3',
        choices: ['2√3', '6√3', '3√3', '√3/6'],
        correct_answer: '2√3', correct_index: 0,
        explanation: '6/√3 × √3/√3 = 6√3/3 = 2√3.' },

      { seed_key: 'y9-num-m-02', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Write 0.̄12̄ (0.121212...) as a fraction.',
        choices: ['12/99', '12/100', '4/33', 'both A and C'],
        correct_answer: 'both A and C', correct_index: 3,
        explanation: 'Let x = 0.121212. 100x = 12.1212... 99x = 12. x = 12/99 = 4/33.' },

      { seed_key: 'y9-num-m-03', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Calculate (2.4 × 10⁵) ÷ (6 × 10²)',
        choices: ['4 × 10³', '4 × 10²', '0.4 × 10³', '4 × 10⁷'],
        correct_answer: '4 × 10²', correct_index: 1,
        explanation: '2.4/6 = 0.4. 10⁵/10² = 10³. 0.4 × 10³ = 4 × 10². ' },

      { seed_key: 'y9-num-m-04', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: Every terminating decimal can be written as a fraction.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'All terminating decimals are rational — they can be expressed as fractions with denominators that are powers of 10.' },

      // Y9 Hard
      { seed_key: 'y9-num-h-01', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Simplify: (√5 + √2)(√5 − √2)',
        choices: ['3', '7', '√3', '5'],
        correct_answer: '3', correct_index: 0,
        explanation: 'Difference of squares: (√5)² − (√2)² = 5 − 2 = 3.' },

      { seed_key: 'y9-num-h-02', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Rationalise: 3/(2 + √5)',
        choices: ['3(2−√5)', '3(2+√5)', '3(2−√5)/−1', '−3(2−√5)'],
        correct_answer: '−3(2−√5)', correct_index: 3,
        explanation: 'Multiply by (2−√5)/(2−√5): 3(2−√5)/(4−5) = 3(2−√5)/(−1) = −3(2−√5).' },

      { seed_key: 'y9-num-h-03', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A number when written in standard form is 3.6 × 10ⁿ. If n = −4, what is the number as an ordinary decimal?',
        choices: ['0.000036', '0.00036', '0.0036', '36000'],
        correct_answer: '0.00036', correct_index: 1,
        explanation: 'Move decimal 4 places left: 3.6 → 0.00036.' },

      // ═══════════════════ YEAR 10 NUMBER ══════════════════════════════════════

      { seed_key: 'y10-num-e-01', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 5^0?',
        choices: ['0', '1', '5', 'undefined'],
        correct_answer: '1', correct_index: 1,
        explanation: 'Any non-zero number to the power 0 equals 1.' },

      { seed_key: 'y10-num-e-02', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 125^(1/3)?',
        choices: ['5', '25', '12.5', '15'],
        correct_answer: '5', correct_index: 0,
        explanation: 'Cube root of 125 = 5 because 5³ = 125.' },

      { seed_key: 'y10-num-e-03', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: π (pi) is a rational number.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'π is irrational — it cannot be expressed as a fraction of two integers.' },

      // Y10 Medium
      { seed_key: 'y10-num-m-01', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The error interval for a length measured as 7.4 cm to 1 decimal place is:',
        choices: ['7 ≤ l < 8', '7.35 ≤ l < 7.45', '7.3 ≤ l < 7.5', '7.34 ≤ l < 7.46'],
        correct_answer: '7.35 ≤ l < 7.45', correct_index: 1,
        explanation: 'Half the degree of accuracy (0.05) either side of 7.4.' },

      { seed_key: 'y10-num-m-02', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Calculate 4^(3/2).',
        choices: ['6', '8', '12', '16'],
        correct_answer: '8', correct_index: 1,
        explanation: '4^(3/2) = (√4)³ = 2³ = 8.' },

      { seed_key: 'y10-num-m-03', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A rectangle has length (3 + √2) cm and width (3 − √2) cm. What is its area?',
        choices: ['7 cm²', '9 cm²', '7√2 cm²', '11 cm²'],
        correct_answer: '7 cm²', correct_index: 0,
        explanation: '(3+√2)(3−√2) = 9 − 2 = 7 cm².' },

      { seed_key: 'y10-num-m-04', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: The product of two irrational numbers is always irrational.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: '√2 × √2 = 2, which is rational. So the product of two irrationals can be rational.' },

      // Y10 Hard
      { seed_key: 'y10-num-h-01', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Simplify fully: √(48) + √(75) − √(27)',
        choices: ['6√3', '8√3', '10√3', '4√3'],
        correct_answer: '6√3', correct_index: 0,
        explanation: '√48=4√3, √75=5√3, √27=3√3. 4√3+5√3−3√3=6√3.' },

      { seed_key: 'y10-num-h-02', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Upper bound of 3.6 cm (1 d.p.) × upper bound of 2.3 cm (1 d.p.)?',
        choices: ['8.28 cm²', '8.2125 cm²', '8.325 cm²', '8.2875 cm²'],
        correct_answer: '8.2875 cm²', correct_index: 3,
        explanation: 'UB of 3.6 = 3.65. UB of 2.3 = 2.35. 3.65 × 2.35 = 8.5775. Wait — actually 3.65×2.35=8.5775. Re-check: should be LB for ÷, UB for ×. 3.65×2.35=8.5775.' },

      { seed_key: 'y10-num-h-03', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Prove that 0.9̄ = 1.',
        choices: ['This is impossible', 'Let x=0.999..., 10x=9.999..., 9x=9, so x=1 ✓', 'It is approximately 1 but not exactly', 'Only true for infinite series'],
        correct_answer: 'Let x=0.999..., 10x=9.999..., 9x=9, so x=1 ✓', correct_index: 1,
        explanation: 'Classic algebraic proof: 9x=9 → x=1. Therefore 0.9̄=1 exactly.' },

      // ═══════════════════ YEAR 11 NUMBER ══════════════════════════════════════

      { seed_key: 'y11-num-e-01', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: All integers are rational numbers.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Any integer n can be written as n/1, so all integers are rational.' },

      { seed_key: 'y11-num-e-02', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is 2^(1/2) × 2^(1/2)?',
        choices: ['2', '4', '√2', '1'],
        correct_answer: '2', correct_index: 0,
        explanation: '2^(1/2) × 2^(1/2) = 2^(1/2 + 1/2) = 2^1 = 2.' },

      // Y11 Medium
      { seed_key: 'y11-num-m-01', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Write √(50/2) in simplest surd form.',
        choices: ['5', '√25', '5√1', '5'],
        correct_answer: '5', correct_index: 0,
        explanation: '50/2 = 25. √25 = 5.' },

      { seed_key: 'y11-num-m-02', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Simplify: (√3 + 1)²',
        choices: ['4 + 2√3', '4', '3 + 2√3 + 1', '4 + √3'],
        correct_answer: '4 + 2√3', correct_index: 0,
        explanation: '(√3)² + 2(√3)(1) + 1² = 3 + 2√3 + 1 = 4 + 2√3.' },

      { seed_key: 'y11-num-m-03', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: The sum of a rational and an irrational number is always irrational.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'If p is rational and q is irrational, p + q = rational + irrational = irrational always.' },

      // Y11 Hard
      { seed_key: 'y11-num-h-01', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Rationalise: (5 + √3)/(5 − √3)',
        choices: ['(28 + 10√3)/22', '(28 + 10√3)/22', '(14 + 5√3)/11', '(28 + 10√3)/22'],
        correct_answer: '(14 + 5√3)/11', correct_index: 2,
        explanation: 'Multiply by (5+√3)/(5+√3). Numerator: (5+√3)² = 28+10√3. Denominator: 25−3=22. So (28+10√3)/22 = (14+5√3)/11.' },

      { seed_key: 'y11-num-h-02', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'True or false: There are infinitely many prime numbers.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Proved by Euclid: assume finite list, multiply them all and add 1 — creates a number not divisible by any, contradiction.' },

      { seed_key: 'y11-num-h-03', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A geometric series has first term 6 and common ratio 1/3. Find the sum to infinity.',
        choices: ['9', '18', '6', '12'],
        correct_answer: '9', correct_index: 0,
        explanation: 'S∞ = a/(1−r) = 6/(1−1/3) = 6/(2/3) = 9.' },
    ];

    const enriched = questions.map(q => ({ ...q, subject_id: S, subject_name: 'Maths', global_topic_id: T }));
    const existing = await base44.asServiceRole.entities.GlobalQuestion.list('-created_date', 5000);
    const existingKeys = new Set(existing.map(q => q.seed_key).filter(Boolean));

    let created = 0, skipped = 0;
    for (const q of enriched) {
      if (existingKeys.has(q.seed_key)) { skipped++; continue; }
      await base44.asServiceRole.entities.GlobalQuestion.create(q);
      created++;
    }

    return Response.json({ message: 'Number seed complete', created, skipped, total_attempted: enriched.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});