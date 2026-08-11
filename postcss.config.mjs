import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}, // <--- Adiciona esta linha para silenciar o erro do Turbopack na Vercel
};

export default withPWA(nextConfig);