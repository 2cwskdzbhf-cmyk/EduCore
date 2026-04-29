import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { audio_url, lesson_id } = await req.json();
  if (!audio_url) return Response.json({ error: 'audio_url required' }, { status: 400 });

  // Fetch the audio file
  const audioRes = await fetch(audio_url);
  if (!audioRes.ok) return Response.json({ error: 'Failed to fetch audio' }, { status: 400 });

  const arrayBuffer = await audioRes.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Write to tmp
  const tmpPath = `/tmp/lesson_audio_${Date.now()}.webm`;
  await Deno.writeFile(tmpPath, uint8);

  // Read it back as a File for OpenAI
  const fileBytes = await Deno.readFile(tmpPath);
  const audioFile = new File([fileBytes], 'audio.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en',
  });

  // Clean up tmp
  await Deno.remove(tmpPath).catch(() => {});

  // If lesson_id provided, update the lesson
  if (lesson_id) {
    await base44.asServiceRole.entities.ClassLesson.update(lesson_id, {
      transcript_text: transcription.text,
    });
  }

  return Response.json({ transcript: transcription.text });
});