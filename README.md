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

## Future Enhancements (TODO)

*   Implement resizing handles for rectangles and lines.
*   Full Pointer Events support for mobile:
    *   Two-finger pan.
    *   Pinch to zoom.
    *   Touch drawing.
*   Eraser tool.
*   Selection tool (select, move, delete objects).
*   Color picker and line width selector.
*   Export drawing as image (PNG/SVG).
*   Service Worker for offline caching (optional step in original plan).
