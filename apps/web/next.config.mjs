/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: gera HTML/CSS/JS em apps/web/out/
  // Servido pela API NestJS via ServeStaticModule em produção.
  // Limitação: sem SSR, sem API Routes do Next.js, sem ISR.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
