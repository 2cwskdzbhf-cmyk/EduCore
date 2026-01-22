/**
 * Complete Maths Content for EduCore
 * 
 * This file contains all structured Maths lessons, topics, and quizzes.
 * 
 * To import this data into your app:
 * 1. Import this file where needed
 * 2. Use the helper function importMathsContent() to bulk create all records
 * 
 * Structure:
 * - 1 Subject (Maths)
 * - 24 Topics (grouped by category)
 * - 24 Lessons (one per topic with full content)
 * - 24 Quizzes (one per topic)
 * - ~190 Questions (across all quizzes)
 */

import { base44 } from '@/api/base44Client';

// ============================================================================
// SUBJECT DATA
// ============================================================================

export const mathsSubject = {
  name: "Mathematics",
  description: "Master fundamental and advanced maths concepts from arithmetic to calculus",
  icon: "Calculator",
  color: "blue",
  key_stage: "KS3",
  exam_board: "General",
  order: 1,
  is_active: true
};

// ============================================================================
// TOPICS DATA (organized by category)
// ============================================================================

export const mathsTopics = [
  // ARITHMETIC (1-5)
  {
    ref: "fractions",
    name: "Fractions",
    description: "Understanding and working with fractions - adding, subtracting, multiplying, dividing",
    order: 1,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    skills: ["simplify fractions", "add fractions", "multiply fractions", "divide fractions"],
    category: "Arithmetic"
  },
  {
    ref: "decimals",
    name: "Decimals",
    description: "Operating with decimal numbers and conversions",
    order: 2,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 80,
    prerequisite_refs: ["fractions"],
    skills: ["decimal operations", "decimal place value", "convert fractions to decimals"],
    category: "Arithmetic"
  },
  {
    ref: "percentages",
    name: "Percentages",
    description: "Understanding percentages, conversions, and percentage calculations",
    order: 3,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    prerequisite_refs: ["fractions", "decimals"],
    skills: ["calculate percentages", "percentage increase", "percentage decrease", "reverse percentages"],
    category: "Arithmetic"
  },
  {
    ref: "ratios",
    name: "Ratios and Proportions",
    description: "Working with ratios, proportions, and sharing quantities",
    order: 4,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 120,
    prerequisite_refs: ["fractions"],
    skills: ["simplify ratios", "share in ratios", "direct proportion", "inverse proportion"],
    category: "Arithmetic"
  },
  {
    ref: "bidmas",
    name: "Order of Operations (BIDMAS)",
    description: "Understanding the correct order for mathematical operations",
    order: 5,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 80,
    skills: ["apply BIDMAS", "evaluate expressions"],
    category: "Arithmetic"
  },

  // ALGEBRA (6-11)
  {
    ref: "simplifying",
    name: "Simplifying Expressions",
    description: "Collecting like terms and simplifying algebraic expressions",
    order: 6,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 90,
    skills: ["collect like terms", "multiply algebraic terms", "divide algebraic terms"],
    category: "Algebra"
  },
  {
    ref: "expanding",
    name: "Expanding Brackets",
    description: "Expanding single and double brackets in algebra",
    order: 7,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 110,
    prerequisite_refs: ["simplifying"],
    skills: ["expand single brackets", "expand double brackets", "FOIL method"],
    category: "Algebra"
  },
  {
    ref: "factorising",
    name: "Factorising",
    description: "Factorising algebraic expressions and quadratics",
    order: 8,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 120,
    prerequisite_refs: ["expanding"],
    skills: ["factorise with HCF", "factorise quadratics", "difference of two squares"],
    category: "Algebra"
  },
  {
    ref: "linear_equations",
    name: "Solving Linear Equations",
    description: "Solving equations with one unknown",
    order: 9,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 110,
    prerequisite_refs: ["simplifying"],
    skills: ["solve one-step equations", "solve two-step equations", "solve equations with x on both sides"],
    category: "Algebra"
  },
  {
    ref: "quadratics",
    name: "Quadratic Equations",
    description: "Solving quadratic equations by factorising and using the formula",
    order: 10,
    difficulty_level: "higher",
    estimated_hours: 4,
    xp_reward: 150,
    prerequisite_refs: ["factorising", "linear_equations"],
    skills: ["solve by factorising", "use quadratic formula", "understand discriminant"],
    category: "Algebra"
  },
  {
    ref: "sequences",
    name: "Sequences",
    description: "Understanding patterns and finding the nth term",
    order: 11,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 120,
    skills: ["find term-to-term rule", "find nth term", "arithmetic sequences", "geometric sequences"],
    category: "Algebra"
  },

  // GEOMETRY (12-16)
  {
    ref: "angles_lines",
    name: "Angles and Lines",
    description: "Properties of angles, parallel lines, and angle calculations",
    order: 12,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    skills: ["angles on a line", "angles at a point", "parallel line angles", "vertically opposite angles"],
    category: "Geometry"
  },
  {
    ref: "triangles_polygons",
    name: "Triangles and Polygons",
    description: "Properties and angle calculations for triangles and polygons",
    order: 13,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 110,
    prerequisite_refs: ["angles_lines"],
    skills: ["triangle angle sum", "polygon angle sum", "exterior angles", "regular polygons"],
    category: "Geometry"
  },
  {
    ref: "circles",
    name: "Circles",
    description: "Circle properties, circumference, area, and circle theorems",
    order: 14,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 120,
    skills: ["calculate circumference", "calculate area", "arc length", "sector area", "circle theorems"],
    category: "Geometry"
  },
  {
    ref: "pythagoras",
    name: "Pythagoras' Theorem",
    description: "Using Pythagoras' theorem to find missing sides in right-angled triangles",
    order: 15,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 130,
    prerequisite_refs: ["triangles_polygons"],
    skills: ["find hypotenuse", "find shorter side", "apply to problems", "Pythagorean triples"],
    category: "Geometry"
  },
  {
    ref: "trigonometry",
    name: "Trigonometry",
    description: "Introduction to trigonometry - SOH CAH TOA",
    order: 16,
    difficulty_level: "higher",
    estimated_hours: 4,
    xp_reward: 150,
    prerequisite_refs: ["pythagoras"],
    skills: ["use sin cos tan", "find sides", "find angles", "apply SOH CAH TOA"],
    category: "Geometry"
  },

  // STATISTICS & PROBABILITY (17-20)
  {
    ref: "averages",
    name: "Averages and Range",
    description: "Calculating mean, median, mode, and range",
    order: 17,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 90,
    skills: ["calculate mean", "find median", "find mode", "calculate range"],
    category: "Statistics & Probability"
  },
  {
    ref: "probability",
    name: "Probability Basics",
    description: "Introduction to probability and calculating probabilities",
    order: 18,
    difficulty_level: "foundation",
    estimated_hours: 3,
    xp_reward: 100,
    skills: ["calculate probability", "probability scale", "expected frequency", "complementary events"],
    category: "Statistics & Probability"
  },
  {
    ref: "graphs",
    name: "Interpreting Graphs",
    description: "Reading and interpreting charts and graphs",
    order: 19,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 80,
    skills: ["read bar charts", "read pie charts", "read line graphs", "interpret pictograms"],
    category: "Statistics & Probability"
  },
  {
    ref: "scatter",
    name: "Scatter Graphs and Correlation",
    description: "Understanding scatter graphs, correlation, and lines of best fit",
    order: 20,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 110,
    prerequisite_refs: ["graphs"],
    skills: ["identify correlation", "draw line of best fit", "make predictions", "identify outliers"],
    category: "Statistics & Probability"
  },

  // NUMBER THEORY & ADVANCED (21-24)
  {
    ref: "primes",
    name: "Prime Numbers",
    description: "Understanding primes and prime factorisation",
    order: 21,
    difficulty_level: "foundation",
    estimated_hours: 2,
    xp_reward: 90,
    skills: ["identify primes", "prime factorisation", "use factor trees", "index notation"],
    category: "Number Theory"
  },
  {
    ref: "hcf_lcm",
    name: "HCF and LCM",
    description: "Finding highest common factors and lowest common multiples",
    order: 22,
    difficulty_level: "intermediate",
    estimated_hours: 3,
    xp_reward: 110,
    prerequisite_refs: ["primes"],
    skills: ["find HCF", "find LCM", "use prime factorisation method"],
    category: "Number Theory"
  },
  {
    ref: "standard_form",
    name: "Standard Form",
    description: "Writing very large and very small numbers in standard form",
    order: 23,
    difficulty_level: "higher",
    estimated_hours: 3,
    xp_reward: 130,
    skills: ["convert to standard form", "convert from standard form", "multiply in standard form", "divide in standard form"],
    category: "Number Theory"
  },
  {
    ref: "surds",
    name: "Surds",
    description: "Working with square roots and rationalising denominators",
    order: 24,
    difficulty_level: "higher",
    estimated_hours: 3,
    xp_reward: 140,
    skills: ["simplify surds", "multiply surds", "add surds", "rationalise denominators"],
    category: "Number Theory"
  }
];

// ============================================================================
// LESSONS CONTENT (full markdown content for each topic)
// ============================================================================

export const mathsLessons = {
  fractions: {
    ref: "fractions",
    title: "Understanding and Working with Fractions",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 50,
    skills_covered: ["simplify fractions", "add fractions", "multiply fractions", "divide fractions"],
    learning_objectives: [
      "Understand what fractions represent",
      "Add and subtract fractions with different denominators",
      "Multiply and divide fractions",
      "Simplify fractions to their lowest terms"
    ],
    content: `# Understanding and Working with Fractions

## What is a fraction?

A fraction represents a part of a whole. It has two parts:
- **Numerator** (top number) – how many parts you have
- **Denominator** (bottom number) – how many equal parts the whole is divided into

## Equivalent Fractions

Fractions that represent the same value. Multiply or divide both numerator and denominator by the same number.

**Example:** 1/2 = 2/4 = 3/6

## Simplifying Fractions

Divide both numerator and denominator by their HCF (Highest Common Factor).

**Example:** 8/12 ÷ 4 = 2/3

## Adding/Subtracting Fractions

1. Find a common denominator
2. Convert fractions to equivalent fractions with that denominator
3. Add/subtract the numerators
4. Simplify if needed

## Multiplying Fractions

1. Multiply numerators together
2. Multiply denominators together
3. Simplify

## Dividing Fractions

1. Keep the first fraction
2. Change ÷ to ×
3. Flip the second fraction (reciprocal)
4. Multiply as normal

---

## Worked Examples

### Example 1: Adding fractions
**Calculate:** 1/4 + 2/3

**Solution:**
- Common denominator = 12
- 1/4 = 3/12
- 2/3 = 8/12
- 3/12 + 8/12 = **11/12**

### Example 2: Multiplying fractions
**Calculate:** 2/5 × 3/4

**Solution:**
- (2 × 3)/(5 × 4) = 6/20
- Simplify: 6/20 = **3/10**

### Example 3: Dividing fractions
**Calculate:** 3/4 ÷ 2/5

**Solution:**
- 3/4 × 5/2 (flip the second fraction)
- (3 × 5)/(4 × 2) = 15/8
- As a mixed number: **1 7/8**

---

## Practice Questions

1. Simplify: 12/18
2. Calculate: 2/5 + 1/3
3. Calculate: 3/7 × 2/9
4. Calculate: 5/6 ÷ 2/3
5. Which is larger: 3/4 or 5/7?

---

## Helpful Resources

- Visualize fractions: https://www.mathsisfun.com/fractions.html
- Khan Academy: Fractions introduction
- BBC Bitesize: KS3 Fractions`
  },

  decimals: {
    ref: "decimals",
    title: "Understanding and Operating with Decimals",
    content_type: "text",
    order: 1,
    duration_minutes: 40,
    xp_reward: 40,
    skills_covered: ["decimal operations", "decimal place value", "convert fractions to decimals"],
    learning_objectives: [
      "Understand decimal place value",
      "Add, subtract, multiply and divide decimals",
      "Convert between fractions and decimals"
    ],
    content: `# Understanding and Operating with Decimals

## What are decimals?

Decimals are another way to represent parts of a whole using a decimal point. The positions after the decimal point represent tenths, hundredths, thousandths, etc.

## Place Value

- 0.1 = one tenth
- 0.01 = one hundredth
- 0.001 = one thousandth

## Adding/Subtracting Decimals

1. Line up the decimal points
2. Add/subtract as normal
3. Keep the decimal point in the same position

## Multiplying Decimals

1. Multiply as if they were whole numbers
2. Count total decimal places in both numbers
3. Put that many decimal places in your answer

## Dividing Decimals

1. Make the divisor a whole number by moving decimal points
2. Move the decimal point in the dividend the same number of places
3. Divide as normal

## Converting Fractions to Decimals

Divide the numerator by the denominator

## Converting Decimals to Fractions

1. Write the decimal over the appropriate power of 10
2. Simplify

---

## Worked Examples

### Example 1: Adding decimals
**Calculate:** 3.45 + 12.8

**Solution:**

  3.45
+12.80
------
 16.25

### Example 2: Multiplying decimals
**Calculate:** 0.6 × 0.4

**Solution:**
- 6 × 4 = 24
- Two decimal places total → **0.24**

### Example 3: Converting fraction to decimal
**Convert 3/8 to a decimal**

**Solution:**
- 3 ÷ 8 = **0.375**

---

## Practice Questions

1. Calculate: 4.67 + 3.8
2. Calculate: 5.2 - 2.85
3. Calculate: 0.7 × 0.3
4. Calculate: 4.8 ÷ 0.6
5. Convert 5/8 to a decimal

---

## Helpful Resources

- BBC Bitesize: Decimals
- https://www.mathsisfun.com/decimals.html`
  },

  percentages: {
    ref: "percentages",
    title: "Understanding and Calculating Percentages",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 50,
    skills_covered: ["calculate percentages", "percentage increase", "percentage decrease", "reverse percentages"],
    learning_objectives: [
      "Understand what percentages represent",
      "Convert between fractions, decimals, and percentages",
      "Calculate percentage increases and decreases",
      "Solve reverse percentage problems"
    ],
    content: `# Understanding and Calculating Percentages

## What is a percentage?

A percentage means "out of 100". The symbol is %.

**Example:** 50% = 50/100 = 0.5

## Converting between fractions, decimals, and percentages

- **Fraction to %:** Divide and multiply by 100
- **Decimal to %:** Multiply by 100
- **% to decimal:** Divide by 100
- **% to fraction:** Write over 100 and simplify

## Finding a percentage of an amount

**Method 1:** (Percentage ÷ 100) × Amount
**Method 2:** Convert to decimal and multiply

## Percentage increase/decrease

1. Find the change in value
2. Divide by original value
3. Multiply by 100

## Reverse percentages

If you know the new value after a percentage change, divide by the multiplier.

---

## Worked Examples

### Example 1: Find 15% of £80
**Solution:**
- (15 ÷ 100) × 80 = 0.15 × 80 = **£12**

### Example 2: Percentage increase
A shirt costs £25. It increases by 20%. What's the new price?

**Solution:**
- Increase: 20% of £25 = 0.2 × 25 = £5
- New price: £25 + £5 = **£30**
- OR: £25 × 1.2 = **£30**

### Example 3: Finding percentage change
A price drops from £50 to £40. What's the percentage decrease?

**Solution:**
- Change = £50 - £40 = £10
- (10 ÷ 50) × 100 = **20% decrease**

---

## Practice Questions

1. Find 25% of 160
2. Convert 0.45 to a percentage
3. A bike costs £300. It's reduced by 15%. What's the new price?
4. A plant grows from 40cm to 50cm. What's the percentage increase?
5. After a 20% increase, a TV costs £360. What was the original price?

---

## Helpful Resources

- Khan Academy: Percentages
- BBC Bitesize: Percentages`
  },

  ratios: {
    ref: "ratios",
    title: "Understanding Ratios and Proportions",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 60,
    skills_covered: ["simplify ratios", "share in ratios", "direct proportion", "inverse proportion"],
    learning_objectives: [
      "Understand what ratios represent",
      "Simplify ratios to their lowest terms",
      "Share quantities in given ratios",
      "Solve direct and inverse proportion problems"
    ],
    content: `# Understanding Ratios and Proportions

## What is a ratio?

A ratio compares two or more quantities. Written as a:b or a/b.

**Example:** A recipe uses flour and sugar in the ratio 3:1 (3 parts flour to 1 part sugar)

## Simplifying ratios

Divide all parts by the HCF, just like fractions.

**Example:** 6:8 = 3:4

## Sharing in a ratio

1. Add the ratio parts to find total parts
2. Divide the total amount by total parts
3. Multiply each ratio part by this value

## Direct proportion

As one value increases, the other increases at the same rate.
If y is proportional to x: y = kx (where k is constant)

## Inverse proportion

As one value increases, the other decreases.
If y is inversely proportional to x: y = k/x

---

## Worked Examples

### Example 1: Simplifying ratios
**Simplify 12:18**

**Solution:**
- HCF of 12 and 18 = 6
- 12:18 = **2:3**

### Example 2: Sharing £60 in ratio 2:3
**Solution:**
- Total parts = 2 + 3 = 5
- Each part = £60 ÷ 5 = £12
- First share: 2 × £12 = **£24**
- Second share: 3 × £12 = **£36**

### Example 3: Direct proportion
If 5 pens cost £3, how much do 8 pens cost?

**Solution:**
- 1 pen costs £3 ÷ 5 = £0.60
- 8 pens cost 8 × £0.60 = **£4.80**

---

## Practice Questions

1. Simplify the ratio 15:25
2. Share £120 in the ratio 3:5
3. A recipe for 4 people uses 200g flour. How much for 6 people?
4. Express 30cm to 2m as a ratio in simplest form
5. If 3 workers take 6 hours to complete a job, how long would 4 workers take? (inverse proportion)

---

## Helpful Resources

- BBC Bitesize: Ratio and Proportion
- https://www.mathsisfun.com/numbers/ratio.html`
  },

  bidmas: {
    ref: "bidmas",
    title: "Order of Operations: BIDMAS/BODMAS",
    content_type: "text",
    order: 1,
    duration_minutes: 35,
    xp_reward: 40,
    skills_covered: ["apply BIDMAS", "evaluate expressions"],
    learning_objectives: [
      "Understand the BIDMAS rule",
      "Apply operations in the correct order",
      "Evaluate complex expressions accurately"
    ],
    content: `# Order of Operations: BIDMAS/BODMAS

## BIDMAS tells you the order to perform operations:

- **B**rackets
- **I**ndices (powers/roots)
- **D**ivision and **M**ultiplication (left to right)
- **A**ddition and **S**ubtraction (left to right)

## Key rules

1. Always do brackets first
2. Then powers and roots
3. Division and multiplication have equal priority – do them left to right
4. Addition and subtraction have equal priority – do them left to right

## Common mistakes

- Don't always do division before multiplication
- Don't always do addition before subtraction
- Remember to work from left to right for equal priority operations

---

## Worked Examples

### Example 1: Basic BIDMAS
**Calculate:** 3 + 4 × 2

**Solution:**
- Multiply first: 4 × 2 = 8
- Then add: 3 + 8 = **11**
- NOT: (3 + 4) × 2 = 14 ❌

### Example 2: With brackets
**Calculate:** (5 + 3) × 2²

**Solution:**
- Brackets: 5 + 3 = 8
- Indices: 2² = 4
- Multiply: 8 × 4 = **32**

### Example 3: Complex expression
**Calculate:** 20 - 12 ÷ 3 + 2

**Solution:**
- Division: 12 ÷ 3 = 4
- Left to right: 20 - 4 + 2
- 20 - 4 = 16
- 16 + 2 = **18**

---

## Practice Questions

1. Calculate: 5 + 6 × 2
2. Calculate: (8 - 3) × 4
3. Calculate: 18 ÷ 3 + 2 × 5
4. Calculate: 3² + 4 × 2
5. Calculate: 24 ÷ (8 - 2) + 3

---

## Helpful Resources

- BBC Bitesize: BIDMAS
- Khan Academy: Order of Operations`
  },

  simplifying: {
    ref: "simplifying",
    title: "Simplifying Algebraic Expressions",
    content_type: "text",
    order: 1,
    duration_minutes: 40,
    xp_reward: 45,
    skills_covered: ["collect like terms", "multiply algebraic terms", "divide algebraic terms"],
    learning_objectives: [
      "Identify like terms",
      "Collect like terms by adding/subtracting",
      "Multiply and divide algebraic terms",
      "Simplify complex expressions"
    ],
    content: `# Simplifying Algebraic Expressions

## Like terms

Terms that have the same variable(s) raised to the same power.
- 3x and 5x are like terms
- 3x and 3x² are NOT like terms
- 2xy and 5xy are like terms

## Collecting like terms

Add or subtract the coefficients (numbers in front) of like terms.

**Example:** 3x + 5x = 8x

## Rules

1. Only combine terms with identical variable parts
2. Keep the variable part and add/subtract coefficients
3. Constants can be combined together

## Multiplying terms

- Multiply coefficients together
- Add the powers of the same variable

**Example:** 3x × 4x² = 12x³

## Dividing terms

- Divide coefficients
- Subtract the powers

**Example:** 12x⁵ ÷ 3x² = 4x³

---

## Worked Examples

### Example 1: Collecting like terms
**Simplify:** 5x + 3y - 2x + 7y

**Solution:**
- Combine x terms: 5x - 2x = 3x
- Combine y terms: 3y + 7y = 10y
- Answer: **3x + 10y**

### Example 2: With constants
**Simplify:** 4a + 5 - 2a + 3

**Solution:**
- Combine a terms: 4a - 2a = 2a
- Combine constants: 5 + 3 = 8
- Answer: **2a + 8**

### Example 3: Multiplying and dividing
**Simplify:** (6x³ × 2x²) ÷ 3x

**Solution:**
- Multiply: 6x³ × 2x² = 12x⁵
- Divide: 12x⁵ ÷ 3x = **4x⁴**

---

## Practice Questions

1. Simplify: 7x + 4x - 3x
2. Simplify: 5a + 2b - 3a + 4b
3. Simplify: 3x² + 5x - x² + 2x
4. Simplify: 4x × 5y
5. Simplify: 15x⁴ ÷ 3x²

---

## Helpful Resources

- BBC Bitesize: Algebraic expressions
- Khan Academy: Simplifying expressions`
  },

  expanding: {
    ref: "expanding",
    title: "Expanding Brackets and Multiplying Terms",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 55,
    skills_covered: ["expand single brackets", "expand double brackets", "FOIL method"],
    learning_objectives: [
      "Expand single brackets",
      "Expand double brackets using FOIL",
      "Handle negative signs correctly",
      "Simplify expressions after expanding"
    ],
    content: `# Expanding Brackets and Multiplying Terms

## Single bracket

Multiply everything inside the bracket by the term outside.

**Formula:** a(b + c) = ab + ac

## Double brackets (FOIL method)

**(a + b)(c + d)**

- **F**irst: a × c
- **O**uter: a × d
- **I**nner: b × c
- **L**ast: b × d

## Remember

- Be careful with negative signs
- Combine like terms after expanding
- Check your answer by substituting a value

---

## Worked Examples

### Example 1: Single bracket
**Expand:** 3(x + 4)

**Solution:**
- 3 × x = 3x
- 3 × 4 = 12
- Answer: **3x + 12**

### Example 2: Single bracket with negatives
**Expand:** -2(3x - 5)

**Solution:**
- -2 × 3x = -6x
- -2 × -5 = +10
- Answer: **-6x + 10**

### Example 3: Double brackets
**Expand:** (x + 3)(x + 5)

**Solution:**
- First: x × x = x²
- Outer: x × 5 = 5x
- Inner: 3 × x = 3x
- Last: 3 × 5 = 15
- Answer: x² + 5x + 3x + 15 = **x² + 8x + 15**

---

## Practice Questions

1. Expand: 5(x + 3)
2. Expand: 4(2x - 3)
3. Expand: -3(x + 7)
4. Expand: (x + 2)(x + 4)
5. Expand and simplify: (2x + 1)(x - 3)

---

## Helpful Resources

- BBC Bitesize: Expanding brackets
- https://www.mathsisfun.com/algebra/expanding.html`
  },

  factorising: {
    ref: "factorising",
    title: "Factorising Algebraic Expressions",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 60,
    skills_covered: ["factorise with HCF", "factorise quadratics", "difference of two squares"],
    learning_objectives: [
      "Factorise using common factors",
      "Factorise quadratic expressions",
      "Recognise and factorise difference of two squares",
      "Understand factorising as the reverse of expanding"
    ],
    content: `# Factorising Algebraic Expressions

**Factorising** is the reverse of expanding brackets. You're looking for common factors.

## Factorising with common factors

1. Find the HCF of all terms
2. Put the HCF outside the bracket
3. Divide each term by the HCF to find what goes inside

## Factorising quadratics (x² + bx + c)

Find two numbers that:
- Multiply to give c
- Add to give b

Write as (x + ?)(x + ?)

## Difference of two squares

**Formula:** a² - b² = (a + b)(a - b)

---

## Worked Examples

### Example 1: Common factor
**Factorise:** 6x + 9

**Solution:**
- HCF of 6 and 9 = 3
- Answer: **3(2x + 3)**

### Example 2: Factorising quadratic
**Factorise:** x² + 7x + 12

**Solution:**
- Find two numbers that multiply to 12 and add to 7
- 3 and 4 work (3 × 4 = 12, 3 + 4 = 7)
- Answer: **(x + 3)(x + 4)**

### Example 3: Difference of two squares
**Factorise:** x² - 16

**Solution:**
- x² - 4² = **(x + 4)(x - 4)**

---

## Practice Questions

1. Factorise: 5x + 15
2. Factorise: 4x² + 8x
3. Factorise: x² + 5x + 6
4. Factorise: x² - 9
5. Factorise: x² - 3x - 10

---

## Helpful Resources

- BBC Bitesize: Factorising
- Khan Academy: Factorising quadratics`
  },

  linear_equations: {
    ref: "linear_equations",
    title: "Solving Linear Equations",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 55,
    skills_covered: ["solve one-step equations", "solve two-step equations", "solve equations with x on both sides"],
    learning_objectives: [
      "Understand what an equation represents",
      "Solve one-step and two-step equations",
      "Solve equations with the unknown on both sides",
      "Check solutions by substitution"
    ],
    content: `# Solving Linear Equations

## What is an equation?

A mathematical statement where two expressions are equal. We solve to find the value of the unknown (usually x).

## Golden rule

**Whatever you do to one side, do to the other side.**

## Steps to solve

1. Simplify both sides (expand brackets, collect like terms)
2. Get all x terms on one side, numbers on the other
3. Divide both sides by the coefficient of x

## Equations with x on both sides

1. Move all x terms to one side (subtract the smaller x term)
2. Move numbers to the other side
3. Solve as normal

## Equations with fractions

Multiply both sides by the denominator to clear fractions.

---

## Worked Examples

### Example 1: Basic equation
**Solve:** 2x + 5 = 13

**Solution:**
- Subtract 5: 2x = 8
- Divide by 2: **x = 4**

### Example 2: x on both sides
**Solve:** 5x + 3 = 2x + 15

**Solution:**
- Subtract 2x: 3x + 3 = 15
- Subtract 3: 3x = 12
- Divide by 3: **x = 4**

### Example 3: With brackets
**Solve:** 2(x + 3) = 16

**Solution:**
- Expand: 2x + 6 = 16
- Subtract 6: 2x = 10
- Divide by 2: **x = 5**

---

## Practice Questions

1. Solve: 2x + 7 = 15
2. Solve: 5x - 3 = 17
3. Solve: 3x + 4 = x + 10
4. Solve: 4(x - 2) = 20
5. Solve: (x + 5)/2 = 6

---

## Helpful Resources

- BBC Bitesize: Solving equations
- Khan Academy: Linear equations`
  },

  quadratics: {
    ref: "quadratics",
    title: "Solving Quadratic Equations",
    content_type: "text",
    order: 1,
    duration_minutes: 60,
    xp_reward: 75,
    skills_covered: ["solve by factorising", "use quadratic formula", "understand discriminant"],
    learning_objectives: [
      "Solve quadratic equations by factorising",
      "Use the quadratic formula",
      "Understand the discriminant",
      "Determine the number of solutions"
    ],
    content: `# Solving Quadratic Equations

## What is a quadratic?

An equation in the form **ax² + bx + c = 0**

## Methods for solving

### 1. Factorising
- Factorise the quadratic
- Set each bracket equal to zero
- Solve

### 2. Quadratic Formula
When you can't factorise, use:

**x = [-b ± √(b² - 4ac)] / 2a**

### 3. Completing the square
Rewrite as (x + p)² + q = 0

## The discriminant (b² - 4ac)

- If > 0: two solutions
- If = 0: one solution
- If < 0: no real solutions

---

## Worked Examples

### Example 1: Factorising
**Solve:** x² + 5x + 6 = 0

**Solution:**
- Factorise: (x + 2)(x + 3) = 0
- Either x + 2 = 0 or x + 3 = 0
- **x = -2 or x = -3**

### Example 2: Quadratic formula
**Solve:** 2x² + 3x - 2 = 0

**Solution:**
- a = 2, b = 3, c = -2
- x = [-3 ± √(9 - 4(2)(-2))] / 4
- x = [-3 ± √25] / 4
- x = [-3 ± 5] / 4
- **x = 0.5 or x = -2**

### Example 3: Difference of squares
**Solve:** x² - 25 = 0

**Solution:**
- (x + 5)(x - 5) = 0
- **x = 5 or x = -5**

---

## Practice Questions

1. Solve: x² + 6x + 8 = 0
2. Solve: x² - 4 = 0
3. Solve: x² + 3x - 10 = 0
4. Solve using the formula: x² + 4x + 1 = 0
5. How many solutions does x² + 2x + 5 = 0 have?

---

## Helpful Resources

- BBC Bitesize: Quadratic equations
- Khan Academy: Quadratics`
  },

  sequences: {
    ref: "sequences",
    title: "Number Sequences and nth Term",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 60,
    skills_covered: ["find term-to-term rule", "find nth term", "arithmetic sequences", "geometric sequences"],
    learning_objectives: [
      "Identify different types of sequences",
      "Find the nth term of linear sequences",
      "Work with arithmetic and geometric sequences",
      "Determine if a number is in a sequence"
    ],
    content: `# Number Sequences and nth Term

## Types of sequences

### 1. Arithmetic (linear)
Each term increases by a constant amount.
- Common difference: d
- nth term formula: **a + (n-1)d**
  where a = first term, d = common difference

### 2. Geometric
Each term is multiplied by a constant.
- Common ratio: r
- nth term: **ar^(n-1)**

### 3. Quadratic
The second difference is constant.
- nth term includes n²

## Finding the nth term

1. Work out the differences between terms
2. If constant: linear sequence (dn + c)
3. If second difference constant: quadratic (an² + bn + c)

---

## Worked Examples

### Example 1: Linear sequence
**Find the nth term of:** 5, 8, 11, 14...

**Solution:**
- Common difference = 3
- Formula: 3n + c
- When n=1: 3(1) + c = 5, so c = 2
- nth term = **3n + 2**

### Example 2: Find a specific term
**Find the 20th term of:** 2, 7, 12, 17...

**Solution:**
- Common difference = 5
- First term = 2
- nth term = 5n - 3
- 20th term = 5(20) - 3 = **97**

### Example 3: Geometric sequence
**Find the 5th term of:** 3, 6, 12, 24...

**Solution:**
- Common ratio = 2
- nth term = 3 × 2^(n-1)
- 5th term = 3 × 2⁴ = 3 × 16 = **48**

---

## Practice Questions

1. Find the next two terms: 4, 9, 14, 19, ...
2. Find the nth term of: 10, 13, 16, 19, ...
3. Find the 50th term of: 7, 11, 15, 19, ...
4. Is 100 in the sequence 3, 7, 11, 15, ...?
5. Find the nth term of: 1, 4, 9, 16, ... (quadratic)

---

## Helpful Resources

- BBC Bitesize: Sequences
- https://www.mathsisfun.com/algebra/sequences-series.html`
  },

  angles_lines: {
    ref: "angles_lines",
    title: "Angles and Properties of Lines",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 50,
    skills_covered: ["angles on a line", "angles at a point", "parallel line angles", "vertically opposite angles"],
    learning_objectives: [
      "Identify types of angles",
      "Calculate missing angles on a line and around a point",
      "Use angle properties with parallel lines",
      "Apply angle rules to solve problems"
    ],
    content: `# Angles and Properties of Lines

## Types of angles

- **Acute:** 0° < angle < 90°
- **Right:** exactly 90°
- **Obtuse:** 90° < angle < 180°
- **Straight:** exactly 180°
- **Reflex:** 180° < angle < 360°

## Angle rules

1. **Angles on a straight line** add to 180°
2. **Angles around a point** add to 360°
3. **Vertically opposite angles** are equal
4. **Corresponding angles** are equal (F-shape on parallel lines)
5. **Alternate angles** are equal (Z-shape on parallel lines)
6. **Co-interior angles** add to 180° (C-shape on parallel lines)

---

## Worked Examples

### Example 1: Angles on a line
**Find angle x if one angle is 65° and they're on a straight line.**

**Solution:**
- Angles on line = 180°
- x + 65° = 180°
- **x = 115°**

### Example 2: Parallel lines
Two parallel lines cut by a transversal. One angle is 70°. Find the alternate angle.

**Solution:**
- Alternate angles are equal
- Answer = **70°**

### Example 3: Around a point
Three angles around a point are 110°, 85°, and x. Find x.

**Solution:**
- Angles around point = 360°
- 110° + 85° + x = 360°
- **x = 165°**

---

## Practice Questions

1. Two angles on a straight line. One is 48°. Find the other.
2. Find vertically opposite angle to 75°
3. Corresponding angle to 55° on parallel lines?
4. Angles around a point: 90°, 120°, x. Find x.
5. Co-interior angles: one is 65°. Find the other.

---

## Helpful Resources

- BBC Bitesize: Angles
- https://www.mathsisfun.com/geometry/angles.html`
  },

  triangles_polygons: {
    ref: "triangles_polygons",
    title: "Properties of Triangles and Polygons",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 55,
    skills_covered: ["triangle angle sum", "polygon angle sum", "exterior angles", "regular polygons"],
    learning_objectives: [
      "Use angle sum properties of triangles",
      "Calculate interior and exterior angles of polygons",
      "Work with regular polygons",
      "Solve problems involving polygon properties"
    ],
    content: `# Properties of Triangles and Polygons

## Triangle angle sum

**Interior angles of a triangle add to 180°**

## Types of triangles

- **Equilateral:** all sides equal, all angles 60°
- **Isosceles:** two sides equal, two angles equal
- **Scalene:** no sides equal
- **Right-angled:** one 90° angle

## Exterior angle of triangle

Equals sum of two opposite interior angles

## Polygons

- Number of sides = n
- **Sum of interior angles = (n - 2) × 180°**
- **Each interior angle of regular polygon = [(n - 2) × 180°] / n**
- **Each exterior angle = 360° / n**
- Exterior angles always sum to 360°

---

## Worked Examples

### Example 1: Triangle angles
Two angles in a triangle are 65° and 40°. Find the third.

**Solution:**
- Angles sum to 180°
- Third angle = 180° - 65° - 40° = **75°**

### Example 2: Regular hexagon
Find each interior angle of a regular hexagon.

**Solution:**
- n = 6
- Each angle = [(6-2) × 180°] / 6
- = (4 × 180°) / 6 = 720° / 6 = **120°**

### Example 3: Polygon with exterior angle
Each exterior angle of a regular polygon is 40°. How many sides?

**Solution:**
- 360° / n = 40°
- n = 360° / 40° = **9 sides**

---

## Practice Questions

1. Triangle angles: 55°, 80°, x. Find x.
2. Exterior angle of triangle is 120°. One interior opposite angle is 45°. Find the other.
3. How many sides does a polygon with interior angle sum 1080° have?
4. Find each interior angle of a regular octagon.
5. Each exterior angle of a regular polygon is 40°. How many sides?

---

## Helpful Resources

- BBC Bitesize: Triangles and polygons
- Khan Academy: Triangles`
  },

  circles: {
    ref: "circles",
    title: "Circle Properties and Calculations",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 60,
    skills_covered: ["calculate circumference", "calculate area", "arc length", "sector area", "circle theorems"],
    learning_objectives: [
      "Calculate circumference and area of circles",
      "Find arc lengths and sector areas",
      "Apply circle theorems",
      "Solve problems involving circles"
    ],
    content: `# Circle Properties and Calculations

## Parts of a circle

- **Radius (r):** center to edge
- **Diameter (d):** across through center, d = 2r
- **Circumference (C):** perimeter/distance around
- **Arc:** part of the circumference
- **Chord:** straight line joining two points on circle
- **Tangent:** line that touches circle at one point

## Formulas

- **Circumference:** C = πd or C = 2πr
- **Area:** A = πr²
- **Arc length:** (θ/360°) × 2πr (where θ is angle in degrees)
- **Sector area:** (θ/360°) × πr²

## Circle theorems

1. Angle in a semicircle is 90°
2. Angles in the same segment are equal
3. Opposite angles in cyclic quadrilateral sum to 180°
4. Tangent perpendicular to radius
5. Two tangents from same point are equal length

---

## Worked Examples

### Example 1: Circumference
Find circumference of circle with radius 7cm (use π = 3.14)

**Solution:**
- C = 2πr = 2 × 3.14 × 7
- **C = 43.96 cm**

### Example 2: Area
Find area of circle with diameter 10cm

**Solution:**
- Radius = 5cm
- A = πr² = π × 5² = 25π
- **A ≈ 78.5 cm²**

### Example 3: Arc length
Find length of arc with angle 60° in circle radius 9cm

**Solution:**
- Arc = (60/360) × 2π × 9
- = (1/6) × 18π = 3π
- **≈ 9.42 cm**

---

## Practice Questions

1. Find circumference of circle radius 5cm (use π = 3.14)
2. Find area of circle diameter 14cm
3. Find radius of circle with area 49π cm²
4. Find arc length: angle 90°, radius 8cm
5. Find sector area: angle 120°, radius 6cm

---

## Helpful Resources

- BBC Bitesize: Circles
- https://www.mathsisfun.com/geometry/circle.html`
  },

  pythagoras: {
    ref: "pythagoras",
    title: "Pythagoras' Theorem",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 65,
    skills_covered: ["find hypotenuse", "find shorter side", "apply to problems", "Pythagorean triples"],
    learning_objectives: [
      "State Pythagoras' theorem",
      "Find the hypotenuse of a right-angled triangle",
      "Find a shorter side using Pythagoras",
      "Apply Pythagoras to real-world problems"
    ],
    content: `# Pythagoras' Theorem

## Pythagoras' Theorem

In a right-angled triangle:
**a² + b² = c²**

where:
- a and b are the two shorter sides
- c is the hypotenuse (longest side, opposite the right angle)

## Finding the hypotenuse

**c = √(a² + b²)**

## Finding a shorter side

**a = √(c² - b²)**

## Applications

- Finding distances
- Checking if triangle is right-angled
- 3D problems

## Common Pythagorean triples

- 3, 4, 5
- 5, 12, 13
- 8, 15, 17
- Multiples also work: 6, 8, 10

---

## Worked Examples

### Example 1: Finding hypotenuse
Right triangle with sides 3cm and 4cm. Find hypotenuse.

**Solution:**
- c² = 3² + 4²
- c² = 9 + 16 = 25
- **c = √25 = 5cm**

### Example 2: Finding shorter side
Hypotenuse is 13cm, one side is 5cm. Find the other.

**Solution:**
- a² + 5² = 13²
- a² + 25 = 169
- a² = 144
- **a = 12cm**

### Example 3: Is it right-angled?
Triangle with sides 7cm, 24cm, 25cm. Is it right-angled?

**Solution:**
- Check: 7² + 24² = 25²?
- 49 + 576 = 625?
- 625 = 625 ✓ **Yes, it's right-angled**

---

## Practice Questions

1. Find hypotenuse: sides 5cm and 12cm
2. Find missing side: hypotenuse 10cm, one side 6cm
3. Is triangle with sides 9, 12, 15 right-angled?
4. A ladder 5m long leans against a wall. Base is 3m from wall. How high up the wall?
5. Find diagonal of rectangle 8cm by 6cm

---

## Helpful Resources

- BBC Bitesize: Pythagoras
- Khan Academy: Pythagorean theorem`
  },

  trigonometry: {
    ref: "trigonometry",
    title: "Introduction to Trigonometry (SOH CAH TOA)",
    content_type: "text",
    order: 1,
    duration_minutes: 60,
    xp_reward: 75,
    skills_covered: ["use sin cos tan", "find sides", "find angles", "apply SOH CAH TOA"],
    learning_objectives: [
      "Understand the three trigonometric ratios",
      "Use SOH CAH TOA to find missing sides",
      "Use inverse functions to find angles",
      "Apply trigonometry to right-angled triangles"
    ],
    content: `# Introduction to Trigonometry (SOH CAH TOA)

## The three ratios

In a right-angled triangle:

**SOH:** sin(θ) = Opposite / Hypotenuse
**CAH:** cos(θ) = Adjacent / Hypotenuse
**TOA:** tan(θ) = Opposite / Adjacent

## Finding sides

1. Label triangle: O, A, H relative to the angle
2. Choose correct ratio based on what you have/want
3. Rearrange and calculate

## Finding angles

Use inverse functions:
- θ = sin⁻¹(O/H)
- θ = cos⁻¹(A/H)
- θ = tan⁻¹(O/A)

---

## Worked Examples

### Example 1: Finding a side
Right triangle: hypotenuse 10cm, angle 30°. Find opposite side.

**Solution:**
- Use SOH: sin(30°) = O/10
- O = 10 × sin(30°)
- **O = 10 × 0.5 = 5cm**

### Example 2: Finding an angle
Right triangle: opposite = 8cm, adjacent = 6cm. Find angle.

**Solution:**
- Use TOA: tan(θ) = 8/6
- θ = tan⁻¹(8/6)
- θ = tan⁻¹(1.333)
- **θ ≈ 53.1°**

### Example 3: Using cos
Find adjacent side: hypotenuse 20cm, angle 40°

**Solution:**
- Use CAH: cos(40°) = A/20
- A = 20 × cos(40°)
- **A ≈ 15.3cm**

---

## Practice Questions

1. Find opposite side: hypotenuse 15cm, angle 45°
2. Find adjacent: hypotenuse 12cm, angle 60°
3. Find angle: opposite 7cm, hypotenuse 10cm
4. Find angle: adjacent 5cm, opposite 8cm
5. Find hypotenuse: adjacent 6cm, angle 50°

---

## Helpful Resources

- BBC Bitesize: Trigonometry
- https://www.mathsisfun.com/sine-cosine-tangent.html`
  },

  averages: {
    ref: "averages",
    title: "Mean, Median, Mode, and Range",
    content_type: "text",
    order: 1,
    duration_minutes: 40,
    xp_reward: 45,
    skills_covered: ["calculate mean", "find median", "find mode", "calculate range"],
    learning_objectives: [
      "Calculate the mean of a data set",
      "Find the median and mode",
      "Calculate the range",
      "Choose appropriate averages for different contexts"
    ],
    content: `# Mean, Median, Mode, and Range

## The four measures

### 1. Mean (average)
Add all values and divide by how many values

**Mean = Sum / Number of values**

### 2. Median (middle value)
- Arrange in order
- Find middle value
- If even number of values, find mean of middle two

### 3. Mode (most common)
The value that appears most often
Can have no mode, one mode, or multiple modes

### 4. Range (spread)
**Highest value - Lowest value**

## When to use each

- **Mean:** best overall average, affected by extreme values
- **Median:** good when there are outliers
- **Mode:** useful for categories/most popular
- **Range:** shows spread of data

---

## Worked Examples

### Example 1: Calculate all four
**Data:** 3, 7, 5, 9, 5, 12

**Solution:**
- Mean = (3+7+5+9+5+12)/6 = 41/6 ≈ **6.8**
- Median: Order: 3,5,5,7,9,12. Middle two: 5,7. Median = **6**
- Mode = **5** (appears twice)
- Range = 12 - 3 = **9**

### Example 2: Finding missing value
Mean of 4, 6, 8, x is 7. Find x.

**Solution:**
- (4+6+8+x)/4 = 7
- 18+x = 28
- **x = 10**

### Example 3: Grouped data mean
Ages: 10-12 (5 people), 13-15 (8 people), 16-18 (3 people)

**Solution:**
- Use midpoints: 11, 14, 17
- Mean = (11×5 + 14×8 + 17×3) / 16
- = (55 + 112 + 51) / 16 = **13.625**

---

## Practice Questions

1. Find mean: 12, 15, 18, 20, 25
2. Find median: 4, 8, 12, 3, 9, 11
3. Find mode: 2, 5, 3, 5, 8, 5, 9
4. Find range: 23, 45, 12, 67, 34
5. Mean of 5, 9, x, 11 is 8. Find x.

---

## Helpful Resources

- BBC Bitesize: Averages
- Khan Academy: Statistics`
  },

  probability: {
    ref: "probability",
    title: "Introduction to Probability",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 50,
    skills_covered: ["calculate probability", "probability scale", "expected frequency", "complementary events"],
    learning_objectives: [
      "Calculate basic probabilities",
      "Use the probability scale",
      "Find expected frequencies",
      "Work with complementary events"
    ],
    content: `# Introduction to Probability

## Probability formula

**P(event) = Number of favorable outcomes / Total number of outcomes**

## Probability scale

- 0 = impossible
- 0.5 = even chance
- 1 = certain
- All probabilities are between 0 and 1

## Key rules

1. **P(not A) = 1 - P(A)**
2. P(A or B) = P(A) + P(B) - P(A and B)
   (for independent events: just add if mutually exclusive)
3. P(A and B) = P(A) × P(B) for independent events

## Expressing probability

Can be written as:
- Fraction: 1/6
- Decimal: 0.167
- Percentage: 16.7%

## Expected frequency

**Expected frequency = Probability × Number of trials**

---

## Worked Examples

### Example 1: Basic probability
Rolling a die, what's P(rolling a 5)?

**Solution:**
- Favorable outcomes: 1 (only one 5)
- Total outcomes: 6
- **P(5) = 1/6**

### Example 2: Complementary events
P(rain) = 0.3. What's P(no rain)?

**Solution:**
- **P(no rain) = 1 - 0.3 = 0.7**

### Example 3: Expected frequency
P(heads) = 0.5. Flip coin 50 times. Expected heads?

**Solution:**
- **Expected = 0.5 × 50 = 25 heads**

---

## Practice Questions

1. Probability of picking a red card from 52 cards?
2. P(even number) when rolling a die?
3. If P(win) = 0.4, find P(not win)
4. Spinner with 5 equal sections (2 red, 2 blue, 1 green). P(red)?
5. P(scoring 6) = 1/6. Roll 60 times. Expected number of 6s?

---

## Helpful Resources

- BBC Bitesize: Probability
- https://www.mathsisfun.com/data/probability.html`
  },

  graphs: {
    ref: "graphs",
    title: "Reading and Interpreting Graphs and Charts",
    content_type: "text",
    order: 1,
    duration_minutes: 40,
    xp_reward: 40,
    skills_covered: ["read bar charts", "read pie charts", "read line graphs", "interpret pictograms"],
    learning_objectives: [
      "Read different types of graphs accurately",
      "Interpret data from charts",
      "Compare information from different graphs",
      "Choose appropriate graph types"
    ],
    content: `# Reading and Interpreting Graphs and Charts

## Types of graphs

### 1. Bar chart
- Shows categories
- Height shows frequency/amount
- Gaps between bars

### 2. Pictogram
- Uses symbols to represent data
- Check the key for symbol value

### 3. Pie chart
- Shows proportions
- Whole circle = 360°
- Angle = (frequency/total) × 360°

### 4. Line graph
- Shows trends over time
- Join points with lines

### 5. Scatter graph
- Shows relationship between two variables
- Each point represents one item

## Reading graphs

1. Check axes labels and scales
2. Check titles and keys
3. Read values carefully
4. Look for patterns/trends

---

## Worked Examples

### Example 1: Bar chart
Chart shows: Mon-10, Tue-15, Wed-8, Thu-12, Fri-20
What's the total for the week?

**Solution:**
- Total = 10+15+8+12+20 = **65**

### Example 2: Pie chart
Total = 120. Angle for "football" = 90°. How many chose football?

**Solution:**
- (90°/360°) × 120 = (1/4) × 120 = **30**

### Example 3: Line graph trends
Temperature graph shows: 12°C at 9am, 18°C at 3pm
What's the increase?

**Solution:**
- Increase = 18 - 12 = **6°C**

---

## Practice Questions

1. Bar chart shows sales: Jan-50, Feb-40, Mar-60. What's the range?
2. Pie chart total=80, angle=120°. Find the frequency.
3. Line graph: point A(2,5), point B(6,13). What's the increase in y?
4. Pictogram: ⭐ = 4 people. 3.5 stars shown. How many people?
5. Which graph best shows change over time: bar, pie, or line?

---

## Helpful Resources

- BBC Bitesize: Charts and graphs
- https://www.mathsisfun.com/data/graphs-index.html`
  },

  scatter: {
    ref: "scatter",
    title: "Scatter Graphs and Correlation",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 55,
    skills_covered: ["identify correlation", "draw line of best fit", "make predictions", "identify outliers"],
    learning_objectives: [
      "Understand what scatter graphs show",
      "Identify positive, negative, and no correlation",
      "Draw lines of best fit",
      "Make predictions using scatter graphs"
    ],
    content: `# Scatter Graphs and Correlation

## What is a scatter graph?

Shows relationship between two variables. Each point represents one data item.

## Types of correlation

### 1. Positive correlation
- As one variable increases, the other increases
- Points slope upward from left to right
- Strong if close to a line, weak if spread out

### 2. Negative correlation
- As one variable increases, the other decreases
- Points slope downward from left to right

### 3. No correlation
- No clear pattern
- Points scattered randomly

## Line of best fit

- Draw a line through the middle of points
- Equal points above and below
- Used to make predictions
- Should pass through the mean point

## Outliers

Points that don't fit the pattern

---

## Worked Examples

### Example 1: Identifying correlation
Graph shows: as hours studied increases, test score increases.

**Solution:**
- This is **positive correlation**
- More study → higher scores

### Example 2: Line of best fit
Points: (2,3), (4,5), (6,7), (8,9)

**Solution:**
- Perfect positive correlation
- Line: y = x + 1
- Can predict: if x=10, **y=11**

### Example 3: Interpreting
Ice cream sales vs temperature shows positive correlation.

**Solution:**
- As temperature increases, sales increase
- But **correlation doesn't mean causation**
- Both might be linked to summer

---

## Practice Questions

1. Height vs shoe size. What type of correlation?
2. Temperature vs heating bills. What correlation?
3. Draw line of best fit for: (1,2), (2,4), (3,5), (4,8)
4. If correlation is strong positive, points are: spread out or close to line?
5. Does correlation prove one thing causes another?

---

## Helpful Resources

- BBC Bitesize: Scatter graphs
- Khan Academy: Scatter plots`
  },

  primes: {
    ref: "primes",
    title: "Prime Numbers and Prime Factors",
    content_type: "text",
    order: 1,
    duration_minutes: 40,
    xp_reward: 45,
    skills_covered: ["identify primes", "prime factorisation", "use factor trees", "index notation"],
    learning_objectives: [
      "Understand what prime numbers are",
      "Identify prime numbers",
      "Express numbers as products of prime factors",
      "Use index notation for repeated primes"
    ],
    content: `# Prime Numbers and Prime Factors

## What is a prime number?

A number greater than 1 that has exactly two factors: 1 and itself.

## First 10 primes

2, 3, 5, 7, 11, 13, 17, 19, 23, 29

## Key facts

- 1 is NOT prime (only one factor)
- 2 is the only even prime
- All primes > 2 are odd

## Prime factorisation

Writing a number as a product of prime factors.

### Method (factor tree)
1. Split number into any two factors
2. Keep splitting until all factors are prime
3. Write as multiplication of primes

## Index notation

Use powers for repeated primes

**Example:** 72 = 2³ × 3²

---

## Worked Examples

### Example 1: Is it prime?
Is 17 prime?

**Solution:**
- Check divisibility by primes < √17 (2,3)
- 17 ÷ 2 = 8.5 (not divisible)
- 17 ÷ 3 = 5.67 (not divisible)
- **Yes, 17 is prime**

### Example 2: Prime factorisation
Find prime factors of 60

**Solution:**

        60
       /  \\
      6   10
     / \\  / \\
    2  3 2  5

**60 = 2 × 2 × 3 × 5 = 2² × 3 × 5**

### Example 3: Using prime factors
Express 48 as product of prime factors

**Solution:**
- 48 = 2 × 24 = 2 × 2 × 12 = 2 × 2 × 2 × 6 = 2 × 2 × 2 × 2 × 3
- **48 = 2⁴ × 3**

---

## Practice Questions

1. List all prime numbers between 20 and 30
2. Is 51 prime?
3. Write 36 as a product of prime factors
4. Express 100 using index notation
5. What's the smallest prime number?

---

## Helpful Resources

- BBC Bitesize: Prime numbers
- https://www.mathsisfun.com/prime-factorization.html`
  },

  hcf_lcm: {
    ref: "hcf_lcm",
    title: "Highest Common Factor and Lowest Common Multiple",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 55,
    skills_covered: ["find HCF", "find LCM", "use prime factorisation method"],
    learning_objectives: [
      "Find the HCF of two or more numbers",
      "Find the LCM of two or more numbers",
      "Use prime factorisation method for HCF and LCM",
      "Apply HCF and LCM to problem solving"
    ],
    content: `# Highest Common Factor and Lowest Common Multiple

## HCF (Highest Common Factor)

The largest number that divides into both numbers.

### Method 1 - List factors
1. List all factors of each number
2. Find common factors
3. Choose the highest

### Method 2 - Prime factorisation
1. Write each number as prime factors
2. Take common prime factors
3. Multiply them

## LCM (Lowest Common Multiple)

The smallest number that both numbers divide into.

### Method 1 - List multiples
1. List multiples of each number
2. Find common multiples
3. Choose the lowest

### Method 2 - Prime factorisation
1. Write each as prime factors
2. Take highest power of each prime
3. Multiply them

---

## Worked Examples

### Example 1: HCF using factors
Find HCF of 12 and 18

**Solution:**
- Factors of 12: 1,2,3,4,6,12
- Factors of 18: 1,2,3,6,9,18
- Common: 1,2,3,6
- **HCF = 6**

### Example 2: HCF using primes
Find HCF of 24 and 36

**Solution:**
- 24 = 2³ × 3
- 36 = 2² × 3²
- Common: 2² × 3 = **12**

### Example 3: LCM using primes
Find LCM of 12 and 15

**Solution:**
- 12 = 2² × 3
- 15 = 3 × 5
- LCM = 2² × 3 × 5 = **60**

---

## Practice Questions

1. Find HCF of 16 and 24
2. Find LCM of 6 and 8
3. Find HCF of 30 and 45
4. Find LCM of 9 and 12
5. HCF of 48 and 60 using prime factors

---

## Helpful Resources

- BBC Bitesize: HCF and LCM
- Khan Academy: LCM and HCF`
  },

  standard_form: {
    ref: "standard_form",
    title: "Standard Form (Scientific Notation)",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 65,
    skills_covered: ["convert to standard form", "convert from standard form", "multiply in standard form", "divide in standard form"],
    learning_objectives: [
      "Understand standard form notation",
      "Convert large and small numbers to standard form",
      "Perform calculations in standard form",
      "Apply standard form to real-world problems"
    ],
    content: `# Standard Form (Scientific Notation)

## What is standard form?

A way to write very large or very small numbers:
**A × 10ⁿ**
where 1 ≤ A < 10 and n is an integer

## For large numbers

- n is positive
- Move decimal left until you have number between 1 and 10
- Count moves = power of 10

## For small numbers

- n is negative
- Move decimal right
- Count moves = power of 10 (negative)

## Calculations in standard form

### Multiplication
Multiply A values, add powers

### Division
Divide A values, subtract powers

### Addition/Subtraction
Convert to ordinary numbers or make powers the same

---

## Worked Examples

### Example 1: Large number
Write 45000 in standard form

**Solution:**
- Move decimal 4 places left
- **4.5 × 10⁴**

### Example 2: Small number
Write 0.00035 in standard form

**Solution:**
- Move decimal 4 places right
- **3.5 × 10⁻⁴**

### Example 3: Multiplication
Calculate (3 × 10⁵) × (2 × 10³)

**Solution:**
- Multiply A values: 3 × 2 = 6
- Add powers: 5 + 3 = 8
- Answer: **6 × 10⁸**

---

## Practice Questions

1. Write 2700 in standard form
2. Write 0.0045 in standard form
3. Calculate (4 × 10³) × (3 × 10²)
4. Calculate (8 × 10⁶) ÷ (2 × 10²)
5. Write 3.2 × 10⁻³ as an ordinary number

---

## Helpful Resources

- BBC Bitesize: Standard form
- Khan Academy: Scientific notation`
  },

  surds: {
    ref: "surds",
    title: "Introduction to Surds",
    content_type: "text",
    order: 1,
    duration_minutes: 45,
    xp_reward: 70,
    skills_covered: ["simplify surds", "multiply surds", "add surds", "rationalise denominators"],
    learning_objectives: [
      "Understand what surds are",
      "Simplify surds",
      "Perform operations with surds",
      "Rationalise denominators"
    ],
    content: `# Introduction to Surds

## What is a surd?

A square root that cannot be simplified to a whole number.

**Examples:** √2, √3, √5

## Not surds

√4 = 2, √9 = 3, √16 = 4 (these simplify to integers)

## Simplifying surds

Look for square number factors:
**√ab = √a × √b**

**Example:** √12 = √(4×3) = √4 × √3 = 2√3

## Multiplying surds

**√a × √b = √(ab)**

## Adding/Subtracting surds

Only combine like surds (same root):
- 3√2 + 5√2 = 8√2
- But: √2 + √3 cannot be simplified

## Rationalising the denominator

Multiply top and bottom by the surd in the denominator:

**1/√2 = 1/√2 × √2/√2 = √2/2**

---

## Worked Examples

### Example 1: Simplifying
Simplify √18

**Solution:**
- √18 = √(9×2) = √9 × √2 = **3√2**

### Example 2: Multiplying
Simplify √3 × √12

**Solution:**
- √3 × √12 = √36 = **6**

### Example 3: Rationalising
Rationalise 4/√5

**Solution:**
- 4/√5 × √5/√5 = **4√5/5**

---

## Practice Questions

1. Simplify √8
2. Simplify √50
3. Calculate √2 × √8
4. Simplify 2√3 + 5√3
5. Rationalise 6/√3

---

## Helpful Resources

- BBC Bitesize: Surds
- https://www.mathsisfun.com/algebra/surds.html`
  }
};

// ============================================================================
// QUIZZES DATA
// ============================================================================

export const mathsQuizzes = [
  {
    ref: "fractions",
    title: "Fractions Quiz",
    description: "Test your understanding of fractions",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 50,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "What is 3/4 + 1/6?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "add fractions",
        points: 1,
        options: [
          { id: "A", text: "4/10" },
          { id: "B", text: "11/12" },
          { id: "C", text: "5/6" },
          { id: "D", text: "7/8" }
        ],
        correct_answer: "B",
        explanation: "Common denominator is 12. 3/4 = 9/12, 1/6 = 2/12. So 9/12 + 2/12 = 11/12"
      },
      {
        question_text: "Simplify 15/20",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "simplify fractions",
        points: 1,
        options: [
          { id: "A", text: "3/4" },
          { id: "B", text: "5/10" },
          { id: "C", text: "1/2" },
          { id: "D", text: "2/3" }
        ],
        correct_answer: "A",
        explanation: "Divide both numerator and denominator by HCF of 5: 15÷5 = 3, 20÷5 = 4"
      },
      {
        question_text: "Calculate 2/3 × 3/4",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "multiply fractions",
        points: 1,
        options: [
          { id: "A", text: "5/7" },
          { id: "B", text: "6/12" },
          { id: "C", text: "1/2" },
          { id: "D", text: "2/3" }
        ],
        correct_answer: "C",
        explanation: "(2×3)/(3×4) = 6/12 = 1/2"
      },
      {
        question_text: "Calculate 5/6 ÷ 2/3",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "divide fractions",
        points: 1,
        options: [
          { id: "A", text: "10/18" },
          { id: "B", text: "5/4" },
          { id: "C", text: "7/9" },
          { id: "D", text: "1" }
        ],
        correct_answer: "B",
        explanation: "5/6 × 3/2 = 15/12 = 5/4 or 1 1/4"
      },
      {
        question_text: "Which is larger: 5/8 or 3/5?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "compare fractions",
        points: 1,
        options: [
          { id: "A", text: "5/8" },
          { id: "B", text: "3/5" },
          { id: "C", text: "Equal" },
          { id: "D", text: "Cannot determine" }
        ],
        correct_answer: "A",
        explanation: "5/8 = 0.625, 3/5 = 0.6, so 5/8 is larger"
      }
    ]
  },
  {
    ref: "decimals",
    title: "Decimals Quiz",
    description: "Test your knowledge of decimal operations",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 40,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Calculate 4.7 + 3.85",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "add decimals",
        points: 1,
        options: [
          { id: "A", text: "8.55" },
          { id: "B", text: "8.45" },
          { id: "C", text: "7.55" },
          { id: "D", text: "9.55" }
        ],
        correct_answer: "A",
        explanation: "Line up decimal points: 4.70 + 3.85 = 8.55"
      },
      {
        question_text: "What is 6.4 - 2.75?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "subtract decimals",
        points: 1,
        options: [
          { id: "A", text: "3.65" },
          { id: "B", text: "3.75" },
          { id: "C", text: "4.65" },
          { id: "D", text: "3.55" }
        ],
        correct_answer: "A",
        explanation: "6.40 - 2.75 = 3.65"
      },
      {
        question_text: "Calculate 0.8 × 0.5",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "multiply decimals",
        points: 1,
        options: [
          { id: "A", text: "0.4" },
          { id: "B", text: "0.04" },
          { id: "C", text: "4.0" },
          { id: "D", text: "0.13" }
        ],
        correct_answer: "A",
        explanation: "8 × 5 = 40, two decimal places total gives 0.40 = 0.4"
      },
      {
        question_text: "What is 3.6 ÷ 0.4?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "divide decimals",
        points: 1,
        options: [
          { id: "A", text: "9" },
          { id: "B", text: "0.9" },
          { id: "C", text: "90" },
          { id: "D", text: "0.09" }
        ],
        correct_answer: "A",
        explanation: "36 ÷ 4 = 9"
      },
      {
        question_text: "Convert 3/5 to a decimal",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "convert fractions to decimals",
        points: 1,
        options: [
          { id: "A", text: "0.35" },
          { id: "B", text: "0.6" },
          { id: "C", text: "0.5" },
          { id: "D", text: "0.75" }
        ],
        correct_answer: "B",
        explanation: "3 ÷ 5 = 0.6"
      }
    ]
  },
  {
    ref: "percentages",
    title: "Percentages Quiz",
    description: "Test your percentage calculation skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 50,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Find 20% of 80",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate percentages",
        points: 1,
        options: [
          { id: "A", text: "16" },
          { id: "B", text: "20" },
          { id: "C", text: "12" },
          { id: "D", text: "18" }
        ],
        correct_answer: "A",
        explanation: "20% = 0.2, so 0.2 × 80 = 16"
      },
      {
        question_text: "Convert 0.35 to a percentage",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "convert to percentage",
        points: 1,
        options: [
          { id: "A", text: "3.5%" },
          { id: "B", text: "35%" },
          { id: "C", text: "350%" },
          { id: "D", text: "0.35%" }
        ],
        correct_answer: "B",
        explanation: "Multiply by 100: 0.35 × 100 = 35%"
      },
      {
        question_text: "Increase £50 by 10%",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "percentage increase",
        points: 1,
        options: [
          { id: "A", text: "£55" },
          { id: "B", text: "£60" },
          { id: "C", text: "£51" },
          { id: "D", text: "£65" }
        ],
        correct_answer: "A",
        explanation: "10% of £50 = £5, so £50 + £5 = £55. Or £50 × 1.1 = £55"
      },
      {
        question_text: "A price drops from £80 to £60. What's the percentage decrease?",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "percentage decrease",
        points: 1,
        options: [
          { id: "A", text: "20%" },
          { id: "B", text: "25%" },
          { id: "C", text: "30%" },
          { id: "D", text: "15%" }
        ],
        correct_answer: "B",
        explanation: "Change = £20, (20/80) × 100 = 25%"
      },
      {
        question_text: "What is 75% as a fraction?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "convert percentage to fraction",
        points: 1,
        options: [
          { id: "A", text: "3/4" },
          { id: "B", text: "7/10" },
          { id: "C", text: "2/3" },
          { id: "D", text: "4/5" }
        ],
        correct_answer: "A",
        explanation: "75/100 = 3/4"
      }
    ]
  },
  {
    ref: "ratios",
    title: "Ratios and Proportions Quiz",
    description: "Test your understanding of ratios",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 60,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Simplify 12:16",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "simplify ratios",
        points: 1,
        options: [
          { id: "A", text: "3:4" },
          { id: "B", text: "6:8" },
          { id: "C", text: "4:3" },
          { id: "D", text: "2:3" }
        ],
        correct_answer: "A",
        explanation: "Divide both by HCF of 4: 12÷4 = 3, 16÷4 = 4"
      },
      {
        question_text: "Share £60 in ratio 2:3. What's the larger share?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "share in ratios",
        points: 1,
        options: [
          { id: "A", text: "£36" },
          { id: "B", text: "£40" },
          { id: "C", text: "£30" },
          { id: "D", text: "£24" }
        ],
        correct_answer: "A",
        explanation: "Total parts = 5, each part = £12. Larger share = 3 × £12 = £36"
      },
      {
        question_text: "If 4 pens cost £2, how much do 10 pens cost?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "direct proportion",
        points: 1,
        options: [
          { id: "A", text: "£4" },
          { id: "B", text: "£5" },
          { id: "C", text: "£4.50" },
          { id: "D", text: "£6" }
        ],
        correct_answer: "B",
        explanation: "1 pen = £0.50, so 10 pens = £5"
      },
      {
        question_text: "Express 25cm to 2m as a ratio in simplest form",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "convert units in ratios",
        points: 1,
        options: [
          { id: "A", text: "1:8" },
          { id: "B", text: "25:200" },
          { id: "C", text: "5:40" },
          { id: "D", text: "1:4" }
        ],
        correct_answer: "A",
        explanation: "2m = 200cm, so 25:200 = 1:8"
      },
      {
        question_text: "If 3 workers take 6 hours, how long for 6 workers? (inverse proportion)",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "inverse proportion",
        points: 1,
        options: [
          { id: "A", text: "12 hours" },
          { id: "B", text: "3 hours" },
          { id: "C", text: "4 hours" },
          { id: "D", text: "9 hours" }
        ],
        correct_answer: "B",
        explanation: "Double workers means half the time: 6 ÷ 2 = 3 hours"
      }
    ]
  },
  {
    ref: "bidmas",
    title: "BIDMAS Quiz",
    description: "Test your order of operations knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 10,
    passing_score: 60,
    xp_reward: 40,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Calculate: 5 + 6 × 2",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "apply BIDMAS",
        points: 1,
        options: [
          { id: "A", text: "22" },
          { id: "B", text: "17" },
          { id: "C", text: "16" },
          { id: "D", text: "11" }
        ],
        correct_answer: "B",
        explanation: "Multiply first: 6 × 2 = 12, then add: 5 + 12 = 17"
      },
      {
        question_text: "Calculate: (8 - 3) × 4",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "brackets first",
        points: 1,
        options: [
          { id: "A", text: "12" },
          { id: "B", text: "20" },
          { id: "C", text: "14" },
          { id: "D", text: "17" }
        ],
        correct_answer: "B",
        explanation: "Brackets: 8 - 3 = 5, then multiply: 5 × 4 = 20"
      },
      {
        question_text: "Calculate: 20 - 8 ÷ 4",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "division before subtraction",
        points: 1,
        options: [
          { id: "A", text: "3" },
          { id: "B", text: "18" },
          { id: "C", text: "16" },
          { id: "D", text: "12" }
        ],
        correct_answer: "B",
        explanation: "Divide first: 8 ÷ 4 = 2, then subtract: 20 - 2 = 18"
      },
      {
        question_text: "Calculate: 3² + 4 × 2",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "indices then multiply",
        points: 1,
        options: [
          { id: "A", text: "49" },
          { id: "B", text: "17" },
          { id: "C", text: "25" },
          { id: "D", text: "14" }
        ],
        correct_answer: "B",
        explanation: "Indices: 3² = 9, multiply: 4 × 2 = 8, add: 9 + 8 = 17"
      },
      {
        question_text: "Calculate: 24 ÷ (8 - 2) + 3",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "complex BIDMAS",
        points: 1,
        options: [
          { id: "A", text: "7" },
          { id: "B", text: "1" },
          { id: "C", text: "9" },
          { id: "D", text: "4" }
        ],
        correct_answer: "A",
        explanation: "Brackets: 8 - 2 = 6, divide: 24 ÷ 6 = 4, add: 4 + 3 = 7"
      }
    ]
  },
  {
    ref: "simplifying",
    title: "Simplifying Expressions Quiz",
    description: "Test your algebra simplification skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 45,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Simplify: 5x + 3x",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "collect like terms",
        points: 1,
        options: [
          { id: "A", text: "8x" },
          { id: "B", text: "15x" },
          { id: "C", text: "8x²" },
          { id: "D", text: "5x + 3" }
        ],
        correct_answer: "A",
        explanation: "Combine like terms: 5x + 3x = 8x"
      },
      {
        question_text: "Simplify: 7a + 2b - 3a",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "collect like terms",
        points: 1,
        options: [
          { id: "A", text: "4a + 2b" },
          { id: "B", text: "10a + 2b" },
          { id: "C", text: "4a - 2b" },
          { id: "D", text: "6ab" }
        ],
        correct_answer: "A",
        explanation: "7a - 3a = 4a, b term stays: 4a + 2b"
      },
      {
        question_text: "Simplify: 4x² + 3x - x²",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "different powers",
        points: 1,
        options: [
          { id: "A", text: "3x² + 3x" },
          { id: "B", text: "7x" },
          { id: "C", text: "3x³" },
          { id: "D", text: "6x²" }
        ],
        correct_answer: "A",
        explanation: "4x² - x² = 3x², 3x stays: 3x² + 3x"
      },
      {
        question_text: "Simplify: 2x × 5y",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "multiply algebraic terms",
        points: 1,
        options: [
          { id: "A", text: "10xy" },
          { id: "B", text: "7xy" },
          { id: "C", text: "10x + 10y" },
          { id: "D", text: "2xy × 5" }
        ],
        correct_answer: "A",
        explanation: "2 × 5 = 10, x × y = xy, so 10xy"
      },
      {
        question_text: "Simplify: 12x⁴ ÷ 3x²",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "divide algebraic terms",
        points: 1,
        options: [
          { id: "A", text: "4x²" },
          { id: "B", text: "9x²" },
          { id: "C", text: "4x⁶" },
          { id: "D", text: "15x²" }
        ],
        correct_answer: "A",
        explanation: "12 ÷ 3 = 4, x⁴ ÷ x² = x², so 4x²"
      }
    ]
  },
  {
    ref: "expanding",
    title: "Expanding Brackets Quiz",
    description: "Test your bracket expansion skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 55,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Expand: 3(x + 5)",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "expand single brackets",
        points: 1,
        options: [
          { id: "A", text: "3x + 15" },
          { id: "B", text: "3x + 5" },
          { id: "C", text: "3x + 8" },
          { id: "D", text: "x + 15" }
        ],
        correct_answer: "A",
        explanation: "3 × x = 3x, 3 × 5 = 15"
      },
      {
        question_text: "Expand: 5(2x - 3)",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "expand with subtraction",
        points: 1,
        options: [
          { id: "A", text: "10x - 15" },
          { id: "B", text: "7x - 3" },
          { id: "C", text: "10x - 3" },
          { id: "D", text: "5x - 15" }
        ],
        correct_answer: "A",
        explanation: "5 × 2x = 10x, 5 × -3 = -15"
      },
      {
        question_text: "Expand: -2(x + 4)",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "expand with negatives",
        points: 1,
        options: [
          { id: "A", text: "-2x - 8" },
          { id: "B", text: "-2x + 8" },
          { id: "C", text: "2x - 8" },
          { id: "D", text: "-2x + 4" }
        ],
        correct_answer: "A",
        explanation: "-2 × x = -2x, -2 × 4 = -8"
      },
      {
        question_text: "Expand: (x + 3)(x + 2)",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "expand double brackets",
        points: 1,
        options: [
          { id: "A", text: "x² + 5x + 6" },
          { id: "B", text: "x² + 6" },
          { id: "C", text: "2x + 5" },
          { id: "D", text: "x² + 3x + 2" }
        ],
        correct_answer: "A",
        explanation: "FOIL: x², +2x, +3x, +6 = x² + 5x + 6"
      },
      {
        question_text: "Expand: (x + 4)(x - 1)",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "expand with negatives",
        points: 1,
        options: [
          { id: "A", text: "x² + 3x - 4" },
          { id: "B", text: "x² - 4" },
          { id: "C", text: "x² + 5x - 4" },
          { id: "D", text: "x² + 4x - 1" }
        ],
        correct_answer: "A",
        explanation: "FOIL: x², -x, +4x, -4 = x² + 3x - 4"
      }
    ]
  },
  {
    ref: "factorising",
    title: "Factorising Quiz",
    description: "Test your factorising skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 60,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Factorise: 6x + 9",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "factorise with HCF",
        points: 1,
        options: [
          { id: "A", text: "3(2x + 3)" },
          { id: "B", text: "6(x + 9)" },
          { id: "C", text: "3(2x + 9)" },
          { id: "D", text: "Cannot factorise" }
        ],
        correct_answer: "A",
        explanation: "HCF is 3: 3(2x + 3)"
      },
      {
        question_text: "Factorise: 4x² + 8x",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "factorise with HCF",
        points: 1,
        options: [
          { id: "A", text: "4x(x + 2)" },
          { id: "B", text: "4(x² + 8x)" },
          { id: "C", text: "x(4x + 8)" },
          { id: "D", text: "2x(2x + 4)" }
        ],
        correct_answer: "A",
        explanation: "HCF is 4x: 4x(x + 2)"
      },
      {
        question_text: "Factorise: x² + 6x + 8",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "factorise quadratics",
        points: 1,
        options: [
          { id: "A", text: "(x + 2)(x + 4)" },
          { id: "B", text: "(x + 1)(x + 8)" },
          { id: "C", text: "(x + 6)(x + 8)" },
          { id: "D", text: "x(x + 6) + 8" }
        ],
        correct_answer: "A",
        explanation: "Find two numbers that multiply to 8 and add to 6: 2 and 4"
      },
      {
        question_text: "Factorise: x² - 9",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "difference of two squares",
        points: 1,
        options: [
          { id: "A", text: "(x + 3)(x - 3)" },
          { id: "B", text: "(x - 3)²" },
          { id: "C", text: "(x + 9)(x - 1)" },
          { id: "D", text: "x(x - 9)" }
        ],
        correct_answer: "A",
        explanation: "x² - 3² = (x + 3)(x - 3)"
      },
      {
        question_text: "Factorise: x² - 3x - 10",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "factorise quadratics",
        points: 1,
        options: [
          { id: "A", text: "(x - 5)(x + 2)" },
          { id: "B", text: "(x - 5)(x - 2)" },
          { id: "C", text: "(x + 5)(x - 2)" },
          { id: "D", text: "(x - 3)(x + 10)" }
        ],
        correct_answer: "A",
        explanation: "Find two numbers that multiply to -10 and add to -3: -5 and 2"
      }
    ]
  },
  {
    ref: "linear_equations",
    title: "Linear Equations Quiz",
    description: "Test your equation solving skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 55,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Solve: 2x + 5 = 13",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "solve two-step equations",
        points: 1,
        options: [
          { id: "A", text: "x = 4" },
          { id: "B", text: "x = 9" },
          { id: "C", text: "x = 6.5" },
          { id: "D", text: "x = 8" }
        ],
        correct_answer: "A",
        explanation: "2x = 8, x = 4"
      },
      {
        question_text: "Solve: 5x - 3 = 17",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "solve two-step equations",
        points: 1,
        options: [
          { id: "A", text: "x = 4" },
          { id: "B", text: "x = 7" },
          { id: "C", text: "x = 5" },
          { id: "D", text: "x = 3" }
        ],
        correct_answer: "A",
        explanation: "5x = 20, x = 4"
      },
      {
        question_text: "Solve: 3x + 4 = x + 10",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "solve equations with x on both sides",
        points: 1,
        options: [
          { id: "A", text: "x = 3" },
          { id: "B", text: "x = 7" },
          { id: "C", text: "x = 2" },
          { id: "D", text: "x = 8" }
        ],
        correct_answer: "A",
        explanation: "2x + 4 = 10, 2x = 6, x = 3"
      },
      {
        question_text: "Solve: 4(x - 2) = 20",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "equations with brackets",
        points: 1,
        options: [
          { id: "A", text: "x = 7" },
          { id: "B", text: "x = 3" },
          { id: "C", text: "x = 9" },
          { id: "D", text: "x = 1" }
        ],
        correct_answer: "A",
        explanation: "4x - 8 = 20, 4x = 28, x = 7"
      },
      {
        question_text: "Solve: (x + 5)/2 = 6",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "equations with fractions",
        points: 1,
        options: [
          { id: "A", text: "x = 7" },
          { id: "B", text: "x = 15" },
          { id: "C", text: "x = 19" },
          { id: "D", text: "x = 9" }
        ],
        correct_answer: "A",
        explanation: "x + 5 = 12, x = 7"
      }
    ]
  },
  {
    ref: "quadratics",
    title: "Quadratic Equations Quiz",
    description: "Test your quadratic solving skills",
    quiz_type: "practice",
    difficulty: "higher",
    time_limit_minutes: 20,
    passing_score: 60,
    xp_reward: 75,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Solve: x² + 4x + 3 = 0",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "solve by factorising",
        points: 1,
        options: [
          { id: "A", text: "x = -1 or -3" },
          { id: "B", text: "x = 1 or 3" },
          { id: "C", text: "x = -4 or -3" },
          { id: "D", text: "x = 2 or 3" }
        ],
        correct_answer: "A",
        explanation: "(x + 1)(x + 3) = 0, so x = -1 or x = -3"
      },
      {
        question_text: "Solve: x² - 9 = 0",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "difference of squares",
        points: 1,
        options: [
          { id: "A", text: "x = ±3" },
          { id: "B", text: "x = 9" },
          { id: "C", text: "x = -9" },
          { id: "D", text: "x = ±9" }
        ],
        correct_answer: "A",
        explanation: "(x + 3)(x - 3) = 0, so x = 3 or x = -3"
      },
      {
        question_text: "Solve: x² + 5x + 6 = 0",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "factorise and solve",
        points: 1,
        options: [
          { id: "A", text: "x = -2 or -3" },
          { id: "B", text: "x = 2 or 3" },
          { id: "C", text: "x = -1 or -6" },
          { id: "D", text: "x = 1 or 6" }
        ],
        correct_answer: "A",
        explanation: "(x + 2)(x + 3) = 0, so x = -2 or x = -3"
      },
      {
        question_text: "Solve: x² - x - 6 = 0",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "factorise negatives",
        points: 1,
        options: [
          { id: "A", text: "x = 3 or -2" },
          { id: "B", text: "x = -3 or 2" },
          { id: "C", text: "x = 6 or -1" },
          { id: "D", text: "x = 1 or -6" }
        ],
        correct_answer: "A",
        explanation: "(x - 3)(x + 2) = 0, so x = 3 or x = -2"
      },
      {
        question_text: "How many solutions does x² + 2x + 5 = 0 have?",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "understand discriminant",
        points: 1,
        options: [
          { id: "A", text: "0" },
          { id: "B", text: "1" },
          { id: "C", text: "2" },
          { id: "D", text: "3" }
        ],
        correct_answer: "A",
        explanation: "Discriminant = b² - 4ac = 4 - 20 = -16 < 0, so no real solutions"
      }
    ]
  },
  {
    ref: "sequences",
    title: "Sequences Quiz",
    description: "Test your sequence knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 60,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Find the next term: 3, 7, 11, 15, ...",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find term-to-term rule",
        points: 1,
        options: [
          { id: "A", text: "19" },
          { id: "B", text: "18" },
          { id: "C", text: "20" },
          { id: "D", text: "17" }
        ],
        correct_answer: "A",
        explanation: "Common difference is 4, so next term is 15 + 4 = 19"
      },
      {
        question_text: "What's the nth term of: 5, 8, 11, 14, ...?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "find nth term",
        points: 1,
        options: [
          { id: "A", text: "3n + 2" },
          { id: "B", text: "5n" },
          { id: "C", text: "n + 3" },
          { id: "D", text: "2n + 5" }
        ],
        correct_answer: "A",
        explanation: "Common difference = 3, first term = 5. When n=1: 3(1) + c = 5, c = 2"
      },
      {
        question_text: "Find the 10th term of: 4, 7, 10, 13, ...",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "use nth term",
        points: 1,
        options: [
          { id: "A", text: "31" },
          { id: "B", text: "34" },
          { id: "C", text: "28" },
          { id: "D", text: "37" }
        ],
        correct_answer: "A",
        explanation: "nth term = 3n + 1, so 10th term = 3(10) + 1 = 31"
      },
      {
        question_text: "What's the common difference in: 20, 16, 12, 8, ...?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "identify common difference",
        points: 1,
        options: [
          { id: "A", text: "-4" },
          { id: "B", text: "4" },
          { id: "C", text: "-2" },
          { id: "D", text: "2" }
        ],
        correct_answer: "A",
        explanation: "Each term decreases by 4"
      },
      {
        question_text: "Geometric sequence: 2, 6, 18, 54, ... What's next?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "geometric sequences",
        points: 1,
        options: [
          { id: "A", text: "162" },
          { id: "B", text: "108" },
          { id: "C", text: "72" },
          { id: "D", text: "216" }
        ],
        correct_answer: "A",
        explanation: "Common ratio = 3, so 54 × 3 = 162"
      }
    ]
  },
  {
    ref: "angles_lines",
    title: "Angles and Lines Quiz",
    description: "Test your angle knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 50,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Angles on a straight line add to?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "angles on a line",
        points: 1,
        options: [
          { id: "A", text: "180°" },
          { id: "B", text: "360°" },
          { id: "C", text: "90°" },
          { id: "D", text: "270°" }
        ],
        correct_answer: "A",
        explanation: "Angles on a straight line always sum to 180°"
      },
      {
        question_text: "If one angle on a line is 65°, what's the other?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate missing angles",
        points: 1,
        options: [
          { id: "A", text: "115°" },
          { id: "B", text: "125°" },
          { id: "C", text: "105°" },
          { id: "D", text: "295°" }
        ],
        correct_answer: "A",
        explanation: "180° - 65° = 115°"
      },
      {
        question_text: "Vertically opposite angles are?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "vertically opposite angles",
        points: 1,
        options: [
          { id: "A", text: "Equal" },
          { id: "B", text: "Add to 180°" },
          { id: "C", text: "Add to 90°" },
          { id: "D", text: "Different" }
        ],
        correct_answer: "A",
        explanation: "Vertically opposite angles are always equal"
      },
      {
        question_text: "Angles around a point add to?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "angles at a point",
        points: 1,
        options: [
          { id: "A", text: "360°" },
          { id: "B", text: "180°" },
          { id: "C", text: "270°" },
          { id: "D", text: "90°" }
        ],
        correct_answer: "A",
        explanation: "Angles around a point always sum to 360°"
      },
      {
        question_text: "Alternate angles on parallel lines are?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "parallel line angles",
        points: 1,
        options: [
          { id: "A", text: "Equal" },
          { id: "B", text: "Add to 180°" },
          { id: "C", text: "Add to 90°" },
          { id: "D", text: "Different" }
        ],
        correct_answer: "A",
        explanation: "Alternate angles (Z-shape) are equal"
      }
    ]
  },
  {
    ref: "triangles_polygons",
    title: "Triangles and Polygons Quiz",
    description: "Test your polygon knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 55,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Angles in a triangle add to?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "triangle angle sum",
        points: 1,
        options: [
          { id: "A", text: "180°" },
          { id: "B", text: "360°" },
          { id: "C", text: "90°" },
          { id: "D", text: "270°" }
        ],
        correct_answer: "A",
        explanation: "Triangle angles always sum to 180°"
      },
      {
        question_text: "Two angles are 70° and 55°. Find the third.",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate triangle angles",
        points: 1,
        options: [
          { id: "A", text: "55°" },
          { id: "B", text: "65°" },
          { id: "C", text: "70°" },
          { id: "D", text: "125°" }
        ],
        correct_answer: "A",
        explanation: "180° - 70° - 55° = 55°"
      },
      {
        question_text: "Interior angles of hexagon sum to?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "polygon angle sum",
        points: 1,
        options: [
          { id: "A", text: "720°" },
          { id: "B", text: "540°" },
          { id: "C", text: "900°" },
          { id: "D", text: "360°" }
        ],
        correct_answer: "A",
        explanation: "(6-2) × 180° = 720°"
      },
      {
        question_text: "Each interior angle of regular pentagon?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "regular polygons",
        points: 1,
        options: [
          { id: "A", text: "108°" },
          { id: "B", text: "120°" },
          { id: "C", text: "72°" },
          { id: "D", text: "90°" }
        ],
        correct_answer: "A",
        explanation: "[(5-2) × 180°] / 5 = 108°"
      },
      {
        question_text: "Exterior angles of any polygon sum to?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "exterior angles",
        points: 1,
        options: [
          { id: "A", text: "360°" },
          { id: "B", text: "180°" },
          { id: "C", text: "540°" },
          { id: "D", text: "Depends on sides" }
        ],
        correct_answer: "A",
        explanation: "Exterior angles always sum to 360°"
      }
    ]
  },
  {
    ref: "circles",
    title: "Circles Quiz",
    description: "Test your circle knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 60,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Formula for circumference?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "circle formulas",
        points: 1,
        options: [
          { id: "A", text: "2πr or πd" },
          { id: "B", text: "πr²" },
          { id: "C", text: "2πd" },
          { id: "D", text: "r²π" }
        ],
        correct_answer: "A",
        explanation: "Circumference = 2πr or πd"
      },
      {
        question_text: "Circumference of circle radius 5cm? (π=3.14)",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate circumference",
        points: 1,
        options: [
          { id: "A", text: "31.4cm" },
          { id: "B", text: "15.7cm" },
          { id: "C", text: "78.5cm" },
          { id: "D", text: "25cm" }
        ],
        correct_answer: "A",
        explanation: "2 × 3.14 × 5 = 31.4cm"
      },
      {
        question_text: "Area of circle radius 4cm?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate area",
        points: 1,
        options: [
          { id: "A", text: "16π cm²" },
          { id: "B", text: "8π cm²" },
          { id: "C", text: "4π cm²" },
          { id: "D", text: "2π cm²" }
        ],
        correct_answer: "A",
        explanation: "π × 4² = 16π cm²"
      },
      {
        question_text: "Angle in semicircle is?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "circle theorems",
        points: 1,
        options: [
          { id: "A", text: "90°" },
          { id: "B", text: "180°" },
          { id: "C", text: "45°" },
          { id: "D", text: "60°" }
        ],
        correct_answer: "A",
        explanation: "Angle in semicircle is always 90°"
      },
      {
        question_text: "Tangent to radius at point of contact is?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "circle theorems",
        points: 1,
        options: [
          { id: "A", text: "Perpendicular" },
          { id: "B", text: "Parallel" },
          { id: "C", text: "At 45°" },
          { id: "D", text: "Equal" }
        ],
        correct_answer: "A",
        explanation: "Tangent is perpendicular to radius at point of contact"
      }
    ]
  },
  {
    ref: "pythagoras",
    title: "Pythagoras' Theorem Quiz",
    description: "Test your Pythagoras knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 65,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "In right triangle, sides 3 and 4. Find hypotenuse.",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find hypotenuse",
        points: 1,
        options: [
          { id: "A", text: "5" },
          { id: "B", text: "7" },
          { id: "C", text: "6" },
          { id: "D", text: "25" }
        ],
        correct_answer: "A",
        explanation: "3² + 4² = 9 + 16 = 25, √25 = 5"
      },
      {
        question_text: "Hypotenuse is 13, one side is 5. Find other side.",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "find shorter side",
        points: 1,
        options: [
          { id: "A", text: "12" },
          { id: "B", text: "8" },
          { id: "C", text: "18" },
          { id: "D", text: "10" }
        ],
        correct_answer: "A",
        explanation: "√(13² - 5²) = √(169 - 25) = √144 = 12"
      },
      {
        question_text: "Is triangle with sides 8, 15, 17 right-angled?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "Pythagorean triples",
        points: 1,
        options: [
          { id: "A", text: "Yes" },
          { id: "B", text: "No" },
          { id: "C", text: "Cannot determine" },
          { id: "D", text: "Only sometimes" }
        ],
        correct_answer: "A",
        explanation: "8² + 15² = 64 + 225 = 289 = 17², so yes"
      },
      {
        question_text: "Which is a Pythagorean triple?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "recognize triples",
        points: 1,
        options: [
          { id: "A", text: "5, 12, 13" },
          { id: "B", text: "4, 5, 6" },
          { id: "C", text: "2, 3, 4" },
          { id: "D", text: "7, 8, 9" }
        ],
        correct_answer: "A",
        explanation: "5² + 12² = 25 + 144 = 169 = 13²"
      },
      {
        question_text: "Right triangle: both shorter sides are 7cm. Hypotenuse?",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "apply to problems",
        points: 1,
        options: [
          { id: "A", text: "7√2 cm" },
          { id: "B", text: "14cm" },
          { id: "C", text: "49cm" },
          { id: "D", text: "10cm" }
        ],
        correct_answer: "A",
        explanation: "7² + 7² = 98, √98 = 7√2"
      }
    ]
  },
  {
    ref: "trigonometry",
    title: "Trigonometry Quiz",
    description: "Test your SOH CAH TOA knowledge",
    quiz_type: "practice",
    difficulty: "higher",
    time_limit_minutes: 20,
    passing_score: 60,
    xp_reward: 75,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "In right triangle, sin(θ) = ?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "understand ratios",
        points: 1,
        options: [
          { id: "A", text: "Opposite/Hypotenuse" },
          { id: "B", text: "Adjacent/Hypotenuse" },
          { id: "C", text: "Opposite/Adjacent" },
          { id: "D", text: "Hypotenuse/Opposite" }
        ],
        correct_answer: "A",
        explanation: "SOH: sin = Opposite / Hypotenuse"
      },
      {
        question_text: "SOH CAH TOA: what does CAH mean?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "recall formulas",
        points: 1,
        options: [
          { id: "A", text: "Cos = Adjacent/Hypotenuse" },
          { id: "B", text: "Cos = Angle/Hypotenuse" },
          { id: "C", text: "Cos = Adjacent/Height" },
          { id: "D", text: "Cos = Area/Height" }
        ],
        correct_answer: "A",
        explanation: "CAH: cos = Adjacent / Hypotenuse"
      },
      {
        question_text: "tan(θ) = ?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "understand ratios",
        points: 1,
        options: [
          { id: "A", text: "Opposite/Adjacent" },
          { id: "B", text: "Adjacent/Opposite" },
          { id: "C", text: "Opposite/Hypotenuse" },
          { id: "D", text: "Hypotenuse/Adjacent" }
        ],
        correct_answer: "A",
        explanation: "TOA: tan = Opposite / Adjacent"
      },
      {
        question_text: "If sin(θ) = 0.5, θ = ?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "find angles",
        points: 1,
        options: [
          { id: "A", text: "30°" },
          { id: "B", text: "60°" },
          { id: "C", text: "45°" },
          { id: "D", text: "90°" }
        ],
        correct_answer: "A",
        explanation: "sin(30°) = 0.5"
      },
      {
        question_text: "To find angle when you know opposite and hypotenuse, use?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "choose correct function",
        points: 1,
        options: [
          { id: "A", text: "sin⁻¹" },
          { id: "B", text: "cos⁻¹" },
          { id: "C", text: "tan⁻¹" },
          { id: "D", text: "sin" }
        ],
        correct_answer: "A",
        explanation: "Use sin⁻¹ (inverse sin) when you have opposite and hypotenuse"
      }
    ]
  },
  {
    ref: "averages",
    title: "Averages Quiz",
    description: "Test your averages knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 45,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Mean of: 4, 6, 8, 10, 12",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate mean",
        points: 1,
        options: [
          { id: "A", text: "8" },
          { id: "B", text: "10" },
          { id: "C", text: "6" },
          { id: "D", text: "7" }
        ],
        correct_answer: "A",
        explanation: "(4+6+8+10+12)/5 = 40/5 = 8"
      },
      {
        question_text: "Median of: 3, 7, 5, 9, 11",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find median",
        points: 1,
        options: [
          { id: "A", text: "7" },
          { id: "B", text: "5" },
          { id: "C", text: "9" },
          { id: "D", text: "11" }
        ],
        correct_answer: "A",
        explanation: "Order: 3,5,7,9,11. Middle value = 7"
      },
      {
        question_text: "Mode of: 2, 5, 5, 8, 5, 9",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find mode",
        points: 1,
        options: [
          { id: "A", text: "5" },
          { id: "B", text: "2" },
          { id: "C", text: "8" },
          { id: "D", text: "No mode" }
        ],
        correct_answer: "A",
        explanation: "5 appears three times (most frequent)"
      },
      {
        question_text: "Range of: 12, 18, 7, 22, 15",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate range",
        points: 1,
        options: [
          { id: "A", text: "15" },
          { id: "B", text: "10" },
          { id: "C", text: "22" },
          { id: "D", text: "11" }
        ],
        correct_answer: "A",
        explanation: "22 - 7 = 15"
      },
      {
        question_text: "Mean of 6, 10, x, 14 is 10. Find x.",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "find missing value",
        points: 1,
        options: [
          { id: "A", text: "10" },
          { id: "B", text: "12" },
          { id: "C", text: "8" },
          { id: "D", text: "14" }
        ],
        correct_answer: "A",
        explanation: "(6+10+x+14)/4 = 10, 30+x = 40, x = 10"
      }
    ]
  },
  {
    ref: "probability",
    title: "Probability Quiz",
    description: "Test your probability skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 50,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "P(rolling 3 on a die)?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate probability",
        points: 1,
        options: [
          { id: "A", text: "1/6" },
          { id: "B", text: "1/3" },
          { id: "C", text: "3/6" },
          { id: "D", text: "1/2" }
        ],
        correct_answer: "A",
        explanation: "1 favorable outcome out of 6"
      },
      {
        question_text: "P(heads on fair coin)?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "basic probability",
        points: 1,
        options: [
          { id: "A", text: "1/2" },
          { id: "B", text: "1" },
          { id: "C", text: "0" },
          { id: "D", text: "2" }
        ],
        correct_answer: "A",
        explanation: "1 out of 2 equally likely outcomes"
      },
      {
        question_text: "If P(rain) = 0.4, P(no rain) = ?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "complementary events",
        points: 1,
        options: [
          { id: "A", text: "0.6" },
          { id: "B", text: "0.4" },
          { id: "C", text: "1" },
          { id: "D", text: "0" }
        ],
        correct_answer: "A",
        explanation: "P(not rain) = 1 - 0.4 = 0.6"
      },
      {
        question_text: "P(red card from 52 cards)?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "calculate probability",
        points: 1,
        options: [
          { id: "A", text: "1/2" },
          { id: "B", text: "1/4" },
          { id: "C", text: "1/13" },
          { id: "D", text: "26/52" }
        ],
        correct_answer: "A",
        explanation: "26 red cards out of 52 = 1/2"
      },
      {
        question_text: "Expected heads in 100 coin flips?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "expected frequency",
        points: 1,
        options: [
          { id: "A", text: "50" },
          { id: "B", text: "100" },
          { id: "C", text: "25" },
          { id: "D", text: "75" }
        ],
        correct_answer: "A",
        explanation: "0.5 × 100 = 50"
      }
    ]
  },
  {
    ref: "graphs",
    title: "Interpreting Graphs Quiz",
    description: "Test your graph reading skills",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 40,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Bar chart shows Mon-15, Tue-20, Wed-10. What's the total?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "read bar charts",
        points: 1,
        options: [
          { id: "A", text: "45" },
          { id: "B", text: "35" },
          { id: "C", text: "50" },
          { id: "D", text: "40" }
        ],
        correct_answer: "A",
        explanation: "15 + 20 + 10 = 45"
      },
      {
        question_text: "Pie chart total=120, angle=90°. Find frequency.",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "read pie charts",
        points: 1,
        options: [
          { id: "A", text: "30" },
          { id: "B", text: "90" },
          { id: "C", text: "40" },
          { id: "D", text: "60" }
        ],
        correct_answer: "A",
        explanation: "(90/360) × 120 = 30"
      },
      {
        question_text: "Line graph: at 2pm temp is 18°C, at 6pm it's 12°C. Change?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "read line graphs",
        points: 1,
        options: [
          { id: "A", text: "Decrease of 6°C" },
          { id: "B", text: "Increase of 6°C" },
          { id: "C", text: "Decrease of 30°C" },
          { id: "D", text: "No change" }
        ],
        correct_answer: "A",
        explanation: "18 - 12 = 6°C decrease"
      },
      {
        question_text: "Which graph shows trend over time best?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "choose appropriate graph",
        points: 1,
        options: [
          { id: "A", text: "Line graph" },
          { id: "B", text: "Pie chart" },
          { id: "C", text: "Bar chart" },
          { id: "D", text: "Pictogram" }
        ],
        correct_answer: "A",
        explanation: "Line graphs best show trends over time"
      },
      {
        question_text: "Pie chart: angle 120° out of 360°. What fraction?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "interpret pie charts",
        points: 1,
        options: [
          { id: "A", text: "1/3" },
          { id: "B", text: "1/2" },
          { id: "C", text: "2/3" },
          { id: "D", text: "1/4" }
        ],
        correct_answer: "A",
        explanation: "120/360 = 1/3"
      }
    ]
  },
  {
    ref: "scatter",
    title: "Scatter Graphs and Correlation Quiz",
    description: "Test your correlation knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 55,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "As X increases, Y increases. What correlation?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "identify correlation",
        points: 1,
        options: [
          { id: "A", text: "Positive" },
          { id: "B", text: "Negative" },
          { id: "C", text: "None" },
          { id: "D", text: "Cannot tell" }
        ],
        correct_answer: "A",
        explanation: "Both increase = positive correlation"
      },
      {
        question_text: "As X increases, Y decreases. What correlation?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "identify correlation",
        points: 1,
        options: [
          { id: "A", text: "Negative" },
          { id: "B", text: "Positive" },
          { id: "C", text: "None" },
          { id: "D", text: "Strong" }
        ],
        correct_answer: "A",
        explanation: "One increases while other decreases = negative correlation"
      },
      {
        question_text: "Points scattered randomly. What correlation?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "no correlation",
        points: 1,
        options: [
          { id: "A", text: "No correlation" },
          { id: "B", text: "Positive" },
          { id: "C", text: "Negative" },
          { id: "D", text: "Perfect" }
        ],
        correct_answer: "A",
        explanation: "Random scatter = no correlation"
      },
      {
        question_text: "Height vs weight would show?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "real-world correlation",
        points: 1,
        options: [
          { id: "A", text: "Positive correlation" },
          { id: "B", text: "Negative" },
          { id: "C", text: "No correlation" },
          { id: "D", text: "Perfect correlation" }
        ],
        correct_answer: "A",
        explanation: "Generally, taller people weigh more"
      },
      {
        question_text: "Does correlation prove causation?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "understand limitations",
        points: 1,
        options: [
          { id: "A", text: "No" },
          { id: "B", text: "Yes" },
          { id: "C", text: "Sometimes" },
          { id: "D", text: "Always" }
        ],
        correct_answer: "A",
        explanation: "Correlation does not prove causation"
      }
    ]
  },
  {
    ref: "primes",
    title: "Prime Numbers Quiz",
    description: "Test your prime number knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 45,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Which is prime: 15, 17, 21, 27?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "identify primes",
        points: 1,
        options: [
          { id: "A", text: "17" },
          { id: "B", text: "15" },
          { id: "C", text: "21" },
          { id: "D", text: "27" }
        ],
        correct_answer: "A",
        explanation: "17 has only factors 1 and 17"
      },
      {
        question_text: "Is 1 a prime number?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "understand primes",
        points: 1,
        options: [
          { id: "A", text: "No" },
          { id: "B", text: "Yes" },
          { id: "C", text: "Sometimes" },
          { id: "D", text: "Depends" }
        ],
        correct_answer: "A",
        explanation: "1 is not prime (only has one factor)"
      },
      {
        question_text: "Express 12 as product of primes",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "prime factorisation",
        points: 1,
        options: [
          { id: "A", text: "2² × 3" },
          { id: "B", text: "2 × 6" },
          { id: "C", text: "3 × 4" },
          { id: "D", text: "12" }
        ],
        correct_answer: "A",
        explanation: "12 = 2 × 2 × 3 = 2² × 3"
      },
      {
        question_text: "Express 30 as product of primes",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "prime factorisation",
        points: 1,
        options: [
          { id: "A", text: "2 × 3 × 5" },
          { id: "B", text: "5 × 6" },
          { id: "C", text: "10 × 3" },
          { id: "D", text: "2 × 15" }
        ],
        correct_answer: "A",
        explanation: "30 = 2 × 3 × 5"
      },
      {
        question_text: "Smallest prime number?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "know primes",
        points: 1,
        options: [
          { id: "A", text: "2" },
          { id: "B", text: "1" },
          { id: "C", text: "3" },
          { id: "D", text: "0" }
        ],
        correct_answer: "A",
        explanation: "2 is the smallest prime number"
      }
    ]
  },
  {
    ref: "hcf_lcm",
    title: "HCF and LCM Quiz",
    description: "Test your HCF and LCM knowledge",
    quiz_type: "practice",
    difficulty: "mixed",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 55,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "HCF of 12 and 18?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find HCF",
        points: 1,
        options: [
          { id: "A", text: "6" },
          { id: "B", text: "12" },
          { id: "C", text: "18" },
          { id: "D", text: "36" }
        ],
        correct_answer: "A",
        explanation: "Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. HCF = 6"
      },
      {
        question_text: "LCM of 4 and 6?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find LCM",
        points: 1,
        options: [
          { id: "A", text: "12" },
          { id: "B", text: "24" },
          { id: "C", text: "4" },
          { id: "D", text: "6" }
        ],
        correct_answer: "A",
        explanation: "Multiples: 4,8,12,16... 6,12,18... LCM = 12"
      },
      {
        question_text: "HCF of 20 and 30?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find HCF",
        points: 1,
        options: [
          { id: "A", text: "10" },
          { id: "B", text: "5" },
          { id: "C", text: "20" },
          { id: "D", text: "60" }
        ],
        correct_answer: "A",
        explanation: "Common factors: 1,2,5,10. HCF = 10"
      },
      {
        question_text: "LCM of 6 and 8?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "find LCM",
        points: 1,
        options: [
          { id: "A", text: "24" },
          { id: "B", text: "48" },
          { id: "C", text: "12" },
          { id: "D", text: "14" }
        ],
        correct_answer: "A",
        explanation: "6 = 2×3, 8 = 2³. LCM = 2³×3 = 24"
      },
      {
        question_text: "HCF of 15 and 25?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "find HCF",
        points: 1,
        options: [
          { id: "A", text: "5" },
          { id: "B", text: "15" },
          { id: "C", text: "25" },
          { id: "D", text: "75" }
        ],
        correct_answer: "A",
        explanation: "Common factors: 1,5. HCF = 5"
      }
    ]
  },
  {
    ref: "standard_form",
    title: "Standard Form Quiz",
    description: "Test your standard form skills",
    quiz_type: "practice",
    difficulty: "higher",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 65,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Write 4500 in standard form",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "convert to standard form",
        points: 1,
        options: [
          { id: "A", text: "4.5 × 10³" },
          { id: "B", text: "45 × 10²" },
          { id: "C", text: "4.5 × 10⁴" },
          { id: "D", text: "0.45 × 10⁴" }
        ],
        correct_answer: "A",
        explanation: "Move decimal 3 places left: 4.5 × 10³"
      },
      {
        question_text: "Write 0.0032 in standard form",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "small numbers",
        points: 1,
        options: [
          { id: "A", text: "3.2 × 10⁻³" },
          { id: "B", text: "3.2 × 10³" },
          { id: "C", text: "32 × 10⁻⁴" },
          { id: "D", text: "0.32 × 10⁻²" }
        ],
        correct_answer: "A",
        explanation: "Move decimal 3 places right: 3.2 × 10⁻³"
      },
      {
        question_text: "(2 × 10⁴) × (3 × 10²) = ?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "multiply in standard form",
        points: 1,
        options: [
          { id: "A", text: "6 × 10⁶" },
          { id: "B", text: "5 × 10⁶" },
          { id: "C", text: "6 × 10²" },
          { id: "D", text: "2.3 × 10⁶" }
        ],
        correct_answer: "A",
        explanation: "2×3 = 6, add powers: 4+2 = 6"
      },
      {
        question_text: "(8 × 10⁶) ÷ (2 × 10²) = ?",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "divide in standard form",
        points: 1,
        options: [
          { id: "A", text: "4 × 10⁴" },
          { id: "B", text: "6 × 10⁴" },
          { id: "C", text: "4 × 10⁸" },
          { id: "D", text: "10 × 10⁴" }
        ],
        correct_answer: "A",
        explanation: "8÷2 = 4, subtract powers: 6-2 = 4"
      },
      {
        question_text: "5.2 × 10⁻² as ordinary number?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "convert from standard form",
        points: 1,
        options: [
          { id: "A", text: "0.052" },
          { id: "B", text: "52" },
          { id: "C", text: "520" },
          { id: "D", text: "0.52" }
        ],
        correct_answer: "A",
        explanation: "Move decimal 2 places left: 0.052"
      }
    ]
  },
  {
    ref: "surds",
    title: "Surds Quiz",
    description: "Test your surd skills",
    quiz_type: "practice",
    difficulty: "higher",
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 70,
    allow_retakes: true,
    shuffle_questions: true,
    shuffle_options: true,
    show_answers_after: "after_submit",
    questions: [
      {
        question_text: "Simplify √12",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "simplify surds",
        points: 1,
        options: [
          { id: "A", text: "2√3" },
          { id: "B", text: "3√2" },
          { id: "C", text: "4√3" },
          { id: "D", text: "√12" }
        ],
        correct_answer: "A",
        explanation: "√12 = √(4×3) = 2√3"
      },
      {
        question_text: "Simplify √18",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "simplify surds",
        points: 1,
        options: [
          { id: "A", text: "3√2" },
          { id: "B", text: "2√3" },
          { id: "C", text: "9√2" },
          { id: "D", text: "6√3" }
        ],
        correct_answer: "A",
        explanation: "√18 = √(9×2) = 3√2"
      },
      {
        question_text: "√3 × √12 = ?",
        question_type: "multiple_choice",
        difficulty: "medium",
        skill: "multiply surds",
        points: 1,
        options: [
          { id: "A", text: "6" },
          { id: "B", text: "√36" },
          { id: "C", text: "3√4" },
          { id: "D", text: "2√6" }
        ],
        correct_answer: "A",
        explanation: "√3 × √12 = √36 = 6"
      },
      {
        question_text: "2√3 + 5√3 = ?",
        question_type: "multiple_choice",
        difficulty: "easy",
        skill: "add surds",
        points: 1,
        options: [
          { id: "A", text: "7√3" },
          { id: "B", text: "10√3" },
          { id: "C", text: "7√6" },
          { id: "D", text: "3 + 5√3" }
        ],
        correct_answer: "A",
        explanation: "Combine like surds: 2√3 + 5√3 = 7√3"
      },
      {
        question_text: "Rationalise 6/√3",
        question_type: "multiple_choice",
        difficulty: "hard",
        skill: "rationalise denominators",
        points: 1,
        options: [
          { id: "A", text: "2√3" },
          { id: "B", text: "6√3" },
          { id: "C", text: "√18" },
          { id: "D", text: "3√2" }
        ],
        correct_answer: "A",
        explanation: "6/√3 × √3/√3 = 6√3/3 = 2√3"
      }
    ]
  }
];

// ============================================================================
// HELPER FUNCTION TO IMPORT ALL DATA
// ============================================================================

export async function importMathsContent() {
  // ✅ Prevent duplicate runs in the same browser session (dev reload / StrictMode)
  if (globalThis.__EDUCORE_MATHS_IMPORTED__) {
    console.log("Maths content already imported (session) — skipping.");
    return { success: true, skipped: true };
  }
  globalThis.__EDUCORE_MATHS_IMPORTED__ = true;

  try {
    console.log("Starting Maths content import (idempotent)...");

    // -------------------------------
    // 0) Load existing data (so we can dedupe)
    // -------------------------------
    const [allSubjects, allTopics, allLessons, allQuizzes] = await Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
      base44.entities.Lesson.list(),
      base44.entities.Quiz.list()
    ]);

    // -------------------------------
    // 1) Subject (reuse if already exists)
    // -------------------------------
    let subject =
      allSubjects.find(s => s.name?.toLowerCase() === mathsSubject.name.toLowerCase()) ||
      allSubjects.find(s => s.name?.toLowerCase() === "mathematics");

    if (!subject) {
      console.log("Creating Maths subject...");
      subject = await base44.entities.Subject.create(mathsSubject);
      console.log("Subject created:", subject.id);
    } else {
      console.log("Maths subject already exists — reusing:", subject.id);
    }

    const subjectId = subject.id;

    // -------------------------------
    // 2) Topics (Pass 1: create/reuse topics)
    // -------------------------------
    console.log("Upserting topics...");
    const topicIdMap = {};

    // Only topics for this subject
    const existingSubjectTopics = allTopics.filter(t => t.subject_id === subjectId);

    for (const topicData of mathsTopics) {
      const { ref, prerequisite_refs, ...topicFields } = topicData;

      // Prefer matching by ref if your DB stores it; otherwise fall back to name
      let existing =
        existingSubjectTopics.find(t => t.ref === ref) ||
        existingSubjectTopics.find(t => t.name?.toLowerCase() === topicFields.name.toLowerCase());

      if (!existing) {
        const created = await base44.entities.Topic.create({
          ...topicFields,
          ref, // IMPORTANT: store ref for future dedupe
          subject_id: subjectId,
          prerequisite_topic_ids: []
        });
        existing = created;
        existingSubjectTopics.push(created);
        console.log(`Topic created: ${topicFields.name} (${created.id})`);
      } else {
        console.log(`Topic exists — reusing: ${existing.name} (${existing.id})`);
      }

      topicIdMap[ref] = existing.id;
    }

    // -------------------------------
    // 2b) Topics (Pass 2: update prerequisites)
    // -------------------------------
    console.log("Updating topic prerequisites...");
    for (const topicData of mathsTopics) {
      const { ref, prerequisite_refs } = topicData;
      if (!prerequisite_refs?.length) continue;

      const topicId = topicIdMap[ref];
      const prerequisite_topic_ids = prerequisite_refs
        .map(r => topicIdMap[r])
        .filter(Boolean);

      if (topicId && prerequisite_topic_ids.length) {
        await base44.entities.Topic.update(topicId, { prerequisite_topic_ids });
      }
    }

    // -------------------------------
    // 3) Lessons (create/reuse, store ref)
    // -------------------------------
    console.log("Upserting lessons...");
    const lessonIdMap = {};

    // Only lessons for this subject's topics (cheap filter)
    const subjectTopicIds = new Set(Object.values(topicIdMap));
    const existingSubjectLessons = allLessons.filter(l => subjectTopicIds.has(l.topic_id));

    for (const [ref, lessonData] of Object.entries(mathsLessons)) {
      const topicId = topicIdMap[ref];
      if (!topicId) {
        console.warn(`No topic found for lesson ref: ${ref}`);
        continue;
      }

      // Prefer match by ref; fallback title+topic_id
      let existing =
        existingSubjectLessons.find(l => l.ref === ref) ||
        existingSubjectLessons.find(
          l => l.topic_id === topicId && l.title?.toLowerCase() === lessonData.title.toLowerCase()
        );

      if (!existing) {
        const { ref: _ignored, ...lessonFields } = lessonData;

        const createdLesson = await base44.entities.Lesson.create({
          ...lessonFields,
          ref,       // IMPORTANT: store ref
          topic_id: topicId
        });

        existing = createdLesson;
        existingSubjectLessons.push(createdLesson);
        console.log(`Lesson created: ${lessonData.title} (${createdLesson.id})`);
      } else {
        console.log(`Lesson exists — reusing: ${existing.title} (${existing.id})`);
      }

      lessonIdMap[ref] = existing.id;
    }

    // -------------------------------
    // 4) Quizzes + Questions (create/reuse)
    // -------------------------------
    console.log("Upserting quizzes and questions...");

    // Only quizzes for this subject (topic_id in our topic set)
    const existingSubjectQuizzes = allQuizzes.filter(q => subjectTopicIds.has(q.topic_id));

    for (const quizData of mathsQuizzes) {
      const topicId = topicIdMap[quizData.ref];
      const lessonId = lessonIdMap[quizData.ref];

      if (!topicId) {
        console.warn(`No topic found for quiz ref: ${quizData.ref}`);
        continue;
      }
      if (!lessonId) {
        console.warn(`No lesson found for quiz ref: ${quizData.ref} (quiz skipped)`);
        continue;
      }

      const { ref, questions = [], ...quizFields } = quizData;

      // Prefer match by ref; fallback title+topic_id
      let existing =
        existingSubjectQuizzes.find(q => q.ref === ref) ||
        existingSubjectQuizzes.find(
          q => q.topic_id === topicId && q.title?.toLowerCase() === quizFields.title.toLowerCase()
        );

      if (!existing) {
        const quiz = await base44.entities.Quiz.create({
          ...quizFields,
          ref,       // IMPORTANT: store ref
          topic_id: topicId,
          lesson_id: lessonId
        });

        console.log(`Quiz created: ${quizFields.title} (${quiz.id}) linked to lesson ${lessonId}`);

        // Create questions
        const createdQuestionIds = [];
        for (const q of questions) {
          const created = await base44.entities.Question.create({
            ...q,
            topic_id: topicId,
            lesson_id: lessonId,
            quiz_id: quiz.id
          });
          if (created?.id) createdQuestionIds.push(created.id);
        }

        // Optional: set question_ids if your schema supports it
        if (createdQuestionIds.length) {
          try {
            await base44.entities.Quiz.update(quiz.id, { question_ids: createdQuestionIds });
          } catch {
            // ignore if field doesn't exist
          }
        }
      } else {
        console.log(`Quiz exists — reusing: ${existing.title} (${existing.id})`);
      }
    }

    console.log("✅ Maths content import complete (no DB duplicates).");
    return {
      success: true,
      subjectId,
      topicCount: Object.keys(topicIdMap).length
    };
  } catch (error) {
    console.error("Error importing Maths content:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
export default {
  mathsSubject,
  mathsTopics,
  mathsLessons,
  mathsQuizzes,
  importMathsContent
};
