import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Dev y build escriben en carpetas distintas a propósito: un `pnpm build` en el mismo árbol
// que un `next dev` deja artefactos de producción dentro de .next y el servidor de desarrollo
// empieza a devolver 500 en todas las rutas. Con .next-dev separado se puede compilar sin
// tumbar la preview.
export default function config(phase: string): NextConfig {
  const nextConfig: NextConfig = {
    reactStrictMode: true,
    ...(phase === PHASE_DEVELOPMENT_SERVER ? { distDir: ".next-dev" } : {}),
    // Sin esto Next elige C:\Users\simon como raíz del workspace por el package-lock.json
    // suelto de la carpeta de usuario y avisa en cada build.
    outputFileTracingRoot: __dirname,
    async headers() {
      return [{ source: "/(.*)", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ] }];
    },
    async redirects() {
      return [{ source: "/product/paño-cocina", destination: "/product/pano-cocina", permanent: true }];
    },
  };

  return nextConfig;
}
