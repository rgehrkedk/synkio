import StyleDictionary from 'style-dictionary';

// Custom format for CSS custom properties
StyleDictionary.registerFormat({
  name: 'css/variables',
  format: function({ dictionary, file, options }) {
    const { selector = ':root' } = options;

    const formatValue = (token) => {
      let value = token.$value ?? token.value;

      // Handle references
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        const refPath = value.slice(1, -1).replace(/\./g, '-');
        return `var(--${refPath})`;
      }

      return value;
    };

    const tokens = dictionary.allTokens.map(token => {
      const name = token.path.join('-');
      const value = formatValue(token);
      return `  --${name}: ${value};`;
    }).join('\n');

    return `${selector} {\n${tokens}\n}\n`;
  }
});

export default {
  source: ['tokens/base/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            selector: ':root'
          }
        }
      ]
    }
  },
  // Include theme files
  include: ['tokens/themes/**/*.json'],
  hooks: {
    parsers: {
      'dtcg-parser': {
        pattern: /\.json$/,
        parser: ({ contents }) => {
          const parsed = JSON.parse(contents);

          // Transform DTCG format to Style Dictionary format
          const transformTokens = (obj, path = []) => {
            const result = {};

            for (const [key, value] of Object.entries(obj)) {
              if (value && typeof value === 'object') {
                if ('$value' in value) {
                  // This is a token
                  result[key] = {
                    value: value.$value,
                    type: value.$type,
                    path: [...path, key]
                  };
                } else {
                  // This is a group
                  result[key] = transformTokens(value, [...path, key]);
                }
              }
            }

            return result;
          };

          return transformTokens(parsed);
        }
      }
    }
  }
};
