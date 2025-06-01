# Infinite Whiteboard

A simple infinite whiteboard application created with HTML, CSS, and pure JavaScript. This project allows users to draw, create shapes, and pan/zoom on a large canvas. Drawings are persisted in `localStorage`.

## Features

*   **Infinite Canvas**: A large 5000x5000 pixel canvas.
*   **Panning**:
    *   Right mouse button + drag.
    *   Spacebar + left mouse button + drag.
    *   (Mobile: Two-finger drag - *planned for future enhancement*).
*   **Zooming**:
    *   Mouse wheel.
    *   Zoom ranges from 10% to 400%.
    *   Zooming is centered on the mouse cursor position.
    *   (Mobile: Pinch to zoom - *planned for future enhancement*).
*   **Drawing Tools**:
    *   **Brush**: Freehand drawing.
    *   **Rectangle**: Draw rectangles (no fill, black border).
    *   **Line**: Draw straight lines.
*   **Toolbar**:
    *   Floating toolbar at the bottom of the screen.
    *   Buttons to select tools.
    *   Responsive design for desktop and mobile.
*   **Persistence**:
    *   Drawings are automatically saved to the browser's `localStorage`.
    *   Work is restored when the page is reloaded.
*   **Responsive Design**:
    *   Toolbar adjusts for mobile screens.
    *   Canvas interactions are designed for mouse input (mobile touch drawing improvements are planned).

## How to Use

1.  Clone this repository or download the files.
2.  Open `index.html` in your web browser.

## Keyboard Shortcuts

*   **B**: Select Brush tool
*   **R**: Select Rectangle tool
*   **L**: Select Line tool
*   **Spacebar** (hold) + Left Mouse Drag: Pan the canvas

## Mobile Compatibility

This application is designed to work on mobile devices and supports touch interactions for drawing, panning, and zooming.

-   **Drawing**: Use a single finger to draw with the selected tool.
-   **Panning**: Use two fingers to drag and pan the canvas.
-   **Zooming**: Use a two-finger pinch gesture to zoom in or out.

For the best experience, a browser that supports the **Pointer Events API** is recommended. Most modern mobile browsers (Chrome for Android, Safari on iOS) have good support for Pointer Events. Basic touch interactions might also work on browsers that only support standard Touch Events, but Pointer Events provide a more unified and robust input model.

## Deployment (GitHub Pages)

This project can be easily deployed using GitHub Pages:

1.  Ensure all project files (`index.html`, `style.css`, `script.js`, `README.md`, `.nojekyll`) are in the main branch (e.g., `main` or `feature/whiteboard` if that's your primary development branch before merging).
2.  Create a branch named `gh-pages`.
3.  Copy all the root files from your main development branch to the `gh-pages` branch.
    ```bash
    # Example commands assuming 'main' is your development branch
    git checkout gh-pages
    git checkout main -- index.html style.css script.js README.md .nojekyll sw.js # Add sw.js if implemented
    git add .
    git commit -m "deploy: static site for gh-pages"
    git push origin gh-pages
    ```
4.  Go to your repository's Settings -> Pages.
5.  Under "Build and deployment", select `gh-pages` as the branch and `/ (root)` as the folder.
6.  Your site should be live shortly at `https://<username>.github.io/<repository-name>/`.

## Future Enhancements

This section outlines potential improvements, new features, and technology considerations for future development of the Infinite Whiteboard.

### Core Feature Enhancements
*   **Object Manipulation**:
    *   **Resizing Handles**: Implement intuitive resizing handles for rectangles, lines, and potentially other shapes.
    *   **Rotation Handles**: Allow rotation of selected objects.
    *   **Selection Tool**: A robust selection tool to select one or multiple objects, enabling:
        *   Moving selected objects.
        *   Deleting selected objects.
        *   Grouping/Ungrouping objects.
        *   Copy/Paste or Duplicate objects.
    *   **Layering (Z-index)**: Functionality to bring objects forward or send them backward.
*   **Drawing Tools & Options**:
    *   **Eraser Tool**: Implement an eraser tool (object-based or pixel-based).
    *   **Text Tool**: Allow adding and editing text elements on the canvas.
    *   **More Shapes**: Add tools for circles, ellipses, triangles, arrows, etc.
    *   **Color Picker**: A more advanced color picker for stroke and fill colors (where applicable).
    *   **Line Width Selector**: Allow users to choose from various line thicknesses.
    *   **Fill Options**: For shapes like rectangles and circles, allow fill colors and patterns.
    *   **Snapping**: Grid snapping or object snapping for precise alignment.
*   **Canvas & UX Improvements**:
    *   **Minimap**: For easier navigation on a large canvas.
    *   **Undo/Redo Functionality**: Essential for any drawing application.
    *   **Export Options**:
        *   Export drawing as PNG or JPEG.
        *   Export drawing as SVG for scalable vector graphics.
        *   Export board data as JSON (for backup or sharing).
    *   **Import Board Data**: Allow importing a previously exported JSON board.
    *   **Performance Optimization**: For very large numbers of objects, investigate techniques like canvas layering, offscreen rendering, or WebGL for rendering.
    *   **Accessibility (a11y)**: Improve keyboard navigation, ARIA attributes, and screen reader support.
    *   **Customizable Grid**: Allow users to show/hide a background grid and customize its appearance.

### Technology & Architecture
*   **State Management**: For more complex features, consider a dedicated state management library (e.g., Redux, Zustand, or a custom solution) instead of simple global variables.
*   **Component-Based Architecture**: If the UI becomes more complex (e.g., modal dialogs, advanced toolbars), refactoring using a component-based approach (even with vanilla JS using Web Components or a simple custom framework) could be beneficial.
*   **Build System**: Introduce a build system (e.g., Vite, Parcel, or Webpack) for:
    *   JavaScript module bundling.
    *   CSS preprocessing (Sass/SCSS, PostCSS).
    *   Minification for production builds.
    *   Development server with hot module replacement (HMR).
*   **Testing Framework**: Introduce a testing framework (e.g., Jest, Vitest, Playwright) for:
    *   Unit tests for core logic (drawing calculations, state changes).
    *   End-to-end tests for user interactions.
*   **TypeScript Migration**: Consider migrating to TypeScript for improved code quality, maintainability, and developer experience through static typing.
*   **Backend & Collaboration (Major Evolution)**:
    *   **Real-time Collaboration**: Using WebSockets (e.g., Socket.io) or WebRTC to allow multiple users to draw on the same board simultaneously. This would require a backend server.
    *   **Cloud Storage**: Saving boards to a cloud database instead of just `localStorage`.
    *   **User Accounts**: For managing saved boards and collaboration.

### Mobile-Specific Enhancements
*   **Refined Touch Gestures**: Further optimize touch interactions, potentially handling edge cases like very quick gestures or transitions between single and multi-touch more gracefully.
*   **Haptic Feedback**: For certain actions on mobile.
*   **Progressive Web App (PWA) Enhancements**:
    *   More robust offline capabilities beyond basic static caching (e.g., offline storage for multiple boards).
    *   Add to Home Screen functionality.
    *   Push notifications (if applicable for collaborative features).

This list provides a roadmap for evolving the Infinite Whiteboard into an even more powerful and versatile tool.
