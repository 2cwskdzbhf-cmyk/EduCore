import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[APPLY_START]', {
      user: user.email,
      timestamp: new Date().toISOString()
    });

    const body = await req.json();
    const { quiz_set_id, questions } = body;

    // Validation
    if (!quiz_set_id) {
      console.error('[APPLY_ERROR] Missing quiz_set_id');
      return Response.json({ error: 'quiz_set_id is required' }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('[APPLY_ERROR] No questions provided');
      return Response.json({ error: 'At least one question is required' }, { status: 400 });
    }

    if (questions.length > 50) {
      console.error('[APPLY_ERROR] Too many questions', { count: questions.length });
      return Response.json({ 
        error: 'Cannot add more than 50 questions at once. Please select fewer questions.' 
      }, { status: 413 });
    }

    console.log('[APPLY_PROCESSING]', {
      quiz_set_id,
      questionCount: questions.length
    });

    // Set up server-side timeout (10s)
    const timeoutSignal = AbortSignal.timeout(10000);

    // Fetch existing questions
    const existingRows = await base44.entities.QuizQuestion.filter({ quiz_set_id });
    const existingGlobalIds = new Set(existingRows.map(r => r.source_global_id).filter(Boolean));
    let maxOrder = existingRows.length ? Math.max(...existingRows.map(r => r.order ?? 0)) : -1;

    let created = 0;
    let skipped = 0;
    let invalid = 0;

    // Process questions with timeout check
    for (const q of questions) {
      // Check if timeout signal is aborted
      if (timeoutSignal.aborted) {
        console.error('[APPLY_TIMEOUT]', {
          processed: created + skipped + invalid,
          total: questions.length,
          timeElapsed: Date.now() - startTime
        });
        return Response.json({
          error: 'Request timed out. Try selecting fewer questions.',
          created,
          skipped,
          invalid
        }, { status: 504 });
      }

      // Skip duplicates
      if (existingGlobalIds.has(q.id)) {
        skipped++;
        continue;
      }

      // Validate question
      const prompt = (q.question_text || '').trim();
      if (!prompt) {
        invalid++;
        console.warn('[SKIP_INVALID] No prompt:', q.id);
        continue;
      }

      const opts = Array.isArray(q.options) && q.options.length === 4
        ? q.options.map(o => String(o).trim())
        : ['', '', '', ''];

      if (opts.some(o => !o)) {
        invalid++;
        console.warn('[SKIP_INVALID] Empty options:', q.id);
        continue;
      }

      let correctIndex = typeof q.correct_index === 'number' ? q.correct_index : -1;
      if (correctIndex < 0 && q.correct_answer) {
        correctIndex = opts.findIndex(o => 
          o.toLowerCase() === String(q.correct_answer).trim().toLowerCase()
        );
      }

      if (correctIndex < 0 || correctIndex > 3) {
        invalid++;
        console.warn('[SKIP_INVALID] Invalid correct_index:', q.id);
        continue;
      }

      maxOrder++;

      await base44.entities.QuizQuestion.create({
        quiz_set_id,
        order: maxOrder,
        prompt,
        question_type: 'multiple_choice',
        options: opts,
        correct_index: correctIndex,
        correct_answer: q.correct_answer || opts[correctIndex],
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        tags: [],
        source_global_id: q.id
      });

      created++;
    }

    const timeElapsed = Date.now() - startTime;
    console.log('[APPLY_SUCCESS]', {
      quiz_set_id,
      created,
      skipped,
      invalid,
      timeElapsed: `${timeElapsed}ms`
    });

    return Response.json({
      created,
      skipped,
      invalid,
      timeElapsed
    });

  } catch (error) {
    const timeElapsed = Date.now() - startTime;
    console.error('[APPLY_ERROR]', {
      error: error.message,
      stack: error.stack,
      timeElapsed: `${timeElapsed}ms`
    });

    return Response.json({
      error: error.message || 'Failed to apply questions',
      created: 0,
      skipped: 0,
      invalid: 0
    }, { status: 500 });
  }
});