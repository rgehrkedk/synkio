// =============================================================================
// Collector - Collect Variables and Styles from Figma
// =============================================================================

import {
  TokenEntry,
  StyleEntry,
  CollectionInfo,
  StyleTypeInfo,
  PaintStyleEntry,
  TextStyleEntry,
  EffectStyleEntry,
  StyleType,
} from './types';

// =============================================================================
// Variable Collection
// =============================================================================

export interface CollectOptions {
  excludedCollections?: string[];
}

export function collectVariables(options: CollectOptions = {}): TokenEntry[] {
  const { excludedCollections = [] } = options;
  const tokens: TokenEntry[] = [];

  const collections = figma.variables.getLocalVariableCollections();

  for (const collection of collections) {
    // Skip excluded collections
    if (excludedCollections.includes(collection.name)) {
      continue;
    }

    const isSingleMode = collection.modes.length === 1;

    for (const variableId of collection.variableIds) {
      const variable = figma.variables.getVariableById(variableId);
      if (!variable) continue;

      for (const mode of collection.modes) {
        const modeValue = variable.valuesByMode[mode.modeId];
        if (modeValue === undefined) continue;

        // Normalize mode name
        const modeName = isSingleMode && mode.name === 'Mode 1' ? 'value' : mode.name;

        // Build path from variable name (replace / with .)
        const path = variable.name.replace(/\//g, '.');

        // Convert value
        const { value, type } = convertValue(modeValue, variable.resolvedType);

        tokens.push({
          variableId: variable.id,
          collectionId: collection.id,
          modeId: mode.modeId,
          collection: collection.name,
          mode: modeName,
          path,
          value,
          type,
          description: variable.description || undefined,
          scopes: variable.scopes?.length ? variable.scopes : undefined,
          codeSyntax: variable.codeSyntax ? {
            WEB: variable.codeSyntax.WEB,
            ANDROID: variable.codeSyntax.ANDROID,
            iOS: variable.codeSyntax.iOS,
          } : undefined,
        });
      }
    }
  }

  return tokens;
}

function convertValue(value: VariableValue, resolvedType: VariableResolvedDataType): { value: unknown; type: string } {
  // Handle variable alias
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return {
      value: { $ref: value.id },
      type: resolvedType.toLowerCase(),
    };
  }

  // Handle color
  if (resolvedType === 'COLOR' && typeof value === 'object' && 'r' in value) {
    const color = value as RGBA;
    return {
      value: rgbaToString(color),
      type: 'color',
    };
  }

  // Handle float (check if dimension)
  if (resolvedType === 'FLOAT') {
    return {
      value: value,
      type: 'number',
    };
  }

  // Handle string
  if (resolvedType === 'STRING') {
    return {
      value: value,
      type: 'string',
    };
  }

  // Handle boolean
  if (resolvedType === 'BOOLEAN') {
    return {
      value: value,
      type: 'boolean',
    };
  }

  return { value, type: 'unknown' };
}

function rgbaToString(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;

  if (a === 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

// =============================================================================
// Style Collection
// =============================================================================

export interface StyleCollectOptions {
  excludedStyleTypes?: StyleType[];
}

export function collectStyles(options: StyleCollectOptions = {}): StyleEntry[] {
  const { excludedStyleTypes = [] } = options;
  const styles: StyleEntry[] = [];

  // Paint styles
  if (!excludedStyleTypes.includes('paint')) {
    const paintStyles = figma.getLocalPaintStyles();
    for (const style of paintStyles) {
      const entry = convertPaintStyle(style);
      if (entry) styles.push(entry);
    }
  }

  // Text styles
  if (!excludedStyleTypes.includes('text')) {
    const textStyles = figma.getLocalTextStyles();
    for (const style of textStyles) {
      const entry = convertTextStyle(style);
      if (entry) styles.push(entry);
    }
  }

  // Effect styles
  if (!excludedStyleTypes.includes('effect')) {
    const effectStyles = figma.getLocalEffectStyles();
    for (const style of effectStyles) {
      const entry = convertEffectStyle(style);
      if (entry) styles.push(entry);
    }
  }

  return styles;
}

function convertPaintStyle(style: PaintStyle): PaintStyleEntry | null {
  if (style.paints.length === 0) return null;

  const paint = style.paints[0];
  const path = style.name.replace(/\//g, '.');

  if (paint.type === 'SOLID') {
    return {
      styleId: style.id,
      type: 'paint',
      path,
      description: style.description || undefined,
      value: {
        $type: 'color',
        $value: rgbaToString({ ...paint.color, a: paint.opacity ?? 1 }),
      },
    };
  }

  if (paint.type.includes('GRADIENT')) {
    const gradientType = paint.type.replace('_GRADIENT', '').toLowerCase() as 'linear' | 'radial' | 'angular' | 'diamond';
    const stops = paint.gradientStops.map(stop => ({
      color: rgbaToString({ ...stop.color, a: stop.color.a }),
      position: stop.position,
    }));

    return {
      styleId: style.id,
      type: 'paint',
      path,
      description: style.description || undefined,
      value: {
        $type: 'gradient',
        $value: {
          gradientType,
          stops,
        },
      },
    };
  }

  return null;
}

function convertTextStyle(style: TextStyle): TextStyleEntry | null {
  const path = style.name.replace(/\//g, '.');

  return {
    styleId: style.id,
    type: 'text',
    path,
    description: style.description || undefined,
    value: {
      $type: 'typography',
      $value: {
        fontFamily: style.fontName.family,
        fontSize: `${style.fontSize}px`,
        fontWeight: getFontWeight(style.fontName.style),
        lineHeight: getLineHeight(style.lineHeight),
        letterSpacing: getLetterSpacing(style.letterSpacing),
        textTransform: style.textCase ? getTextTransform(style.textCase) : undefined,
        textDecoration: style.textDecoration ? getTextDecoration(style.textDecoration) : undefined,
      },
    },
  };
}

function convertEffectStyle(style: EffectStyle): EffectStyleEntry | null {
  if (style.effects.length === 0) return null;

  const path = style.name.replace(/\//g, '.');
  const effect = style.effects[0];

  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const shadows = style.effects
      .filter(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')
      .map(e => {
        const shadow = e as DropShadowEffect | InnerShadowEffect;
        return {
          offsetX: `${shadow.offset.x}px`,
          offsetY: `${shadow.offset.y}px`,
          blur: `${shadow.radius}px`,
          spread: `${shadow.spread || 0}px`,
          color: rgbaToString(shadow.color),
          inset: e.type === 'INNER_SHADOW' ? true : undefined,
        };
      });

    return {
      styleId: style.id,
      type: 'effect',
      path,
      description: style.description || undefined,
      value: {
        $type: 'shadow',
        $value: shadows.length === 1 ? shadows[0] : shadows,
      },
    };
  }

  if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    return {
      styleId: style.id,
      type: 'effect',
      path,
      description: style.description || undefined,
      value: {
        $type: 'blur',
        $value: {
          radius: `${effect.radius}px`,
        },
      },
    };
  }

  return null;
}

function getFontWeight(styleName: string): number | string {
  const weightMap: Record<string, number> = {
    'Thin': 100,
    'Hairline': 100,
    'Extra Light': 200,
    'Ultra Light': 200,
    'Light': 300,
    'Regular': 400,
    'Normal': 400,
    'Medium': 500,
    'Semi Bold': 600,
    'Demi Bold': 600,
    'Bold': 700,
    'Extra Bold': 800,
    'Ultra Bold': 800,
    'Black': 900,
    'Heavy': 900,
  };

  for (const [name, weight] of Object.entries(weightMap)) {
    if (styleName.toLowerCase().includes(name.toLowerCase())) {
      return weight;
    }
  }

  return 400;
}

function getLineHeight(lineHeight: LineHeight): string | number {
  if (lineHeight.unit === 'AUTO') {
    return 'auto';
  }
  if (lineHeight.unit === 'PERCENT') {
    return `${lineHeight.value}%`;
  }
  return `${lineHeight.value}px`;
}

function getLetterSpacing(letterSpacing: LetterSpacing): string {
  if (letterSpacing.unit === 'PERCENT') {
    return `${letterSpacing.value}%`;
  }
  return `${letterSpacing.value}px`;
}

function getTextTransform(textCase: TextCase): string | undefined {
  const map: Record<TextCase, string | undefined> = {
    ORIGINAL: undefined,
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
    SMALL_CAPS: 'small-caps',
    SMALL_CAPS_FORCED: 'small-caps',
  };
  return map[textCase];
}

function getTextDecoration(decoration: TextDecoration): string | undefined {
  const map: Record<TextDecoration, string | undefined> = {
    NONE: undefined,
    UNDERLINE: 'underline',
    STRIKETHROUGH: 'line-through',
  };
  return map[decoration];
}

// =============================================================================
// Collection Info
// =============================================================================

export function getCollectionInfos(): CollectionInfo[] {
  const collections = figma.variables.getLocalVariableCollections();

  return collections.map(collection => ({
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map(mode => ({
      id: mode.modeId,
      name: mode.name,
    })),
    variableCount: collection.variableIds.length,
    excluded: false,
  }));
}

export function getStyleTypeInfos(): StyleTypeInfo[] {
  return [
    { type: 'paint', count: figma.getLocalPaintStyles().length, excluded: false },
    { type: 'text', count: figma.getLocalTextStyles().length, excluded: false },
    { type: 'effect', count: figma.getLocalEffectStyles().length, excluded: false },
  ];
}
