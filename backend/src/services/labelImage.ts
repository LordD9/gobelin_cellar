import sharp from 'sharp';

export const LABEL_IMAGE_MAX_SIDE = 768;
export const LABEL_IMAGE_RETRY_SIDE = 512;

/** Recadre / réencode en JPEG baseline. Les HEIC et 12 Mpx iPhone cassent souvent les VLM (EOF). */
export async function normalizeLabelImage(base64: string, maxSide = LABEL_IMAGE_MAX_SIDE): Promise<string> {
  const input = Buffer.from(base64, 'base64');
  if (input.length < 32) {
    throw new Error('Image trop petite');
  }

  try {
    const output = await sharp(input, { failOn: 'none', limitInputPixels: 80_000_000 })
      .rotate()
      .resize({
        width: maxSide,
        height: maxSide,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .removeAlpha()
      .jpeg({
        quality: 75,
        mozjpeg: true,
        chromaSubsampling: '4:2:0',
        force: true,
      })
      .toBuffer();

    if (output.length < 64) {
      throw new Error('Image illisible après conversion');
    }
    return output.toString('base64');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'conversion impossible';
    throw new Error(`Impossible de préparer la photo pour Ollama (${message})`);
  }
}

export function isModelImageCrash(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unexpected eof|error was encountered while running the model|failed to decode image|image decode/i.test(
    message,
  );
}
