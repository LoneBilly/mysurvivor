# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

# Synthèse du Projet : Rivalist - Simulation de Survie

## 1. Objectif du Projet

**Rivalist** est un jeu de simulation de survie multijoueur asynchrone sur navigateur. L'objectif est de créer une expérience immersive où les joueurs doivent explorer, collecter des ressources, construire une base, fabriquer des objets et interagir avec d'autres joueurs (commerce, combat) pour devenir le survivant ultime. Le jeu se déroule sur un serveur unique où toutes les actions ont un impact persistant.

## 2. Design & Expérience Utilisateur (UX)

-   **Thème :** Sombre, post-apocalyptique, inspiré des terminaux informatiques de survie.
-   **Interface :** Minimaliste, épurée et fonctionnelle. L'accent est mis sur la clarté de l'information plutôt que sur des graphismes 3D complexes.
-   **Composants UI :** Utilisation intensive de la bibliothèque **shadcn/ui** pour une cohérence visuelle et une maintenabilité accrues. Les modales sont le principal moyen d'interaction pour les actions complexes (inventaire, marché, artisanat, etc.).
-   **Palette de couleurs :** Tons sombres (gris, noir), avec des couleurs d'accentuation pour les informations importantes (jaune pour les crédits, rouge pour la vie, bleu pour l'eau, etc.).
-   **Typographie :** Polices de caractères de type "mono" pour renforcer l'aspect "terminal".

## 3. Stack Technique

-   **Frontend :** React avec TypeScript, Vite comme bundler.
-   **Backend & Base de données :** **Supabase** est utilisé pour toute la partie backend.
    -   **Authentification :** Gestion des utilisateurs (inscription, connexion).
    -   **PostgreSQL Database :** Stockage de toutes les données du jeu (joueurs, inventaires, carte, objets, constructions, etc.).
    -   **Fonctions PostgreSQL (RPC) :** Le cœur de la logique du jeu. Presque toutes les actions du joueur (se déplacer, construire, crafter, combattre) sont gérées par des fonctions SQL sécurisées appelées depuis le client.
    -   **Storage :** Hébergement des icônes et des assets du jeu.
-   **Styling :** Tailwind CSS pour un design "utility-first".
-   **Routing :** React Router pour la navigation entre les pages.

## 4. Structure du Projet

Le code source est organisé de manière modulaire pour faciliter la maintenance et l'évolution.

```
/src
|-- /components/       # Composants React réutilisables
|   |-- /admin/        # Composants spécifiques au panel admin
|   |-- /game/         # Composants spécifiques à l'interface de jeu
|   |-- /ui/           # Composants shadcn/ui
|-- /contexts/         # Contextes React pour la gestion d'état global
|   |-- AuthContext.tsx  # Gère l'authentification et le profil utilisateur
|   |-- GameContext.tsx  # Gère l'état principal du jeu pour le joueur connecté
|-- /hooks/            # Hooks React personnalisés
|-- /integrations/     # Intégrations avec des services tiers
|   |-- /supabase/     # Configuration du client Supabase
|-- /pages/            # Composants de page principaux (une par route)
|   |-- Landing.tsx    # Page d'accueil publique
|   |-- Login.tsx      # Page de connexion/inscription
|   |-- Game.tsx       # Interface principale du jeu
|   |-- Admin.tsx      # Panel d'administration
|-- /types/            # Définitions TypeScript pour les données du jeu
|-- /utils/            # Fonctions utilitaires
|-- App.tsx            # Point d'entrée principal, gestion des routes
|-- main.tsx           # Fichier racine de l'application React
```

## 5. Fonctionnalités Clés

### A. Interface de Jeu (`Game.tsx` & `GameUI.tsx`)

-   **Vue Principale :** Une grille interactive (`GameGrid.tsx`) représentant la carte du monde. Le joueur peut cliquer sur les cases pour se déplacer ou interagir.
-   **Vue de la Base (`BaseInterface.tsx`) :** Une vue détaillée du campement du joueur, où il peut construire, améliorer et interagir avec ses bâtiments.
-   **HUD :**
    -   **Header (`GameHeader.tsx`) :** Affiche les informations de survie (jours survécus) et les accès aux options/classement.
    -   **Footer (`GameFooter.tsx`) :** Affiche les statistiques vitales (vie, faim, soif, énergie) et l'accès à l'inventaire.
-   **Modales d'Interaction :**
    -   `InventoryModal.tsx` : Gestion de l'inventaire et de l'équipement.
    -   `MarketModal.tsx` : Achat et vente d'objets entre joueurs.
    -   `WorkbenchModal.tsx` : Interface d'artisanat.
    -   `ExplorationModal.tsx` : Interface pour explorer une zone et collecter du butin.
    -   Et de nombreuses autres pour chaque bâtiment et interaction spécifique (Banque, Hôtel, Pièges, etc.).

### B. Panel d'Administration (`Admin.tsx`)

Un outil puissant et complet permettant de gérer tous les aspects du jeu sans avoir à toucher directement à la base de données.

-   **Gestion de la Carte :** Éditeur visuel de la carte du monde avec drag-and-drop.
-   **Gestion des Joueurs :** Visualisation, modification des stats, bannissement.
-   **Gestion des Objets & Recettes :** Création et modification des objets et de leurs recettes d'artisanat.
-   **Gestion des Événements :** Configuration des événements aléatoires qui peuvent survenir lors de l'exploration.
-   **Gestion des Bâtiments :** Définition des bâtiments, de leurs niveaux et de leurs coûts d'amélioration.
-   **Gestion des Enchères, du Guide et des Patchnotes.**

### C. Logique du Jeu (Fonctions Supabase)

La logique métier est déportée côté serveur via des fonctions PostgreSQL pour des raisons de sécurité et de performance.

-   `get_full_player_data`: Une fonction centrale qui récupère l'intégralité de l'état d'un joueur en un seul appel.
-   Des fonctions pour chaque action : `move_player`, `start_craft`, `buy_market_item`, `start_building_upgrade`, etc.

