import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Só ativa o cache forte no Deploy final
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suas outras configurações do Next ficam aqui, se houver
};

export default withPWA(nextConfig);