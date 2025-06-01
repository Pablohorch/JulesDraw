document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');

    const CANVAS_WIDTH = 5000;
    const CANVAS_HEIGHT = 5000;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let scale = 1;
    let panX = 0;
    let panY = 0;

    const canvasRect = canvas.getBoundingClientRect();
    panX = (window.innerWidth - CANVAS_WIDTH * scale) / 2;
    panY = (window.innerHeight - CANVAS_HEIGHT * scale) / 2;

    let isPanning = false;
    let lastPanPosition = { x: 0, y: 0 };
    let spacePressed = false;

    const toolbar = document.getElementById('toolbar');
    const brushToolButton = document.getElementById('brush-tool');
    const rectToolButton = document.getElementById('rect-tool');
    const lineToolButton = document.getElementById('line-tool');

    let currentTool = 'brush';
    let isDrawing = false;
    let drawnObjects = [];
    let currentPath = [];
    let startX, startY;

    // --- Persistence Logic ---
    const STORAGE_KEY = 'infiniteWhiteboardDrawing';
    let saveTimeout = null;

    function saveData() {
        if (saveTimeout) {
            clearTimeout(saveTimeout); // Clear any pending timeout
            saveTimeout = null; // Reset timeout state
        }
        try {
            const data = JSON.stringify(drawnObjects);
            localStorage.setItem(STORAGE_KEY, data);
            console.log('Drawing saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    function scheduleSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(saveData, 5000); // Debounced save every 5 seconds
    }

    function loadData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                if (Array.isArray(parsedData)) {
                    drawnObjects = parsedData;
                    console.log('Drawing loaded from localStorage');
                } else {
                    drawnObjects = []; // Reset if data is not an array
                    console.warn('Loaded data was not an array, reset drawing.');
                }
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            drawnObjects = []; // Reset if loading fails
        }
        // applyTransformAndDrawObjects() will be called after this in the initial setup flow
    }

    // --- Tool Switching Logic ---
    function setActiveTool(tool) {
        currentTool = tool;
        console.log("Tool changed to:", currentTool);

        if (brushToolButton) brushToolButton.classList.toggle('active', tool === 'brush');
        if (rectToolButton) rectToolButton.classList.toggle('active', tool === 'rect');
        if (lineToolButton) lineToolButton.classList.toggle('active', tool === 'line');

        switch (tool) {
            case 'brush':
            case 'rect':
            case 'line':
                canvas.style.cursor = 'crosshair';
                break;
            default:
                canvas.style.cursor = 'default';
        }
        if (spacePressed && !isPanning) {
            canvas.style.cursor = 'grab';
        }
    }

    if (brushToolButton) brushToolButton.addEventListener('click', () => setActiveTool('brush'));
    if (rectToolButton) rectToolButton.addEventListener('click', () => setActiveTool('rect'));
    if (lineToolButton) lineToolButton.addEventListener('click', () => setActiveTool('line'));

    function getMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left - panX) / scale,
            y: (event.clientY - rect.top - panY) / scale
        };
    }

    function applyTransformAndDrawObjects(isPreviewing = false, previewPos = null) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        drawnObjects.forEach(obj => {
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = obj.lineWidth / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (obj.type === 'brush') {
                if (obj.path.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(obj.path[0].x, obj.path[0].y);
                for (let i = 1; i < obj.path.length; i++) {
                    ctx.lineTo(obj.path[i].x, obj.path[i].y);
                }
                ctx.stroke();
            } else if (obj.type === 'rect') {
                ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(obj.x1, obj.y1);
                ctx.lineTo(obj.x2, obj.y2);
                ctx.stroke();
            }
        });

        if (isPreviewing && isDrawing && previewPos) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (currentTool === 'brush') {
                if (currentPath.length > 0) {
                     ctx.beginPath();
                     ctx.moveTo(currentPath[0].x, currentPath[0].y);
                     for(let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
                     ctx.lineTo(previewPos.x, previewPos.y);
                     ctx.stroke();
                }
            } else if (currentTool === 'rect') {
                ctx.strokeRect(
                    Math.min(startX, previewPos.x),
                    Math.min(startY, previewPos.y),
                    Math.abs(startX - previewPos.x),
                    Math.abs(startY - previewPos.y)
                );
            } else if (currentTool === 'line') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(previewPos.x, previewPos.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function startPan(event) {
        isPanning = true;
        lastPanPosition = { x: event.clientX, y: event.clientY };
        canvas.style.cursor = 'grabbing';
    }

    function doPan(event) {
        if (!isPanning) return;
        const dx = event.clientX - lastPanPosition.x;
        const dy = event.clientY - lastPanPosition.y;
        panX += dx;
        panY += dy;
        lastPanPosition = { x: event.clientX, y: event.clientY };
        applyTransformAndDrawObjects();
    }

    function endPan() {
        if (!isPanning) return;
        isPanning = false;
        if (spacePressed) {
            canvas.style.cursor = 'grab';
        } else {
            setActiveTool(currentTool);
        }
    }

    function startDrawing(event) {
        if (event.button !== 0 || spacePressed || isPanning) return;
        isDrawing = true;
        const pos = getMousePos(event);
        startX = pos.x;
        startY = pos.y;
        if (currentTool === 'brush') {
            currentPath = [{ x: startX, y: startY }];
        }
    }

    function draw(event) {
        if (!isDrawing || spacePressed || isPanning) return;
        const pos = getMousePos(event);
        if (currentTool === 'brush') {
            currentPath.push({ x: pos.x, y: pos.y });
        }
        applyTransformAndDrawObjects(true, pos);
    }

    // Modified endDrawing to include scheduleSave()
    function endDrawing(event) {
        if (!isDrawing || (event.button !== undefined && event.button !== 0)) return; // Check button if event is a mouse event
        isDrawing = false; // Set isDrawing to false immediately

        // For touchend or other events that might not have `button` property,
        // we rely on isDrawing state primarily.
        // For mouseup, ensure it was the primary button if applicable.

        const pos = getMousePos(event);

        let newObject = null;
        const commonProps = { color: '#000000', lineWidth: 2 };

        if (currentTool === 'brush') {
            if (currentPath.length > 0) { // Path can have one point if it was just a click
                 // Ensure the last point is added if not already
                if (currentPath.length === 1 || currentPath[currentPath.length-1].x !== pos.x || currentPath[currentPath.length-1].y !== pos.y) {
                    currentPath.push({x: pos.x, y: pos.y});
                }
                // Only save if it's more than a single point (actual drag)
                if (currentPath.length > 1) {
                    newObject = { type: 'brush', path: [...currentPath], ...commonProps };
                }
            }
            currentPath = [];
        } else if (currentTool === 'rect') {
            const width = Math.abs(startX - pos.x);
            const height = Math.abs(startY - pos.y);
            if (width > 0 || height > 0) { // Only save if it has dimensions
                newObject = {
                    type: 'rect',
                    x: Math.min(startX, pos.x),
                    y: Math.min(startY, pos.y),
                    width: width,
                    height: height,
                    ...commonProps
                };
            }
        } else if (currentTool === 'line') {
            if (startX !== pos.x || startY !== pos.y) { // Only save if it's not a dot
                 newObject = {
                    type: 'line',
                    x1: startX, y1: startY,
                    x2: pos.x, y2: pos.y,
                    ...commonProps
                };
            }
        }

        if (newObject) {
            drawnObjects.push(newObject);
            scheduleSave(); // Schedule save after adding a new object
        }

        applyTransformAndDrawObjects();
    }

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2 || (event.button === 0 && spacePressed)) {
            startPan(event);
            event.preventDefault();
        } else if (event.button === 0 && !spacePressed) {
            startDrawing(event);
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isPanning) {
            doPan(event);
        } else if (isDrawing) {
            draw(event);
        }
    });

    window.addEventListener('mouseup', (event) => {
        if (isPanning) {
            endPan(event);
        } else if (isDrawing) {
            // Check event.button for mouseup to ensure it's the left button
            if (event.button === 0) {
                endDrawing(event);
            }
        }
    });

    canvas.addEventListener('contextmenu', (event) => {
        if (event.button === 2) {
            event.preventDefault();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        if (event.code === 'Space') {
            if (!spacePressed) {
                spacePressed = true;
                if (!isPanning && !isDrawing) {
                    canvas.style.cursor = 'grab';
                }
                event.preventDefault();
            }
        } else if (event.key === 'b' || event.key === 'B') {
            setActiveTool('brush');
        } else if (event.key === 'r' || event.key === 'R') {
            setActiveTool('rect');
        } else if (event.key === 'l' || event.key === 'L') {
            setActiveTool('line');
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
            spacePressed = false;
            if (!isPanning) {
                setActiveTool(currentTool);
            }
             event.preventDefault();
        }
    });

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        const direction = event.deltaY < 0 ? 1 : -1;
        const currentRect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - currentRect.left;
        const mouseY = event.clientY - currentRect.top;
        const pointX = (mouseX - panX) / scale;
        const pointY = (mouseY - panY) / scale;
        const newScale = Math.max(0.1, Math.min(10, scale + direction * zoomIntensity * scale));
        panX = mouseX - pointX * newScale;
        panY = mouseY - pointY * newScale;
        scale = newScale;
        applyTransformAndDrawObjects();
    }, { passive: false });

    // Save before unload
    window.addEventListener('pagehide', () => {
        saveData(); // Force save, no debounce
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveData(); // Force save
        }
    });

    // --- Initial Load & Setup ---
    loadData(); // Load existing data first
    setActiveTool(currentTool);
    applyTransformAndDrawObjects(); // Then render (loaded or empty)

    // TODO: Implement resizers for rect and line
    // TODO: Pointer events for mobile drawing & two-finger pan/pinch zoom

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});
