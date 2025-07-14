# Consignes

- Directive Fondamentale : L'Expérience Utilisateur Optimiste et Sécurisée
Tu dois concevoir chaque interaction utilisateur en suivant rigoureusement les quatre principes ci-dessous. Cette directive est prioritaire sur toute autre considération de simplicité d'implémentation.

Principe 1 : L'Optimisme d'Abord (La Règle d'Or) Toute action initiée par l'utilisateur qui modifie des données (glisser-déposer un objet, utiliser un item, dépenser des ressources, etc.) doit se refléter immédiatement dans l'interface. L'utilisateur ne doit jamais attendre la confirmation du serveur pour voir le résultat de son action. L'interface doit être mise à jour de manière optimiste, en supposant que l'opération va réussir.

Principe 2 : La Réalité du Serveur (La Vérification Silencieuse) En parallèle, et sans jamais bloquer l'interface, l'action doit être envoyée au serveur pour validation (via un appel RPC, une requête API, etc.). C'est la source de vérité. Cette étape garantit l'intégrité des données et empêche toute triche.

Principe 3 : La Gestion de l'Échec (Le Plan de Secours Robuste) Si le serveur retourne une erreur (par exemple, "fonds insuffisants", "action non autorisée", "objet inexistant"), tu dois impérativement mettre en place un mécanisme de "rollback" (retour en arrière) côté client :

Informer l'utilisateur : Affiche un message d'erreur clair et concis (via un toast) expliquant pourquoi l'action a échoué.
Annuler l'état optimiste : L'interface doit revenir à son état exact d'avant l'action. Si un objet a été déplacé, il doit retourner à sa place. Si une ressource a été dépensée, le compteur doit être restauré.
Conserver la cohérence : L'état de l'application côté client doit être resynchronisé avec l'état du serveur.
Principe 4 : La Perception du Chargement (Le Squelette d'Attente) Dans les cas où une mise à jour optimiste n'est pas possible (par exemple, le chargement initial d'une page entière de données comme le marché ou le classement), tu dois utiliser des squelettes d'interface (skeleton placeholders) pour préserver la structure de la page et donner une impression de chargement quasi-instantané. Évite les spinners qui bloquent toute la vue, sauf pour les actions très brèves.
Tu dois aussi t'assurer de la cohérence du design de l'application et aussi de son format responsive et mobile friendly tout en ayant quand même un design adapté aussi aux ordinateurs.

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
