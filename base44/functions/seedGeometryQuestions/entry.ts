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
    let geoTopic = globalTopics.find(t => t.name === 'Geometry & Measures' && t.subject_id === S);
    if (!geoTopic) {
      geoTopic = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: S, subject_name: 'Maths', name: 'Geometry & Measures', order_index: 3,
        description: 'Shapes, area, volume, angles, Pythagoras, trigonometry, transformations and vectors'
      });
    }
    const T = geoTopic.id;

    const questions = [

      // ═══════════════════ YEAR 7 GEOMETRY ═════════════════════════════════════

      { seed_key: 'y7-geo-e-01', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'How many degrees are in a right angle?',
        choices: ['45°', '90°', '180°', '360°'],
        correct_answer: '90°', correct_index: 1,
        explanation: 'A right angle is exactly 90 degrees.' },

      { seed_key: 'y7-geo-e-02', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the area of a rectangle with length 8 cm and width 5 cm?',
        choices: ['13 cm²', '26 cm²', '40 cm²', '30 cm²'],
        correct_answer: '40 cm²', correct_index: 2,
        explanation: 'Area = length × width = 8 × 5 = 40 cm².' },

      { seed_key: 'y7-geo-e-03', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: An equilateral triangle has all sides equal.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'An equilateral triangle has all three sides the same length and all angles equal to 60°.' },

      { seed_key: 'y7-geo-e-04', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Angles in a triangle add up to:',
        choices: ['90°', '180°', '270°', '360°'],
        correct_answer: '180°', correct_index: 1,
        explanation: 'The interior angles of any triangle sum to 180°.' },

      { seed_key: 'y7-geo-e-05', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the perimeter of a square with side 6 cm?',
        choices: ['12 cm', '24 cm', '36 cm', '6 cm'],
        correct_answer: '24 cm', correct_index: 1,
        explanation: 'Perimeter = 4 × side = 4 × 6 = 24 cm.' },

      { seed_key: 'y7-geo-e-06', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'How many faces does a cube have?',
        choices: ['4', '5', '6', '8'],
        correct_answer: '6', correct_index: 2,
        explanation: 'A cube has 6 square faces.' },

      { seed_key: 'y7-geo-e-07', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What type of angle is 135°?',
        choices: ['Acute', 'Right', 'Obtuse', 'Reflex'],
        correct_answer: 'Obtuse', correct_index: 2,
        explanation: 'Obtuse angles are between 90° and 180°.' },

      { seed_key: 'y7-geo-e-08', year_group: 7, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: The sum of angles on a straight line is 180°.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Angles on a straight line always add up to 180°.' },

      // Y7 Medium
      { seed_key: 'y7-geo-m-01', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Find the area of a triangle with base 10 cm and height 6 cm.',
        choices: ['60 cm²', '30 cm²', '16 cm²', '60 cm'],
        correct_answer: '30 cm²', correct_index: 1,
        explanation: 'Area = ½ × base × height = ½ × 10 × 6 = 30 cm².' },

      { seed_key: 'y7-geo-m-02', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'In a parallelogram, two angles are 70°. What are the other two angles?',
        choices: ['70°', '110°', '140°', '20°'],
        correct_answer: '110°', correct_index: 1,
        explanation: 'Angles in a parallelogram: opposite angles are equal, consecutive angles add to 180°. 180° − 70° = 110°.' },

      { seed_key: 'y7-geo-m-03', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the volume of a cuboid 5 cm × 3 cm × 4 cm?',
        choices: ['12 cm³', '47 cm³', '60 cm³', '40 cm³'],
        correct_answer: '60 cm³', correct_index: 2,
        explanation: 'Volume = l × w × h = 5 × 3 × 4 = 60 cm³.' },

      { seed_key: 'y7-geo-m-04', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the sum of interior angles of a pentagon?',
        choices: ['360°', '540°', '720°', '480°'],
        correct_answer: '540°', correct_index: 1,
        explanation: 'Sum = (n−2) × 180 = 3 × 180 = 540°.' },

      { seed_key: 'y7-geo-m-05', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A regular hexagon has interior angles of:',
        choices: ['120°', '108°', '135°', '90°'],
        correct_answer: '120°', correct_index: 0,
        explanation: 'Sum of interior angles = (6−2)×180 = 720°. Each angle = 720÷6 = 120°.' },

      { seed_key: 'y7-geo-m-06', year_group: 7, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: Vertically opposite angles are equal.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'When two straight lines cross, the angles opposite each other are always equal.' },

      // Y7 Hard
      { seed_key: 'y7-geo-h-01', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A shape has interior angles summing to 1080°. How many sides does it have?',
        choices: ['6', '7', '8', '9'],
        correct_answer: '8', correct_index: 2,
        explanation: '(n−2)×180 = 1080 → n−2 = 6 → n = 8.' },

      { seed_key: 'y7-geo-h-02', year_group: 7, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Find the exterior angle of a regular octagon.',
        choices: ['45°', '135°', '30°', '60°'],
        correct_answer: '45°', correct_index: 0,
        explanation: 'Exterior angle = 360° ÷ 8 = 45°.' },

      // ═══════════════════ YEAR 8 GEOMETRY ═════════════════════════════════════

      { seed_key: 'y8-geo-e-01', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the circumference of a circle with radius 5 cm? (Use π ≈ 3.14)',
        choices: ['15.7 cm', '31.4 cm', '78.5 cm', '25 cm'],
        correct_answer: '31.4 cm', correct_index: 1,
        explanation: 'C = 2πr = 2 × 3.14 × 5 = 31.4 cm.' },

      { seed_key: 'y8-geo-e-02', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: A diameter is twice the radius of a circle.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'd = 2r. The diameter passes through the centre and spans the full width.' },

      { seed_key: 'y8-geo-e-03', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the area of a circle with radius 3 cm? (Use π ≈ 3.14)',
        choices: ['9.42 cm²', '18.84 cm²', '28.26 cm²', '56.52 cm²'],
        correct_answer: '28.26 cm²', correct_index: 2,
        explanation: 'A = πr² = 3.14 × 9 = 28.26 cm².' },

      { seed_key: 'y8-geo-e-04', year_group: 8, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which transformation moves a shape without rotating or reflecting it?',
        choices: ['Rotation', 'Reflection', 'Translation', 'Enlargement'],
        correct_answer: 'Translation', correct_index: 2,
        explanation: 'A translation slides a shape in a direction — no rotation or reflection.' },

      // Y8 Medium
      { seed_key: 'y8-geo-m-01', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Use Pythagoras: a triangle has legs 3 cm and 4 cm. What is the hypotenuse?',
        choices: ['5 cm', '6 cm', '7 cm', '12 cm'],
        correct_answer: '5 cm', correct_index: 0,
        explanation: 'c² = 3² + 4² = 9 + 16 = 25. c = √25 = 5 cm.' },

      { seed_key: 'y8-geo-m-02', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: Pythagoras\' theorem applies to all triangles.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'Pythagoras only applies to right-angled triangles.' },

      { seed_key: 'y8-geo-m-03', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A sector has radius 6 cm and angle 90°. What is its area? (Use π)',
        choices: ['9π cm²', '36π cm²', '12π cm²', '18π cm²'],
        correct_answer: '9π cm²', correct_index: 0,
        explanation: 'Area = (90/360) × πr² = (1/4) × π × 36 = 9π cm².' },

      { seed_key: 'y8-geo-m-04', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A shape is enlarged by scale factor 3. If the original area is 4 cm², what is the new area?',
        choices: ['12 cm²', '24 cm²', '36 cm²', '9 cm²'],
        correct_answer: '36 cm²', correct_index: 2,
        explanation: 'Area scales by the square of the scale factor: 4 × 3² = 4 × 9 = 36 cm².' },

      { seed_key: 'y8-geo-m-05', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What are the coordinates of the midpoint of (2, 4) and (8, 10)?',
        choices: ['(5, 7)', '(6, 7)', '(5, 6)', '(10, 14)'],
        correct_answer: '(5, 7)', correct_index: 0,
        explanation: 'Midpoint = ((2+8)/2, (4+10)/2) = (5, 7).' },

      { seed_key: 'y8-geo-m-06', year_group: 8, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: A rhombus is a special type of parallelogram.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'A rhombus has all sides equal and opposite sides parallel — it is a special parallelogram.' },

      // Y8 Hard
      { seed_key: 'y8-geo-h-01', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Calculate the volume of a cylinder with radius 4 cm and height 10 cm. Leave in terms of π.',
        choices: ['40π cm³', '80π cm³', '160π cm³', '40 cm³'],
        correct_answer: '160π cm³', correct_index: 2,
        explanation: 'V = πr²h = π × 16 × 10 = 160π cm³.' },

      { seed_key: 'y8-geo-h-02', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'The distance between points (1, 2) and (4, 6) is:',
        choices: ['5', '7', '√25', '√50'],
        correct_answer: '5', correct_index: 0,
        explanation: 'd = √((4−1)² + (6−2)²) = √(9+16) = √25 = 5.' },

      { seed_key: 'y8-geo-h-03', year_group: 8, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A cone has radius 3 cm and height 4 cm. What is its slant height?',
        choices: ['5 cm', '7 cm', '12 cm', '25 cm'],
        correct_answer: '5 cm', correct_index: 0,
        explanation: 'l = √(r² + h²) = √(9 + 16) = √25 = 5 cm.' },

      // ═══════════════════ YEAR 9 GEOMETRY ═════════════════════════════════════

      { seed_key: 'y9-geo-e-01', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'In a right-angled triangle, sin(θ) = opposite/hypotenuse. If opposite = 3, hypotenuse = 5, what is sin(θ)?',
        choices: ['0.5', '0.6', '0.75', '0.8'],
        correct_answer: '0.6', correct_index: 1,
        explanation: 'sin(θ) = 3/5 = 0.6.' },

      { seed_key: 'y9-geo-e-02', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: cos(0°) = 1',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'cos(0°) = 1. At 0°, the adjacent equals the hypotenuse.' },

      { seed_key: 'y9-geo-e-03', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the exact value of sin(30°)?',
        choices: ['1/2', '√3/2', '√2/2', '1'],
        correct_answer: '1/2', correct_index: 0,
        explanation: 'sin(30°) = 0.5 = 1/2. Standard trig value.' },

      { seed_key: 'y9-geo-e-04', year_group: 9, difficulty: 'easy', question_type: 'mcq',
        question_text: 'Which trig ratio uses adjacent and hypotenuse?',
        choices: ['sin', 'cos', 'tan', 'All of them'],
        correct_answer: 'cos', correct_index: 1,
        explanation: 'cos(θ) = adjacent/hypotenuse. Remember SOH CAH TOA.' },

      // Y9 Medium
      { seed_key: 'y9-geo-m-01', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A right triangle has hypotenuse 10 cm and one angle of 30°. What is the opposite side?',
        choices: ['5 cm', '8.66 cm', '10 cm', '5.77 cm'],
        correct_answer: '5 cm', correct_index: 0,
        explanation: 'opp = hyp × sin(30°) = 10 × 0.5 = 5 cm.' },

      { seed_key: 'y9-geo-m-02', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A right triangle has opposite = 4, adjacent = 3. What is the angle? (give in degrees)',
        choices: ['36.9°', '53.1°', '45°', '30°'],
        correct_answer: '53.1°', correct_index: 1,
        explanation: 'tan(θ) = 4/3 = 1.333. θ = tan⁻¹(1.333) ≈ 53.1°.' },

      { seed_key: 'y9-geo-m-03', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: In a circle, the angle in a semicircle is always 90°.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Thales\' theorem: an angle inscribed in a semicircle (with diameter as its base) is always 90°.' },

      { seed_key: 'y9-geo-m-04', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The volume of a sphere with radius 3 cm is: (Use V = 4/3 πr³)',
        choices: ['36π cm³', '27π cm³', '9π cm³', '12π cm³'],
        correct_answer: '36π cm³', correct_index: 0,
        explanation: 'V = 4/3 × π × 3³ = 4/3 × π × 27 = 36π cm³.' },

      { seed_key: 'y9-geo-m-05', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What vector translates (3, 1) to (7, −2)?',
        choices: ['(4, −3)', '(−4, 3)', '(10, −1)', '(4, 3)'],
        correct_answer: '(4, −3)', correct_index: 0,
        explanation: '7−3=4, −2−1=−3. Translation vector = (4, −3).' },

      { seed_key: 'y9-geo-m-06', year_group: 9, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: When a shape is reflected, its size changes.',
        choices: ['True', 'False'],
        correct_answer: 'False', correct_index: 1,
        explanation: 'Reflection is a congruent transformation — size and shape stay the same, only orientation changes.' },

      // Y9 Hard
      { seed_key: 'y9-geo-h-01', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Using the sine rule, in triangle ABC: a/sin(A) = b/sin(B). If a=8, A=30°, B=45°, find b.',
        choices: ['8√2', '4√2', '8', '11.3'],
        correct_answer: '8√2', correct_index: 0,
        explanation: 'b = a × sin(B)/sin(A) = 8 × sin45°/sin30° = 8 × (√2/2)/(1/2) = 8√2.' },

      { seed_key: 'y9-geo-h-02', year_group: 9, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A cylinder and a cone have the same radius and height. What is the ratio of their volumes?',
        choices: ['3:1', '1:3', '2:1', '1:2'],
        correct_answer: '3:1', correct_index: 0,
        explanation: 'Vcylinder = πr²h. Vcone = ⅓πr²h. Ratio = 3:1.' },

      // ═══════════════════ YEAR 10 GEOMETRY ════════════════════════════════════

      { seed_key: 'y10-geo-e-01', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is the exact value of tan(45°)?',
        choices: ['1/2', '√3', '1', '√2'],
        correct_answer: '1', correct_index: 2,
        explanation: 'tan(45°) = sin(45°)/cos(45°) = 1.' },

      { seed_key: 'y10-geo-e-02', year_group: 10, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: The surface area of a cube with side s is 6s².',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: '6 faces × s² each = 6s².' },

      // Y10 Medium
      { seed_key: 'y10-geo-m-01', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Using the cosine rule: c² = a² + b² − 2ab cos(C). If a=5, b=7, C=60°, find c.',
        choices: ['√39', '√49', '√24', '√51'],
        correct_answer: '√39', correct_index: 0,
        explanation: 'c² = 25 + 49 − 2(5)(7)(0.5) = 74 − 35 = 39. c = √39.' },

      { seed_key: 'y10-geo-m-02', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A bearing of 135° is in which compass direction?',
        choices: ['NE', 'SE', 'SW', 'NW'],
        correct_answer: 'SE', correct_index: 1,
        explanation: 'Bearings are measured clockwise from North. 135° = SE.' },

      { seed_key: 'y10-geo-m-03', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'A frustum is formed by removing a cone from a larger cone. True or false: a frustum has two circular faces.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'A frustum (truncated cone) has a large circular base and a smaller circular top.' },

      { seed_key: 'y10-geo-m-04', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'The angle subtended by an arc at the centre is twice the angle at the circumference. This is called:',
        choices: ['Thales\' theorem', 'The inscribed angle theorem', 'The alternate segment theorem', 'The cyclic quadrilateral theorem'],
        correct_answer: 'The inscribed angle theorem', correct_index: 1,
        explanation: 'The central angle is double the inscribed angle subtending the same arc.' },

      { seed_key: 'y10-geo-m-05', year_group: 10, difficulty: 'medium', question_type: 'mcq',
        question_text: 'What is the area of a sector with radius 8 cm and angle 45°? Leave in terms of π.',
        choices: ['2π cm²', '4π cm²', '8π cm²', '16π cm²'],
        correct_answer: '8π cm²', correct_index: 2,
        explanation: 'Area = (45/360) × π × 64 = (1/8) × 64π = 8π cm².' },

      // Y10 Hard
      { seed_key: 'y10-geo-h-01', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Prove that the tangent to a circle is perpendicular to the radius at the point of contact. The key reason is:',
        choices: ['Because tangent touches at one point', 'The radius is the shortest distance from centre to line', 'By definition', 'The angle in a semicircle'],
        correct_answer: 'The radius is the shortest distance from centre to line', correct_index: 1,
        explanation: 'The perpendicular from a point to a line is the shortest distance — so the radius must be perpendicular to the tangent.' },

      { seed_key: 'y10-geo-h-02', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'A shape is enlarged by scale factor k. Its volume scales by:',
        choices: ['k', 'k²', 'k³', '2k'],
        correct_answer: 'k³', correct_index: 2,
        explanation: 'Length scales by k, area by k², volume by k³.' },

      { seed_key: 'y10-geo-h-03', year_group: 10, difficulty: 'hard', question_type: 'mcq',
        question_text: 'In the alternate segment theorem, the angle between a tangent and a chord equals:',
        choices: ['The angle in the major segment', 'The angle in the alternate segment', '90°', 'Half the central angle'],
        correct_answer: 'The angle in the alternate segment', correct_index: 1,
        explanation: 'This is the alternate segment theorem: the angle between tangent and chord equals the inscribed angle in the opposite segment.' },

      // ═══════════════════ YEAR 11 GEOMETRY ════════════════════════════════════

      { seed_key: 'y11-geo-e-01', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'What is sin²(θ) + cos²(θ) equal to?',
        choices: ['0', '1', 'tan(θ)', '2'],
        correct_answer: '1', correct_index: 1,
        explanation: 'This is the Pythagorean identity: sin²θ + cos²θ = 1 for all θ.' },

      { seed_key: 'y11-geo-e-02', year_group: 11, difficulty: 'easy', question_type: 'mcq',
        question_text: 'True or false: Opposite angles in a cyclic quadrilateral add up to 180°.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'Cyclic quadrilateral theorem: opposite angles are supplementary (sum to 180°).' },

      // Y11 Medium
      { seed_key: 'y11-geo-m-01', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Find all solutions to sin(x) = 0.5 in the range 0° ≤ x ≤ 360°.',
        choices: ['30° only', '30° and 150°', '150° only', '30° and 210°'],
        correct_answer: '30° and 150°', correct_index: 1,
        explanation: 'sin is positive in Q1 and Q2. sin(30°)=0.5, and 180°−30°=150°.' },

      { seed_key: 'y11-geo-m-02', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'Using the sine rule, find angle B if a=6, sin(A)=0.5, b=8.',
        choices: ['41.8°', '48.6°', 'No solution', 'sin(B)=0.667'],
        correct_answer: 'sin(B)=0.667', correct_index: 3,
        explanation: 'sin(B)/b = sin(A)/a → sin(B) = 8×0.5/6 = 4/6 = 0.667. B = sin⁻¹(0.667) ≈ 41.8°.' },

      { seed_key: 'y11-geo-m-03', year_group: 11, difficulty: 'medium', question_type: 'mcq',
        question_text: 'True or false: The graph of y = sin(x) has a period of 360°.',
        choices: ['True', 'False'],
        correct_answer: 'True', correct_index: 0,
        explanation: 'The sine function repeats every 360°.' },

      // Y11 Hard
      { seed_key: 'y11-geo-h-01', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'Solve: 2sin²(x) − sin(x) − 1 = 0 for 0° ≤ x ≤ 360°.',
        choices: ['x = 90°, 210°, 330°', 'x = 90°, 270°', 'x = 90°, 30°', 'x = 30°, 150°'],
        correct_answer: 'x = 90°, 210°, 330°', correct_index: 0,
        explanation: 'Factor: (2sin(x)+1)(sin(x)−1)=0. sin(x)=1→x=90°. sin(x)=−0.5→x=210°,330°.' },

      { seed_key: 'y11-geo-h-02', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'The area of triangle ABC with sides a=7, b=5 and included angle C=40° is:',
        choices: ['17.5 sin40°', '35 sin40° / 2', 'Both A and B', 'None'],
        correct_answer: 'Both A and B', correct_index: 2,
        explanation: 'Area = ½ab sinC = ½ × 7 × 5 × sin40° = 17.5 sin40°. Option A and B simplify to the same.' },

      { seed_key: 'y11-geo-h-03', year_group: 11, difficulty: 'hard', question_type: 'mcq',
        question_text: 'In a vector problem, if OA = 3a and OB = 2b, what is AB in terms of a and b?',
        choices: ['3a + 2b', '2b − 3a', '3a − 2b', '−3a − 2b'],
        correct_answer: '2b − 3a', correct_index: 1,
        explanation: 'AB = AO + OB = −OA + OB = −3a + 2b = 2b − 3a.' },
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

    return Response.json({ message: 'Geometry & Measures seed complete', created, skipped, total_attempted: enriched.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});