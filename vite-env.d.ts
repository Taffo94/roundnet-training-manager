
// Fix: Removed problematic reference to vite/client and provided manual declarations for ImportMeta 
// to resolve the "Cannot find type definition file" error in environments where the vite package is not fully indexed.
interface ImportMetaEnv {
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const src: string;
  export default src;
}
