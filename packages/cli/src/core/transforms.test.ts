import { describe, test, expect } from 'vitest';
import { 
  transformForCSS, 
  transformColor, 
  transformDimension, 
  transformFontSize,
  transformFontFamily, 
  transformFontWeight,
  transformLineHeight,
  transformLetterSpacing,
  transformDuration,
  transformShadow,
  transformBorder,
  transformNumber,
  inferTypeFromPath
} from './transforms/index.js';

describe('transformForCSS', () => {
  test('routes to correct transform based on type', () => {
    expect(transformForCSS({ value: 16, type: 'dimension' })).toBe('16px');
    expect(transformForCSS({ value: '#ff0000', type: 'color' })).toBe('#ff0000');
    expect(transformForCSS({ value: 400, type: 'fontWeight' })).toBe('400');
  });
  
  test('respects useRem option', () => {
    expect(transformForCSS({ value: 16, type: 'dimension' }, { useRem: true })).toBe('1rem');
    expect(transformForCSS({ value: 32, type: 'fontSize' }, { useRem: true })).toBe('2rem');
  });
  
  test('respects custom basePxFontSize', () => {
    expect(transformForCSS({ value: 20, type: 'dimension' }, { useRem: true, basePxFontSize: 20 })).toBe('1rem');
  });
});

describe('transformColor', () => {
  test('returns string colors as-is', () => {
    expect(transformColor('#ff0000')).toBe('#ff0000');
    expect(transformColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    expect(transformColor('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
  });

  test('converts Figma color objects to hex', () => {
    expect(transformColor({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
    expect(transformColor({ r: 0, g: 1, b: 0, a: 1 })).toBe('#00ff00');
  });

  test('converts Figma color objects with alpha to rgba', () => {
    expect(transformColor({ r: 1, g: 0, b: 0, a: 0.5 })).toBe('rgba(255, 0, 0, 0.5)');
  });

  test('handles normalized Figma values (0-1 range)', () => {
    expect(transformColor({ r: 0.5, g: 0.5, b: 0.5 })).toBe('#808080');
  });
});

describe('transformDimension', () => {
  test('adds px to numbers', () => {
    expect(transformDimension(16)).toBe('16px');
    expect(transformDimension(0)).toBe('0');
  });

  test('converts to rem when useRem is true', () => {
    expect(transformDimension(16, { useRem: true })).toBe('1rem');
    expect(transformDimension(24, { useRem: true })).toBe('1.5rem');
    expect(transformDimension(0, { useRem: true })).toBe('0');
  });

  test('respects custom basePxFontSize', () => {
    expect(transformDimension(20, { useRem: true, basePxFontSize: 20 })).toBe('1rem');
  });

  test('preserves existing units', () => {
    expect(transformDimension('16px')).toBe('16px');
    expect(transformDimension('1rem')).toBe('1rem');
    expect(transformDimension('50%')).toBe('50%');
  });

  test('handles string numbers', () => {
    expect(transformDimension('16')).toBe('16px');
    expect(transformDimension('0')).toBe('0');
  });
});

describe('transformFontSize', () => {
  test('adds px to numbers', () => {
    expect(transformFontSize(14)).toBe('14px');
    expect(transformFontSize(16)).toBe('16px');
  });

  test('converts to rem when useRem is true', () => {
    expect(transformFontSize(16, { useRem: true })).toBe('1rem');
    expect(transformFontSize(14, { useRem: true })).toBe('0.875rem');
  });
});

describe('transformFontFamily', () => {
  test('quotes font names with spaces', () => {
    expect(transformFontFamily('Inter')).toBe('Inter');
    expect(transformFontFamily('Open Sans')).toBe("'Open Sans'");
    expect(transformFontFamily('Helvetica Neue')).toBe("'Helvetica Neue'");
  });

  test('handles arrays', () => {
    expect(transformFontFamily(['Inter', 'sans-serif'])).toBe('Inter, sans-serif');
    expect(transformFontFamily(['Open Sans', 'Helvetica', 'sans-serif'])).toBe("'Open Sans', Helvetica, sans-serif");
  });

  test('handles comma-separated strings', () => {
    expect(transformFontFamily('Inter, sans-serif')).toBe('Inter, sans-serif');
    expect(transformFontFamily('Open Sans, Helvetica')).toBe("'Open Sans', Helvetica");
  });

  test('preserves already-quoted fonts', () => {
    expect(transformFontFamily("'Open Sans'")).toBe("'Open Sans'");
    expect(transformFontFamily('"Open Sans"')).toBe('"Open Sans"');
  });
});

describe('transformFontWeight', () => {
  test('returns numeric weights as strings', () => {
    expect(transformFontWeight(400)).toBe('400');
    expect(transformFontWeight(700)).toBe('700');
  });

  test('converts weight names to numbers', () => {
    expect(transformFontWeight('regular')).toBe('400');
    expect(transformFontWeight('bold')).toBe('700');
    expect(transformFontWeight('light')).toBe('300');
    expect(transformFontWeight('medium')).toBe('500');
    expect(transformFontWeight('semibold')).toBe('600');
    expect(transformFontWeight('black')).toBe('900');
  });

  test('handles case-insensitive and variations', () => {
    expect(transformFontWeight('Regular')).toBe('400');
    expect(transformFontWeight('BOLD')).toBe('700');
    expect(transformFontWeight('Semi Bold')).toBe('600');
    expect(transformFontWeight('extra-light')).toBe('200');
  });
});

describe('transformLineHeight', () => {
  test('returns unitless line heights', () => {
    expect(transformLineHeight(1.5)).toBe('1.5');
    expect(transformLineHeight(1)).toBe('1');
  });

  test('converts percentage to unitless', () => {
    expect(transformLineHeight('150%')).toBe('1.5');
    expect(transformLineHeight('100%')).toBe('1');
    expect(transformLineHeight('120%')).toBe('1.2');
  });

  test('preserves other string values', () => {
    expect(transformLineHeight('normal')).toBe('normal');
    expect(transformLineHeight('1.5em')).toBe('1.5em');
  });
});

describe('transformLetterSpacing', () => {
  test('adds px to numbers', () => {
    expect(transformLetterSpacing(1)).toBe('1px');
    expect(transformLetterSpacing(0)).toBe('0');
  });

  test('converts percentage to em', () => {
    expect(transformLetterSpacing('5%')).toBe('0.05em');
    expect(transformLetterSpacing('10%')).toBe('0.1em');
  });

  test('preserves existing units', () => {
    expect(transformLetterSpacing('0.05em')).toBe('0.05em');
    expect(transformLetterSpacing('1px')).toBe('1px');
  });
});

describe('transformDuration', () => {
  test('adds ms to small numbers', () => {
    expect(transformDuration(200)).toBe('200ms');
    expect(transformDuration(500)).toBe('500ms');
  });

  test('converts large numbers to seconds', () => {
    expect(transformDuration(1000)).toBe('1s');
    expect(transformDuration(2500)).toBe('2.5s');
  });

  test('preserves existing units', () => {
    expect(transformDuration('200ms')).toBe('200ms');
    expect(transformDuration('1s')).toBe('1s');
  });
});

describe('transformShadow', () => {
  test('returns string shadows as-is', () => {
    expect(transformShadow('0 2px 4px rgba(0,0,0,0.1)')).toBe('0 2px 4px rgba(0,0,0,0.1)');
  });

  test('converts shadow objects', () => {
    const shadow = {
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      spread: 0,
      color: '#000000',
    };
    expect(transformShadow(shadow)).toBe('0 2px 4px #000000');
  });

  test('handles inset shadows', () => {
    const shadow = {
      type: 'innerShadow',
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      color: '#000000',
    };
    expect(transformShadow(shadow)).toBe('inset 0 2px 4px #000000');
  });

  test('handles array of shadows', () => {
    const shadows = [
      { offsetX: 0, offsetY: 2, blur: 4, color: '#000000' },
      { offsetX: 0, offsetY: 4, blur: 8, color: '#000000' },
    ];
    expect(transformShadow(shadows)).toContain(',');
  });
});

describe('transformBorder', () => {
  test('returns string borders as-is', () => {
    expect(transformBorder('1px solid black')).toBe('1px solid black');
  });

  test('converts border objects', () => {
    const border = {
      width: 1,
      style: 'solid',
      color: '#000000',
    };
    expect(transformBorder(border)).toBe('1px solid #000000');
  });
});

describe('transformNumber', () => {
  test('returns numbers as strings', () => {
    expect(transformNumber(100)).toBe('100');
    expect(transformNumber(0.5)).toBe('0.5');
  });

  test('handles floating point precision', () => {
    expect(transformNumber(0.333333333)).toBe('0.333');
  });
});

describe('inferTypeFromPath', () => {
  test('returns non-generic types unchanged', () => {
    expect(inferTypeFromPath('color', 'colors.primary.500')).toBe('color');
    expect(inferTypeFromPath('dimension', 'spacing.md')).toBe('dimension');
  });

  test('infers dimension from spacing paths', () => {
    expect(inferTypeFromPath('number', 'spacing.xs')).toBe('dimension');
    expect(inferTypeFromPath('number', 'spacing.md')).toBe('dimension');
    expect(inferTypeFromPath('float', 'space.lg')).toBe('dimension');
  });

  test('infers dimension from size paths', () => {
    // Note: 'size' alone may be ambiguous - width/height are clearer
    expect(inferTypeFromPath('number', 'width.container')).toBe('dimension');
    expect(inferTypeFromPath('number', 'height.header')).toBe('dimension');
    expect(inferTypeFromPath('number', 'gap.md')).toBe('dimension');
  });

  test('infers borderRadius from radius paths', () => {
    expect(inferTypeFromPath('number', 'radius.sm')).toBe('borderRadius');
    expect(inferTypeFromPath('number', 'radius.full')).toBe('borderRadius');
    expect(inferTypeFromPath('number', 'corner.rounded')).toBe('borderRadius');
  });

  test('infers duration from animation paths', () => {
    expect(inferTypeFromPath('number', 'duration.fast')).toBe('duration');
    expect(inferTypeFromPath('number', 'animation.duration')).toBe('duration');
    expect(inferTypeFromPath('number', 'transition.delay')).toBe('duration');
  });

  test('returns original type when no inference possible', () => {
    expect(inferTypeFromPath('number', 'unknown.value')).toBe('number');
    expect(inferTypeFromPath('float', 'random.thing')).toBe('float');
  });

  test('infers opacity from opacity paths', () => {
    expect(inferTypeFromPath('number', 'opacity.50')).toBe('opacity');
    expect(inferTypeFromPath('float', 'alpha.value')).toBe('opacity');
  });

  test('handles missing path', () => {
    expect(inferTypeFromPath('number')).toBe('number');
    expect(inferTypeFromPath('number', undefined)).toBe('number');
  });
});

describe('transformForCSS with path inference', () => {
  test('applies dimension transform when path suggests spacing', () => {
    expect(transformForCSS({ value: 16, type: 'number', path: 'spacing.md' })).toBe('16px');
    expect(transformForCSS({ value: 4, type: 'number', path: 'spacing.xs' })).toBe('4px');
  });

  test('applies dimension transform when path suggests radius', () => {
    expect(transformForCSS({ value: 8, type: 'number', path: 'radius.md' })).toBe('8px');
    expect(transformForCSS({ value: 9999, type: 'number', path: 'radius.full' })).toBe('9999px');
  });

  test('uses rem when configured with path inference', () => {
    expect(transformForCSS({ value: 16, type: 'number', path: 'spacing.md' }, { useRem: true })).toBe('1rem');
  });
});
