import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::", // Permet l'accès externe
    port: 8080, // Port de développement

    // Autorisation d'accès aux fichiers du projet
    fs: {
      allow: ['.']
    },

    // Autorisation d'un hôte spécifique (à remplacer par ton sous-domaine ngrok actuel)
    allowedHosts: ['df4fa5b77365.ngrok-free.app'],
  },
  plugins: [
    dyadComponentTagger(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
