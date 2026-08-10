/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfkit legge i font .afm da disco con __dirname a runtime: se webpack lo
  // impacchetta nel bundle della route, __dirname non punta più alla sua
  // cartella reale in node_modules e i font non si trovano più in produzione
  // (Vercel). Escluderlo dal bundling lo mantiene un require reale a runtime.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
}

export default nextConfig