// =============================================================================
// Style Operations
// =============================================================================

import { StyleBaselineEntry, StyleType } from '../lib/types';
import { parseColor } from './color-parser';
import { weightToStyle } from './typography';

/**
 * Input type for creating or updating a style.
 */
export interface StyleChangeInput {
  path: string;
  value: unknown;
  styleType: StyleType;
  styleId?: string;
}

/**
 * Creates or updates a Figma style based on the provided change data.
 *
 * @param stylesBaseline - The styles baseline record to look up style values
 * @param change - The style change data including path, value, styleType, and optional styleId
 */
export async function createOrUpdateStyle(
  stylesBaseline: Record<string, StyleBaselineEntry>,
  change: StyleChangeInput
): Promise<void> {
  const styleName = change.path.replace(/\./g, '/');

  // Try to find existing style
  let existingStyle: PaintStyle | TextStyle | EffectStyle | null = null;

  if (change.styleId) {
    existingStyle = await figma.getStyleByIdAsync(change.styleId) as PaintStyle | TextStyle | EffectStyle | null;
  }

  if (!existingStyle) {
    // Try to find by name
    if (change.styleType === 'paint') {
      const paintStyles = await figma.getLocalPaintStylesAsync();
      existingStyle = paintStyles.find(s => s.name === styleName) || null;
    } else if (change.styleType === 'text') {
      const textStyles = await figma.getLocalTextStylesAsync();
      existingStyle = textStyles.find(s => s.name === styleName) || null;
    } else if (change.styleType === 'effect') {
      const effectStyles = await figma.getLocalEffectStylesAsync();
      existingStyle = effectStyles.find(s => s.name === styleName) || null;
    }
  }

  // Get the style value from baseline
  const styleEntry = Object.values(stylesBaseline).find(s => s.path === change.path);
  if (!styleEntry) return;

  const styleValue = styleEntry.value as Record<string, unknown>;

  if (change.styleType === 'paint') {
    if (!existingStyle) {
      existingStyle = figma.createPaintStyle();
      existingStyle.name = styleName;
    }

    const paints = convertToPaints(styleValue);
    if (paints) {
      (existingStyle as PaintStyle).paints = paints;
    }
  } else if (change.styleType === 'text') {
    if (!existingStyle) {
      existingStyle = figma.createTextStyle();
      existingStyle.name = styleName;
    }

    await applyTypographyStyle(existingStyle as TextStyle, styleValue);
  } else if (change.styleType === 'effect') {
    if (!existingStyle) {
      existingStyle = figma.createEffectStyle();
      existingStyle.name = styleName;
    }

    const effects = convertToEffects(styleValue);
    if (effects) {
      (existingStyle as EffectStyle).effects = effects;
    }
  }
}

/**
 * Converts a style value to Figma Paint array.
 *
 * @param styleValue - The style value object with $type and $value
 * @returns Array of Figma Paint objects, or null if conversion fails
 */
function convertToPaints(styleValue: Record<string, unknown>): Paint[] | null {
  if (!styleValue.$type) return null;

  if (styleValue.$type === 'color') {
    const colorValue = styleValue.$value as string;
    const rgba = parseColor(colorValue);
    return [{
      type: 'SOLID',
      color: { r: rgba.r, g: rgba.g, b: rgba.b },
      opacity: rgba.a,
    }];
  }

  if (styleValue.$type === 'gradient') {
    const gradientData = styleValue.$value as {
      gradientType: string;
      stops: Array<{ color: string; position: number }>;
      angle?: number;
    };

    const gradientTypeMap: Record<string, 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'> = {
      linear: 'GRADIENT_LINEAR',
      radial: 'GRADIENT_RADIAL',
      angular: 'GRADIENT_ANGULAR',
      diamond: 'GRADIENT_DIAMOND',
    };

    const gradientStops: ColorStop[] = gradientData.stops.map(stop => {
      const rgba = parseColor(stop.color);
      return {
        position: stop.position,
        color: { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a },
      };
    });

    return [{
      type: gradientTypeMap[gradientData.gradientType] || 'GRADIENT_LINEAR',
      gradientStops,
      gradientTransform: [[1, 0, 0], [0, 1, 0]], // Identity transform
    }];
  }

  return null;
}

/**
 * Applies typography properties to a Figma TextStyle.
 *
 * @param style - The Figma TextStyle to update
 * @param styleValue - The typography style value object
 */
async function applyTypographyStyle(style: TextStyle, styleValue: Record<string, unknown>): Promise<void> {
  if (styleValue.$type !== 'typography') return;

  const typographyValue = styleValue.$value as {
    fontFamily: string;
    fontSize: string;
    fontWeight: number | string;
    lineHeight: string | number;
    letterSpacing: string;
    textTransform?: string;
    textDecoration?: string;
  };

  // Load font
  const fontWeight = typeof typographyValue.fontWeight === 'number'
    ? weightToStyle(typographyValue.fontWeight)
    : typographyValue.fontWeight;

  try {
    await figma.loadFontAsync({ family: typographyValue.fontFamily, style: fontWeight });
    style.fontName = { family: typographyValue.fontFamily, style: fontWeight };
  } catch {
    // Font not available, try loading default
    try {
      await figma.loadFontAsync({ family: typographyValue.fontFamily, style: 'Regular' });
      style.fontName = { family: typographyValue.fontFamily, style: 'Regular' };
    } catch {
      // Keep existing font
    }
  }

  // Font size
  const fontSize = parseFloat(typographyValue.fontSize);
  if (!isNaN(fontSize)) {
    style.fontSize = fontSize;
  }

  // Line height
  if (typographyValue.lineHeight === 'auto') {
    style.lineHeight = { unit: 'AUTO' };
  } else if (typeof typographyValue.lineHeight === 'string') {
    if (typographyValue.lineHeight.endsWith('%')) {
      style.lineHeight = { unit: 'PERCENT', value: parseFloat(typographyValue.lineHeight) };
    } else {
      style.lineHeight = { unit: 'PIXELS', value: parseFloat(typographyValue.lineHeight) };
    }
  } else if (typeof typographyValue.lineHeight === 'number') {
    style.lineHeight = { unit: 'PIXELS', value: typographyValue.lineHeight };
  }

  // Letter spacing
  if (typographyValue.letterSpacing.endsWith('%')) {
    style.letterSpacing = { unit: 'PERCENT', value: parseFloat(typographyValue.letterSpacing) };
  } else {
    style.letterSpacing = { unit: 'PIXELS', value: parseFloat(typographyValue.letterSpacing) };
  }

  // Text case
  if (typographyValue.textTransform) {
    const caseMap: Record<string, TextCase> = {
      uppercase: 'UPPER',
      lowercase: 'LOWER',
      capitalize: 'TITLE',
      'small-caps': 'SMALL_CAPS',
    };
    style.textCase = caseMap[typographyValue.textTransform] || 'ORIGINAL';
  }

  // Text decoration
  if (typographyValue.textDecoration) {
    const decorationMap: Record<string, TextDecoration> = {
      underline: 'UNDERLINE',
      'line-through': 'STRIKETHROUGH',
    };
    style.textDecoration = decorationMap[typographyValue.textDecoration] || 'NONE';
  }
}

/**
 * Converts a style value to Figma Effect array.
 *
 * @param styleValue - The style value object with $type and $value
 * @returns Array of Figma Effect objects, or null if conversion fails
 */
function convertToEffects(styleValue: Record<string, unknown>): Effect[] | null {
  if (!styleValue.$type) return null;

  if (styleValue.$type === 'shadow') {
    const shadowData = styleValue.$value;
    const shadows = Array.isArray(shadowData) ? shadowData : [shadowData];

    return shadows.map((shadow: {
      offsetX: string;
      offsetY: string;
      blur: string;
      spread: string;
      color: string;
      inset?: boolean;
    }) => {
      const rgba = parseColor(shadow.color);
      return {
        type: shadow.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        color: rgba,
        offset: {
          x: parseFloat(shadow.offsetX),
          y: parseFloat(shadow.offsetY),
        },
        radius: parseFloat(shadow.blur),
        spread: parseFloat(shadow.spread),
        visible: true,
        blendMode: 'NORMAL',
      } as DropShadowEffect | InnerShadowEffect;
    });
  }

  if (styleValue.$type === 'blur') {
    const blurData = styleValue.$value as { radius: string };
    return [{
      type: 'LAYER_BLUR',
      radius: parseFloat(blurData.radius),
      visible: true,
    } as BlurEffect];
  }

  return null;
}
