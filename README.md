# MangaHub Pro 🔖

MangaHub Pro is a modern, offline-first web application for reading your personal collection of digital mangas and comics. It offers a unique 3D library interface and a highly customizable reading experience, all running directly in your browser.

## 👤 For Users

If you just want to use the application, a detailed user guide is available to help you get started:

➡️ **[Read the User Guide (Français)](./USER_GUIDE.md)**

## ✨ Features

*   **3D Library:** Browse your collection on virtual, customizable shelves.
*   **PWA Ready:** Installable as a Progressive Web App for a native-like experience and offline access.
*   **Offline First:** All your data is stored locally in your browser's IndexedDB. No server, no tracking.
*   **Versatile Importer:** Add new mangas from individual image files or directly from `.zip` and `.cbz` archives.
*   **Advanced Reader:**
    *   Supports both manga (Right-to-Left) and comic (Left-to-Right) reading directions.
    *   Single or double-page display, adapting to your screen orientation.
    *   Multiple ways to turn pages (click, drag, keyboard).
    *   Customizable page turn animations.
*   **Powerful Management:** Organize your library with groups (series), artists, and tags.
*   **Fuzzy Search:** Quickly find what you're looking for, even with typos.
*   **Data Portability:** Easily export and import your entire library for backup and migration.

## 🛠️ Tech Stack

*   **Frontend:** React (with Hooks)
*   **Build Tool:** Vite
*   **Styling:** TailwindCSS
*   **Local Storage:** IndexedDB (via a lightweight wrapper)
*   **Libraries:** Fuse.js (fuzzy search), JSZip (archive handling), React Window (list virtualization).

## 🚀 Getting Started

To run the project locally for development:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mangahub-pro.git
    cd mangahub-pro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173/mangahub-pro/`.

## 📦 Build for Production

To create a production-ready build:

```bash
npm run build
```

The optimized files will be generated in the `dist` folder. You can preview the production build locally with `npm run preview`.
