/// <reference types="vite/client" />

// Vite ?raw import declarations
declare module '*?raw' {
  const content: string;
  export default content;
}
