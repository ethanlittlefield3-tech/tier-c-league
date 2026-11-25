/**
 * Photo proof is shrunk on the phone to a JPEG of 300 KB or less (PHASE1.md,
 * "Photo proof"), so it fits in one database document on the free plan.
 */

/** The most a proof photo can weigh. The security rules allow its text form, a little more. */
export const PROOF_BYTES = 300_000;

const PREFIX = 'data:image/jpeg;base64,';

/** How many bytes a JPEG data URL holds. */
export function bytesOf(dataUrl: string): number {
  const body = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - padding;
}

/** The sizes to try, largest first: the long side, then smaller and smaller. */
export function sizesToTry(width: number, height: number, longest = 1600): { width: number; height: number }[] {
  const sizes: { width: number; height: number }[] = [];
  let scale = Math.min(1, longest / Math.max(width, height, 1));
  for (let step = 0; step < 6; step += 1) {
    sizes.push({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) });
    scale *= 0.75;
  }
  return sizes;
}

/** Shrinks a photo to a JPEG data URL of `PROOF_BYTES` or less, trying lower quality, then smaller sizes. */
export async function shrinkPhoto(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This phone cannot shrink photos.');
    for (const size of sizesToTry(image.naturalWidth, image.naturalHeight)) {
      canvas.width = size.width;
      canvas.height = size.height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(image, 0, 0, size.width, size.height);
      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.startsWith(PREFIX) && bytesOf(data) <= PROOF_BYTES) return data;
      }
    }
    throw new Error('That photo is too big to send, even shrunk.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
