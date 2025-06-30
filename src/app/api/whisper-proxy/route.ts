import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Save the uploaded file temporarily
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const tempDir = join(process.cwd(), 'tmp');
    const webmPath = join(tempDir, `audio_${Date.now()}.webm`);
    const mp3Path = join(tempDir, `audio_${Date.now()}.mp3`);
    
    await writeFile(webmPath, buffer);
    
    // Convert webm to mp3 using ffmpeg
    try {
      await execAsync(`ffmpeg -i "${webmPath}" -acodec mp3 "${mp3Path}"`);
    } catch (ffmpegError) {
      console.error('FFmpeg conversion error:', ffmpegError);
      // If ffmpeg fails, try to use the original file
      await writeFile(mp3Path, buffer);
    }

    // Send to OpenAI Whisper API
    const whisperFormData = new FormData();
    const mp3Buffer = await import('fs').then(fs => fs.promises.readFile(mp3Path));
    const mp3Blob = new Blob([mp3Buffer], { type: 'audio/mp3' });
    
    whisperFormData.append('file', mp3Blob, 'audio.mp3');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'ja');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json({ error: 'Whisper API error' }, { status: 500 });
    }

    const whisperResult = await whisperResponse.json();
    
    // Clean up temporary files
    try {
      await unlink(webmPath);
      await unlink(mp3Path);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return NextResponse.json({ 
      text: whisperResult.text,
      success: true 
    });

  } catch (error) {
    console.error('Error in whisper-proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

