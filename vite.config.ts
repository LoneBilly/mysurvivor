import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::", // Garde cette configuration pour permettre l'accès externe
    port: 8080, // Votre port actuel
    // --- C'est la ligne importante à ajouter ! ---
    fs: {
      allow: [
        '.', // Ceci autorise l'accès aux fichiers du répertoire de votre projet
        '8c1aec6d1cc6.ngrok-free.app' // C'est ici que vous ajoutez l'hôte ngrok spécifique
      ]
    }
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));