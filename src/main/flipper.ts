import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// Get FFmpeg path - handles both dev and packaged app on Mac/Windows
function getFfmpegPath(): string | null {
  let ffmpegPath: string | null = null;

  // For Windows packaged app, use bundled ffmpeg
  if (process.platform === 'win32' && process.resourcesPath) {
    const bundledPath = path.join(process.resourcesPath, 'ffmpeg.exe');
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
  }

  // For Mac or dev mode, use ffmpeg-static
  try {
    ffmpegPath = require('ffmpeg-static');
  } catch (e) {
    return null;
  }

  // In packaged app, adjust path for asar unpacking
  if (ffmpegPath && ffmpegPath.includes('app.asar')) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }

  // Verify the binary exists
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }

  return null;
}

// Set FFmpeg path
const ffmpegBinary = getFfmpegPath();
if (ffmpegBinary) {
  ffmpeg.setFfmpegPath(ffmpegBinary);
}

function isVideo(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

function isImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getOutputPath(inputPath: string, outputFolder: string): string {
  const ext = path.extname(inputPath);
  const basename = path.basename(inputPath, ext);
  return path.join(outputFolder, `${basename}_flipped${ext}`);
}

function flipVideo(inputPath: string, outputPath: string, onProgress: (percent: number) => void): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!ffmpegBinary) {
      resolve({ success: false, error: 'FFmpeg not found' });
      return;
    }

    let duration = 0;

    ffmpeg(inputPath)
      .on('codecData', (data: any) => {
        if (data.duration && data.duration !== 'N/A') {
          const parts = data.duration.split(':');
          if (parts.length === 3) {
            duration = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          }
        }
      })
      .on('progress', (progress: any) => {
        if (duration > 0 && progress.timemark) {
          const parts = progress.timemark.split(':');
          if (parts.length === 3) {
            const currentTime = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            const percent = Math.min(99, Math.round((currentTime / duration) * 100));
            onProgress(percent);
          }
        }
      })
      .on('end', () => {
        onProgress(100);
        resolve({ success: true });
      })
      .on('error', (err: Error) => {
        resolve({ success: false, error: err.message });
      })
      .videoFilters('hflip')
      .outputOptions([
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'fast',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        '-y'
      ])
      .output(outputPath)
      .run();
  });
}

function flipImage(inputPath: string, outputPath: string, onProgress: (percent: number) => void): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!ffmpegBinary) {
      resolve({ success: false, error: 'FFmpeg not found' });
      return;
    }

    onProgress(10);

    const ext = path.extname(inputPath).toLowerCase();

    // Configure output options based on format
    let outputOptions = ['-vf', 'hflip', '-y'];

    if (ext === '.jpg' || ext === '.jpeg') {
      outputOptions.push('-q:v', '2');
    } else if (ext === '.png') {
      outputOptions.push('-compression_level', '6');
    } else if (ext === '.webp') {
      outputOptions.push('-quality', '100', '-lossless', '1');
    }

    onProgress(30);

    ffmpeg(inputPath)
      .outputOptions(outputOptions)
      .on('start', () => {
        onProgress(50);
      })
      .on('end', () => {
        onProgress(100);
        resolve({ success: true });
      })
      .on('error', (err: Error) => {
        resolve({ success: false, error: err.message });
      })
      .save(outputPath);
  });
}

interface ProcessResult {
  success: boolean;
  error?: string;
}

interface ProgressCallback {
  (progress: { file: string; status: string; percent: number; error?: string }): void;
}

async function processFile(filePath: string, outputFolder: string, onProgress: ProgressCallback): Promise<ProcessResult> {
  const outputPath = getOutputPath(filePath, outputFolder);

  // Ensure output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const progressCallback = (percent: number) => {
    onProgress({
      file: filePath,
      status: 'processing',
      percent
    });
  };

  let result: ProcessResult;

  try {
    if (isVideo(filePath)) {
      result = await flipVideo(filePath, outputPath, progressCallback);
    } else if (isImage(filePath)) {
      result = await flipImage(filePath, outputPath, progressCallback);
    } else {
      result = { success: false, error: 'Unsupported file format' };
    }

    // Verify file was actually created
    if (result.success && !fs.existsSync(outputPath)) {
      result = { success: false, error: 'Output file was not created' };
    }
  } catch (err) {
    result = { success: false, error: (err as Error).message };
  }

  // Send final status
  onProgress({
    file: filePath,
    status: result.success ? 'done' : 'error',
    percent: 100,
    error: result.error
  });

  return result;
}

export async function processFiles(files: string[], outputFolder: string, onProgress: ProgressCallback, concurrency = 2): Promise<ProcessResult[]> {
  const results: { file: string; success: boolean; error?: string }[] = [];
  const queue = [...files];

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const file = queue.shift();
      if (file) {
        const result = await processFile(file, outputFolder, onProgress);
        results.push({ file, ...result });
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, files.length); i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);

  return files.map(f => results.find(r => r.file === f) || { success: false, error: 'Not processed' });
}

export function isValidFlipperFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext);
}
