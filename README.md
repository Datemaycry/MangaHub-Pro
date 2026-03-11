📚 MangaHub Pro

MangaHub Pro est une application web (PWA) de lecture et de gestion de mangas et bandes dessinées. Conçue pour offrir une expérience premium, immersive et entièrement locale, elle transforme votre navigateur en une véritable bibliothèque virtuelle avec des rendus 3D interactifs.

(Ajoute une capture d'écran ici !)

✨ Fonctionnalités Principales

📖 Lecteur Avancé : Support du sens de lecture Japonais (RTL) ou Classique (LTR). Bascule à la volée entre l'affichage en Page Simple ou Double Page.

🎮 Inspection 3D Interactive : Inspectez vos tomes sous tous les angles avec un rendu 3D dynamique (style Tomb Raider), avec support des jaquettes complètes (wraparound).

🗄️ Étagères Intelligentes : Organisation automatique par Piles / Séries. Personnalisez le matériau de vos étagères (Acajou, Chêne, Métal, Verre) pour un rendu unique.

📦 Importation Rapide : Importez directement vos archives .zip ou .cbz. Un outil de création manuelle avec tri par glisser-déposer est également inclus.

🔒 100% Local & Privé : Aucune base de données cloud, aucun serveur. Vos mangas et votre progression de lecture sont stockés directement dans votre navigateur via IndexedDB.

🎨 Personnalisation & Confort : Plusieurs thèmes de couleurs (Bleu, Rouge, Vert, Violet, Jaune), un mode "Nuit / Confort des yeux" (filtre sépia), et une UI qui s'efface pendant la lecture (Zen Mode).

💾 Sauvegarde & Export : Exportez votre bibliothèque complète (avec progression) au format JSON, ou exportez un tome spécifique en .cbz / .zip.

🛠️ Technologies Utilisées

Ce projet est conçu comme une application "Single File" (ou presque) tournant entièrement côté client :

React 18 (via Babel standalone pour une exécution directe sans build process complexe)

Tailwind CSS (via CDN pour un style rapide et réactif)

IndexedDB (Stockage asynchrone des images et métadonnées en local)

JSZip (Extraction et compression des archives CBZ/ZIP en local)

Mobile Drag & Drop Polyfill (Pour le support du glisser-déposer tactile sur mobile/tablette)

🚀 Installation & Utilisation

Puisque MangaHub Pro est une application 100% front-end, son déploiement est extrêmement simple.

Option 1 : Utilisation Locale Rapide

Clonez ou téléchargez ce dépôt.

Ouvrez simplement le fichier index.html dans votre navigateur web (Chrome, Firefox, Safari, Edge).
(Note : Certains navigateurs stricts nécessitent un serveur local pour faire fonctionner IndexedDB correctement).

Option 2 : Serveur Local (Recommandé)

Pour éviter tout problème lié aux politiques CORS ou de stockage local :

Utilisez une extension comme Live Server sur VS Code.

Ou via Python dans votre terminal :

python -m http.server 8000


Puis ouvrez http://localhost:8000

Option 3 : Déploiement Web

Hébergez gratuitement le fichier index.html sur GitHub Pages, Vercel ou Netlify. L'application fonctionnera parfaitement et pourra être installée en tant que PWA sur vos appareils mobiles.

📱 Support Multi-Écrans

L'application a été pensée pour s'adapter à tous les formats :

Smartphones : Interface optimisée pour le toucher, tiroirs coulissants et vue page simple.

Tablettes : Disposition hybride confortable.

Écrans Ultra-Wide (21:9 / 32:9) : Les étagères fusionnent visuellement pour tirer parti de toute la largeur de l'écran, offrant une vue panoramique sur votre collection.
