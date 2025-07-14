# Consignes

- Tu dois toujours t'assurer que le code que tu écris rend une expérience d'utilisation fluide, sans délais d'affichages ni chargement bloquants visibles.
Tu dois partir d'un point de vue optimiste donc faire toutes les mises à jour d'interface client immédiatement mais toujours t'assurer de faire les vérifications serveur necessaire en fond quand c'est utile pour éviter toute triche de la part des clients.
Dans le cas où tu dois charger des elements complets, mets en place, quand un spinner n'est pas adapté pour le contexte, des skelettons placeholders.
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
