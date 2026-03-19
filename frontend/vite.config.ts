import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: "stats.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    minify: "esbuild",
    cssCodeSplit: true, // 拆分CSS为单独文件
    cssTarget: ["chrome90", "safari15"],
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
            "tailwindcss-animate",
          ],
          "ai-vendor": ["ai", "@ai-sdk/react"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "three-vendor": ["three", "@react-three/fiber", "@react-three/drei"],
          "chart-vendor": ["d3"],
          "animation-vendor": ["framer-motion"],
          "markdown-vendor": ["react-markdown", "react-syntax-highlighter"],
          "router-vendor": ["react-router-dom"],
          "lucide-vendor": ["lucide-react"],
        },
      },
    },
  },
});
