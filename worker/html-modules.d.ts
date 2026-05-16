// Declares ?raw imports so TypeScript accepts Vite's static asset string import syntax.
// https://vite.dev/guide/assets#importing-a-file-as-string
declare module "*.html?raw" {
  const content: string;
  export default content;
}
