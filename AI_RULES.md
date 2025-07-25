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

## 6. Description détaillée des fichiers `/src`

### Fichiers racines de `/src`

-   **`App.tsx`**: Composant principal qui configure le routeur (`react-router-dom`) et encapsule l'application avec les fournisseurs de contexte (`AuthProvider`). C'est ici que les routes publiques, privées et d'administration sont définies.
-   **`main.tsx`**: Point d'entrée de l'application. Il rend le composant `App` dans le DOM et configure le `QueryClientProvider` pour TanStack Query.
-   **`globals.css` & `index.css`**: Fichiers CSS globaux. Ils contiennent les directives Tailwind CSS, les variables de thème (couleurs, radius, etc.) et quelques styles de base.
-   **`vite-env.d.ts`**: Fichier de déclaration de types pour TypeScript, spécifique à l'environnement Vite.

### `/src/components`

Contient tous les composants React réutilisables.

-   **Modales d'interaction principales :**
    -   `InventoryModal.tsx`: Affiche l'inventaire du joueur, son équipement et gère les interactions de glisser-déposer.
    -   `MarketModal.tsx`: Interface complète pour le marché, avec des onglets pour acheter et gérer ses propres ventes.
    -   `ExplorationModal.tsx`: Gère le processus d'exploration d'une zone, de l'affichage du butin potentiel au résultat de l'exploration.
    -   `BaseInterface.tsx`: N'est pas une modale, mais l'interface principale de la vue "base", affichant la grille de construction du joueur.
    -   `WorkbenchModal.tsx`, `ChestModal.tsx`, `CampfireModal.tsx`, etc. : Modales spécifiques pour interagir avec chaque type de bâtiment.
-   **Composants de l'interface de jeu :**
    -   `GameHeader.tsx`: La barre supérieure de l'interface de jeu.
    -   `GameFooter.tsx`: La barre inférieure affichant les statistiques vitales.
    -   `GameGrid.tsx`: La grille de la carte du monde interactive.
-   **Composants utilitaires :**
    -   `ActionModal.tsx`: Modale générique pour les confirmations d'action.
    -   `PrivateRoute.tsx`, `AdminRoute.tsx`, `PublicRoute.tsx`: Composants d'ordre supérieur (HOC) pour protéger les routes.
    -   `ItemIcon.tsx`, `DynamicIcon.tsx`: Composants pour afficher dynamiquement des icônes.
-   **`/admin`**: Contient tous les composants utilisés exclusivement dans le panel d'administration (`/pages/Admin.tsx`). Chaque composant gère une facette du jeu (joueurs, carte, objets, etc.).
-   **`/game`**:
    -   `GameUI.tsx`: Le composant qui assemble toutes les parties de l'interface de jeu (Header, Grid, Footer, Modales).
-   **`/ui`**: Contient les composants de la bibliothèque `shadcn/ui`. **NE PAS MODIFIER CES FICHIERS.**

### `/src/contexts`

Gère l'état global de l'application.

-   **`AuthContext.tsx`**: Gère l'état de l'utilisateur (connecté ou non), sa session, son rôle ('admin' ou 'player'), et son statut de bannissement. Il gère également les redirections automatiques (par exemple, vers `/create-profile` si le pseudo n'est pas défini).
-   **`GameContext.tsx`**: Le cœur de la gestion de l'état en jeu. Il contient toutes les données du joueur (`playerData`), la carte, la liste des objets, etc. Il fournit des fonctions pour rafraîchir ces données de manière ciblée (`refreshPlayerData`, `refreshResources`, etc.).

### `/src/hooks`

Contient les hooks React personnalisés pour encapsuler des logiques complexes.

-   **`useWorkbench.ts`**: Un hook complexe qui contient toute la logique de l'établi (matching de recettes, gestion du craft, etc.).
-   **`useDebounce.ts`**: Hook utilitaire pour "débouncer" une valeur (attendre la fin de la saisie avant de déclencher une action).
-   **`useIsMobile.ts`**: Détecte si l'utilisateur est sur un appareil mobile.

### `/src/integrations/supabase`

-   **`client.ts`**: Fichier crucial qui initialise et exporte le client Supabase. C'est ce client qui est utilisé partout dans l'application pour communiquer avec le backend.

### `/src/pages`

Chaque fichier correspond à une page (une route) de l'application.

-   **`Landing.tsx`**: La page d'accueil publique du jeu.
-   **`Login.tsx`**: La page de connexion et d'inscription.
-   **`CreateProfile.tsx`**: La page où un nouvel utilisateur doit choisir son pseudonyme.
-   **`Game.tsx`**: La page principale du jeu. Son rôle est de charger toutes les données initiales nécessaires (`playerData`, `mapLayout`, `items`) et de les fournir au `GameContext` qui encapsule `GameUI.tsx`.
-   **`Admin.tsx`**: La page du panel d'administration, qui utilise un système d'onglets pour naviguer entre les différents gestionnaires.
-   **`NotFound.tsx`**: La page 404.

### `/src/types`

Contient les définitions de types TypeScript.

-   **`game.ts`**: Contient les interfaces pour toutes les structures de données du jeu (ex: `FullPlayerData`, `InventoryItem`, `BaseConstruction`).
-   **`admin.ts`**: Contient les types spécifiques au panel d'administration.

### `/src/utils`

Contient des fonctions utilitaires globales.

-   **`toast.tsx`**: Fonctions d'aide pour afficher des notifications (succès, erreur, info) en utilisant la bibliothèque `sonner`.
-   **`imageUrls.ts`**: Fonction pour construire l'URL publique des icônes stockées dans Supabase Storage.
-   **`preloadImages.ts`**: Fonction pour précharger des images afin d'améliorer la fluidité de l'interface.