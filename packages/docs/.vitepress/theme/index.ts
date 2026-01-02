import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './tokens.css'
import './custom.css'

export default {
  extends: DefaultTheme
} satisfies Theme
