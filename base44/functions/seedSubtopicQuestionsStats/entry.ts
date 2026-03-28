import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const mcq = (text, choices, correctIndex, explanation, difficulty, yearGroup, seedKey) => ({
  question_text: text, question_type: 'mcq', choices, correct_index: correctIndex,
  correct_answer: choices[correctIndex], explanation, difficulty, year_group: yearGroup, seed_key: seedKey
});
const tf = (text, isTrue, explanation, difficulty, yearGroup, seedKey) => ({
  question_text: text, question_type: 'mcq', choices: ['True', 'False'],
  correct_index: isTrue ? 0 : 1, correct_answer: isTrue ? 'True' : 'False',
  explanation, difficulty, year_group: yearGroup, seed_key: seedKey
});
const written = (text, answer, explanation, difficulty, yearGroup, seedKey) => ({
  question_text: text, question_type: 'short', choices: [], correct_index: 0,
  correct_answer: answer, explanation, difficulty, year_group: yearGroup, seed_key: seedKey
});

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const subjectId = '69769100f956ea6355550df7';
  const allTopics = await base44.asServiceRole.entities.GlobalTopic.filter({ subject_id: subjectId });
  const find = (name) => allTopics.find(t => t.name === name)?.id;

  const AVERAGES   = find('Averages & Range');
  const DATA_REP   = find('Data Representation');
  const PROB       = find('Basic Probability');
  const EXP_FREQ   = find('Expected Frequency & Relative Frequency');
  const SPREAD     = find('Spread & Distributions');
  const CORR       = find('Correlation & Regression');
  const ADV_STATS  = find('Advanced Statistics');

  const questions = [
    // ── AVERAGES & RANGE ──
    ...[
      mcq('Find the mean of: 3, 7, 5, 8, 2', ['5','7','25','3'], 0, '(3+7+5+8+2)/5=25/5=5', 'easy', 7, 'avg-01'),
      tf('The median is the middle value when data is ordered', true, 'Arrange in order, then find the middle', 'easy', 7, 'avg-02'),
      written('Find the mode of: 2, 4, 4, 6, 6, 6, 8', '6', '6 appears most frequently (3 times)', 'easy', 7, 'avg-03'),
      mcq('Find the range of: 3, 8, 1, 9, 4', ['8','5','6','9'], 0, 'Range = 9 − 1 = 8', 'easy', 7, 'avg-04'),
      tf('A data set can have more than one mode (e.g. bimodal)', true, 'Bimodal or multimodal distributions are possible', 'easy', 7, 'avg-05'),
      written('Find the median of: 4, 7, 9, 2, 6', '6', 'Ordered: 2,4,6,7,9 — middle value is 6', 'easy', 7, 'avg-06'),
      mcq('For the set 2, 2, 2, 8, the mean is:', ['3.5','2','4.5','5'], 0, '(2+2+2+8)/4=14/4=3.5', 'easy', 7, 'avg-07'),
      tf('The mean is always a value that appears in the data set', false, 'e.g. mean of 1, 2, 3 is 2, but mean of 1, 2 is 1.5 which is not in set', 'medium', 8, 'avg-08'),
      written('Find the mean of this frequency table: Value: 1, 2, 3. Frequency: 2, 5, 3', '2.1', '(1×2+2×5+3×3)/(2+5+3)=(2+10+9)/10=21/10=2.1', 'medium', 8, 'avg-09'),
      mcq('Which average is most affected by extreme values (outliers)?', ['Mean','Median','Mode','Range'], 0, 'The mean is pulled by extreme values', 'medium', 8, 'avg-10'),
      written('Find the median of: 5, 3, 8, 1, 6, 2', '4', 'Ordered: 1,2,3,5,6,8 — median=(3+5)/2=4', 'medium', 8, 'avg-11'),
      tf('For an even number of data values, the median is the mean of the two middle values', true, 'Take the mean of the two central values', 'easy', 8, 'avg-12'),
      mcq('The range of: 100, 150, 75, 200, 125 is:', ['125','200','75','25'], 0, '200 − 75 = 125', 'easy', 7, 'avg-13'),
      written('5 students score: 60, 70, 80, 90, 100. Find the mean.', '80', '400/5 = 80', 'easy', 7, 'avg-14'),
      tf('Adding an outlier that is much larger than all other values increases the mean', true, 'Outliers pull the mean in their direction', 'medium', 8, 'avg-15'),
      mcq('Which measure of average is best to use for categorical data?', ['Mode','Mean','Median','Range'], 0, 'Mode is the only average applicable to categorical data', 'medium', 9, 'avg-16'),
      written('The mean of five numbers is 12. What is their sum?', '60', 'Sum = mean × count = 12 × 5 = 60', 'easy', 7, 'avg-17'),
      mcq('Find the mean from a frequency table: 2 appears 3 times, 5 appears 2 times', ['3.2','3.5','3','4'], 0, '(2×3+5×2)/5=(6+10)/5=16/5=3.2', 'medium', 8, 'avg-18'),
      tf('The median is resistant to outliers compared to the mean', true, 'Outliers have less effect on the median', 'medium', 8, 'avg-19'),
      written('Find the modal class in: 10–20 (3 students), 20–30 (7 students), 30–40 (5 students)', '20–30', 'Highest frequency is 7 in 20–30', 'medium', 9, 'avg-20'),
      mcq('Seven values sum to 77. What is the mean?', ['11','7','77','14'], 0, '77/7=11', 'easy', 7, 'avg-21'),
      written('The mean of 4 tests is 75. After a 5th test the mean is 74. What was the 5th test score?', '70', 'Sum of 4 = 300; sum of 5 = 370; 5th = 370−300 = 70', 'hard', 10, 'avg-22'),
      tf('An outlier always makes the range larger', true, 'Outliers increase the spread, hence the range', 'easy', 7, 'avg-23'),
      mcq('For a right-skewed distribution, which is typically largest?', ['Mean','Median','Mode','Range'], 0, 'In right-skewed data, mean > median > mode', 'hard', 11, 'avg-24'),
      written('Find the interquartile range (IQR) of: 2, 4, 6, 8, 10, 12, 14', '8', 'Q1=4, Q3=12; IQR=12−4=8', 'hard', 10, 'avg-25'),
      tf('Mode is the only average that can be found for qualitative data', true, 'Mean and median require numerical values', 'medium', 9, 'avg-26'),
      mcq('The median of 10 ordered values is the:', ['Mean of 5th and 6th values','5th value','6th value','Mean of all 10'], 0, 'For even n, median = mean of n/2 and n/2+1 th values', 'medium', 8, 'avg-27'),
      written('Calculate the mean absolute deviation for: 2, 6, 4, 8 (mean=5)', '2', '(|2-5|+|6-5|+|4-5|+|8-5|)/4 = (3+1+1+3)/4=2', 'hard', 11, 'avg-28'),
      tf('If all values in a data set are equal, the range is 0', true, 'Range = max − min = 0 when all values are the same', 'easy', 7, 'avg-29'),
      mcq('Which measure gives the most commonly occurring value?', ['Mode','Mean','Median','IQR'], 0, 'Mode = most frequent value', 'easy', 7, 'avg-30'),
    ].map(q => ({ ...q, global_topic_id: AVERAGES, subject_id: subjectId, subject_name: 'Maths' })),

    // ── BASIC PROBABILITY ──
    ...(PROB ? [
      mcq('A fair coin is flipped. P(heads) = ?', ['1/2','1','0','2'], 0, '2 equally likely outcomes, 1 is heads', 'easy', 7, 'prob-01'),
      tf('Probability can never be greater than 1', true, 'Probability ranges from 0 to 1 inclusive', 'easy', 7, 'prob-02'),
      written('A bag has 3 red and 7 blue balls. P(red) = ?', '3/10', '3 out of 10 total balls', 'easy', 7, 'prob-03'),
      mcq('P(event not happening) = ?', ['1 − P(event)','P(event)','P(event) + 1','0'], 0, 'Complementary probability: P(A\') = 1 − P(A)', 'easy', 7, 'prob-04'),
      tf('An impossible event has probability 0', true, 'Something that cannot happen has probability 0', 'easy', 7, 'prob-05'),
      written('A dice is rolled. P(multiple of 3) = ?', '1/3', '3 and 6 are multiples of 3; 2/6 = 1/3', 'easy', 7, 'prob-06'),
      mcq('Two events are mutually exclusive if:', ['They cannot both occur at the same time','Their probabilities sum to 1','They are independent','They always occur together'], 0, 'Mutually exclusive = cannot happen simultaneously', 'medium', 9, 'prob-07'),
      written('P(A) = 0.3. Find P(not A)', '0.7', '1 − 0.3 = 0.7', 'easy', 8, 'prob-08'),
      tf('All probabilities in a sample space sum to 1', true, 'The total probability of all possible outcomes = 1', 'medium', 8, 'prob-09'),
      mcq('A pack of 52 cards. P(ace) = ?', ['1/13','4/52','1/26','1/4'], 0, '4 aces in 52 cards = 4/52 = 1/13', 'medium', 8, 'prob-10'),
      written('P(A) = 0.4, P(B) = 0.5, A and B mutually exclusive. P(A or B) = ?', '0.9', 'P(A ∪ B) = P(A) + P(B) = 0.4 + 0.5 = 0.9', 'medium', 9, 'prob-11'),
      tf('Rolling a 7 on a standard dice has probability 0', true, 'A standard dice has faces 1–6 only', 'easy', 7, 'prob-12'),
      mcq('P(getting a red card from a pack of 52) = ?', ['1/2','1/4','1/13','2/3'], 0, '26 red cards out of 52: 26/52=1/2', 'easy', 7, 'prob-13'),
      written('List the sample space for rolling a fair dice', '1, 2, 3, 4, 5, 6', 'All possible outcomes', 'easy', 7, 'prob-14'),
      mcq('P(A and B) where A and B are independent = ?', ['P(A) × P(B)','P(A) + P(B)','P(A) − P(B)','P(A) ÷ P(B)'], 0, 'For independent events multiply probabilities', 'hard', 10, 'prob-15'),
      tf('P(A) = 0.6 means A is more likely to happen than not', true, 'P > 0.5 means more likely than unlikely', 'easy', 7, 'prob-16'),
      written('A spinner has 5 equal sections: 1, 2, 3, 4, 5. P(even) = ?', '2/5', 'Even numbers: 2, 4 → 2 out of 5', 'easy', 7, 'prob-17'),
      mcq('A bag has 5 red, 3 blue, 2 green balls. P(not red) = ?', ['1/2','3/10','2/10','7/10'], 0, 'P(not red) = (3+2)/10 = 5/10 = 1/2', 'easy', 8, 'prob-18'),
      tf('If events A and B are mutually exclusive, P(A and B) = 0', true, 'They cannot both occur, so P(A ∩ B) = 0', 'medium', 9, 'prob-19'),
      written('P(rain) = 0.65. What is P(no rain)?', '0.35', '1 − 0.65 = 0.35', 'easy', 7, 'prob-20'),
      mcq('Two dice are rolled. P(sum = 12) = ?', ['1/36','2/36','6/36','1/6'], 0, 'Only one way: (6,6)', 'medium', 9, 'prob-21'),
      written('From a class of 30, 12 are left-handed. P(randomly chosen student is right-handed) = ?', '3/5', '18/30 = 3/5', 'easy', 7, 'prob-22'),
      tf('P(A) + P(A\') = 1 always', true, 'Complementary probabilities always sum to 1', 'easy', 7, 'prob-23'),
      mcq('How many outcomes are in the sample space of flipping 3 coins?', ['8','6','4','3'], 0, '2³ = 8 outcomes', 'medium', 9, 'prob-24'),
      written('Probability of an event on a probability scale is always between what values?', '0 and 1', 'Impossible = 0, certain = 1', 'easy', 7, 'prob-25'),
      tf('Tossing a coin and rolling a dice are independent events', true, 'The outcome of one does not affect the other', 'easy', 8, 'prob-26'),
      mcq('P(A) = 1/4, P(B) = 1/3, independent. Find P(A and B)', ['1/12','7/12','1/6','2/7'], 0, '(1/4)×(1/3)=1/12', 'medium', 9, 'prob-27'),
      written('A number is chosen at random from 1 to 20. P(prime) = ?', '2/5', 'Primes: 2,3,5,7,11,13,17,19 = 8 primes; 8/20=2/5', 'hard', 10, 'prob-28'),
      tf('A certain event has probability 1', true, 'Something guaranteed to happen has probability 1', 'easy', 7, 'prob-29'),
      mcq('A card is drawn from 52. P(king or queen) = ?', ['2/13','4/52','1/13','1/26'], 0, '8 kings/queens out of 52 = 8/52 = 2/13', 'medium', 9, 'prob-30'),
    ].map(q => ({ ...q, global_topic_id: PROB, subject_id: subjectId, subject_name: 'Maths' })) : []),

    // ── DATA REPRESENTATION ──
    ...(DATA_REP ? [
      mcq('Which chart is best for showing parts of a whole?', ['Pie chart','Bar chart','Line graph','Scatter diagram'], 0, 'Pie charts show proportions', 'easy', 7, 'drep-01'),
      tf('A bar chart can be used for discrete data', true, 'Bar charts suit discrete categorical data', 'easy', 7, 'drep-02'),
      written('In a pie chart, if a sector represents 90 out of 360 students, what angle should it have?', '90°', '(90/360)×360 = 90°', 'easy', 7, 'drep-03'),
      mcq('In a frequency polygon, what is plotted on the x-axis?', ['Midpoint of class interval','Class frequency','Cumulative frequency','Lower boundary'], 0, 'Midpoints of class intervals are used', 'medium', 9, 'drep-04'),
      tf('A histogram uses the height of bars to represent frequency', false, 'Histograms use AREA not height when classes are unequal width', 'hard', 10, 'drep-05'),
      written('A pie chart has 4 sectors. Their frequencies are 30, 60, 90, 120. What angle does the 90 sector have?', '108°', '90/300 × 360 = 108°', 'medium', 8, 'drep-06'),
      mcq('Which diagram is used to show the relationship between two variables?', ['Scatter diagram','Bar chart','Pie chart','Stem and leaf'], 0, 'Scatter diagrams show correlation between two variables', 'easy', 8, 'drep-07'),
      tf('A stem-and-leaf diagram preserves all original data values', true, 'Individual values are visible in the leaves', 'easy', 8, 'drep-08'),
      written('In a frequency table: 1–5 has frequency 4, 6–10 has frequency 6. What is the midpoint of 6–10?', '8', '(6+10)/2 = 8', 'easy', 7, 'drep-09'),
      mcq('A cumulative frequency graph is also called:', ['Ogive','Histogram','Box plot','Stem-and-leaf'], 0, 'A cumulative frequency graph is an ogive', 'medium', 9, 'drep-10'),
      written('From a bar chart: red: 8, blue: 12, green: 5. What fraction chose blue?', '12/25', '12 out of 8+12+5=25', 'easy', 7, 'drep-11'),
      tf('A two-way table shows data for two categorical variables simultaneously', true, 'Two-way tables cross-tabulate two categories', 'easy', 8, 'drep-12'),
      mcq('Frequency density in a histogram = ?', ['Frequency ÷ class width','Frequency × class width','Class width ÷ frequency','Cumulative frequency'], 0, 'Frequency density allows comparison of unequal class widths', 'hard', 10, 'drep-13'),
      written('A back-to-back stem-and-leaf plot compares two data sets. Give one advantage.', 'You can directly compare distributions and identify overlaps', 'Visual comparison of two data sets using same stem', 'medium', 9, 'drep-14'),
      tf('Line graphs are best suited to continuous data over time', true, 'They show trends and changes over time', 'easy', 8, 'drep-15'),
      mcq('In a stem-and-leaf: stem 3, leaves 2, 5, 8 represents:', ['32, 35, 38','23, 53, 83','3, 2, 5, 8','325, 358, 382'], 0, 'Stem is tens, leaves are units', 'easy', 7, 'drep-16'),
      written('80 people were surveyed. 40 chose football, 20 chose tennis, 20 chose swimming. Find the angle for football in a pie chart.', '180°', '40/80 × 360 = 180°', 'easy', 7, 'drep-17'),
      tf('A histogram with equal class widths can use frequency (not density) on the y-axis', true, 'When class widths are equal, frequency and frequency density are proportional', 'medium', 9, 'drep-18'),
      mcq('Which best shows the distribution of continuous data?', ['Histogram','Pie chart','Bar chart','Pictogram'], 0, 'Histograms are designed for continuous grouped data', 'medium', 9, 'drep-19'),
      written('What does the interquartile range show on a box plot?', 'The spread of the middle 50% of the data', 'IQR = Q3 − Q1, the range of the central half of data', 'medium', 9, 'drep-20'),
      mcq('Which diagram shows the five-number summary (min, Q1, median, Q3, max)?', ['Box plot','Bar chart','Histogram','Scatter graph'], 0, 'Box plots display the five-number summary', 'medium', 9, 'drep-21'),
      tf('Pictograms should have a key explaining what each symbol represents', true, 'Without a key, the frequency value of symbols is unknown', 'easy', 7, 'drep-22'),
      written('What is the class width of the interval 20 ≤ x < 30?', '10', '30 − 20 = 10', 'easy', 7, 'drep-23'),
      mcq('A histogram bar for class 0–10 has height 3 (frequency density). Frequency = ?', ['30','3','13','300'], 0, 'Frequency = frequency density × class width = 3×10=30', 'hard', 10, 'drep-24'),
      written('State one advantage of a pie chart over a bar chart', 'Easier to see proportions/fractions of the whole', 'Pie chart clearly shows proportions', 'medium', 8, 'drep-25'),
      tf('In a cumulative frequency graph the y-axis starts at 0 and ends at the total frequency', true, 'Cumulative frequency builds from 0 to the total', 'medium', 9, 'drep-26'),
      mcq('What does an outlier look like on a box plot?', ['A dot or asterisk outside the whiskers','Part of the box','Inside the IQR','On the median line'], 0, 'Outliers are plotted as separate points', 'medium', 10, 'drep-27'),
      written('From a scatter graph two variables show that as x increases, y decreases. What correlation is this?', 'Negative correlation', 'As one increases, the other decreases', 'easy', 8, 'drep-28'),
      tf('Frequency polygons are plotted by joining midpoints of histogram bars with straight lines', true, 'This is how frequency polygons are constructed', 'medium', 9, 'drep-29'),
      mcq('In a cumulative frequency diagram, the median is estimated at:', ['The 50th percentile value on the x-axis','The highest point','Half the total on the y-axis','The midpoint of the x-axis'], 0, 'Read across from n/2 on y-axis to the curve, then down to x-axis', 'hard', 10, 'drep-30'),
    ].map(q => ({ ...q, global_topic_id: DATA_REP, subject_id: subjectId, subject_name: 'Maths' })) : []),

    // ── CORRELATION & REGRESSION ──
    ...(CORR ? [
      mcq('What does a positive correlation mean?', ['As x increases, y increases','As x increases, y decreases','No relationship between x and y','x and y are equal'], 0, 'Positive correlation: both increase together', 'easy', 8, 'corr-01'),
      tf('A correlation coefficient of −1 indicates perfect negative correlation', true, 'r = −1 means all points lie on a straight line with negative gradient', 'medium', 10, 'corr-02'),
      written('Describe the correlation: as temperature increases, ice cream sales increase', 'Positive correlation', 'Both variables increase together', 'easy', 8, 'corr-03'),
      mcq('The line of best fit should:', ['Pass through the mean point (x̄, ȳ)','Pass through the origin','Connect the first and last data points','Touch every data point'], 0, 'A line of best fit passes through the mean of both variables', 'medium', 9, 'corr-04'),
      tf('Correlation implies causation', false, 'Just because two variables correlate does not mean one causes the other', 'medium', 9, 'corr-05'),
      written('What is interpolation when using a line of best fit?', 'Estimating a value within the range of the data', 'Interpolation uses the model within its data range', 'medium', 9, 'corr-06'),
      mcq('The correlation coefficient r ranges between:', ['−1 and 1','0 and 1','−∞ and ∞','0 and ∞'], 0, 'r is always between −1 and +1', 'medium', 10, 'corr-07'),
      tf('Extrapolation is less reliable than interpolation', true, 'Predictions beyond the data range are less reliable', 'medium', 10, 'corr-08'),
      written('Describe the correlation: as hours of study increase, test scores decrease (hypothetically)', 'Negative correlation', 'As one increases the other decreases', 'easy', 8, 'corr-09'),
      mcq('Which r value indicates the strongest correlation?', ['−0.95','0.8','0.4','−0.2'], 0, '|r| = 0.95 is closest to 1', 'medium', 10, 'corr-10'),
      written('What does r = 0 suggest about the correlation?', 'No linear correlation', 'r = 0 means no linear relationship between the variables', 'medium', 9, 'corr-11'),
      tf('A line of best fit can be used to make predictions', true, 'That is its main purpose', 'easy', 8, 'corr-12'),
      mcq('What is extrapolation?', ['Predicting values outside the data range','Reading values from the data','Interpolating between points','Calculating the mean'], 0, 'Extrapolation goes beyond the range of the data collected', 'medium', 9, 'corr-13'),
      written('State one reason why extrapolation can be unreliable', 'The relationship may not continue beyond the data range', 'The model may not hold outside the observed data', 'medium', 10, 'corr-14'),
      tf('A weak correlation means the data points are spread far from the line of best fit', true, 'Strong correlation = points close to line; weak = spread out', 'medium', 9, 'corr-15'),
      mcq('Which scatter graph shows negative correlation?', ['Points going from top-left to bottom-right','Points going from bottom-left to top-right','Points scattered randomly','Points in a horizontal line'], 0, 'Negative correlation slopes downward from left to right', 'easy', 8, 'corr-16'),
      written('Give an example of two variables with no correlation', 'Shoe size and exam results (generally)', 'No obvious relationship exists between these', 'easy', 8, 'corr-17'),
      tf('Spearmans rank correlation can be used for ordinal data', true, 'Spearman\'s is a rank-based correlation coefficient', 'hard', 11, 'corr-18'),
      mcq('What does a line of best fit with gradient 2 mean?', ['For each unit increase in x, y increases by 2','x and y are always equal','y is always 2','x increases twice as fast as y'], 0, 'The gradient tells us how y changes per unit of x', 'medium', 9, 'corr-19'),
      written('The equation of a line of best fit is y = 3x + 5. Predict y when x = 4.', '17', 'y = 3(4)+5 = 17', 'easy', 8, 'corr-20'),
      tf('A scatter diagram with all points on a line has r = ±1', true, 'Perfect correlation (positive or negative)', 'medium', 10, 'corr-21'),
      mcq('What is a lurking (confounding) variable?', ['A hidden variable affecting both x and y','The x-variable','The y-variable','A variable with no effect'], 0, 'A confounding variable creates apparent correlation between unrelated variables', 'hard', 11, 'corr-22'),
      written('r = 0.85 for height vs weight data. Describe this correlation.', 'Strong positive correlation', '0.85 close to 1 and positive', 'easy', 9, 'corr-23'),
      tf('The line of best fit must pass through the origin', false, 'It passes through (x̄, ȳ) — the mean point, not necessarily the origin', 'medium', 9, 'corr-24'),
      mcq('Regression line is written as ŷ = a + bx. What does b represent?', ['The gradient (rate of change)','The y-intercept','The correlation coefficient','The predicted value'], 0, 'b is the slope/gradient of the regression line', 'hard', 10, 'corr-25'),
      written('What type of correlation does r = −0.9 suggest?', 'Strong negative correlation', 'Close to −1 = strong; negative sign = negative correlation', 'easy', 9, 'corr-26'),
      tf('PMCC stands for Pearson\'s moment correlation coefficient', true, 'PMCC is the formal name for Pearson r', 'hard', 11, 'corr-27'),
      mcq('A y-intercept of 5 in a regression equation means:', ['When x = 0, predicted y = 5','y increases by 5 per unit of x','The gradient is 5','x = 5 when y = 0'], 0, 'y-intercept is the value of y when x = 0', 'medium', 9, 'corr-28'),
      written('State one advantage of using a line of best fit over reading individual data points', 'It smooths out variability and allows prediction between measured points', 'A model gives general trend rather than relying on single noisy measurements', 'medium', 10, 'corr-29'),
      tf('Both variables in a scatter diagram are quantitative (numerical)', true, 'Scatter diagrams require two numerical variables', 'easy', 8, 'corr-30'),
    ].map(q => ({ ...q, global_topic_id: CORR, subject_id: subjectId, subject_name: 'Maths' })) : []),
  ];

  const existing = await base44.asServiceRole.entities.GlobalQuestion.list('created_date', 2000);
  const existingKeys = new Set(existing.map(q => q.seed_key).filter(Boolean));
  const toCreate = questions.filter(q => q.seed_key && !existingKeys.has(q.seed_key));

  let created = 0, skipped = questions.length - toCreate.length;
  const batchSize = 10;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    const batch = toCreate.slice(i, i + batchSize);
    await Promise.all(batch.map(q => base44.asServiceRole.entities.GlobalQuestion.create(q)));
    created += batch.length;
    if (i + batchSize < toCreate.length) await new Promise(r => setTimeout(r, 500));
  }

  return Response.json({ message: 'Statistics subtopic seed complete', created, skipped, total: questions.length });
});