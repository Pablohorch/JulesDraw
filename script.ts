// --- Type Definitions ---
interface Point {
    x: number;
    y: number;
    isPotentialDot?: boolean; // For brush strokes during creation
}

interface DrawingObjectBase {
    type: 'brush' | 'rect' | 'line';
    color: string;
    lineWidth: number;
}

interface BrushStroke extends DrawingObjectBase {
    type: 'brush';
    path: Point[];
    isDot?: boolean; // True if the brush stroke is just a single dot
}

interface Rectangle extends DrawingObjectBase {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Line extends DrawingObjectBase {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

type DrawingObject = BrushStroke | Rectangle | Line;
type CanvasState = DrawingObject[]; // Represents an array of drawing objects, used for undo/redo

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('board') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!; // Non-null assertion, as canvas should always exist

    const brushToolButton = document.getElementById('brush-tool') as HTMLButtonElement | null;
    const rectToolButton = document.getElementById('rect-tool') as HTMLButtonElement | null;
    const lineToolButton = document.getElementById('line-tool') as HTMLButtonElement | null;
    const undoButton = document.getElementById('undo-button') as HTMLButtonElement | null;
    const redoButton = document.getElementById('redo-button') as HTMLButtonElement | null;

    // --- Canvas & Drawing State ---
    const CANVAS_WIDTH: number = 5000;
    const CANVAS_HEIGHT: number = 5000;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let scale: number = 1;
    let panX: number = (window.innerWidth - CANVAS_WIDTH * scale) / 2;
    let panY: number = (window.innerHeight - CANVAS_HEIGHT * scale) / 2;

    let isPanning: boolean = false;
    let lastPanPosition: Point = { x: 0, y: 0 };
    let spacePressed: boolean = false;

    type ToolType = 'brush' | 'rect' | 'line';
    let currentTool: ToolType = 'brush';
    let isDrawing: boolean = false;
    let drawnObjects: DrawingObject[] = [];
    let currentPath: Point[] = [];
    let startX: number, startY: number; // Assigned in onPointerDown

    let activePointers: Map<number, PointerEvent> = new Map();
    let initialPointerDistance: number | null = null;
    let lastGesturePanPosition: Point | null = null;
    let isGesturing: boolean = false;

    // --- Undo/Redo State ---
    let undoStack: CanvasState[] = [];
    let redoStack: CanvasState[] = [];
    const MAX_UNDO_STATES: number = 50;

    // --- Persistence State ---
    const STORAGE_KEY: string = 'infiniteWhiteboardDrawing';
    let saveTimeout: number | null = null; // NodeJS.Timeout in Node, number in browser

    // --- UI Update Function ---
    function updateUndoRedoButtonStates(): void {
        if (undoButton) {
            undoButton.disabled = undoStack.length === 0;
        }
        if (redoButton) {
            redoButton.disabled = redoStack.length === 0;
        }
    }

    // --- Undo/Redo Logic ---
    function saveStateForUndo(): void {
        try {
            const currentState: CanvasState = JSON.parse(JSON.stringify(drawnObjects));
            undoStack.push(currentState);

            if (undoStack.length > MAX_UNDO_STATES) {
                undoStack.shift();
            }
            redoStack = [];

            updateUndoRedoButtonStates();
        } catch (e) {
            console.error("Error saving state for undo:", e);
        }
    }

    function handleUndo(): void {
        if (undoStack.length > 0) {
            try {
                redoStack.push(JSON.parse(JSON.stringify(drawnObjects)));
                const previousState = undoStack.pop()!; // Non-null as length > 0
                drawnObjects = JSON.parse(JSON.stringify(previousState));

                applyTransformAndDrawObjects();
                scheduleSave();
                updateUndoRedoButtonStates();
            } catch (e) {
                console.error("Error during undo:", e);
            }
        }
    }

    function handleRedo(): void {
        if (redoStack.length > 0) {
            try {
                undoStack.push(JSON.parse(JSON.stringify(drawnObjects)));
                if (undoStack.length > MAX_UNDO_STATES) {
                    undoStack.shift();
                }
                const nextState = redoStack.pop()!; // Non-null as length > 0
                drawnObjects = JSON.parse(JSON.stringify(nextState));

                applyTransformAndDrawObjects();
                scheduleSave();
                updateUndoRedoButtonStates();
            } catch (e) {
                console.error("Error during redo:", e);
            }
        }
    }

    // --- Persistence Logic ---
    function saveData(): void {
        if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
        try {
            const data = JSON.stringify(drawnObjects);
            localStorage.setItem(STORAGE_KEY, data);
        } catch (error) { console.error('Error saving to localStorage:', error); }
    }
    function scheduleSave(): void {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = window.setTimeout(saveData, 5000);
    }
    function loadData(): void {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsedData: CanvasState = JSON.parse(data); // Assume data is CanvasState
                if (Array.isArray(parsedData)) drawnObjects = parsedData; else drawnObjects = [];
            }
        } catch (error) { console.error('Error loading from localStorage:', error); drawnObjects = []; }
    }

    // --- Tool Switching Logic ---
    function setActiveTool(tool: ToolType): void {
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
    if (undoButton) undoButton.addEventListener('click', handleUndo);
    if (redoButton) redoButton.addEventListener('click', handleRedo);

    // --- Coordinate Helper ---
    function getPointerPos(event: PointerEvent): Point {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left - panX) / scale, y: (event.clientY - rect.top - panY) / scale };
    }

    // --- Rendering Logic ---
    function applyTransformAndDrawObjects(isPreviewing: boolean = false, previewPos: Point | null = null): void {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        drawnObjects.forEach((obj: DrawingObject) => {
            ctx.strokeStyle = obj.color;
            const currentLineWidth = obj.lineWidth / scale;
            ctx.lineWidth = currentLineWidth;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            if (obj.type === 'brush') {
                if (obj.isDot && obj.path.length === 1) {
                    ctx.beginPath();
                    ctx.arc(obj.path[0].x, obj.path[0].y, currentLineWidth / 2, 0, Math.PI * 2);
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

        if (isPreviewing && isDrawing) { // Preview for single-pointer drawing
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
    function getDistanceBetweenPointers(pointersArray: PointerEvent[]): number {
        if (pointersArray.length < 2) return 0;
        const p1 = pointersArray[0]; const p2 = pointersArray[1];
        const dx = p1.clientX - p2.clientX; const dy = p1.clientY - p2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    function getCentroid(pointersArray: PointerEvent[]): Point {
        if (pointersArray.length < 2) return { x: 0, y: 0 }; // Should ideally not be called with < 2
        const p1 = pointersArray[0]; const p2 = pointersArray[1];
        return { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
    }

    // --- Pointer Event Handlers ---
    function onPointerDown(event: PointerEvent): void {
        activePointers.set(event.pointerId, event);
        try { canvas.setPointerCapture(event.pointerId); } catch (e) { console.warn("Failed to capture pointer", e); }


        if (activePointers.size === 2) {
            isGesturing = true;
            isDrawing = false; isPanning = false;
            currentPath = [];

            const pointers = Array.from(activePointers.values());
            initialPointerDistance = getDistanceBetweenPointers(pointers);
            lastGesturePanPosition = getCentroid(pointers);
            setActiveTool(currentTool);
        } else if (activePointers.size === 1 && !isGesturing) {
            const pointerEvent = event; // Already typed as PointerEvent
            if ((pointerEvent.pointerType === 'mouse' && pointerEvent.button === 2) ||
                (spacePressed && pointerEvent.isPrimary)) {
                isPanning = true;
                lastPanPosition = { x: pointerEvent.clientX, y: pointerEvent.clientY };
                setActiveTool(currentTool);
            } else if (((pointerEvent.pointerType === 'mouse' && pointerEvent.button === 0) ||
                       (pointerEvent.pointerType === 'touch' && pointerEvent.isPrimary)) && !spacePressed) {
                isDrawing = true;
                const pos = getPointerPos(pointerEvent);
                startX = pos.x; startY = pos.y; // These are numbers
                if (currentTool === 'brush') {
                    currentPath = [{ x: startX, y: startY, isPotentialDot: true }];
                }
                setActiveTool(currentTool);
            }
        }
    }

    function onPointerMove(event: PointerEvent): void {
        if (!activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, event);

        if (isGesturing && activePointers.size === 2) {
            const pointers = Array.from(activePointers.values());
            const currentCentroid = getCentroid(pointers);
            const canvasRect = canvas.getBoundingClientRect(); // Get fresh rect for calculations

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

    function onPointerUpOrCancel(event: PointerEvent): void {
        if (!activePointers.has(event.pointerId)) return;
        try { canvas.releasePointerCapture(event.pointerId); } catch (e) { console.warn("Failed to release pointer capture", e); }
        activePointers.delete(event.pointerId);

        if (isGesturing) {
            if (activePointers.size < 2) {
                isGesturing = false;
                initialPointerDistance = null;
                lastGesturePanPosition = null;
                setActiveTool(currentTool);
            }
        } else if (isPanning && activePointers.size === 0) { // Was single pointer panning
            isPanning = false;
            setActiveTool(currentTool);
        } else if (isDrawing && activePointers.size === 0) { // Was single pointer drawing
            const pos = getPointerPos(event);
            let newObject: DrawingObject | null = null;
            const commonProps: Pick<DrawingObjectBase, 'color' | 'lineWidth'> = { color: '#000000', lineWidth: 2 };

            if (currentTool === 'brush' && currentPath && currentPath.length > 0) {
                let isActualDot = currentPath.length === 1 && currentPath[0].isPotentialDot === true;
                if (isActualDot) {
                    newObject = { type: 'brush', path: [{ x: startX, y: startY }], isDot: true, ...commonProps };
                } else {
                    // Ensure the last point is added to the path if it moved
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
    canvas.addEventListener('pointerleave', (e: PointerEvent) => { if(e.pointerType === 'mouse') onPointerUpOrCancel(e);});

    canvas.addEventListener('contextmenu', (event: MouseEvent) => { // contextmenu is a MouseEvent
        // Only prevent context menu for actual mouse right-click, not pen right-click which might be different
        if (event.button === 2 && (event.pointerType === 'mouse' || event.pointerType === undefined)) {
             event.preventDefault();
        }
    });

    // --- Keyboard Event Listeners ---
    window.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

        if (event.code === 'Space') {
            if (!spacePressed) { spacePressed = true; setActiveTool(currentTool); event.preventDefault(); }
        } else if (event.key === 'b' || event.key === 'B') {
            setActiveTool('brush');
        } else if (event.key === 'r' || event.key === 'R') {
            setActiveTool('rect');
        } else if (event.key === 'l' || event.key === 'L') {
            setActiveTool('line');
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault(); handleUndo();
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault(); handleRedo();
        } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'Z' || event.key === 'z')) {
             event.preventDefault(); handleRedo();
        }
    });
    window.addEventListener('keyup', (event: KeyboardEvent) => {
        if (event.code === 'Space') {
            spacePressed = false; setActiveTool(currentTool); event.preventDefault();
        }
    });

    canvas.addEventListener('wheel', (event: WheelEvent) => {
        event.preventDefault();
        const zoomIntensity: number = 0.1; const direction: number = event.deltaY < 0 ? 1 : -1;
        const currentRect = canvas.getBoundingClientRect();
        const mouseX: number = event.clientX - currentRect.left; const mouseY: number = event.clientY - currentRect.top;
        const pointX: number = (mouseX - panX) / scale; const pointY: number = (mouseY - panY) / scale;
        let newScale: number = scale * (1 + direction * zoomIntensity);
        newScale = Math.max(0.1, Math.min(4, newScale));
        panX = mouseX - pointX * newScale; panY = mouseY - pointY * newScale;
        scale = newScale;
        applyTransformAndDrawObjects();
    }, { passive: false });

    window.addEventListener('pagehide', saveData as EventListener); // Cast if needed, or ensure saveData matches
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveData(); });

    // --- Initial Load & Setup ---
    loadData();
    setActiveTool(currentTool);
    applyTransformAndDrawObjects();
    saveStateForUndo();
    updateUndoRedoButtonStates();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js') // Changed path
                .then(reg => console.log('ServiceWorker registration successful with scope: ', reg.scope))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }
});
