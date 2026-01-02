# Using Style Dictionary

Synkio outputs standard DTCG-format JSON files that can be consumed by Style Dictionary or any other token build tool.

## Setup

### 1. Install Style Dictionary

```bash
npm install style-dictionary --save-dev
```

### 2. Create Config

Create `sd.config.js`:

```js
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/',
      files: [{
        destination: '_tokens.scss',
        format: 'scss/variables'
      }]
    }
  }
}
```

### 3. Add npm Script

```json
{
  "scripts": {
    "build:tokens": "style-dictionary build --config sd.config.js"
  }
}
```

### 4. Configure Synkio

```json
{
  "build": {
    "script": "npm run build:tokens"
  }
}
```

Now when you run `synkio build`, it will:

1. Read `baseline.json`
2. Write DTCG JSON files to `tokens/`
3. Run Style Dictionary
4. Output CSS/SCSS to `dist/`

## Multi-Platform Output

```js
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [{
        destination: '_tokens.scss',
        format: 'scss/variables'
      }]
    },
    ios: {
      transformGroup: 'ios',
      buildPath: 'dist/ios/',
      files: [{
        destination: 'Tokens.swift',
        format: 'ios-swift/class.swift'
      }]
    },
    android: {
      transformGroup: 'android',
      buildPath: 'dist/android/',
      files: [{
        destination: 'tokens.xml',
        format: 'android/resources'
      }]
    }
  }
}
```

## Custom Transforms

Handle DTCG format references:

```js
import StyleDictionary from 'style-dictionary'

StyleDictionary.registerTransform({
  name: 'dtcg/value',
  type: 'value',
  transitive: true,
  filter: (token) => token.$value !== undefined,
  transform: (token) => token.$value
})

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transforms: ['dtcg/value', 'name/kebab'],
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables'
      }]
    }
  }
}
```

## Theme Modes

Handle multiple modes (light/dark):

```js
export default {
  source: ['tokens/primitives.json'],
  platforms: {
    'css-light': {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens-light.css',
        format: 'css/variables',
        filter: (token) => token.filePath.includes('light')
      }]
    },
    'css-dark': {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens-dark.css',
        format: 'css/variables',
        filter: (token) => token.filePath.includes('dark')
      }]
    }
  }
}
```

## TypeScript Output

Generate TypeScript constants:

```js
StyleDictionary.registerFormat({
  name: 'typescript/constants',
  format: ({ dictionary }) => {
    const tokens = dictionary.allTokens
      .map(token => `export const ${token.name} = '${token.$value}';`)
      .join('\n')
    return tokens
  }
})

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    typescript: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.ts',
        format: 'typescript/constants'
      }]
    }
  }
}
```

## Resources

- [Style Dictionary Documentation](https://styledictionary.com/)
- [DTCG Format Specification](https://design-tokens.github.io/community-group/format/)
