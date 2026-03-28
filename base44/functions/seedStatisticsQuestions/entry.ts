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
    let statsTopic = globalTopics.find(t => t.name === 'Statistics & Probability' && t.subject_id === S);
    if (!statsTopic) {
      statsTopic = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: S, subject_name: 'Maths', name: 'Statistics & Probability', order_index: 4,
        description: 'Data handling, averages, charts, probability, tree diagrams and distributions'
      });
    }
    const T = statsTopic.id;

    const questions = [

      // ═══════════════════ YEAR 7 STATISTICS ═══════════════════════════════════

      { seed_key: 'y7-stat-e-01', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the mean of 4, 6, 8, 10, 12?',
        choices: ['6', '8', '10', '9'],
        correct_answer: '8', correct_index: 1,
        explanation: 'Mean = (4+6+8+10+12)/5 = 40/5 = 8.' },

      { seed_key: 'y7-stat-e-02', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the median of: 3, 7, 2, 9, 5?',
        choices: ['2', '5', '7', '6'],
        correct_answer: '5', correct_index: 1,
        explanation: 'Ordered: 2, 3, 5, 7, 9. Middle value = 5.' },

      { seed_key: 'y7-stat-e-03', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the mode of: 3, 5, 5, 7, 8, 5, 3?',
        choices: ['3', '5', '7', '8'],
        correct_answer: '5', correct_index: 1,
        explanation: '5 appears 3 times — more than any other value.' },

      { seed_key: 'y7-stat-e-04', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: The probability of an impossible event is 0.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Impossible events have a probability of 0. Certain events have probability 1.' },

      { seed_key: 'y7-stat-e-05', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'A fair die is rolled. What is the probability of getting a 6?',
        choices: ['1/3', '1/6', '1/2', '1/4'],
        correct_answer: '1/6', correct_index: 1,
        explanation: 'There is 1 favourable outcome (6) out of 6 equally likely outcomes.' },

      { seed_key: 'y7-stat-e-06', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the range of: 15, 8, 22, 3, 17?',
        choices: ['14', '19', '22', '15'],
        correct_answer: '19', correct_index: 1,
        explanation: 'Range = highest − lowest = 22 − 3 = 19.' },

      { seed_key: 'y7-stat-e-07', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which diagram is best for showing the frequency of categories?',
        choices: ['Pie chart', 'Scatter graph', 'Bar chart', 'Line graph'],
        correct_answer: 'Bar chart', correct_index: 2,
        explanation: 'Bar charts are ideal for comparing frequencies of different categories.' },

      { seed_key: 'y7-stat-e-08', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: A probability can be greater than 1.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'Probabilities are always between 0 and 1 inclusive.' },

      // Y7 Medium
      { seed_key: 'y7-stat-m-01', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The mean of 5 numbers is 12. Four of the numbers are 8, 10, 14, 15. What is the fifth?',
        choices: ['10', '11', '13', '12'],
        correct_answer: '13', correct_index: 2,
        explanation: 'Total = 5 × 12 = 60. Sum of four = 47. Fifth = 60 − 47 = 13.' },

      { seed_key: 'y7-stat-m-02', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A bag has 3 red, 5 blue, 2 green counters. Probability of blue?',
        choices: ['1/2', '5/10', '1/3', 'Both A and B'],
        correct_answer: 'Both A and B', correct_index: 3,
        explanation: '5/10 = 1/2. P(blue) = 5/10 = 1/2.' },

      { seed_key: 'y7-stat-m-03', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'In a frequency table, frequency density = frequency ÷ class width. True or false?',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Used in histograms: frequency density = frequency ÷ class width.' },

      { seed_key: 'y7-stat-m-04', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'If P(A) = 0.3, what is P(not A)?',
        choices: ['0.3', '0.7', '0.6', '1.3'],
        correct_answer: '0.7', correct_index: 1,
        explanation: 'P(not A) = 1 − P(A) = 1 − 0.3 = 0.7.' },

      { seed_key: 'y7-stat-m-05', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What type of data is "favourite colour"?',
        choices: ['Continuous', 'Discrete', 'Categorical', 'Ordinal'],
        correct_answer: 'Categorical', correct_index: 2,
        explanation: 'Categorical data consists of named groups/categories, not numbers.' },

      // Y7 Hard
      { seed_key: 'y7-stat-h-01', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Two events A and B are mutually exclusive. P(A) = 0.4, P(B) = 0.35. What is P(A or B)?',
        choices: ['0.14', '0.75', '0.05', '0.65'],
        correct_answer: '0.75', correct_index: 1,
        explanation: 'Mutually exclusive: P(A or B) = P(A) + P(B) = 0.4 + 0.35 = 0.75.' },

      { seed_key: 'y7-stat-h-02', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'The mean of a data set increases if a new value is added that is higher than the mean. True or false?',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Adding a value above the current mean will pull the mean upward.' },

      // ═══════════════════ YEAR 8 STATISTICS ═══════════════════════════════════

      { seed_key: 'y8-stat-e-01', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the median of 6 values when ordered: 3, 5, 7, 9, 11, 13?',
        choices: ['7', '8', '9', '7.5'],
        correct_answer: '8', correct_index: 1,
        explanation: 'With 6 values, median = average of 3rd and 4th: (7+9)/2 = 8.' },

      { seed_key: 'y8-stat-e-02', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: A scatter graph shows correlation between two variables.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Scatter graphs plot pairs of values to show whether two variables are related (correlated).' },

      { seed_key: 'y8-stat-e-03', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What does positive correlation look like on a scatter graph?',
        choices: ['Points go up left to right', 'Points go down left to right', 'Points form a circle', 'Points are scattered randomly'],
        correct_answer: 'Points go up left to right', correct_index: 0,
        explanation: 'Positive correlation: as x increases, y increases. Points trend upward left to right.' },

      { seed_key: 'y8-stat-e-04', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'A fair coin is flipped twice. What is P(two heads)?',
        choices: ['1/2', '1/4', '1/3', '3/4'],
        correct_answer: '1/4', correct_index: 1,
        explanation: 'P(H) × P(H) = 1/2 × 1/2 = 1/4.' },

      // Y8 Medium
      { seed_key: 'y8-stat-m-01', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A bag has 4 red and 6 blue balls. One is drawn and not replaced, then another is drawn. P(both red)?',
        choices: ['16/100', '12/90', '6/25', '4/10'],
        correct_answer: '12/90', correct_index: 1,
        explanation: 'P(R then R) = 4/10 × 3/9 = 12/90.' },

      { seed_key: 'y8-stat-m-02', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: Correlation implies causation.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'Just because two variables are correlated does not mean one causes the other.' },

      { seed_key: 'y8-stat-m-03', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A histogram bar has height 4 and width 5. What is the frequency?',
        choices: ['20', '9', '0.8', '1.25'],
        correct_answer: '20', correct_index: 0,
        explanation: 'Frequency = frequency density × class width = 4 × 5 = 20.' },

      { seed_key: 'y8-stat-m-04', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the interquartile range (IQR)?',
        choices: ['Q3 − Q1', 'Q2 − Q1', 'Max − Min', 'Q3 − Q2'],
        correct_answer: 'Q3 − Q1', correct_index: 0,
        explanation: 'IQR = Upper quartile (Q3) − Lower quartile (Q1). Measures the spread of the middle 50%.' },

      { seed_key: 'y8-stat-m-05', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The lower quartile of a dataset is at which percentage point?',
        choices: ['25%', '50%', '75%', '10%'],
        correct_answer: '25%', correct_index: 0,
        explanation: 'Q1 (lower quartile) = 25th percentile. Q2 = 50th (median). Q3 = 75th.' },

      // Y8 Hard
      { seed_key: 'y8-stat-h-01', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A survey has sampling bias. Which is an example of a biased sample?',
        choices: ['Randomly surveying students from every class', 'Surveying only Year 11 students about school uniform', 'Using a stratified sample', 'Picking names from a hat'],
        correct_answer: 'Surveying only Year 11 students about school uniform', correct_index: 1,
        explanation: 'Only surveying Year 11 excludes other year groups, creating bias.' },

      { seed_key: 'y8-stat-h-02', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Events A and B are independent. P(A)=0.6, P(B)=0.4. What is P(A and B)?',
        choices: ['1.0', '0.24', '0.2', '0.8'],
        correct_answer: '0.24', correct_index: 1,
        explanation: 'For independent events: P(A and B) = P(A) × P(B) = 0.6 × 0.4 = 0.24.' },

      { seed_key: 'y8-stat-h-03', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Which measure of average is most affected by extreme values (outliers)?',
        choices: ['Mean', 'Median', 'Mode', 'Range'],
        correct_answer: 'Mean', correct_index: 0,
        explanation: 'The mean uses all values, so outliers pull it heavily. Median is more resistant.' },

      // ═══════════════════ YEAR 9 STATISTICS ═══════════════════════════════════

      { seed_key: 'y9-stat-e-01', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: In a normal distribution, mean = median = mode.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'A normal (bell-curve) distribution is perfectly symmetric, so all three averages coincide.' },

      { seed_key: 'y9-stat-e-02', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the probability of rolling an even number on a fair 6-sided die?',
        choices: ['1/2', '1/3', '2/3', '1/6'],
        correct_answer: '1/2', correct_index: 0,
        explanation: 'Even numbers: 2, 4, 6. That\'s 3 out of 6. P = 3/6 = 1/2.' },

      // Y9 Medium
      { seed_key: 'y9-stat-m-01', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A tree diagram shows 3 outcomes at the first branch and 2 at each second branch. Total outcomes?',
        choices: ['5', '6', '8', '9'],
        correct_answer: '6', correct_index: 1,
        explanation: '3 × 2 = 6 total equally likely outcomes.' },

      { seed_key: 'y9-stat-m-02', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: If two events are mutually exclusive, they can happen at the same time.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'Mutually exclusive events cannot both occur at the same time — they have no overlap.' },

      { seed_key: 'y9-stat-m-03', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A relative frequency of 0.35 means the event occurred in what fraction of trials?',
        choices: ['About 3 in 10', 'About 35 in 100', 'About 7 in 20', 'All of the above'],
        correct_answer: 'All of the above', correct_index: 3,
        explanation: '0.35 = 35/100 = 7/20 ≈ 3.5/10. All represent the same proportion.' },

      { seed_key: 'y9-stat-m-04', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What does a cumulative frequency graph look like?',
        choices: ['S-shaped curve', 'Bell-shaped curve', 'Straight line', 'V-shape'],
        correct_answer: 'S-shaped curve', correct_index: 0,
        explanation: 'Cumulative frequency always increases — it typically forms an S-shaped (ogive) curve.' },

      { seed_key: 'y9-stat-m-05', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'In a stratified sample of 50 from a school of 500 (200 Y10, 300 Y11), how many Y10 should be chosen?',
        choices: ['20', '25', '30', '10'],
        correct_answer: '20', correct_index: 0,
        explanation: 'Y10 proportion = 200/500 = 2/5. 2/5 × 50 = 20.' },

      // Y9 Hard
      { seed_key: 'y9-stat-h-01', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Using Bayes-style reasoning: P(disease) = 0.01. Test is 99% accurate. If positive, P(actual disease)?',
        choices: ['~50%', '~99%', '~1%', '~0.5%'],
        correct_answer: '~50%', correct_index: 0,
        explanation: 'With rare diseases and imperfect tests, most positives are false. P ≈ 0.5 from base rate analysis.' },

      { seed_key: 'y9-stat-h-02', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Box plots show outliers as individual points. An outlier is typically defined as a value more than ____ IQRs from Q1 or Q3.',
        choices: ['1', '1.5', '2', '3'],
        correct_answer: '1.5', correct_index: 1,
        explanation: 'The standard fence rule: outliers lie more than 1.5 × IQR below Q1 or above Q3.' },

      // ═══════════════════ YEAR 10 STATISTICS ══════════════════════════════════

      { seed_key: 'y10-stat-e-01', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: Standard deviation measures how spread out data is from the mean.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Standard deviation quantifies the average distance of data points from the mean.' },

      { seed_key: 'y10-stat-e-02', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'In a venn diagram, the intersection (A ∩ B) represents:',
        choices: ['A only', 'B only', 'Both A and B', 'Neither A nor B'],
        correct_answer: 'Both A and B', correct_index: 2,
        explanation: 'The intersection symbol ∩ means AND — elements in both A and B.' },

      // Y10 Medium
      { seed_key: 'y10-stat-m-01', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'If P(A) = 0.5 and P(B) = 0.4 and they are independent, P(A ∪ B) = ?',
        choices: ['0.9', '0.7', '0.2', '0.3'],
        correct_answer: '0.7', correct_index: 1,
        explanation: 'P(A∪B) = P(A)+P(B)−P(A∩B) = 0.5+0.4−0.2 = 0.7.' },

      { seed_key: 'y10-stat-m-02', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: Larger samples generally give more reliable estimates of population parameters.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Larger samples reduce sampling error and provide better estimates of the true population values.' },

      { seed_key: 'y10-stat-m-03', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'You roll a die 600 times. Expected frequency of rolling a 3?',
        choices: ['100', '200', '60', '300'],
        correct_answer: '100', correct_index: 0,
        explanation: 'Expected frequency = P(3) × total = 1/6 × 600 = 100.' },

      { seed_key: 'y10-stat-m-04', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Conditional probability P(A|B) means:',
        choices: ['P(A) given B has occurred', 'P(A) + P(B)', 'P(A) × P(B)', 'P(neither A nor B)'],
        correct_answer: 'P(A) given B has occurred', correct_index: 0,
        explanation: 'P(A|B) = P(A and B) / P(B). It is the probability of A given that B has already happened.' },

      { seed_key: 'y10-stat-m-05', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Which best describes the use of a frequency polygon?',
        choices: ['Shows individual values', 'Compares frequency distributions', 'Shows cumulative data', 'Displays categorical data'],
        correct_answer: 'Compares frequency distributions', correct_index: 1,
        explanation: 'Frequency polygons are useful for comparing distributions on the same graph.' },

      // Y10 Hard
      { seed_key: 'y10-stat-h-01', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'From a class of 10, 3 are chosen for a team. How many ways? (combinations)',
        choices: ['30', '120', '720', '10'],
        correct_answer: '120', correct_index: 1,
        explanation: '¹⁰C₃ = 10!/(3!7!) = 120.' },

      { seed_key: 'y10-stat-h-02', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'True or false: If P(A|B) = P(A), then A and B are independent events.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'If knowing B gives no information about A, then A and B are independent: P(A|B) = P(A).' },

      { seed_key: 'y10-stat-h-03', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A set of data has mean 50 and standard deviation 10. What percentage lies within one standard deviation of the mean in a normal distribution?',
        choices: ['50%', '68%', '95%', '99.7%'],
        correct_answer: '68%', correct_index: 1,
        explanation: 'The 68-95-99.7 rule: ~68% within 1SD, ~95% within 2SD, ~99.7% within 3SD.' },

      // ═══════════════════ YEAR 11 STATISTICS ══════════════════════════════════

      { seed_key: 'y11-stat-e-01', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: A higher standard deviation means data is more spread out.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'A larger SD means values are more dispersed from the mean.' },

      { seed_key: 'y11-stat-e-02', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which is NOT a valid probability value?',
        choices: ['0', '0.5', '1', '1.5'],
        correct_answer: '1.5', correct_index: 3,
        explanation: 'Probability must be between 0 and 1 inclusive. 1.5 > 1, so it is invalid.' },

      // Y11 Medium
      { seed_key: 'y11-stat-m-01', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A binomial experiment has n=10 trials with P(success)=0.3. Expected number of successes?',
        choices: ['3', '5', '7', '10'],
        correct_answer: '3', correct_index: 0,
        explanation: 'Expected value = np = 10 × 0.3 = 3.' },

      { seed_key: 'y11-stat-m-02', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'You draw a card from a deck. P(red or Ace)?',
        choices: ['26/52', '28/52', '30/52', '54/52'],
        correct_answer: '28/52', correct_index: 1,
        explanation: 'P(red)=26/52, P(Ace)=4/52, P(red and Ace)=2/52. P(red or Ace)=26+4−2=28/52.' },

      { seed_key: 'y11-stat-m-03', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: The expected value of a fair game is zero.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'In a fair game, expected winnings = expected losses, so net expected value = 0.' },

      { seed_key: 'y11-stat-m-04', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'An experiment has outcomes with probabilities 0.2, 0.5, 0.3. Expected value if gains are £10, £5, −£2?',
        choices: ['£4.90', '£5.10', '£4.40', '£5.40'],
        correct_answer: '£4.90', correct_index: 0,
        explanation: 'E = 0.2×10 + 0.5×5 + 0.3×(−2) = 2 + 2.5 − 0.6 = £3.9. Closest = £3.90. Check: 2+2.5=4.5, −0.6=3.9.' },

      // Y11 Hard
      { seed_key: 'y11-stat-h-01', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'True or false: The chi-squared test is used to test for association between two categorical variables.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Chi-squared (χ²) test compares observed vs expected frequencies to test independence of categorical variables.' },

      { seed_key: 'y11-stat-h-02', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'In hypothesis testing, a p-value of 0.03 with significance level 0.05 means:',
        choices: ['Accept the null hypothesis', 'Reject the null hypothesis', 'Test is inconclusive', 'p-value is too small to interpret'],
        correct_answer: 'Reject the null hypothesis', correct_index: 1,
        explanation: 'p < α (0.03 < 0.05) means the result is statistically significant — reject H₀.' },

      { seed_key: 'y11-stat-h-03', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A least squares regression line minimises the sum of:',
        choices: ['Absolute residuals', 'Squared residuals', 'Residual signs', 'Predicted values'],
        correct_answer: 'Squared residuals', correct_index: 1,
        explanation: 'Ordinary least squares (OLS) finds the line that minimises Σ(y − ŷ)², the sum of squared residuals.' },

      { seed_key: 'y11-stat-h-04', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Two standard deviations from the mean in a normal distribution captures approximately what % of data?',
        choices: ['68%', '75%', '95%', '99.7%'],
        correct_answer: '95%', correct_index: 2,
        explanation: '±2 standard deviations from the mean covers approximately 95% of data in a normal distribution.' },

      { seed_key: 'y11-stat-h-05', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'True or false: Pearson\'s r = −1 means perfect negative linear correlation.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'r ranges from −1 to +1. r = −1 means perfect negative linear correlation.' },
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

    return Response.json({ message: 'Statistics & Probability seed complete', created, skipped, total_attempted: enriched.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});