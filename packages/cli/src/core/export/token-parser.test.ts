import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTokenFile, parseMultiModeFile } from './token-parser.js';

const TEST_DIR = 'test-temp-token-parser';

describe('token-parser', () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('parseTokenFile', () => {
    it('should parse simple DTCG tokens', async () => {
      const content = {
        colors: {
          primary: {
            $value: '#ff0000',
            $type: 'color',
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        path: 'colors.primary',
        value: '#ff0000',
        type: 'color',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should parse nested token structures', async () => {
      const content = {
        colors: {
          brand: {
            primary: {
              500: { $value: '#0066cc', $type: 'color' },
              600: { $value: '#0055aa', $type: 'color' },
            },
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens.map(t => t.path).sort()).toEqual([
        'colors.brand.primary.500',
        'colors.brand.primary.600',
      ]);
    });

    it('should extract variableId from $extensions', async () => {
      const content = {
        colors: {
          primary: {
            $value: '#ff0000',
            $type: 'color',
            $extensions: {
              'com.figma': {
                variableId: 'VariableID:1:31',
              },
            },
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens[0].variableId).toBe('VariableID:1:31');
    });

    it('should extract scopes from $extensions', async () => {
      const content = {
        colors: {
          primary: {
            $value: '#ff0000',
            $type: 'color',
            $extensions: {
              'com.figma': {
                scopes: ['FRAME_FILL', 'SHAPE_FILL'],
              },
            },
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens[0].scopes).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    });

    it('should extract $description', async () => {
      const content = {
        colors: {
          primary: {
            $value: '#ff0000',
            $type: 'color',
            $description: 'Primary brand color',
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens[0].description).toBe('Primary brand color');
    });

    it('should skip $-prefixed keys as groups', async () => {
      const content = {
        $schema: 'https://schemas.design.tokens/1.0.0',
        colors: {
          primary: {
            $value: '#ff0000',
            $type: 'color',
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].path).toBe('colors.primary');
    });

    it('should handle multiple token types', async () => {
      const content = {
        colors: {
          primary: { $value: '#ff0000', $type: 'color' },
        },
        spacing: {
          base: { $value: '8px', $type: 'dimension' },
        },
        typography: {
          weight: { $value: 400, $type: 'fontWeight' },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(3);

      const colorToken = result.tokens.find(t => t.path === 'colors.primary');
      expect(colorToken?.type).toBe('color');

      const spacingToken = result.tokens.find(t => t.path === 'spacing.base');
      expect(spacingToken?.type).toBe('dimension');

      const weightToken = result.tokens.find(t => t.path === 'typography.weight');
      expect(weightToken?.type).toBe('fontWeight');
    });

    it('should handle empty token files', async () => {
      writeFileSync('tokens.json', '{}');

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle tokens with complex values', async () => {
      const content = {
        shadows: {
          md: {
            $value: {
              offsetX: '0px',
              offsetY: '4px',
              blur: '8px',
              spread: '0px',
              color: 'rgba(0,0,0,0.1)',
            },
            $type: 'shadow',
          },
        },
      };
      writeFileSync('tokens.json', JSON.stringify(content));

      const result = await parseTokenFile(resolve('tokens.json'));

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].value).toEqual({
        offsetX: '0px',
        offsetY: '4px',
        blur: '8px',
        spread: '0px',
        color: 'rgba(0,0,0,0.1)',
      });
    });

    it('should throw on malformed JSON', async () => {
      writeFileSync('tokens.json', '{ invalid json }');

      await expect(parseTokenFile(resolve('tokens.json'))).rejects.toThrow();
    });

    it('should handle file not found', async () => {
      await expect(parseTokenFile(resolve('nonexistent.json'))).rejects.toThrow();
    });
  });

  describe('parseMultiModeFile', () => {
    it('should parse multi-mode structure', () => {
      const json = {
        light: {
          colors: {
            bg: { $value: '#ffffff', $type: 'color' },
          },
        },
        dark: {
          colors: {
            bg: { $value: '#000000', $type: 'color' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(2);
      expect(result.get('light')).toHaveLength(1);
      expect(result.get('dark')).toHaveLength(1);
      expect(result.get('light')![0].value).toBe('#ffffff');
      expect(result.get('dark')![0].value).toBe('#000000');
    });

    it('should skip $-prefixed top-level keys', () => {
      const json = {
        $schema: 'https://schemas.design.tokens/1.0.0',
        light: {
          colors: {
            bg: { $value: '#ffffff', $type: 'color' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('$schema')).toBe(false);
      expect(result.get('light')).toHaveLength(1);
    });

    it('should skip top-level token entries', () => {
      const json = {
        // This is a token, not a mode
        standaloneToken: { $value: '#ff0000', $type: 'color' },
        light: {
          colors: {
            bg: { $value: '#ffffff', $type: 'color' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('standaloneToken')).toBe(false);
      expect(result.get('light')).toHaveLength(1);
    });

    it('should skip modes with no tokens', () => {
      const json = {
        light: {
          colors: {
            bg: { $value: '#ffffff', $type: 'color' },
          },
        },
        empty: {
          metadata: { version: '1.0.0' }, // No tokens
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(1);
      expect(result.has('empty')).toBe(false);
    });

    it('should handle nested tokens in modes', () => {
      const json = {
        light: {
          colors: {
            brand: {
              primary: {
                500: { $value: '#0066cc', $type: 'color' },
              },
            },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.get('light')).toHaveLength(1);
      expect(result.get('light')![0].path).toBe('colors.brand.primary.500');
    });

    it('should extract extensions in multi-mode files', () => {
      const json = {
        light: {
          colors: {
            primary: {
              $value: '#ff0000',
              $type: 'color',
              $extensions: {
                'com.figma': {
                  variableId: 'VariableID:1:31',
                },
              },
            },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.get('light')![0].variableId).toBe('VariableID:1:31');
    });

    it('should handle empty object', () => {
      const json = {};

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(0);
    });

    it('should handle multiple modes with multiple tokens each', () => {
      const json = {
        light: {
          colors: {
            bg: { $value: '#ffffff', $type: 'color' },
            fg: { $value: '#000000', $type: 'color' },
          },
          spacing: {
            base: { $value: '8px', $type: 'dimension' },
          },
        },
        dark: {
          colors: {
            bg: { $value: '#000000', $type: 'color' },
            fg: { $value: '#ffffff', $type: 'color' },
          },
          spacing: {
            base: { $value: '8px', $type: 'dimension' },
          },
        },
      };

      const result = parseMultiModeFile(json);

      expect(result.size).toBe(2);
      expect(result.get('light')).toHaveLength(3);
      expect(result.get('dark')).toHaveLength(3);
    });
  });
});
