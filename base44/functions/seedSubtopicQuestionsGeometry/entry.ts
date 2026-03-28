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

  const ANGLES      = find('Angles & Polygons');
  const AREA        = find('Area & Perimeter');
  const VOLUME      = find('Volume & Surface Area');
  const PYTHAG      = find('Pythagoras & Distance');
  const TRIG        = find('Trigonometry');
  const CIRCLES     = find('Circle Theorems');
  const VECTORS     = find('Vectors');
  const BEARINGS    = find('Bearings & Loci');
  const TRANSFORMS  = find('Transformations');

  const questions = [
    // ── ANGLES & POLYGONS ──
    ...[
      mcq('Angles on a straight line add up to:', ['180°','360°','90°','270°'], 0, 'Straight line = 180°', 'easy', 7, 'ang-01'),
      tf('A regular hexagon has interior angles of 120°', true, '(6−2)×180÷6 = 120°', 'medium', 8, 'ang-02'),
      written('Find the interior angle of a regular pentagon', '108°', '(5−2)×180÷5 = 108°', 'medium', 8, 'ang-03'),
      mcq('Angles in a triangle add up to:', ['180°','360°','90°','270°'], 0, 'Triangle angle sum = 180°', 'easy', 7, 'ang-04'),
      tf('Alternate angles are equal when lines are parallel', true, 'Z-angles are equal', 'easy', 7, 'ang-05'),
      written('What is the sum of exterior angles of any convex polygon?', '360°', 'Always 360° for any convex polygon', 'easy', 7, 'ang-06'),
      mcq('Find angle x if angles in a quadrilateral are 90°, 110°, 80° and x', ['80°','100°','70°','90°'], 0, '360 − 90 − 110 − 80 = 80°', 'medium', 8, 'ang-07'),
      tf('Co-interior angles between parallel lines add up to 180°', true, 'C-angles (co-interior) are supplementary', 'easy', 8, 'ang-08'),
      written('A regular polygon has exterior angle of 30°. How many sides does it have?', '12', '360/30 = 12', 'medium', 9, 'ang-09'),
      mcq('Which type of angle is greater than 90° but less than 180°?', ['Obtuse','Reflex','Acute','Right'], 0, 'Obtuse angles are between 90° and 180°', 'easy', 7, 'ang-10'),
      written('Find the number of sides of a regular polygon with interior angle 150°', '12', 'Exterior = 30°; 360/30 = 12', 'medium', 9, 'ang-11'),
      tf('Vertically opposite angles are equal', true, 'When two lines cross, opposite angles are equal', 'easy', 7, 'ang-12'),
      mcq('What is the exterior angle of a regular octagon?', ['45°','40°','36°','30°'], 0, '360/8 = 45°', 'medium', 8, 'ang-13'),
      written('Find angle a: triangle with angles 47° and 83°', '50°', '180 − 47 − 83 = 50°', 'easy', 7, 'ang-14'),
      tf('A reflex angle is between 180° and 360°', true, 'Reflex angles are greater than 180° but less than 360°', 'easy', 7, 'ang-15'),
      mcq('Corresponding angles on parallel lines are:', ['Equal','Supplementary','Complementary','Different'], 0, 'F-angles are equal on parallel lines', 'easy', 8, 'ang-16'),
      written('What is the sum of interior angles of a hexagon?', '720°', '(6−2) × 180 = 720°', 'medium', 8, 'ang-17'),
      mcq('An isosceles triangle has one angle of 50°. The base angles are:', ['65°','50°','130°','40°'], 0, '(180−50)/2 = 65°', 'medium', 8, 'ang-18'),
      tf('All angles in an equilateral triangle are 60°', true, 'Equal sides → equal angles; 180/3 = 60°', 'easy', 7, 'ang-19'),
      written('A regular polygon has interior angle sum of 1080°. How many sides does it have?', '8', '(n−2)×180=1080, n−2=6, n=8', 'hard', 9, 'ang-20'),
      mcq('Two parallel lines are crossed by a transversal. Co-interior angles sum to:', ['180°','90°','360°','270°'], 0, 'Co-interior (same-side interior) angles are supplementary', 'medium', 8, 'ang-21'),
      written('Find the interior angle of a regular 10-sided polygon', '144°', '(10−2)×180/10 = 144°', 'medium', 9, 'ang-22'),
      tf('A quadrilateral has angle sum 360°', true, '(4−2)×180 = 360°', 'easy', 7, 'ang-23'),
      mcq('In a right-angled triangle, the other two angles:', ['Are complementary (add to 90°)','Add to 180°','Are both 45°','Add to 270°'], 0, 'Total must be 180°, one angle is 90°, so other two sum to 90°', 'easy', 7, 'ang-24'),
      written('A regular polygon has 20 sides. Find its exterior angle.', '18°', '360/20 = 18°', 'medium', 9, 'ang-25'),
      tf('Alternate interior angles are formed between parallel lines on opposite sides of the transversal', true, 'These are the Z-angles', 'easy', 8, 'ang-26'),
      mcq('Which angle relationship exists when parallel lines are cut by a transversal and angles are on the same side?', ['Co-interior (supplementary)','Alternate (equal)','Corresponding (equal)','Vertically opposite'], 0, 'Same-side interior = co-interior = supplementary', 'medium', 9, 'ang-27'),
      written('An angle is 34°. What is its supplement?', '146°', '180 − 34 = 146°', 'easy', 7, 'ang-28'),
      tf('The exterior angle of a triangle equals the sum of the two non-adjacent interior angles', true, 'Exterior angle theorem', 'medium', 9, 'ang-29'),
      written('Find the missing angle: polygon with 5 sides and 4 known angles: 100°, 105°, 95°, 110°', '130°', 'Sum of pentagon = 540°; 540−100−105−95−110=130°', 'hard', 9, 'ang-30'),
    ].map(q => ({ ...q, global_topic_id: ANGLES, subject_id: subjectId, subject_name: 'Maths' })),

    // ── AREA & PERIMETER ──
    ...[
      mcq('Area of a rectangle 8 cm × 5 cm:', ['40 cm²','26 cm²','13 cm²','80 cm²'], 0, 'A = l × w = 8 × 5 = 40', 'easy', 7, 'area-01'),
      tf('The perimeter of a shape is measured in square units', false, 'Perimeter is a length — measured in cm, m etc., not cm²', 'easy', 7, 'area-02'),
      written('Find the area of a triangle with base 10 cm and height 6 cm', '30 cm²', 'A = ½ × 10 × 6 = 30', 'easy', 7, 'area-03'),
      mcq('Circumference of a circle with radius 5 cm (use π ≈ 3.14):', ['31.4 cm','78.5 cm','15.7 cm','10 cm'], 0, 'C = 2πr = 2×3.14×5 = 31.4', 'medium', 8, 'area-04'),
      tf('Area of a circle = πr²', true, 'Standard formula for circle area', 'easy', 7, 'area-05'),
      written('Find the area of a trapezium with parallel sides 6 cm and 10 cm, height 4 cm', '32 cm²', 'A = ½(6+10)×4 = 32', 'medium', 8, 'area-06'),
      mcq('Area of a circle with diameter 10 cm (leave in terms of π):', ['25π cm²','100π cm²','10π cm²','50π cm²'], 0, 'r=5; A=πr²=25π', 'medium', 8, 'area-07'),
      tf('Perimeter of a semicircle with radius r = πr + 2r', true, 'Half circumference + diameter: πr + 2r', 'hard', 9, 'area-08'),
      written('A sector has radius 6 cm and angle 90°. Find its area (use π).', '9π cm²', 'A = (90/360) × π × 36 = 9π', 'hard', 10, 'area-09'),
      mcq('What is the area of a parallelogram with base 9 cm and height 4 cm?', ['36 cm²','26 cm²','18 cm²','45 cm²'], 0, 'A = b × h = 9 × 4 = 36', 'easy', 7, 'area-10'),
      written('Find the perimeter of a rectangle 12 cm × 7 cm', '38 cm', 'P = 2(12+7) = 38 cm', 'easy', 7, 'area-11'),
      mcq('Arc length of a sector with radius 8 cm and angle 45° (leave in terms of π):', ['2π cm','4π cm','8π cm','π cm'], 0, 'L = (45/360)×2π×8 = (1/8)×16π = 2π', 'hard', 10, 'area-12'),
      tf('A rhombus has the same area formula as a parallelogram', true, 'Both use A = base × height', 'medium', 9, 'area-13'),
      written('Find the area of a kite with diagonals 8 cm and 6 cm', '24 cm²', 'A = (d₁×d₂)/2 = (8×6)/2 = 24', 'medium', 9, 'area-14'),
      mcq('A rectangular garden is 15 m × 8 m. What is the area?', ['120 m²','46 m²','60 m²','90 m²'], 0, '15 × 8 = 120', 'easy', 7, 'area-15'),
      written('Radius of a circle is 3 cm. Find circumference in terms of π.', '6π cm', 'C = 2π × 3 = 6π', 'easy', 8, 'area-16'),
      tf('Area scales by the square of the scale factor when a shape is enlarged', true, 'If linear scale factor = k, area scale factor = k²', 'hard', 10, 'area-17'),
      mcq('A circle has area 49π cm². What is its radius?', ['7 cm','14 cm','49 cm','7π cm'], 0, 'πr²=49π → r²=49 → r=7', 'medium', 9, 'area-18'),
      written('Find the area of a composite shape: a rectangle 10×4 with a semicircle of radius 2 on top', '40 + 2π cm²', 'Rect=40; semi=½π(2²)=2π; total=40+2π', 'hard', 10, 'area-19'),
      tf('The area of a triangle = ½ × base × perpendicular height', true, 'This is the standard formula', 'easy', 7, 'area-20'),
      mcq('Perimeter of a square with area 64 cm²?', ['32 cm','16 cm','8 cm','64 cm'], 0, 'Side = √64 = 8; P = 4×8 = 32', 'medium', 8, 'area-21'),
      written('A circle has circumference 20π cm. Find its area in terms of π.', '100π cm²', 'C=2πr=20π → r=10; A=100π', 'hard', 10, 'area-22'),
      tf('1 m² = 100 cm²', false, '1 m = 100 cm, so 1 m² = 10,000 cm²', 'medium', 9, 'area-23'),
      mcq('Which formula gives the area of a trapezium?', ['½(a+b)h','(a+b)h','ab','½ab'], 0, 'Trapezium area = half the sum of parallel sides times height', 'medium', 8, 'area-24'),
      written('A semi-circle has diameter 14 cm. Find area in terms of π.', '24.5π cm²', 'r=7; area=½π×49=24.5π', 'medium', 9, 'area-25'),
      tf('Doubling all dimensions of a shape doubles its area', false, 'Doubling all dimensions quadruples (×4) the area', 'hard', 10, 'area-26'),
      mcq('A triangle has base 12 m and area 36 m². What is the height?', ['6 m','3 m','9 m','12 m'], 0, '36 = ½ × 12 × h → h = 6', 'medium', 8, 'area-27'),
      written('Find the shaded area: a 10×10 square with a circle of radius 4 removed (leave in terms of π).', '100 − 16π cm²', 'Square: 100; circle: π×16=16π; shaded: 100−16π', 'hard', 10, 'area-28'),
      tf('The perimeter of a circle is called the circumference', true, 'Circumference is the term for a circle\'s perimeter', 'easy', 7, 'area-29'),
      mcq('Area of a sector with radius 12 cm and angle 120° (in terms of π)?', ['48π cm²','24π cm²','36π cm²','144π cm²'], 0, '(120/360)×π×144 = (1/3)×144π = 48π', 'hard', 10, 'area-30'),
    ].map(q => ({ ...q, global_topic_id: AREA, subject_id: subjectId, subject_name: 'Maths' })),

    // ── VOLUME & SURFACE AREA ──
    ...[
      mcq('Volume of a cuboid 4 × 3 × 5 cm:', ['60 cm³','60 cm²','47 cm³','20 cm³'], 0, 'V = l×w×h = 60', 'easy', 7, 'vol-01'),
      tf('Volume of a cylinder = πr²h', true, 'Standard cylinder volume formula', 'easy', 8, 'vol-02'),
      written('Find volume of a cylinder with radius 3 cm and height 10 cm (in terms of π)', '90π cm³', 'V = π×9×10 = 90π', 'medium', 8, 'vol-03'),
      mcq('Surface area of a cube with side 4 cm:', ['96 cm²','16 cm²','64 cm²','24 cm²'], 0, 'SA = 6 × 4² = 6 × 16 = 96', 'medium', 8, 'vol-04'),
      tf('The volume of a cone is one third the volume of a cylinder with the same base and height', true, 'V_cone = (1/3)πr²h', 'medium', 9, 'vol-05'),
      written('Volume of a sphere with radius 3 cm (in terms of π)', '36π cm³', 'V = (4/3)π×27 = 36π', 'hard', 10, 'vol-06'),
      mcq('Volume of a cone with radius 6 cm and height 5 cm (in terms of π):', ['60π cm³','30π cm³','180π cm³','20π cm³'], 0, 'V = (1/3)π×36×5 = 60π', 'hard', 10, 'vol-07'),
      tf('Surface area is measured in cubic units', false, 'Surface area is measured in square units (cm²), not cubic', 'easy', 7, 'vol-08'),
      written('Find the volume of a triangular prism with triangular cross-section area 12 cm² and length 7 cm', '84 cm³', 'V = cross-section area × length = 12 × 7 = 84', 'medium', 9, 'vol-09'),
      mcq('A sphere has volume 36π cm³. What is its radius?', ['3 cm','6 cm','4 cm','9 cm'], 0, '(4/3)πr³=36π → r³=27 → r=3', 'hard', 10, 'vol-10'),
      written('Total surface area of a closed cylinder with r=5 and h=8 (in terms of π)', '130π cm²', 'TSA = 2πr²+2πrh = 2π(25)+2π(40) = 50π+80π = 130π', 'hard', 10, 'vol-11'),
      tf('Volume scales by the cube of the scale factor under enlargement', true, 'If scale factor = k, volume scales by k³', 'hard', 10, 'vol-12'),
      mcq('A cuboid has dimensions 2 cm, 3 cm, 4 cm. What is its surface area?', ['52 cm²','24 cm²','48 cm²','26 cm²'], 0, '2(2×3+3×4+2×4)=2(6+12+8)=2×26=52', 'medium', 9, 'vol-13'),
      written('Volume of a pyramid with square base 6×6 and height 10 cm', '120 cm³', 'V = (1/3)×36×10 = 120', 'hard', 10, 'vol-14'),
      tf('A hemisphere has half the volume of a full sphere', true, 'V_hemisphere = (1/2)(4/3)πr³ = (2/3)πr³', 'medium', 9, 'vol-15'),
      mcq('Density = mass ÷ volume. If mass = 300 g and volume = 50 cm³, what is density?', ['6 g/cm³','250 g/cm³','15000 g/cm³','0.17 g/cm³'], 0, '300 ÷ 50 = 6 g/cm³', 'medium', 9, 'vol-16'),
      written('Find the curved surface area of a cylinder with r=4 and h=9 (in terms of π)', '72π cm²', 'CSA = 2πrh = 2π×4×9 = 72π', 'medium', 9, 'vol-17'),
      tf('A cube and a cuboid with the same volume have the same surface area', false, 'A cube is the most efficient shape; equal volume ≠ equal surface area', 'hard', 10, 'vol-18'),
      mcq('How many times greater is the volume of a shape if it is enlarged with scale factor 3?', ['27','9','3','81'], 0, '3³ = 27', 'hard', 10, 'vol-19'),
      written('Surface area of a sphere with radius 5 cm (in terms of π)', '100π cm²', 'SA = 4πr² = 4π×25 = 100π', 'hard', 10, 'vol-20'),
      mcq('Volume of a prism = ?', ['Cross-section area × length','Base × height','l × w × h','πr²h'], 0, 'Volume of any prism = area of cross-section × length', 'easy', 8, 'vol-21'),
      written('A block of metal has volume 80 cm³ and density 8 g/cm³. Find its mass.', '640 g', 'mass = density × volume = 8 × 80 = 640', 'medium', 9, 'vol-22'),
      tf('The total surface area of a cube with side s is 6s²', true, '6 faces, each with area s²', 'easy', 8, 'vol-23'),
      mcq('Which 3D shape has exactly 1 curved face, 1 flat face, and 1 vertex?', ['Cone','Cylinder','Sphere','Pyramid'], 0, 'Cone: circular base (flat), curved surface, apex (vertex)', 'easy', 8, 'vol-24'),
      written('A cone has slant height 13 cm and radius 5 cm. Find its curved surface area (in terms of π).', '65π cm²', 'CSA = πrl = π×5×13 = 65π', 'hard', 10, 'vol-25'),
      tf('Volume is always greater than surface area for any given shape', false, 'A 1cm cube has volume 1 cm³ and surface area 6 cm²', 'medium', 9, 'vol-26'),
      mcq('A cylinder has the same volume as a cuboid with dimensions 5×4×9. The cylinder has height 9 and its radius is:', ['√(20/π)','3 cm','9 cm','√20 cm'], 0, 'πr²×9=180 → r²=20/π → r=√(20/π)', 'hard', 11, 'vol-27'),
      written('Find the volume of a cone with diameter 8 cm and height 9 cm (in terms of π)', '48π cm³', 'r=4; V=(1/3)π×16×9=48π', 'hard', 10, 'vol-28'),
      tf('1 litre = 1000 cm³', true, '1 L = 1000 mL = 1000 cm³', 'easy', 8, 'vol-29'),
      mcq('What is the volume of a hollow cylinder (pipe) with outer radius 5, inner radius 3, height 10 (in terms of π)?', ['160π cm³','250π cm³','90π cm³','70π cm³'], 0, 'V = π(5²−3²)×10 = π(16)×10 = 160π', 'hard', 11, 'vol-30'),
    ].map(q => ({ ...q, global_topic_id: VOLUME, subject_id: subjectId, subject_name: 'Maths' })),

    // ── PYTHAGORAS ──
    ...(PYTHAG ? [
      mcq('In a right-angled triangle with legs 3 and 4, what is the hypotenuse?', ['5 cm','7 cm','12 cm','6 cm'], 0, '√(9+16)=√25=5', 'easy', 7, 'pyth-01'),
      tf('Pythagoras theorem states: a² + b² = c² where c is the hypotenuse', true, 'Standard statement of Pythagoras', 'easy', 7, 'pyth-02'),
      written('Find the hypotenuse of a right triangle with legs 5 cm and 12 cm', '13 cm', '√(25+144)=√169=13', 'easy', 8, 'pyth-03'),
      mcq('A leg of a right triangle is 6, hypotenuse is 10. Find the other leg.', ['8','4','√136','16'], 0, '√(100−36)=√64=8', 'medium', 8, 'pyth-04'),
      tf('Pythagoras theorem only applies to right-angled triangles', true, 'It requires a right angle', 'easy', 7, 'pyth-05'),
      written('Find the distance between points (1, 1) and (4, 5)', '5', '√((4−1)²+(5−1)²)=√(9+16)=5', 'medium', 9, 'pyth-06'),
      mcq('Which set of numbers is a Pythagorean triple?', ['5, 12, 13','5, 11, 13','3, 4, 6','6, 8, 11'], 0, '5²+12²=25+144=169=13²', 'medium', 8, 'pyth-07'),
      written('Is triangle with sides 7, 24, 25 right-angled?', 'Yes', '7²+24²=49+576=625=25²', 'medium', 9, 'pyth-08'),
      tf('The hypotenuse is always the longest side of a right-angled triangle', true, 'The side opposite the right angle is the longest', 'easy', 7, 'pyth-09'),
      mcq('Find the diagonal of a square with side 5 cm (to 1 d.p.)', ['7.1 cm','5.0 cm','10.0 cm','6.2 cm'], 0, '√(25+25)=√50≈7.07≈7.1', 'medium', 8, 'pyth-10'),
      written('A right triangle has hypotenuse 15 cm and one leg 9 cm. Find the other leg.', '12 cm', '√(225−81)=√144=12', 'medium', 9, 'pyth-11'),
      tf('In 3D Pythagoras you can apply the theorem multiple times', true, 'E.g. find diagonal of cuboid using two steps', 'hard', 10, 'pyth-12'),
      mcq('Find the length of the space diagonal of a cuboid 3 × 4 × 12 cm', ['13 cm','19 cm','5 cm','169 cm'], 0, '√(3²+4²+12²)=√(9+16+144)=√169=13', 'hard', 10, 'pyth-13'),
      written('Find the distance between (−2, 3) and (4, −5)', '10', '√(36+64)=√100=10', 'hard', 10, 'pyth-14'),
      mcq('A 5 m ladder leans against a wall. Its foot is 3 m from the wall. How high does it reach?', ['4 m','8 m','√34 m','2 m'], 0, '√(25−9)=√16=4', 'medium', 9, 'pyth-15'),
      written('A square has diagonal 10 cm. Find its side length (to 1 d.p.)', '7.1 cm', 's√2=10 → s=10/√2=7.07≈7.1', 'hard', 10, 'pyth-16'),
      tf('a² + b² = c² can be used to check if a triangle is right-angled', true, 'If this holds, the triangle contains a right angle', 'easy', 8, 'pyth-17'),
      mcq('Sides of a triangle are 8, 15, 17. Is it right-angled?', ['Yes, 8²+15²=17²','No','Cannot tell','Only if acute'], 0, '64+225=289=17²', 'medium', 9, 'pyth-18'),
      written('Find the exact length of hypotenuse in a triangle with legs 1 and 1', '√2', '√(1+1)=√2', 'medium', 9, 'pyth-19'),
      mcq('What is the perpendicular height of an equilateral triangle with side 6 cm?', ['3√3 cm','6√3 cm','3 cm','√3 cm'], 0, 'h=√(6²−3²)=√27=3√3', 'hard', 10, 'pyth-20'),
      written('Two points are A(0, 0) and B(8, 6). Find AB.', '10', '√(64+36)=√100=10', 'medium', 9, 'pyth-21'),
      tf('Pythagoras can determine if a triangle is acute, right, or obtuse', true, 'Compare c² with a²+b² to classify the triangle', 'hard', 10, 'pyth-22'),
      mcq('Find the hypotenuse of a right triangle with legs 7 and 24 (to nearest integer)', ['25','26','31','18'], 0, '√(49+576)=√625=25', 'medium', 9, 'pyth-23'),
      written('A rectangle has diagonal 20 cm and width 12 cm. Find its length.', '16 cm', '√(400−144)=√256=16', 'medium', 9, 'pyth-24'),
      tf('If a²+b²<c², the triangle is obtuse', true, 'The angle opposite c is obtuse when c²>a²+b²', 'hard', 11, 'pyth-25'),
      mcq('What is the exact hypotenuse of a triangle with legs 2 and 3?', ['√13','√5','√7','√15'], 0, '√(4+9)=√13', 'medium', 9, 'pyth-26'),
      written('Find the length of a diagonal of a rectangle measuring 9 m × 40 m', '41 m', '√(81+1600)=√1681=41', 'medium', 9, 'pyth-27'),
      tf('The shortest side is always opposite the smallest angle in any triangle', true, 'Side lengths correspond to opposite angle sizes', 'medium', 9, 'pyth-28'),
      written('A cuboid has length 6, width 8, height h. Diagonal = 14. Find h (leave in surd form).', '√96 or 4√6', '36+64+h²=196; h²=96; h=√96=4√6', 'hard', 11, 'pyth-29'),
      written('Prove that a triangle with sides 9, 40, 41 is right-angled', '9²+40²=81+1600=1681=41²', '9²+40²=81+1600=1681=41² ✓', 'hard', 10, 'pyth-30'),
    ].map(q => ({ ...q, global_topic_id: PYTHAG, subject_id: subjectId, subject_name: 'Maths' })) : []),

    // ── TRIGONOMETRY ──
    ...(TRIG ? [
      mcq('SOH CAH TOA: sin θ = ?', ['Opposite/Hypotenuse','Adjacent/Hypotenuse','Opposite/Adjacent','Hypotenuse/Opposite'], 0, 'Sine = Opposite over Hypotenuse', 'easy', 8, 'trig-01'),
      tf('cos 60° = 0.5', true, 'Exact value: cos 60° = 1/2', 'easy', 9, 'trig-02'),
      written('Find side x in a right triangle: angle = 30°, hypotenuse = 10 cm, opposite = x', '5 cm', 'x = 10 × sin 30° = 10 × 0.5 = 5', 'easy', 9, 'trig-03'),
      mcq('tan 45° = ?', ['1','0.5','√3','√2'], 0, 'tan 45° = 1 (exact value)', 'easy', 9, 'trig-04'),
      tf('The sine rule is used when you know two sides and the angle between them', false, 'That requires the COSINE rule; sine rule needs a side-angle pair', 'hard', 10, 'trig-05'),
      written('Find angle θ if tan θ = 1.5 (to 1 d.p.)', '56.3°', 'θ = tan⁻¹(1.5) ≈ 56.3°', 'medium', 10, 'trig-06'),
      mcq('In a right triangle, adjacent = 6 and hypotenuse = 10. Find the angle (to 1 d.p.)', ['53.1°','36.9°','30°','45°'], 0, 'cos θ = 6/10; θ = cos⁻¹(0.6) ≈ 53.1°', 'medium', 9, 'trig-07'),
      tf('sin²θ + cos²θ = 1 for all angles θ', true, 'This is the Pythagorean trigonometric identity', 'hard', 11, 'trig-08'),
      written('A ladder of length 8 m makes a 60° angle with the ground. Find its height up the wall.', '4√3 m ≈ 6.93 m', 'h = 8 × sin 60° = 8 × (√3/2) = 4√3', 'hard', 10, 'trig-09'),
      mcq('Sine rule: a/sin A = b/sin B. Find a when b = 10, B = 30°, A = 45°', ['10√2','5','20','5√2'], 0, 'a = 10 × sin45°/sin30° = 10×(√2/2)/(1/2) = 10√2', 'hard', 11, 'trig-10'),
      written('Find the adjacent side in a right triangle with hypotenuse 15 cm and angle 40°', '11.5 cm', 'adj = 15 × cos 40° ≈ 15 × 0.766 ≈ 11.5', 'medium', 10, 'trig-11'),
      tf('sin 30° = cos 60°', true, 'Both equal 0.5', 'medium', 10, 'trig-12'),
      mcq('The cosine rule is: a² = ?', ['b² + c² − 2bc cos A','b² + c² + 2bc cos A','b + c − 2bc cos A','a + b − 2ab cos A'], 0, 'Standard cosine rule formula', 'hard', 10, 'trig-13'),
      written('Find the angle θ if sin θ = 0.866 (to nearest degree)', '60°', 'sin⁻¹(0.866) ≈ 60°', 'medium', 10, 'trig-14'),
      tf('tan θ is undefined at 90°', true, 'tan 90° = sin90°/cos90° = 1/0 → undefined', 'hard', 11, 'trig-15'),
      mcq('In a right triangle with opposite = 5 and adjacent = 5, what is the angle?', ['45°','60°','30°','90°'], 0, 'tan θ = 5/5 = 1; θ = 45°', 'easy', 9, 'trig-16'),
      written('Find the exact value of sin 45°', '√2/2', 'sin 45° = √2/2 = 1/√2', 'medium', 10, 'trig-17'),
      mcq('Using cosine rule: sides 7, 8, angle between them 60°. Find the third side.', ['√57','√113','√129','7'], 0, 'c²=49+64−2×7×8×cos60°=113−56=57; c=√57', 'hard', 11, 'trig-18'),
      tf('SOHCAHTOA only applies to right-angled triangles', true, 'For non-right triangles use sine/cosine rules', 'easy', 9, 'trig-19'),
      written('A tower is 50 m tall. You stand 50 m away. Find the angle of elevation.', '45°', 'tan θ = 50/50 = 1; θ = 45°', 'medium', 9, 'trig-20'),
      mcq('Area of triangle = ½ab sin C. Find area when a=8, b=5, C=30°.', ['10','20','40','5'], 0, '½×8×5×0.5=10', 'hard', 10, 'trig-21'),
      written('Opposite side = 9 cm, angle = 35°. Find hypotenuse (to 1 d.p.)', '15.7 cm', 'h = 9/sin35° ≈ 9/0.574 ≈ 15.7', 'medium', 10, 'trig-22'),
      tf('Angles of elevation are measured from the horizontal upwards', true, 'Elevation = looking up from horizontal', 'easy', 9, 'trig-23'),
      mcq('Find cos 90°', ['0','1','−1','0.5'], 0, 'cos 90° = 0 (exact value)', 'easy', 9, 'trig-24'),
      written('In a triangle, a=12, b=15, c=10. Use cosine rule to find angle C (to nearest degree).', '41°', 'cos C=(144+225−100)/(2×12×15)=269/360≈0.747; C≈41.7°≈42°', 'hard', 11, 'trig-25'),
      tf('sin 0° = 0', true, 'sin 0° = 0 (exact value)', 'easy', 9, 'trig-26'),
      mcq('In a right triangle, opposite = 8, hypotenuse = 17. Find the adjacent side.', ['15','9','√225','13'], 0, '√(289−64)=√225=15', 'medium', 9, 'trig-27'),
      written('What does SOHCAHTOA stand for?', 'Sin=Opp/Hyp, Cos=Adj/Hyp, Tan=Opp/Adj', 'Memory aid for trig ratios in right triangles', 'easy', 8, 'trig-28'),
      tf('The angle of depression is equal to the angle of elevation from the other position', true, 'By alternate angles on parallel horizontal lines', 'hard', 10, 'trig-29'),
      mcq('Find the height of a right triangle with hypotenuse 20 cm and base angle 40°', ['12.9 cm','15.3 cm','6.4 cm','20 cm'], 0, 'h = 20 × sin 40° ≈ 20 × 0.643 ≈ 12.9', 'medium', 10, 'trig-30'),
    ].map(q => ({ ...q, global_topic_id: TRIG, subject_id: subjectId, subject_name: 'Maths' })) : []),
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

  return Response.json({ message: 'Geometry subtopic seed complete', created, skipped, total: questions.length });
});