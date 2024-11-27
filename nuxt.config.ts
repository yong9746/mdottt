// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    injectPosition: 0,
    viewer: true,
  },
  ssr: false, // Enable server-side rendering for static generation
  target: 'static', // Set the target to static
  nitro: {
    compressPublicAssets: true,
    preset: 'netlify',
  },
  experimental: {
    compatibilityDate: '2024-03-19', // Set to today's date
  },
  app: {
    baseURL: '/', // Ensure this is set for Netlify
  },
});
