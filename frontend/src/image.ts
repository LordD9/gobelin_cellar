const MAX_SIDE = 896;
const JPEG_QUALITY = 0.72;

/** Réduit et réencode en JPEG baseline (iPhone HEIC / 12–48 Mpx sinon font planter les VLM). */
export async function compressImage(file: File, maxSide = MAX_SIDE, quality = JPEG_QUALITY): Promise<string> {
  try {
    return canvasToJpeg(await loadViaBitmap(file, maxSide), quality);
  } catch {
    return canvasToJpeg(await loadViaElement(file, maxSide), quality);
  }
}

interface Raster {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
}

async function loadViaBitmap(file: File, maxSide: number): Promise<Raster> {
  const orientation = { imageOrientation: 'from-image' as const };
  const probe = await createImageBitmap(file, orientation);
  const scale = Math.min(1, maxSide / Math.max(probe.width, probe.height));
  const width = Math.max(1, Math.round(probe.width * scale));
  const height = Math.max(1, Math.round(probe.height * scale));

  if (scale < 1) {
    probe.close();
    const resized = await createImageBitmap(file, {
      ...orientation,
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    });
    return bitmapRaster(resized);
  }

  return bitmapRaster(probe);
}

function bitmapRaster(bitmap: ImageBitmap): Raster {
  return {
    width: bitmap.width,
    height: bitmap.height,
    draw(ctx, width, height) {
      ctx.drawImage(bitmap, 0, 0, width, height);
    },
    close() {
      bitmap.close();
    },
  };
}

async function loadViaElement(file: File, maxSide: number): Promise<Raster> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Format photo non lisible (HEIC trop ancien ?). Réessaie en JPEG.'));
      el.src = url;
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width < 8 || height < 8) {
      throw new Error('Image trop petite ou illisible');
    }
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      draw(ctx, w, h) {
        ctx.drawImage(image, 0, 0, w, h);
      },
      close() {
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToJpeg(source: Raster, quality: number): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error("Impossible de préparer l'image");
    }
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, source.width, source.height);
    source.draw(ctx, source.width, source.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (!dataUrl.startsWith('data:image/jpeg') || dataUrl.length < 800) {
      throw new Error('Conversion JPEG incomplète');
    }
    return dataUrl;
  } finally {
    source.close();
  }
}
