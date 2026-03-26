const FALLBACK_PRIMARY_COLOR = '#1A5CFF';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');

const rgbToHex = (r: number, g: number, b: number) =>
  `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

export const getContrastTextColor = (hexColor: string) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return '#FFFFFF';
  }
  return luminance(rgb) > 0.6 ? '#0F172A' : '#FFFFFF';
};

const mixWith = (hexColor: string, amount: number, target: 'white' | 'black') => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return FALLBACK_PRIMARY_COLOR;
  }
  const mix = clamp(amount, 0, 1);
  const targetValue = target === 'white' ? 255 : 0;
  return rgbToHex(
    rgb.r + (targetValue - rgb.r) * mix,
    rgb.g + (targetValue - rgb.g) * mix,
    rgb.b + (targetValue - rgb.b) * mix,
  );
};

export const buildBrandPalette = (hexColor?: string | null) => {
  const normalized = (hexColor ?? '').trim();
  const primary = /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : FALLBACK_PRIMARY_COLOR;
  return {
    primary,
    primaryHover: mixWith(primary, 0.16, 'black'),
    primarySoft: mixWith(primary, 0.82, 'white'),
    onPrimary: getContrastTextColor(primary),
  };
};

export const extractDominantColorFromFile = async (file: File): Promise<string> => {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load logo image.'));
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return FALLBACK_PRIMARY_COLOR;
    }

    const maxSize = 64;
    const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 120) {
        continue;
      }
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const quantizedKey = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const bucket = buckets.get(quantizedKey) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(quantizedKey, bucket);
    }

    if (buckets.size === 0) {
      return FALLBACK_PRIMARY_COLOR;
    }

    const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    return rgbToHex(dominant.r / dominant.count, dominant.g / dominant.count, dominant.b / dominant.count);
  } catch {
    return FALLBACK_PRIMARY_COLOR;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

