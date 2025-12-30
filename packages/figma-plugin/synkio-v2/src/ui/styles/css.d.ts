// Type declarations for CSS imports (esbuild css loader)
declare module '*.css' {
  const content: string;
  export default content;
}
