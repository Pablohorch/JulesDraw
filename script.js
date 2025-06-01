document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');

    // --- DOM Elements ---
    const brushToolButton = document.getElementById('brush-tool');
    const rectToolButton = document.getElementById('rect-tool');
    const lineToolButton = document.getElementById('line-tool');
    const undoButton = document.getElementById('undo-button'); // Added
    const redoButton = document.getElementById('redo-button'); // Added

    // --- Canvas & Drawing State ---
    const CANVAS_WIDTH = 5000;
    const CANVAS_HEIGHT = 5000;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let scale = 1;
    let panX = (window.innerWidth - CANVAS_WIDTH * scale) / 2;
    let panY = (window.innerHeight - CANVAS_HEIGHT * scale) / 2;

    let isPanning = false;
    let lastPanPosition = { x: 0, y: 0 };
    let spacePressed = false;

    let currentTool = 'brush';
    let isDrawing = false;
    let drawnObjects = [];
    let currentPath = [];
    let startX, startY;

    let activePointers = new Map();
    let initialPointerDistance = null;
    let lastGesturePanPosition = null;
    let isGesturing = false;

    // --- Undo/Redo State ---
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO_STATES = 50;

    // --- Persistence State ---
    const STORAGE_KEY = 'infiniteWhiteboardDrawing';
    let saveTimeout = null;

    // --- UI Update Function ---
    function updateUndoRedoButtonStates() {
        if (undoButton) {
            undoButton.disabled = undoStack.length === 0;
        }
        if (redoButton) {
            redoButton.disabled = redoStack.length === 0;
        }
        // console.log("Button states updated. Undo enabled:", !(undoStack.length === 0), "Redo enabled:", !(redoStack.length === 0));
    }

    // --- Undo/Redo Logic ---
    function saveStateForUndo() {
        try {
            const currentState = JSON.parse(JSON.stringify(drawnObjects));
            undoStack.push(currentState);

            if (undoStack.length > MAX_UNDO_STATES) {
                undoStack.shift();
            }
            redoStack = [];

            updateUndoRedoButtonStates();
            // console.log('State saved for undo. Undo:', undoStack.length, 'Redo:', redoStack.length);
        } catch (e) {
            console.error("Error saving state for undo:", e);
        }
    }

    function handleUndo() {
        if (undoStack.length > 0) {
            try {
                redoStack.push(JSON.parse(JSON.stringify(drawnObjects)));
                const previousState = undoStack.pop();
                drawnObjects = JSON.parse(JSON.stringify(previousState));

                applyTransformAndDrawObjects();
                scheduleSave();
                updateUndoRedoButtonStates();
                // console.log('Undo applied. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length);
            } catch (e) {
                console.error("Error during undo:", e);
            }
        } else {
            // console.log('Undo stack empty.');
        }
    }

    function handleRedo() {
        if (redoStack.length > 0) {
            try {
                undoStack.push(JSON.parse(JSON.stringify(drawnObjects)));
                if (undoStack.length > MAX_UNDO_STATES) {
                    undoStack.shift();
                }
                const nextState = redoStack.pop();
                drawnObjects = JSON.parse(JSON.stringify(nextState));

                applyTransformAndDrawObjects();
                scheduleSave();
                updateUndoRedoButtonStates();
                // console.log('Redo applied. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length);
            } catch (e) {
                console.error("Error during redo:", e);
            }
        } else {
            // console.log('Redo stack empty.');
        }
    }

    // --- Persistence Logic ---
    function saveData() {
        if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
        try {
            const data = JSON.stringify(drawnObjects);
            localStorage.setItem(STORAGE_KEY, data);
        } catch (error) { console.error('Error saving to localStorage:', error); }
    }
    function scheduleSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveData, 5000);
    }
    function loadData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                if (Array.isArray(parsedData)) drawnObjects = parsedData; else drawnObjects = [];
            }
        } catch (error) { console.error('Error loading from localStorage:', error); drawnObjects = []; }
    }

    // --- Tool Switching Logic ---
    function setActiveTool(tool) {
        currentTool = tool;
        if (brushToolButton) brushToolButton.classList.toggle('active', tool === 'brush');
        if (rectToolButton) rectToolButton.classList.toggle('active', tool === 'rect');
        if (lineToolButton) lineToolButton.classList.toggle('active', tool === 'line');

        if (isGesturing) { canvas.style.cursor = 'move'; }
        else if (spacePressed && !isPanning) { canvas.style.cursor = 'grab'; }
        else if (isPanning) { canvas.style.cursor = 'grabbing'; }
        else {
            switch (tool) {
                case 'brush': case 'rect': case 'line': canvas.style.cursor = 'crosshair'; break;
                default: canvas.style.cursor = 'default';
            }
        }
    }

    // --- Toolbar Button Event Listeners ---
    if (brushToolButton) brushToolButton.addEventListener('click', () => setActiveTool('brush'));
    if (rectToolButton) rectToolButton.addEventListener('click', () => setActiveTool('rect'));
    if (lineToolButton) lineToolButton.addEventListener('click', () => setActiveTool('line'));

    if (undoButton) { // Added
        undoButton.addEventListener('click', () => {
            handleUndo();
        });
    }
    if (redoButton) { // Added
        redoButton.addEventListener('click', () => {
            handleRedo();
        });
    }

    // --- Coordinate Helper ---
    function getPointerPos(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left - panX) / scale, y: (event.clientY - rect.top - panY) / scale };
    }

    // --- Rendering Logic ---
    function applyTransformAndDrawObjects(isPreviewing = false, previewPos = null) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        drawnObjects.forEach(obj => {
            ctx.strokeStyle = obj.color;
            const lineWidth = obj.lineWidth / scale;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            if (obj.type === 'brush') {
                if (obj.isDot && obj.path.length === 1) {
                    ctx.beginPath();
                    ctx.arc(obj.path[0].x, obj.path[0].y, lineWidth / 2, 0, Math.PI * 2);
                    ctx.fillStyle = obj.color;
                    ctx.fill();
                    return;
                }
                if (obj.path.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(obj.path[0].x, obj.path[0].y);
                for (let i = 1; i < obj.path.length; i++) ctx.lineTo(obj.path[i].x, obj.path[i].y);
                ctx.stroke();
            } else if (obj.type === 'rect') {
                ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2);
                ctx.stroke();
            }
        });

        if (isPreviewing && isDrawing) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 / scale;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            if (currentTool === 'brush' && currentPath.length > 0) {
                ctx.beginPath();
                ctx.moveTo(currentPath[0].x, currentPath[0].y);
                for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
                ctx.stroke();
            } else if (currentTool === 'rect' && previewPos) {
                ctx.strokeRect(Math.min(startX, previewPos.x), Math.min(startY, previewPos.y),
                               Math.abs(startX - previewPos.x), Math.abs(startY - previewPos.y));
            } else if (currentTool === 'line' && previewPos) {
                ctx.beginPath();
                ctx.moveTo(startX, startY); ctx.lineTo(previewPos.x, previewPos.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // --- Gesture Helper Functions ---
    function getDistanceBetweenPointers(pointersArray) {
        if (pointersArray.length < 2) return 0;
        const p1 = pointersArray[0]; const p2 = pointersArray[1];
        const dx = p1.clientX - p2.clientX; const dy = p1.clientY - p2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    function getCentroid(pointersArray) {
        if (pointersArray.length < 2) return { x: 0, y: 0 };
        const p1 = pointersArray[0]; const p2 = pointersArray[1];
        return { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
    }

    // --- Pointer Event Handlers ---
    function onPointerDown(event) {
        activePointers.set(event.pointerId, event);
        try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }

        if (activePointers.size === 2) {
            isGesturing = true;
            isDrawing = false; isPanning = false;
            currentPath = [];

            const pointers = Array.from(activePointers.values());
            initialPointerDistance = getDistanceBetweenPointers(pointers);
            lastGesturePanPosition = getCentroid(pointers);
            setActiveTool(currentTool);
        } else if (activePointers.size === 1 && !isGesturing) {
            const pointerEvent = event;
            if ((pointerEvent.pointerType === 'mouse' && pointerEvent.button === 2) ||
                (spacePressed && pointerEvent.isPrimary)) {
                isPanning = true;
                lastPanPosition = { x: pointerEvent.clientX, y: pointerEvent.clientY };
                setActiveTool(currentTool);
            } else if (((pointerEvent.pointerType === 'mouse' && pointerEvent.button === 0) ||
                       (pointerEvent.pointerType === 'touch' && pointerEvent.isPrimary)) && !spacePressed) {
                isDrawing = true;
                const pos = getPointerPos(pointerEvent);
                startX = pos.x; startY = pos.y;
                if (currentTool === 'brush') {
                    currentPath = [{ x: startX, y: startY, isPotentialDot: true }];
                }
                setActiveTool(currentTool);
            }
        }
    }

    function onPointerMove(event) {
        if (!activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, event);

        if (isGesturing && activePointers.size === 2) {
            const pointers = Array.from(activePointers.values());
            const currentCentroid = getCentroid(pointers);
            const canvasRect = canvas.getBoundingClientRect();

            if (lastGesturePanPosition) {
                const dxPan = currentCentroid.x - lastGesturePanPosition.x;
                const dyPan = currentCentroid.y - lastGesturePanPosition.y;
                panX += dxPan; panY += dyPan;
            }

            const currentDistance = getDistanceBetweenPointers(pointers);
            if (initialPointerDistance && initialPointerDistance > 0) {
                const scaleFactor = currentDistance / initialPointerDistance;
                let newScale = scale * scaleFactor;
                newScale = Math.max(0.1, Math.min(4, newScale));

                const zoomPointX = (currentCentroid.x - canvasRect.left - panX) / scale;
                const zoomPointY = (currentCentroid.y - canvasRect.top - panY) / scale;

                panX = (currentCentroid.x - canvasRect.left) - zoomPointX * newScale;
                panY = (currentCentroid.y - canvasRect.top) - zoomPointY * newScale;
                scale = newScale;
            }

            lastGesturePanPosition = currentCentroid;
            initialPointerDistance = currentDistance;

            applyTransformAndDrawObjects();
        } else if (isPanning && activePointers.size === 1) {
            const pointerEvent = Array.from(activePointers.values())[0];
            const dx = pointerEvent.clientX - lastPanPosition.x;
            const dy = pointerEvent.clientY - lastPanPosition.y;
            panX += dx; panY += dy;
            lastPanPosition = { x: pointerEvent.clientX, y: pointerEvent.clientY };
            applyTransformAndDrawObjects();
        } else if (isDrawing && activePointers.size === 1) {
            const pointerEvent = Array.from(activePointers.values())[0];
            const pos = getPointerPos(pointerEvent);
            if (currentTool === 'brush' && currentPath.length > 0) {
                if(currentPath[0].isPotentialDot) delete currentPath[0].isPotentialDot;
                currentPath.push(pos);
            }
            applyTransformAndDrawObjects(true, pos);
        }
    }

    function onPointerUpOrCancel(event) {
        if (!activePointers.has(event.pointerId)) return;
        try { canvas.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
        activePointers.delete(event.pointerId);

        if (isGesturing) {
            if (activePointers.size < 2) {
                isGesturing = false;
                initialPointerDistance = null;
                lastGesturePanPosition = null;
                setActiveTool(currentTool);
            }
        } else if (isPanning && activePointers.size === 0) {
            isPanning = false;
            setActiveTool(currentTool);
        } else if (isDrawing && activePointers.size === 0) {
            const pos = getPointerPos(event);
            let newObject = null;
            const commonProps = { color: '#000000', lineWidth: 2 };

            if (currentTool === 'brush' && currentPath && currentPath.length > 0) {
                let isDot = currentPath.length === 1 && currentPath[0].isPotentialDot;
                if (isDot) {
                    newObject = { type: 'brush', path: [{ x: startX, y: startY }], isDot: true, ...commonProps };
                } else {
                    if (currentPath.length === 1 && (currentPath[0].x !== pos.x || currentPath[0].y !== pos.y)) {
                         currentPath.push(pos);
                    } else if (currentPath.length > 1 && (currentPath[currentPath.length-1].x !== pos.x || currentPath[currentPath.length-1].y !== pos.y) ) {
                         currentPath.push(pos);
                    }
                    if (currentPath.length >=1 ) {
                       newObject = { type: 'brush', path: [...currentPath], isDot: false, ...commonProps };
                    }
                }
            } else if (currentTool === 'rect') {
                const width = Math.abs(startX - pos.x); const height = Math.abs(startY - pos.y);
                if (width > 0 || height > 0) newObject = { type: 'rect', x: Math.min(startX, pos.x), y: Math.min(startY, pos.y), width, height, ...commonProps };
            } else if (currentTool === 'line') {
                if (startX !== pos.x || startY !== pos.y) newObject = { type: 'line', x1: startX, y1: startY, x2: pos.x, y2: pos.y, ...commonProps };
            }

            if (newObject) {
                saveStateForUndo();
                drawnObjects.push(newObject);
                scheduleSave();
            }
            isDrawing = false; currentPath = [];
            applyTransformAndDrawObjects();
            setActiveTool(currentTool);
        }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUpOrCancel);
    canvas.addEventListener('pointercancel', onPointerUpOrCancel);
    canvas.addEventListener('pointerleave', (e) => { if(e.pointerType === 'mouse') onPointerUpOrCancel(e);});

    canvas.addEventListener('contextmenu', (event) => {
        if (event.pointerType === 'mouse' && event.button === 2) event.preventDefault();
    });

    // --- Keyboard Event Listeners ---
    window.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        if (event.code === 'Space') {
            if (!spacePressed) { spacePressed = true; setActiveTool(currentTool); event.preventDefault(); }
        } else if (event.key === 'b' || event.key === 'B') {
            setActiveTool('brush');
        } else if (event.key === 'r' || event.key === 'R') {
            setActiveTool('rect');
        } else if (event.key === 'l' || event.key === 'L') {
            setActiveTool('line');
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) { // Ctrl+Z or Cmd+Z
            event.preventDefault();
            handleUndo();
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') { // Ctrl+Y or Cmd+Y
            event.preventDefault();
            handleRedo();
        } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'Z' || event.key === 'z')) { // Ctrl+Shift+Z or Cmd+Shift+Z
             event.preventDefault();
             handleRedo();
        }
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
            spacePressed = false; setActiveTool(currentTool); event.preventDefault();
        }
    });

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1; const direction = event.deltaY < 0 ? 1 : -1;
        const currentRect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - currentRect.left; const mouseY = event.clientY - currentRect.top;
        const pointX = (mouseX - panX) / scale; const pointY = (mouseY - panY) / scale;
        let newScale = scale * (1 + direction * zoomIntensity);
        newScale = Math.max(0.1, Math.min(4, newScale));
        panX = mouseX - pointX * newScale; panY = mouseY - pointY * newScale;
        scale = newScale;
        applyTransformAndDrawObjects();
    }, { passive: false });

    window.addEventListener('pagehide', saveData);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveData(); });

    // --- Initial Load & Setup ---
    loadData();
    setActiveTool(currentTool);
    applyTransformAndDrawObjects();
    saveStateForUndo(); // Save initial state for undo
    updateUndoRedoButtonStates(); // Set initial button states

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        });
    }
});
