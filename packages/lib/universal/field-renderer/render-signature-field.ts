import Konva from 'konva';

import { DEFAULT_SIGNATURE_TEXT_FONT_SIZE, getSignatureFontFamily } from '../../constants/pdf';
import { AppError } from '../../errors/app-error';
import type { TSignatureFieldMeta } from '../../types/field-meta';
import { resolveFieldOverflowMode } from '../../types/field-meta';
import { calculateOverflowLayout } from './calculate-overflow-layout';
import {
  createFieldHoverInteraction,
  konvaTextFontFamily,
  upsertFieldGroup,
  upsertFieldRect,
} from './field-generic-items';
import type { FieldToRender, RenderFieldElementOptions } from './field-renderer';
import { calculateFieldPosition } from './field-renderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SkiaImage: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SkiaCanvas: any;

void (async () => {
  if (typeof window === 'undefined') {
    const mod = await import('@documenso/skia-canvas');
    SkiaImage = mod.Image;
    SkiaCanvas = mod.Canvas;
  }
})();

type ImageCrop = { x: number; y: number; width: number; height: number };

/**
 * Alpha below this is treated as empty so anti-aliasing haze around strokes
 * does not keep the margins alive.
 */
const SIGNATURE_TRIM_ALPHA_THRESHOLD = 8;

/**
 * Breathing room kept around the trimmed content, relative to its larger side.
 */
const SIGNATURE_TRIM_PADDING_RATIO = 0.04;

/**
 * Find the visible content of a signature image.
 *
 * Signature pads export the whole canvas, so a drawn signature carries wide
 * transparent margins. Contain-fitting that into a flat field (the usual
 * shape of a signature line) shrinks the ink to a fraction of the field.
 * Cropping to the content lets the strokes use the full field.
 *
 * Images without transparency yield their full bounds, so they are unchanged.
 */
const getSignatureContentCrop = (img: HTMLImageElement, createCanvas: (w: number, h: number) => HTMLCanvasElement) => {
  const { width, height } = img;

  if (!width || !height) {
    return null;
  }

  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > SIGNATURE_TRIM_ALPHA_THRESHOLD) {
          if (x < minX) {
            minX = x;
          }
          if (x > maxX) {
            maxX = x;
          }
          if (y < minY) {
            minY = y;
          }
          if (y > maxY) {
            maxY = y;
          }
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    const padding = Math.round(Math.max(maxX - minX, maxY - minY) * SIGNATURE_TRIM_PADDING_RATIO);

    const x = Math.max(0, minX - padding);
    const y = Math.max(0, minY - padding);

    const crop: ImageCrop = {
      x,
      y,
      width: Math.min(width, maxX + 1 + padding) - x,
      height: Math.min(height, maxY + 1 + padding) - y,
    };

    return crop;
  } catch {
    return null;
  }
};

const getImageDimensions = (
  img: HTMLImageElement,
  fieldWidth: number,
  fieldHeight: number,
  crop?: ImageCrop | null,
) => {
  let imageWidth = crop?.width ?? img.width;
  let imageHeight = crop?.height ?? img.height;

  const scalingFactor = Math.min(fieldWidth / imageWidth, fieldHeight / imageHeight, 1);

  imageWidth = imageWidth * scalingFactor;
  imageHeight = imageHeight * scalingFactor;

  const imageX = (fieldWidth - imageWidth) / 2;
  const imageY = (fieldHeight - imageHeight) / 2;

  return {
    width: imageWidth,
    height: imageHeight,
    x: imageX,
    y: imageY,
  };
};

type FieldSignature =
  | {
      node: Konva.Text;
      isImageSignature: false;
      isLabel: boolean;
    }
  | {
      node: Konva.Image;
      isImageSignature: true;
      isLabel: boolean;
    };

/**
 * The pixel ratio used when caching the signature image as an offscreen bitmap.
 *
 * Konva's default redraw composites the source image with low-quality scaling
 * which makes signatures look blurry, especially when the source PNG is much
 * larger than the field. Caching at a high pixel ratio rasterises the shape
 * once into a sharp bitmap that is then reused on every redraw.
 *
 * Multiplied by `devicePixelRatio` to keep the cache crisp on retina displays.
 */
const SIGNATURE_IMAGE_CACHE_PIXEL_RATIO = 2;

/**
 * Build a Konva.Image for a base64 signature, sized to fit within the given
 * field dimensions. Works in both browser and Node.js (via skia-canvas).
 */
const createSignatureImage = (signatureImageAsBase64: string, fieldWidth: number, fieldHeight: number): Konva.Image => {
  if (typeof window !== 'undefined') {
    const img = new Image();

    const image = new Konva.Image({
      image: img,
      x: 0,
      y: 0,
      width: fieldWidth,
      height: fieldHeight,
      listening: false,
    });

    img.onload = () => {
      const crop = getSignatureContentCrop(img, (w, h) =>
        Object.assign(document.createElement('canvas'), { width: w, height: h }),
      );

      image.setAttrs({
        image: img,
        ...(crop ? { crop } : {}),
        ...getImageDimensions(img, fieldWidth, fieldHeight, crop),
      });

      // Cache the image as a high-resolution bitmap so it stays sharp on
      // redraws and zoom changes instead of being re-scaled from the source PNG
      // every time.
      image.cache({
        pixelRatio: SIGNATURE_IMAGE_CACHE_PIXEL_RATIO * (window.devicePixelRatio || 1),
      });
    };

    img.src = signatureImageAsBase64;

    return image;
  }

  // Node.js with skia-canvas
  if (!SkiaImage) {
    throw new Error('Skia image not found');
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const img = new SkiaImage(signatureImageAsBase64) as unknown as HTMLImageElement;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const crop = SkiaCanvas ? getSignatureContentCrop(img, (w, h) => new SkiaCanvas(w, h) as HTMLCanvasElement) : null;

  return new Konva.Image({
    image: img,
    ...(crop ? { crop } : {}),
    ...getImageDimensions(img, fieldWidth, fieldHeight, crop),
    listening: false,
  });
};

const createFieldSignature = (field: FieldToRender, options: RenderFieldElementOptions): FieldSignature => {
  const { pageWidth, pageHeight, mode = 'edit', translations } = options;

  const { fieldX, fieldY, fieldWidth, fieldHeight } = calculateFieldPosition(field, pageWidth, pageHeight);
  const fontSize = field.fieldMeta?.fontSize || DEFAULT_SIGNATURE_TEXT_FONT_SIZE;

  const fieldText = new Konva.Text({
    id: `${field.renderId}-text`,
    name: 'field-text',
    listening: false,
  });

  // Stamp fields get their own placeholder label in a regular font so they
  // are visually distinct from handwriting-style signature placeholders.
  const isStampField = (field.fieldMeta as TSignatureFieldMeta | undefined)?.stamp === true;

  const fieldTypeName = isStampField ? 'Stamp' : translations?.[field.type] || field.type;

  // Calculate text positioning based on alignment
  const textX = 0;
  const textY = 0;

  let textToRender: string = fieldTypeName;

  const signature = field.signature;

  // Handle edit mode.
  if (mode === 'edit') {
    textToRender = fieldTypeName;

    // If the field has already been signed and we have the signature data
    // available, render it. Otherwise leave the field type label as a placeholder.
    if (field.inserted && signature?.typedSignature) {
      textToRender = signature.typedSignature;
    }

    if (field.inserted && signature?.signatureImageAsBase64) {
      return {
        node: createSignatureImage(signature.signatureImageAsBase64, fieldWidth, fieldHeight),
        isImageSignature: true,
        isLabel: false,
      };
    }
  }

  // Handle sign mode.
  if (mode === 'sign' || mode === 'export') {
    textToRender = fieldTypeName;

    if (field.inserted && !signature) {
      throw new AppError('MISSING_SIGNATURE');
    }

    if (signature?.typedSignature) {
      textToRender = signature.typedSignature;
    }

    if (signature?.signatureImageAsBase64) {
      return {
        node: createSignatureImage(signature.signatureImageAsBase64, fieldWidth, fieldHeight),
        isImageSignature: true,
        isLabel: false,
      };
    }
  }

  const fieldMeta = field.fieldMeta as TSignatureFieldMeta | undefined;

  // Whether we're rendering the field type name (like "Signature") vs actual signed content.
  // Overflow should not apply to the label.
  const isLabel = !signature?.typedSignature;

  const overflowLayout = calculateOverflowLayout({
    overflowMode: resolveFieldOverflowMode(fieldMeta),
    isLabel,
    textToRender,
    fontSize,
    fontFamily: isStampField && isLabel ? konvaTextFontFamily : getSignatureFontFamily(textToRender),
    lineHeight: 1,
    letterSpacing: 0,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseX: textX,
    baseY: textY,
    baseWidth: fieldWidth,
    baseHeight: fieldHeight,
    groupX: fieldX,
    groupY: fieldY,
    pageWidth,
    pageHeight,
  });

  fieldText.setAttrs({
    x: overflowLayout.x,
    y: overflowLayout.y,
    verticalAlign: overflowLayout.verticalAlign,
    wrap: overflowLayout.wrap,
    text: textToRender,
    fontSize,
    fontFamily: isStampField && isLabel ? konvaTextFontFamily : getSignatureFontFamily(textToRender),
    align: overflowLayout.textAlign,
    width: overflowLayout.width,
    height: overflowLayout.height,
  } satisfies Partial<Konva.TextConfig>);

  return { node: fieldText, isImageSignature: false, isLabel };
};

export const renderSignatureFieldElement = (field: FieldToRender, options: RenderFieldElementOptions) => {
  const { mode = 'edit', pageLayer, pageWidth, pageHeight, color } = options;

  const isFirstRender = !pageLayer.findOne(`#${field.renderId}`);

  const fieldGroup = upsertFieldGroup(field, options);

  // Clear previous children and listeners to re-render fresh.
  fieldGroup.removeChildren();
  fieldGroup.off('transform');

  // Assign elements to group and any listeners that should only be run on initialization.
  if (isFirstRender) {
    pageLayer.add(fieldGroup);
  }

  // Render the field background and text.
  const fieldRect = upsertFieldRect(field, options);
  const { node: fieldSignature, isImageSignature, isLabel } = createFieldSignature(field, options);

  fieldGroup.add(fieldRect);
  fieldGroup.add(fieldSignature);

  fieldGroup.on('transform', () => {
    const groupScaleX = fieldGroup.scaleX();
    const groupScaleY = fieldGroup.scaleY();

    // Adjust text scale so it doesn't change while group is resized.
    fieldSignature.scaleX(1 / groupScaleX);
    fieldSignature.scaleY(1 / groupScaleY);

    const rectWidth = fieldRect.width() * groupScaleX;
    const rectHeight = fieldRect.height() * groupScaleY;

    // During active transform, use crop dimensions (field bounds only).
    if (!isImageSignature) {
      fieldSignature.x(0);
      fieldSignature.y(0);
      fieldSignature.wrap('word');
    }

    fieldSignature.width(rectWidth);
    fieldSignature.height(rectHeight);

    fieldGroup.getLayer()?.batchDraw();
  });

  fieldGroup.on('transformend', () => {
    fieldSignature.scaleX(1);
    fieldSignature.scaleY(1);

    const rectWidth = fieldRect.width();
    const rectHeight = fieldRect.height();

    if (!isImageSignature) {
      const fieldMeta = field.fieldMeta as TSignatureFieldMeta | undefined;

      const newOverflowLayout = calculateOverflowLayout({
        overflowMode: resolveFieldOverflowMode(fieldMeta),
        isLabel,
        textToRender: fieldSignature.text(),
        fontSize: fieldSignature.fontSize(),
        fontFamily: getSignatureFontFamily(fieldSignature.text()),
        lineHeight: 1,
        letterSpacing: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseX: 0,
        baseY: 0,
        baseWidth: rectWidth,
        baseHeight: rectHeight,
        groupX: fieldGroup.x(),
        groupY: fieldGroup.y(),
        pageWidth,
        pageHeight,
      });

      fieldSignature.x(newOverflowLayout.x);
      fieldSignature.y(newOverflowLayout.y);
      fieldSignature.width(newOverflowLayout.width);
      fieldSignature.height(newOverflowLayout.height);
      fieldSignature.wrap(newOverflowLayout.wrap);
      fieldSignature.verticalAlign(newOverflowLayout.verticalAlign);
    } else {
      fieldSignature.width(rectWidth);
      fieldSignature.height(rectHeight);
    }

    fieldGroup.getLayer()?.batchDraw();
  });

  // Handle export mode.
  if (mode === 'export') {
    // Hide the rectangle.
    fieldRect.opacity(0);
  }

  if (color !== 'readOnly' && mode !== 'export') {
    createFieldHoverInteraction({ fieldGroup, fieldRect, options });
  }

  return {
    fieldGroup,
    isFirstRender,
  };
};
