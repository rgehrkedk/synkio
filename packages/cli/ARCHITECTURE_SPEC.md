# Synkio Token Pipeline: Robust Arkitektur Spec

## Overblik

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              TOKEN PIPELINE                                 │
└────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
  │  INPUT  │ -> │ PREPROCESSOR│ -> │ TRANSFORMS │ -> │ FORMATTER │ -> │  OUTPUT  │
  │ (Figma) │    │             │    │            │    │           │    │  (Files) │
  └─────────┘    └─────────────┘    └────────────┘    └───────────┘    └──────────┘
       │               │                  │                │                │
       │         Normalisér          Konverter        Byg filstruktur   Skriv filer
       │         typer & værdier     værdier          & syntax
       │               │                  │                │
       ▼               ▼                  ▼                ▼
   Raw JSON      Normalized Token    Platform Value    Formatted File
```

---

## 1. Token Model (Core Types)

### 1.1 Raw Token (fra Figma)
```typescript
interface RawFigmaToken {
  name: string;
  value: unknown;                    // Kan være hvad som helst
  type?: string;                     // Ofte "number", "float", eller mangler
  resolvedType?: string;             // Figma's resolved type
  description?: string;
  codeSyntax?: Record<string, string>;
}
```

### 1.2 Normalized Token (efter preprocessing)
```typescript
interface NormalizedToken {
  // Identitet
  path: string;                      // "colors.primary.500"
  name: string;                      // "colors-primary-500" (CSS-safe)
  
  // Værdi
  value: TokenValue;                 // Normaliseret værdi
  originalValue: unknown;            // Original fra Figma
  
  // Type (DTCG-compliant)
  $type: TokenType;                  // Kanonisk type
  
  // Metadata
  $description?: string;
  mode?: string;                     // "light" | "dark" | etc.
  
  // References
  references?: string[];             // ["{colors.brand.500}"]
  isReference: boolean;
}

// Kanoniske token typer (DTCG spec)
type TokenType = 
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontStyle'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography'
  | 'unknown';

// Normaliserede værdi-typer
type TokenValue = 
  | string
  | number
  | ColorValue
  | DimensionValue
  | ShadowValue
  | ShadowValue[]
  | BorderValue
  | TypographyValue
  | GradientValue
  | TransitionValue;

interface ColorValue {
  hex: string;
  rgb: { r: number; g: number; b: number };
  alpha: number;
}

interface DimensionValue {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%' | 'none';
}

interface ShadowValue {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: ColorValue;
  inset: boolean;
}

interface BorderValue {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: ColorValue;
}

interface TypographyValue {
  fontFamily: string | string[];
  fontSize: number;
  fontWeight: number;
  lineHeight: number | string;
  letterSpacing: number;
  fontStyle?: 'normal' | 'italic';
}
```

### 1.3 Transformed Token (platform-specifik)
```typescript
interface TransformedToken extends NormalizedToken {
  // Platform-specifik output
  transformedValue: string | number | object;
  
  // For CSS-baserede platforme
  cssVariable?: string;              // "--colors-primary-500"
  cssValue?: string;                 // "#3b82f6"
}
```

---

## 2. Preprocessor

### 2.1 Ansvar
1. **Type Resolution** - Bestem kanonisk type for hver token
2. **Value Normalization** - Konverter alle værdier til normaliseret format
3. **Reference Detection** - Find og marker token-referencer
4. **Mode Handling** - Håndter light/dark/etc. modes

### 2.2 Type Resolution Pipeline
```typescript
interface TypeResolver {
  // Prioriteret rækkefølge for type-resolution
  resolve(token: RawFigmaToken): TokenType;
}

class DefaultTypeResolver implements TypeResolver {
  private resolvers: TypeResolutionStrategy[] = [
    new ExplicitTypeResolver(),      // 1. Brug eksplicit type hvis valid
    new ValueShapeResolver(),        // 2. Inferrer fra værdi-struktur
    new PathPatternResolver(),       // 3. Inferrer fra path
    new FallbackResolver(),          // 4. Default til 'unknown'
  ];
  
  resolve(token: RawFigmaToken): TokenType {
    for (const resolver of this.resolvers) {
      const type = resolver.tryResolve(token);
      if (type) return type;
    }
    return 'unknown';
  }
}
```

### 2.3 Type Resolution Strategies

```typescript
// Strategy 1: Eksplicit type (hvis den er i vores kanoniske liste)
class ExplicitTypeResolver implements TypeResolutionStrategy {
  private readonly CANONICAL_TYPES = new Set<TokenType>([
    'color', 'dimension', 'fontFamily', 'fontWeight', 'duration',
    'shadow', 'border', 'typography', 'gradient', 'number', 'cubicBezier'
  ]);
  
  private readonly TYPE_ALIASES: Record<string, TokenType> = {
    // Figma aliases
    'float': 'number',
    'boolean': 'number',
    
    // DTCG aliases
    'fontSize': 'dimension',
    'spacing': 'dimension',
    'sizing': 'dimension',
    'borderRadius': 'dimension',
    'borderWidth': 'dimension',
    'lineHeight': 'number',
    'letterSpacing': 'dimension',
    'paragraphSpacing': 'dimension',
    'fontStyle': 'fontStyle',
    
    // Common variations
    'size': 'dimension',
    'space': 'dimension',
    'radius': 'dimension',
    'opacity': 'number',
    'time': 'duration',
    'animation': 'duration',
    'boxShadow': 'shadow',
    'dropShadow': 'shadow',
    'innerShadow': 'shadow',
  };
  
  tryResolve(token: RawFigmaToken): TokenType | null {
    const rawType = token.type?.toLowerCase();
    if (!rawType) return null;
    
    if (this.CANONICAL_TYPES.has(rawType as TokenType)) {
      return rawType as TokenType;
    }
    
    return this.TYPE_ALIASES[rawType] ?? null;
  }
}

// Strategy 2: Inferrer fra værdi-struktur
class ValueShapeResolver implements TypeResolutionStrategy {
  tryResolve(token: RawFigmaToken): TokenType | null {
    const { value } = token;
    
    // Objekt med r,g,b → color
    if (this.isColorObject(value)) return 'color';
    
    // String der ligner farve → color
    if (this.isColorString(value)) return 'color';
    
    // Objekt med shadow-properties → shadow
    if (this.isShadowObject(value)) return 'shadow';
    
    // Array af shadows → shadow
    if (Array.isArray(value) && value.every(v => this.isShadowObject(v))) {
      return 'shadow';
    }
    
    // Objekt med border-properties → border
    if (this.isBorderObject(value)) return 'border';
    
    // Objekt med typography-properties → typography
    if (this.isTypographyObject(value)) return 'typography';
    
    // String med unit → dimension
    if (this.isDimensionString(value)) return 'dimension';
    
    // String med font-familie → fontFamily
    if (this.isFontFamilyString(value)) return 'fontFamily';
    
    return null;
  }
  
  private isColorObject(v: unknown): boolean {
    return typeof v === 'object' && v !== null && 
           'r' in v && 'g' in v && 'b' in v;
  }
  
  private isColorString(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    return /^#([0-9a-f]{3,8})$/i.test(v) ||
           /^rgba?\(/.test(v) ||
           /^hsla?\(/.test(v);
  }
  
  private isShadowObject(v: unknown): boolean {
    if (typeof v !== 'object' || v === null) return false;
    const keys = Object.keys(v);
    return keys.some(k => ['offsetX', 'offsetY', 'blur', 'spread', 'x', 'y'].includes(k));
  }
  
  private isBorderObject(v: unknown): boolean {
    if (typeof v !== 'object' || v === null) return false;
    const keys = Object.keys(v);
    return keys.includes('width') && (keys.includes('style') || keys.includes('color'));
  }
  
  private isTypographyObject(v: unknown): boolean {
    if (typeof v !== 'object' || v === null) return false;
    const keys = Object.keys(v);
    return keys.includes('fontFamily') || keys.includes('fontSize');
  }
  
  private isDimensionString(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    return /^-?[\d.]+\s*(px|rem|em|%|pt|vh|vw)$/i.test(v);
  }
  
  private isFontFamilyString(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    // Indeholder komma eller kendte font-navne
    return v.includes(',') || 
           /^(sans-serif|serif|monospace|cursive|fantasy)$/i.test(v) ||
           /^['"]/.test(v);
  }
}

// Strategy 3: Path-baseret inference (fallback)
class PathPatternResolver implements TypeResolutionStrategy {
  private readonly PATH_PATTERNS: Array<{ pattern: RegExp; type: TokenType }> = [
    // Colors
    { pattern: /\b(color|colours?|brand|accent|background|foreground|text|border-color|fill|stroke)\b/i, type: 'color' },
    
    // Dimensions
    { pattern: /\b(spacing|space|gap|padding|margin|size|width|height|radius|inset|offset|blur)\b/i, type: 'dimension' },
    
    // Typography
    { pattern: /\b(font-?size|text-?size)\b/i, type: 'dimension' },
    { pattern: /\b(font-?family|typeface)\b/i, type: 'fontFamily' },
    { pattern: /\b(font-?weight|weight)\b/i, type: 'fontWeight' },
    { pattern: /\b(line-?height|leading)\b/i, type: 'number' },
    { pattern: /\b(letter-?spacing|tracking)\b/i, type: 'dimension' },
    { pattern: /\b(typography|type|text-style)\b/i, type: 'typography' },
    
    // Effects
    { pattern: /\b(shadow|elevation|drop-shadow|box-shadow)\b/i, type: 'shadow' },
    { pattern: /\b(border)\b/i, type: 'border' },
    
    // Animation
    { pattern: /\b(duration|delay|timing|animation|transition)\b/i, type: 'duration' },
    { pattern: /\b(easing|ease|bezier)\b/i, type: 'cubicBezier' },
    
    // Other
    { pattern: /\b(opacity|alpha)\b/i, type: 'number' },
    { pattern: /\b(z-?index|layer|order)\b/i, type: 'number' },
  ];
  
  tryResolve(token: RawFigmaToken): TokenType | null {
    const path = token.name.toLowerCase();
    
    for (const { pattern, type } of this.PATH_PATTERNS) {
      if (pattern.test(path)) {
        return type;
      }
    }
    
    return null;
  }
}
```

### 2.4 Value Normalization

```typescript
interface ValueNormalizer {
  normalize(value: unknown, type: TokenType): TokenValue;
}

class DefaultValueNormalizer implements ValueNormalizer {
  normalize(value: unknown, type: TokenType): TokenValue {
    switch (type) {
      case 'color':
        return this.normalizeColor(value);
      case 'dimension':
        return this.normalizeDimension(value);
      case 'shadow':
        return this.normalizeShadow(value);
      case 'border':
        return this.normalizeBorder(value);
      case 'typography':
        return this.normalizeTypography(value);
      case 'fontFamily':
        return this.normalizeFontFamily(value);
      case 'fontWeight':
        return this.normalizeFontWeight(value);
      case 'duration':
        return this.normalizeDuration(value);
      case 'number':
        return this.normalizeNumber(value);
      default:
        return value as TokenValue;
    }
  }
  
  private normalizeColor(value: unknown): ColorValue {
    // Figma object { r: 0-1, g: 0-1, b: 0-1, a?: 0-1 }
    if (typeof value === 'object' && value !== null && 'r' in value) {
      const { r, g, b, a = 1 } = value as any;
      return {
        rgb: { 
          r: Math.round(r * 255), 
          g: Math.round(g * 255), 
          b: Math.round(b * 255) 
        },
        hex: this.rgbToHex(r * 255, g * 255, b * 255),
        alpha: a,
      };
    }
    
    // Hex string
    if (typeof value === 'string') {
      return this.parseColorString(value);
    }
    
    throw new TokenNormalizationError('color', value);
  }
  
  private normalizeDimension(value: unknown): DimensionValue {
    // Number → assume px
    if (typeof value === 'number') {
      return { value, unit: 'px' };
    }
    
    // String med unit
    if (typeof value === 'string') {
      const match = value.match(/^(-?[\d.]+)\s*(px|rem|em|%)?$/i);
      if (match) {
        return {
          value: parseFloat(match[1]),
          unit: (match[2]?.toLowerCase() as any) || 'px',
        };
      }
    }
    
    throw new TokenNormalizationError('dimension', value);
  }
  
  // ... flere normalizers
}
```

---

## 3. Transform System

### 3.1 Transform Registry

```typescript
interface Transform {
  name: string;
  type: 'value' | 'name' | 'attribute';
  
  // Hvilke tokens matcher denne transform?
  filter: TransformFilter;
  
  // Selve transformationen
  transform: TransformFunction;
  
  // Skal transforms kaskade gennem references?
  transitive?: boolean;
}

type TransformFilter = (token: NormalizedToken, options: TransformOptions) => boolean;
type TransformFunction = (token: NormalizedToken, options: TransformOptions) => unknown;

interface TransformOptions {
  platform: Platform;
  basePxFontSize: number;
  useRem: boolean;
}

class TransformRegistry {
  private transforms: Map<string, Transform> = new Map();
  private groups: Map<string, string[]> = new Map();
  
  register(transform: Transform): void {
    this.transforms.set(transform.name, transform);
  }
  
  registerGroup(name: string, transformNames: string[]): void {
    this.groups.set(name, transformNames);
  }
  
  getGroup(name: string): Transform[] {
    const names = this.groups.get(name) || [];
    return names.map(n => this.transforms.get(n)!).filter(Boolean);
  }
}
```

### 3.2 Built-in Transforms

```typescript
// ============================================================================
// VALUE TRANSFORMS
// ============================================================================

const transforms: Transform[] = [
  // ---------------------------------------------------------------------------
  // Color Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'color/css',
    type: 'value',
    filter: (token) => token.$type === 'color',
    transform: (token) => {
      const color = token.value as ColorValue;
      if (color.alpha === 1) {
        return color.hex;
      }
      return `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.alpha})`;
    },
  },
  
  {
    name: 'color/rgb',
    type: 'value',
    filter: (token) => token.$type === 'color',
    transform: (token) => {
      const { rgb } = token.value as ColorValue;
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    },
  },
  
  {
    name: 'color/hsl',
    type: 'value',
    filter: (token) => token.$type === 'color',
    transform: (token) => {
      const color = token.value as ColorValue;
      const hsl = rgbToHsl(color.rgb);
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    },
  },
  
  {
    name: 'color/reactNative',
    type: 'value',
    filter: (token) => token.$type === 'color',
    transform: (token) => {
      const color = token.value as ColorValue;
      // RN supports hex and rgba
      if (color.alpha === 1) {
        return color.hex;
      }
      return `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.alpha})`;
    },
  },
  
  // ---------------------------------------------------------------------------
  // Dimension Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'dimension/px',
    type: 'value',
    filter: (token) => token.$type === 'dimension',
    transform: (token) => {
      const dim = token.value as DimensionValue;
      if (dim.value === 0) return '0';
      return `${dim.value}px`;
    },
  },
  
  {
    name: 'dimension/rem',
    type: 'value',
    filter: (token) => token.$type === 'dimension',
    transform: (token, options) => {
      const dim = token.value as DimensionValue;
      if (dim.value === 0) return '0';
      const remValue = dim.value / options.basePxFontSize;
      return `${round(remValue, 4)}rem`;
    },
  },
  
  {
    name: 'dimension/reactNative',
    type: 'value',
    filter: (token) => token.$type === 'dimension',
    transform: (token) => {
      const dim = token.value as DimensionValue;
      return dim.value;  // Unitless number
    },
  },
  
  // ---------------------------------------------------------------------------
  // Typography Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'fontFamily/css',
    type: 'value',
    filter: (token) => token.$type === 'fontFamily',
    transform: (token) => {
      const value = token.value;
      if (Array.isArray(value)) {
        return value.map(quoteIfNeeded).join(', ');
      }
      if (typeof value === 'string') {
        return value.split(',').map(f => quoteIfNeeded(f.trim())).join(', ');
      }
      return String(value);
    },
  },
  
  {
    name: 'fontFamily/reactNative',
    type: 'value',
    filter: (token) => token.$type === 'fontFamily',
    transform: (token) => {
      const value = token.value;
      // RN only supports single font
      if (Array.isArray(value)) return value[0];
      if (typeof value === 'string') return value.split(',')[0].trim().replace(/['"]/g, '');
      return String(value);
    },
  },
  
  {
    name: 'fontWeight/css',
    type: 'value',
    filter: (token) => token.$type === 'fontWeight',
    transform: (token) => {
      const value = token.value;
      if (typeof value === 'number') return String(value);
      return FONT_WEIGHT_MAP[String(value).toLowerCase()] || value;
    },
  },
  
  // ---------------------------------------------------------------------------
  // Shadow Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'shadow/css',
    type: 'value',
    filter: (token) => token.$type === 'shadow',
    transitive: true,
    transform: (token, options) => {
      const shadows = Array.isArray(token.value) ? token.value : [token.value];
      return shadows.map((s: ShadowValue) => {
        const inset = s.inset ? 'inset ' : '';
        const x = transformDimension(s.offsetX, options);
        const y = transformDimension(s.offsetY, options);
        const blur = transformDimension(s.blur, options);
        const spread = s.spread ? ` ${transformDimension(s.spread, options)}` : '';
        const color = transformColor(s.color);
        return `${inset}${x} ${y} ${blur}${spread} ${color}`;
      }).join(', ');
    },
  },
  
  // ---------------------------------------------------------------------------
  // Duration Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'duration/css',
    type: 'value',
    filter: (token) => token.$type === 'duration',
    transform: (token) => {
      const ms = typeof token.value === 'number' ? token.value : parseFloat(token.value);
      if (ms >= 1000) {
        return `${round(ms / 1000, 2)}s`;
      }
      return `${ms}ms`;
    },
  },
  
  {
    name: 'duration/reactNative',
    type: 'value',
    filter: (token) => token.$type === 'duration',
    transform: (token) => {
      // RN animations use ms as numbers
      return typeof token.value === 'number' ? token.value : parseFloat(token.value);
    },
  },
  
  // ---------------------------------------------------------------------------
  // Number Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'number/css',
    type: 'value',
    filter: (token) => token.$type === 'number',
    transform: (token) => String(round(Number(token.value), 4)),
  },
  
  // ---------------------------------------------------------------------------
  // Name Transforms
  // ---------------------------------------------------------------------------
  {
    name: 'name/kebab',
    type: 'name',
    filter: () => true,
    transform: (token) => token.path.replace(/\./g, '-').toLowerCase(),
  },
  
  {
    name: 'name/camel',
    type: 'name',
    filter: () => true,
    transform: (token) => {
      return token.path
        .split('.')
        .map((part, i) => i === 0 ? part.toLowerCase() : capitalize(part))
        .join('');
    },
  },
  
  {
    name: 'name/pascal',
    type: 'name',
    filter: () => true,
    transform: (token) => {
      return token.path.split('.').map(capitalize).join('');
    },
  },
];
```

### 3.3 Transform Groups

```typescript
const transformGroups = {
  // Web/CSS platforms
  'css': [
    'name/kebab',
    'color/css',
    'dimension/rem',
    'fontFamily/css',
    'fontWeight/css',
    'shadow/css',
    'duration/css',
    'number/css',
  ],
  
  'css/px': [
    'name/kebab',
    'color/css',
    'dimension/px',
    'fontFamily/css',
    'fontWeight/css',
    'shadow/css',
    'duration/css',
    'number/css',
  ],
  
  'scss': [
    'name/kebab',
    'color/css',
    'dimension/rem',
    'fontFamily/css',
    'fontWeight/css',
    'shadow/css',
    'duration/css',
    'number/css',
  ],
  
  'tailwind': [
    'name/kebab',
    'color/css',
    'dimension/rem',
    'fontFamily/css',
    'fontWeight/css',
    'shadow/css',
    'duration/css',
    'number/css',
  ],
  
  // JavaScript
  'js': [
    'name/camel',
    'color/css',
    'dimension/rem',
    'fontFamily/css',
    'fontWeight/css',
    'shadow/css',
    'duration/css',
    'number/css',
  ],
  
  // React Native
  'react-native': [
    'name/camel',
    'color/reactNative',
    'dimension/reactNative',
    'fontFamily/reactNative',
    'fontWeight/css',
    'duration/reactNative',
    'number/css',
  ],
};
```

---

## 4. Formatter System

### 4.1 Formatter Interface

```typescript
interface Formatter {
  name: string;
  
  // Byg output fra transformerede tokens
  format(context: FormatContext): string;
}

interface FormatContext {
  tokens: TransformedToken[];
  allTokens: TransformedToken[];
  modes: string[];
  options: FormatOptions;
  platform: PlatformConfig;
}

interface FormatOptions {
  // Output
  fileHeader?: string | false;
  footer?: string;
  
  // Modes
  defaultMode?: string;
  modeSelectors?: Record<string, string>;  // { dark: '[data-theme="dark"]' }
  
  // References
  outputReferences?: boolean;
  
  // Platform-specific
  [key: string]: unknown;
}
```

### 4.2 Built-in Formatters

```typescript
// ============================================================================
// CSS FORMATTER
// ============================================================================
const cssVariables: Formatter = {
  name: 'css/variables',
  format({ tokens, modes, options }) {
    const lines: string[] = [];
    
    // Header
    if (options.fileHeader !== false) {
      lines.push(options.fileHeader || DEFAULT_HEADER);
    }
    
    // Group by mode
    const byMode = groupByMode(tokens, modes);
    const defaultMode = options.defaultMode || modes[0];
    
    // Default mode in :root
    lines.push(':root {');
    for (const token of byMode.get(defaultMode) || []) {
      const comment = token.$description ? ` /* ${token.$description} */` : '';
      lines.push(`  --${token.name}: ${token.transformedValue};${comment}`);
    }
    lines.push('}');
    
    // Other modes with selectors
    for (const [mode, modeTokens] of byMode) {
      if (mode === defaultMode) continue;
      
      const selector = options.modeSelectors?.[mode] || `[data-mode="${mode}"]`;
      lines.push('');
      lines.push(`${selector} {`);
      for (const token of modeTokens) {
        lines.push(`  --${token.name}: ${token.transformedValue};`);
      }
      lines.push('}');
    }
    
    return lines.join('\n');
  },
};

// ============================================================================
// SCSS FORMATTER
// ============================================================================
const scssVariables: Formatter = {
  name: 'scss/variables',
  format({ tokens, modes, options }) {
    const lines: string[] = [];
    
    lines.push(fileHeader('SCSS Variables'));
    
    const byMode = groupByMode(tokens, modes);
    const defaultMode = options.defaultMode || modes[0];
    
    // Variables
    for (const token of byMode.get(defaultMode) || []) {
      const comment = token.$description ? ` // ${token.$description}` : '';
      lines.push(`$${token.name}: ${token.transformedValue};${comment}`);
    }
    
    // Mode variants with suffix
    for (const [mode, modeTokens] of byMode) {
      if (mode === defaultMode) continue;
      
      lines.push('');
      lines.push(`// ${mode} mode`);
      for (const token of modeTokens) {
        lines.push(`$${token.name}--${mode}: ${token.transformedValue};`);
      }
    }
    
    return lines.join('\n');
  },
};

// ============================================================================
// SCSS WITH CSS VARS FORMATTER
// ============================================================================
const scssWithCssVars: Formatter = {
  name: 'scss/css-vars',
  format({ tokens, modes, options }) {
    const lines: string[] = [];
    
    lines.push(fileHeader('SCSS with CSS Variables'));
    
    // SCSS variables that reference CSS vars
    for (const token of getDefaultModeTokens(tokens, modes, options)) {
      lines.push(`$${token.name}: var(--${token.name});`);
    }
    
    return lines.join('\n');
  },
};

// ============================================================================
// TAILWIND FORMATTER
// ============================================================================
const tailwindConfig: Formatter = {
  name: 'tailwind/config',
  format({ tokens, modes, options }) {
    const defaultTokens = getDefaultModeTokens(tokens, modes, options);
    const theme = buildTailwindTheme(defaultTokens, options);
    
    const config = {
      theme: options.extend !== false 
        ? { extend: theme }
        : theme,
    };
    
    const configStr = JSON.stringify(config, null, 2)
      // Convert arrays to Tailwind format
      .replace(/"(\[.*?\])"/g, '$1');
    
    const exportType = options.esm !== false ? 'export default' : 'module.exports =';
    
    return `/** @type {import('tailwindcss').Config} */
${exportType} ${configStr};`;
  },
};

// ============================================================================
// JAVASCRIPT FORMATTERS
// ============================================================================
const javascriptEsm: Formatter = {
  name: 'javascript/esm',
  format({ tokens, modes, options }) {
    const defaultTokens = getDefaultModeTokens(tokens, modes, options);
    const obj = buildNestedObject(defaultTokens);
    
    return `${fileHeader('JavaScript ES Modules')}

export const tokens = ${JSON.stringify(obj, null, 2)};

export default tokens;`;
  },
};

const typescriptDefinitions: Formatter = {
  name: 'typescript/definitions',
  format({ tokens, modes, options }) {
    const defaultTokens = getDefaultModeTokens(tokens, modes, options);
    const obj = buildNestedObject(defaultTokens);
    
    const typeStr = generateTypeFromObject(obj);
    
    return `${fileHeader('TypeScript Definitions')}

export interface DesignTokens ${typeStr}

export const tokens: DesignTokens;
export default tokens;`;
  },
};

// ============================================================================
// REACT NATIVE FORMATTERS
// ============================================================================
const reactNativeStyleSheet: Formatter = {
  name: 'react-native/stylesheet',
  format({ tokens, modes, options }) {
    const defaultTokens = getDefaultModeTokens(tokens, modes, options);
    
    // Group by category for better organization
    const colors = defaultTokens.filter(t => t.$type === 'color');
    const spacing = defaultTokens.filter(t => t.$type === 'dimension');
    const typography = defaultTokens.filter(t => 
      ['fontFamily', 'fontWeight', 'typography'].includes(t.$type)
    );
    
    return `${fileHeader('React Native StyleSheet')}
import { StyleSheet } from 'react-native';

export const colors = {
${colors.map(t => `  ${t.name}: '${t.transformedValue}',`).join('\n')}
};

export const spacing = {
${spacing.map(t => `  ${t.name}: ${t.transformedValue},`).join('\n')}
};

export const typography = {
${typography.map(t => `  ${t.name}: '${t.transformedValue}',`).join('\n')}
};

export const tokens = { colors, spacing, typography };
export default tokens;`;
  },
};
```

---

## 5. Platform Configuration

### 5.1 Platform Config Interface

```typescript
interface PlatformConfig {
  // Transform group to use
  transformGroup: string;
  
  // Or individual transforms
  transforms?: string[];
  
  // Base settings
  basePxFontSize?: number;      // Default: 16
  
  // Output files
  files: FileConfig[];
}

interface FileConfig {
  destination: string;
  format: string;
  filter?: TokenFilter;
  options?: FormatOptions;
}

type TokenFilter = 
  | ((token: TransformedToken) => boolean)
  | { $type?: TokenType | TokenType[]; path?: string | RegExp };
```

### 5.2 Config Schema

```typescript
interface SynkioConfig {
  // Token sources
  figma?: {
    fileKey: string;
    accessToken?: string;  // Or from env
  };
  
  // Preprocessing
  preprocessors?: PreprocessorConfig[];
  
  // Platform outputs
  platforms: Record<string, PlatformConfig>;
}

// Example config
const config: SynkioConfig = {
  figma: {
    fileKey: 'abc123',
  },
  
  platforms: {
    css: {
      transformGroup: 'css',
      basePxFontSize: 16,
      files: [
        {
          destination: 'tokens/tokens.css',
          format: 'css/variables',
          options: {
            modeSelectors: {
              dark: '[data-theme="dark"]',
              light: '[data-theme="light"]',
            },
          },
        },
      ],
    },
    
    scss: {
      transformGroup: 'scss',
      files: [
        {
          destination: 'tokens/_tokens.scss',
          format: 'scss/variables',
        },
        {
          destination: 'tokens/_tokens-css-vars.scss',
          format: 'scss/css-vars',
        },
      ],
    },
    
    tailwind: {
      transformGroup: 'tailwind',
      files: [
        {
          destination: 'tokens/tailwind.config.js',
          format: 'tailwind/config',
          options: {
            extend: true,
            esm: true,
          },
        },
      ],
    },
    
    js: {
      transformGroup: 'js',
      files: [
        {
          destination: 'tokens/tokens.ts',
          format: 'javascript/esm',
        },
        {
          destination: 'tokens/tokens.d.ts',
          format: 'typescript/definitions',
        },
      ],
    },
    
    reactNative: {
      transformGroup: 'react-native',
      files: [
        {
          destination: 'tokens/tokens.ts',
          format: 'react-native/stylesheet',
        },
      ],
    },
  },
};
```

---

## 6. Pipeline Execution

### 6.1 Build Pipeline

```typescript
class TokenPipeline {
  constructor(
    private preprocessor: Preprocessor,
    private transformRegistry: TransformRegistry,
    private formatterRegistry: FormatterRegistry,
  ) {}
  
  async build(rawTokens: RawFigmaToken[], config: SynkioConfig): Promise<BuildResult> {
    // 1. Preprocess
    const normalizedTokens = await this.preprocessor.process(rawTokens);
    
    // 2. Build each platform
    const outputs: Map<string, FileOutput[]> = new Map();
    
    for (const [platformName, platformConfig] of Object.entries(config.platforms)) {
      // Get transforms for platform
      const transforms = platformConfig.transforms
        ? platformConfig.transforms.map(n => this.transformRegistry.get(n))
        : this.transformRegistry.getGroup(platformConfig.transformGroup);
      
      // Transform tokens
      const transformedTokens = await this.transformTokens(
        normalizedTokens,
        transforms,
        platformConfig,
      );
      
      // Format each file
      const fileOutputs: FileOutput[] = [];
      
      for (const fileConfig of platformConfig.files) {
        // Filter tokens if needed
        const filteredTokens = fileConfig.filter
          ? transformedTokens.filter(this.createFilter(fileConfig.filter))
          : transformedTokens;
        
        // Format
        const formatter = this.formatterRegistry.get(fileConfig.format);
        const content = formatter.format({
          tokens: filteredTokens,
          allTokens: transformedTokens,
          modes: this.getModes(normalizedTokens),
          options: fileConfig.options || {},
          platform: platformConfig,
        });
        
        fileOutputs.push({
          path: fileConfig.destination,
          content,
        });
      }
      
      outputs.set(platformName, fileOutputs);
    }
    
    return { outputs };
  }
  
  private async transformTokens(
    tokens: NormalizedToken[],
    transforms: Transform[],
    config: PlatformConfig,
  ): Promise<TransformedToken[]> {
    const options: TransformOptions = {
      platform: config,
      basePxFontSize: config.basePxFontSize || 16,
      useRem: true,
    };
    
    return tokens.map(token => {
      const result: TransformedToken = { 
        ...token, 
        transformedValue: token.value,
      };
      
      for (const transform of transforms) {
        if (transform.filter(token, options)) {
          if (transform.type === 'value') {
            result.transformedValue = transform.transform(token, options);
          } else if (transform.type === 'name') {
            result.name = transform.transform(token, options) as string;
          }
        }
      }
      
      // Add CSS variable name
      result.cssVariable = `--${result.name}`;
      
      return result;
    });
  }
}
```

---

## 7. Extension Points

### 7.1 Custom Transforms

```typescript
// Bruger kan registrere custom transforms
synkio.registerTransform({
  name: 'custom/brand-color',
  type: 'value',
  filter: (token) => token.path.startsWith('brand.'),
  transform: (token) => {
    // Custom logic
    return `brand-${token.transformedValue}`;
  },
});
```

### 7.2 Custom Formatters

```typescript
// Bruger kan registrere custom formatters
synkio.registerFormatter({
  name: 'custom/json',
  format({ tokens }) {
    return JSON.stringify(tokens, null, 2);
  },
});
```

### 7.3 Custom Type Resolvers

```typescript
// Bruger kan tilføje type resolution strategies
synkio.registerTypeResolver({
  name: 'custom/my-types',
  priority: 10,  // Kør før defaults
  tryResolve(token) {
    if (token.name.includes('my-custom-type')) {
      return 'dimension';
    }
    return null;
  },
});
```

---

## 8. Error Handling

```typescript
class TokenError extends Error {
  constructor(
    message: string,
    public token: RawFigmaToken | NormalizedToken,
    public phase: 'preprocess' | 'transform' | 'format',
  ) {
    super(message);
  }
}

class TokenNormalizationError extends TokenError {
  constructor(expectedType: string, value: unknown) {
    super(
      `Cannot normalize value "${JSON.stringify(value)}" as ${expectedType}`,
      { name: 'unknown', value } as any,
      'preprocess',
    );
  }
}

class TransformError extends TokenError {
  constructor(transform: string, token: NormalizedToken, cause: Error) {
    super(
      `Transform "${transform}" failed for token "${token.path}": ${cause.message}`,
      token,
      'transform',
    );
  }
}
```

---

## 9. Migration Path

### Fra nuværende implementation:

1. **Fase 1**: Tilføj `NormalizedToken` type og preprocessor
   - Bevar eksisterende transforms som fallback
   - Gradvist migrér til ny type-resolution

2. **Fase 2**: Refaktorer transforms til registry-pattern
   - Konverter eksisterende funktioner til Transform-objekter
   - Tilføj filter-funktioner

3. **Fase 3**: Tilføj formatter-system
   - Wrap eksisterende generators i Formatter-interface
   - Tilføj nye formatters

4. **Fase 4**: Ny config-struktur
   - Platform-baseret config
   - Fuld DTCG-support

---

## 10. Sammenligning: Nuværende vs. Ny Arkitektur

| Aspekt | Nuværende | Ny Arkitektur |
|--------|-----------|---------------|
| Type resolution | Hardcodet switch + path inference | Pluggable strategies |
| DTCG support | Nej | Fuld |
| Transform registration | Nej | Ja (registry) |
| Custom transforms | Nej (kræver fork) | Ja (via API) |
| Formatter separation | Delvis (generators) | Fuld (formatters) |
| Error handling | Basic | Struktureret |
| Config | Simpel | Platform-baseret |

---

Denne spec giver jer en robust, udvidelig arkitektur der:
- ✅ Håndterer type-resolution eksplicit og konfigurerbart
- ✅ Separerer transforms (værdi-konvertering) fra formatters (fil-generering)
- ✅ Understøtter DTCG-spec
- ✅ Er udvidelig via registries
- ✅ Har klar fejlhåndtering
- ✅ Kan migreres gradvist fra nuværende implementation
