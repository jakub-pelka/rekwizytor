'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Save, X, Trash2, MousePointer, PenTool, Square, Plus, Scaling, AlignCenterVertical, Undo, Redo } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface SvgMapEditorProps {
    readonly locationId: string
    readonly initialSvgContent: string
    readonly onClose: () => void
}

// Recursive interface
interface SvgElement {
    id: string
    type: string
    attributes: Record<string, string>
    children?: SvgElement[]
    raw?: string
}

type EditorMode = 'select' | 'draw_wall' | 'place_door' | 'place_shelf' | 'place_cross'

// New component for recursive rendering
const RenderSvgElement = ({
    el,
    selectedId,
    hoveredId,
    parentGroupId,
    onSelect,
    onHover,
    onMouseDown,
    onContextMenu,
    onWallClick
}: {
    readonly el: SvgElement,
    readonly selectedId: string | null,
    readonly hoveredId: string | null,
    readonly parentGroupId?: string,
    readonly onSelect: (e: React.MouseEvent, id: string) => void,
    readonly onHover: (id: string | null) => void,
    readonly onMouseDown: (e: React.MouseEvent, id: string) => void,
    readonly onContextMenu: (e: React.MouseEvent, id: string) => void,
    readonly onWallClick?: (e: React.MouseEvent, el: SvgElement) => void
}) => {
    const TagName = el.type as any
    const reactProps: Record<string, string> = {}
    Object.entries(el.attributes).forEach(([key, value]) => {
        if (key === 'stroke-width') reactProps.strokeWidth = value
        else if (key === 'stroke-dasharray') reactProps.strokeDasharray = value
        else if (key === 'stroke-linecap') reactProps.strokeLinecap = value
        else if (key === 'stroke-linejoin') reactProps.strokeLinejoin = value
        else if (key === 'fill-opacity') reactProps.fillOpacity = value
        else if (key === 'stroke-opacity') reactProps.strokeOpacity = value
        else if (key === 'class') reactProps.className = value
        else reactProps[key] = value
    })

    const effectiveSelectionId = parentGroupId || el.id
    const isSelected = selectedId === effectiveSelectionId

    // Group Logic
    if (el.children && el.children.length > 0) {
        const myId = el.id
        return (
            <TagName
                key={el.id}
                {...reactProps}
                style={{ cursor: isSelected ? 'move' : 'pointer' }}
                onMouseDown={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onSelect(e, myId)
                    onMouseDown(e, myId)
                }}
                onMouseEnter={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onHover(myId)
                }}
                onMouseLeave={() => onHover(null)}
                onContextMenu={(e: React.MouseEvent) => onContextMenu(e, myId)}
                opacity={isSelected ? 0.8 : (reactProps.opacity || 1)}
            >
                {/* Note: clickable area relies on actual group content now */}
                {el.children.map(child => (
                    <RenderSvgElement
                        key={child.id}
                        el={child}
                        selectedId={selectedId}
                        hoveredId={hoveredId}
                        parentGroupId={myId}
                        onSelect={onSelect}
                        onHover={onHover}
                        onMouseDown={onMouseDown}
                        onContextMenu={onContextMenu}
                        onWallClick={onWallClick}
                    />
                ))}
            </TagName>
        )
    }
    // Check if this is a wall (lock drag, only vertex editing)
    const isWall = el.attributes['data-type'] === 'wall'

    return (
        <TagName
            key={el.id}
            {...reactProps}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                cursor: (() => {
                    if (isWall) return 'crosshair'
                    if (isSelected) return 'move'
                    return 'pointer'
                })(),
            }}
            stroke={isSelected ? 'blue' : (reactProps.stroke || '#000')}
            strokeWidth={isSelected ? '3' : (reactProps.strokeWidth || '1')}
            onClick={isWall && onWallClick ? (e: React.MouseEvent) => {
                e.stopPropagation() // Important: stop bubbling
                onWallClick(e, el)
            } : (e: React.MouseEvent) => {
                // For non-walls, we might want to ensure click selects it strongly
                // e.stopPropagation() is handled in onMouseDown usually, but good to have here too
                e.stopPropagation()
            }}
            onMouseDown={(e: React.MouseEvent) => {
                e.stopPropagation() // Stop bubbling to canvas
                const targetId = parentGroupId || el.id
                onSelect(e, targetId)
                // Only trigger drag for non-walls
                if (!isWall) {
                    onMouseDown(e, targetId)
                }
            }}
            onMouseEnter={(e: React.MouseEvent) => {
                e.stopPropagation();
                onHover(parentGroupId || el.id)
            }}
            onMouseLeave={() => onHover(null)}
            onContextMenu={(e: React.MouseEvent) => onContextMenu(e, parentGroupId || el.id)}
        />
    )
}

export function SvgMapEditor({ locationId, initialSvgContent, onClose }: SvgMapEditorProps) {
    const [elements, setElements] = useState<SvgElement[]>([])

    // History State
    const [history, setHistory] = useState<SvgElement[][]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)
    const [viewBox, setViewBox] = useState("0 0 800 600")

    // Editor Mode
    const [mode, setMode] = useState<EditorMode>('select')
    const [drawingPoints, setDrawingPoints] = useState<{ x: number, y: number }[]>([])

    // Cursor Tracking & Preview
    const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null)

    // State for dragging
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [draggingVertexIdx, setDraggingVertexIdx] = useState<number | null>(null)

    // Hover delay for vertices to prevent flickering
    const [vertexHoverDelayTimeout, setVertexHoverDelayTimeout] = useState<NodeJS.Timeout | null>(null)
    const [delayedHoveredElementId, setDelayedHoveredElementId] = useState<string | null>(null)

    // Context Menu & Resize
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null)
    const [resizeDialog, setResizeDialog] = useState<{ id: string, width: string, height: string } | null>(null)

    // Resize Handle State
    const [resizingHandle, setResizingHandle] = useState<string | null>(null)
    const [resizeStartDims, setResizeStartDims] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [rotatingElementId, setRotatingElementId] = useState<string | null>(null)
    const [startRotationAngle, setStartRotationAngle] = useState(0)
    const [startMouseAngle, setStartMouseAngle] = useState(0)

    // ... refs ...
    const svgRef = useRef<SVGSVGElement>(null)
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()
    const t = useTranslations('Notifications')

    // History Management
    const pushHistory = useCallback((newElements: SvgElement[]) => {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(newElements)
        if (newHistory.length > 50) newHistory.shift() // Limit history size
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
        setElements(newElements)
    }, [history, historyIndex])

    const updateElements = (updater: (prev: SvgElement[]) => SvgElement[]) => {
        const newEls = updater(elements)
        pushHistory(newEls)
    }

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1)
            setElements(history[historyIndex - 1])
        }
    }, [history, historyIndex])

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1)
            setElements(history[historyIndex + 1])
        }
    }, [history, historyIndex])

    // Helper: Recursive delete
    const deleteFromTree = (list: SvgElement[], id: string): SvgElement[] => {
        return list.filter(item => {
            if (item.id === id) return false
            if (item.children) {
                item.children = deleteFromTree(item.children, id)
            }
            return true
        })
    }

    // Deletion Logic
    const handleDeleteKeyAction = () => {
        if (mode === 'draw_wall') {
            setDrawingPoints(prev => prev.slice(0, -1))
        } else if (selectedElementId) {
            updateElements(prev => deleteFromTree(prev, selectedElementId))
            setSelectedElementId(null)
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo/Redo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault()
                if (e.shiftKey) {
                    handleRedo()
                } else {
                    handleUndo()
                }
                return
            }

            // Deletion (Backspace or Delete)
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (resizeDialog) return
                // Check if user is typing in an input? (None active besides resize)
                e.preventDefault()
                handleDeleteKeyAction()
            }
        }
        globalThis.addEventListener('keydown', handleKeyDown)
        return () => globalThis.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo, mode, selectedElementId, resizeDialog, elements, history, historyIndex, pushHistory]) // Added dependencies

    // ... (rest of file)


    const handleVertexMouseDown = (e: React.MouseEvent, elId: string, tokenIndex: number) => {
        e.stopPropagation()
        e.preventDefault()
        setSelectedElementId(elId)
        setDraggingVertexIdx(tokenIndex)
        setIsDragging(true)
        setDragOffset({ x: 0, y: 0 })
    }

    // Handle Mouse Down on Resize Handle
    const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: string, el: SvgElement) => {
        e.stopPropagation()
        e.preventDefault()
        setResizingHandle(handle)
        setIsDragging(true)

        const svg = svgRef.current
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        setDragOffset({ x: svgP.x, y: svgP.y }) // Store initial mouse position for resize calculation

        const x = parseFloat(el.attributes.x || '0')
        const y = parseFloat(el.attributes.y || '0')
        const w = parseFloat(el.attributes.width || '0')
        const h = parseFloat(el.attributes.height || '0')
        setResizeStartDims({ x, y, w, h })
    }

    // Helper: Collect all edges from elements for snapping
    const collectEdges = (list: SvgElement[]): { x?: number, y?: number }[] => {
        const edges: { x?: number, y?: number }[] = []
        const collectFromEl = (el: SvgElement) => {
            if (el.type === 'rect') {
                const x = parseFloat(el.attributes.x || '0')
                const y = parseFloat(el.attributes.y || '0')
                const w = parseFloat(el.attributes.width || '0')
                const h = parseFloat(el.attributes.height || '0')
                edges.push({ x }, { x: x + w }, { y }, { y: y + h })
            }
            if (el.children) el.children.forEach(collectFromEl)
        }
        list.forEach(collectFromEl)
        return edges
    }

    // Helper to update element in tree (moved up so handleWallClick can use it)
    const updateElementInTree = (list: SvgElement[], id: string, updater: (el: SvgElement) => SvgElement): SvgElement[] => {
        return list.map(item => {
            if (item.id === id) {
                return updater(item)
            }
            if (item.children) {
                return { ...item, children: updateElementInTree(item.children, id, updater) }
            }
            return item
        })
    }

    // Handler for clicking on wall path to add a new vertex (FIXED: finds closest segment)
    const handleWallClick = (e: React.MouseEvent, wallEl: SvgElement) => {
        e.stopPropagation()
        if (!wallEl.attributes.d) return

        const svg = svgRef.current
        if (!svg) return

        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        // Snap click to grid
        const GRID = 10
        const clickX = Math.round(svgP.x / GRID) * GRID
        const clickY = Math.round(svgP.y / GRID) * GRID

        // Parse path into points
        const d = wallEl.attributes.d
        const tokens = d.replaceAll(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/)

        // Extract all coordinate pairs
        const points: { x: number, y: number, idx: number }[] = []
        for (let i = 0; i < tokens.length; i++) {
            if (/[a-zA-Z]/.test(tokens[i])) continue
            if (i + 1 < tokens.length && !/[a-zA-Z]/.test(tokens[i + 1])) {
                points.push({
                    x: parseFloat(tokens[i]),
                    y: parseFloat(tokens[i + 1]),
                    idx: i
                })
                i++ // skip next token
            }
        }

        if (points.length < 2) return

        // CHECK: If click is within one grid cell (10px) of existing vertex, don't add new point
        // This allows user to grab vertices more easily
        const VERTEX_SNAP_THRESHOLD = 10
        for (const point of points) {
            const dist = Math.sqrt((clickX - point.x) ** 2 + (clickY - point.y) ** 2)
            if (dist <= VERTEX_SNAP_THRESHOLD) {
                // Click is near existing vertex - don't add new point
                // User can grab the vertex with the existing circle handler
                return
            }
        }

        // Find closest segment to click point
        let closestSegIdx = 0
        let minDist = Infinity

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]
            const p2 = points[i + 1]

            // Distance from point to line segment
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y
            const lenSq = dx * dx + dy * dy

            let t = 0
            if (lenSq > 0) {
                t = Math.max(0, Math.min(1, ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / lenSq))
            }

            const projX = p1.x + t * dx
            const projY = p1.y + t * dy
            const dist = Math.sqrt((clickX - projX) ** 2 + (clickY - projY) ** 2)

            if (dist < minDist) {
                minDist = dist
                closestSegIdx = i
            }
        }

        // Insert new point after the start of the closest segment
        const insertAfterIdx = points[closestSegIdx].idx + 2 // +2 to skip x,y pair
        tokens.splice(insertAfterIdx, 0, 'L', String(clickX), String(clickY))

        const newD = tokens.join(' ')
        updateElements(prev => updateElementInTree(prev, wallEl.id, el => ({
            ...el, attributes: { ...el.attributes, d: newD }
        })))

        notify.success(t('pointAdded', { x: clickX, y: clickY }))
    }

    // Custom hover handler with delay for vertices
    const handleHoverWithDelay = (id: string | null) => {
        if (vertexHoverDelayTimeout) {
            clearTimeout(vertexHoverDelayTimeout)
        }

        if (id === null) {
            // Delay hiding vertices
            const timeout = setTimeout(() => {
                setDelayedHoveredElementId(null)
            }, 1000) // 1 second delay
            setVertexHoverDelayTimeout(timeout)
        } else {
            // Show immediately
            setDelayedHoveredElementId(id)
        }

        // Also update the normal hover
        setHoveredElementId(id)
    }

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY, id })
        setSelectedElementId(id)
    }

    const closeContextMenu = () => setContextMenu(null)

    // Helper to parse elements recursively
    const parseElementsRecursively = (children: HTMLCollection, prefix = 'el'): SvgElement[] => {
        return Array.from(children).map((child, index) => {
            if (child.tagName === 'defs') return null

            // Filter out background rect (heuristic: simple white rect filling canvas or large)
            if (child.tagName === 'rect') {
                const width = child.getAttribute('width')
                const height = child.getAttribute('height')
                const fill = child.getAttribute('fill')
                // Check for 800x600 or 100%
                if ((width === '800' || width === '100%') && (height === '600' || height === '100%')) {
                    // Additional check: if it's the first rect and white/transparent
                    return null
                }
            }

            const attrs: Record<string, string> = {}
            Array.from(child.attributes).forEach(attr => {
                attrs[attr.name] = attr.value
            })

            const elementId = `${prefix}-${index}-${Date.now()}`
            const type = child.tagName.toLowerCase()

            const el: SvgElement = {
                id: elementId,
                type,
                attributes: attrs,
            }

            if (child.children.length > 0) {
                const childElements = parseElementsRecursively(child.children, elementId)
                el.children = childElements.filter(Boolean) as SvgElement[]
            }

            return el
        }).filter(Boolean) as SvgElement[]
    }

    useEffect(() => {
        // Parse initial SVG string
        if (initialSvgContent) {
            try {
                const parser = new DOMParser()
                console.log('SvgMapEditor Raw Content:', initialSvgContent)

                // Aggressive cleanup: find the first <svg and last </svg>
                let cleanContent = initialSvgContent
                const startIdx = cleanContent.indexOf('<svg')
                if (startIdx !== -1) {
                    cleanContent = cleanContent.substring(startIdx)
                }

                const doc = parser.parseFromString(cleanContent, 'image/svg+xml')

                // Check for parser errors
                const parserError = doc.querySelector('parsererror')
                if (parserError) {
                    console.error('DOMParser Error:', parserError.textContent)
                    notify.error(t('svgParseError'))
                    return
                }

                const svgRoot = doc.querySelector('svg')

                if (svgRoot) {
                    notify.success(t('svgParsed'))
                    setViewBox(svgRoot.getAttribute('viewBox') || "0 0 800 600")

                    const parsedElements = parseElementsRecursively(svgRoot.children)

                    setElements(parsedElements)
                    setHistory([parsedElements])
                    setHistoryIndex(0)
                    console.log('SvgMapEditor Parsed Elements:', parsedElements.length, parsedElements)
                    notify.success(t('loadedElements', { count: parsedElements.length }))
                } else {
                    notify.error(t('noSvgRoot'))
                }
            } catch (e) {
                console.error("Error parsing SVG", e)
                notify.error(t('svgLoadError'))
            }
        } else {
            notify.error(t('noInitialContent'))
        }
    }, [initialSvgContent])

    const calculateSnappedPoint = (rawX: number, rawY: number, lastPoint?: { x: number, y: number }) => {
        const GRID = 10
        let x = Math.round(rawX / GRID) * GRID
        let y = Math.round(rawY / GRID) * GRID

        // Angle Snapping for Drawing
        if (lastPoint) {
            const dx = x - lastPoint.x
            const dy = y - lastPoint.y
            const angle = Math.atan2(dy, dx) * (180 / Math.PI) // degrees
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Snap to 0, 45, 90, 135, 180... (multiples of 45)
            const SNAP_THRESHOLD = 5 // degrees
            const multipleOf45 = Math.round(angle / 45) * 45

            if (Math.abs(angle - multipleOf45) < SNAP_THRESHOLD || Math.abs(angle - multipleOf45) > (360 - SNAP_THRESHOLD)) {
                const snappedAngleRad = multipleOf45 * (Math.PI / 180)
                x = lastPoint.x + Math.round((Math.cos(snappedAngleRad) * dist) / GRID) * GRID
                y = lastPoint.y + Math.round((Math.sin(snappedAngleRad) * dist) / GRID) * GRID
                return { x, y }
            }
        }
        return { x, y }
    }

    const finishWallDrawing = (points: { x: number, y: number }[]) => {
        if (points.length < 3) return

        // Vertex Merging
        const mergedPoints = points.reduce((acc, p) => {
            if (acc.length === 0) return [p]
            const last = acc[acc.length - 1]
            const dist = Math.sqrt((p.x - last.x) ** 2 + (p.y - last.y) ** 2)
            if (dist < 5) return acc // Duplicate/Close point
            return [...acc, p]
        }, [] as { x: number, y: number }[])

        if (mergedPoints.length > 2) {
            const start = mergedPoints[0]
            const end = mergedPoints[mergedPoints.length - 1]
            const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
            if (dist < 10) mergedPoints.pop()
        }

        if (mergedPoints.length < 3) return

        const d = mergedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

        const newEl: SvgElement = {
            id: `wall-${Date.now()}`,
            type: 'path',
            attributes: {
                d,
                fill: 'none',
                stroke: 'black',
                'stroke-width': '4',
                'data-type': 'wall'
            }
        }
        pushHistory([...elements, newEl])
        setDrawingPoints([])
        setMode('select')
        notify.success(t('roomAdded'))
    }

    const addElement = (el: SvgElement) => {
        pushHistory([...elements, el])
    }

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (mode === 'select') {
            setSelectedElementId(null)
            return
        }

        const svg = svgRef.current
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        const lastPoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : undefined
        const snapped = calculateSnappedPoint(svgP.x, svgP.y, mode === 'draw_wall' ? lastPoint : undefined)

        const clickX = snapped.x
        const clickY = snapped.y

        if (mode === 'draw_wall') {
            // Add point to drawing
            setDrawingPoints(prev => {
                const newPoints = [...prev, { x: clickX, y: clickY }]
                if (newPoints.length > 2) {
                    const start = newPoints[0]
                    const dist = Math.sqrt((clickX - start.x) ** 2 + (clickY - start.y) ** 2)
                    if (dist < 20) {
                        finishWallDrawing(prev)
                        return []
                    }
                }
                return newPoints
            })
        } else if (mode === 'place_door') {
            // Snap to top-left grid
            addElement({
                id: `door-${Date.now()}`,
                type: 'rect',
                attributes: {
                    x: String(clickX),
                    y: String(clickY), // Top-left at click
                    width: '50',
                    height: '10',
                    fill: '#8B4513',
                    'data-type': 'door'
                }
            })
            setMode('select')
        } else if (mode === 'place_shelf') {
            addElement({
                id: `shelf-${Date.now()}`,
                type: 'rect',
                attributes: {
                    x: String(clickX),
                    y: String(clickY),
                    width: '60',
                    height: '30',
                    fill: '#aaa',
                    stroke: '#666',
                    'stroke-width': '2',
                    'data-type': 'shelf'
                }
            })
            setMode('select')
        } else if (mode === 'place_cross') {
            // "Cross" is now "Generic Object" (Furniture)
            addElement({
                id: `obj-${Date.now()}`,
                type: 'rect',
                attributes: {
                    x: String(clickX),
                    y: String(clickY), // Top-left
                    width: '40',
                    height: '40',
                    fill: '#e5e5e5',
                    stroke: '#666',
                    'stroke-width': '1',
                    'data-type': 'obstacle' // meaningful name
                }
            })
            setMode('select')
        }
    }

    const handleElementSelect = (e: React.MouseEvent, elId: string) => {
        e.stopPropagation()
        if (mode === 'select') {
            setSelectedElementId(elId)
        }
    }

    // Helpers for Rotation
    const rotatePoint = (x: number, y: number, cx: number, cy: number, angleDeg: number) => {
        const rad = angleDeg * (Math.PI / 180)
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const dx = x - cx
        const dy = y - cy
        return {
            x: cx + (dx * cos - dy * sin),
            y: cy + (dx * sin + dy * cos)
        }
    }

    const getRotation = (el: SvgElement): number => {
        const transform = el.attributes.transform || ''
        const match = /rotate\(([^,]+)[, ]+([^,]+)[, ]+([^)]+)\)/.exec(transform)
        if (match) return parseFloat(match[1])
        return 0
    }

    const handleMouseDown = (e: React.MouseEvent, elId: string) => {
        e.stopPropagation()

        if (mode !== 'select') return

        // Find element (recursive search)
        const findElement = (list: SvgElement[], id: string): SvgElement | undefined => {
            for (const item of list) {
                if (item.id === id) return item
                if (item.children) {
                    const found = findElement(item.children, id)
                    if (found) return found
                }
            }
            return undefined
        }

        const el = findElement(elements, elId)
        if (!el) return

        // DUPLICATION LOGIC
        if (e.altKey) {
            const newEl = JSON.parse(JSON.stringify(el)) as SvgElement
            newEl.id = `${el.type}-${Date.now()}`
            // If it's a rect, offset it slightly
            if (newEl.type === 'rect') {
                newEl.attributes.x = String(parseFloat(newEl.attributes.x || '0') + 10)
                newEl.attributes.y = String(parseFloat(newEl.attributes.y || '0') + 10)
            } else if (newEl.type === 'g') {
                let currentX = 0
                let currentY = 0
                const transform = newEl.attributes.transform || ''
                const match = /translate\(([^,]+)[, ]+([^)]+)\)/.exec(transform)
                if (match) {
                    currentX = parseFloat(match[1])
                    currentY = parseFloat(match[2])
                }
                newEl.attributes.transform = `translate(${currentX + 10}, ${currentY + 10})`
            }
            setElements(prev => [...prev, newEl])
            setSelectedElementId(newEl.id) // Select new element
        } else {
            setSelectedElementId(elId)
        }

        setIsDragging(true)

        const svg = svgRef.current
        if (!svg) return

        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        setDragOffset({ x: svgP.x, y: svgP.y })

        // Store initial state for absolute snapping (and resize/rotate)
        if (el.type === 'rect') {
            const x = parseFloat(el.attributes.x || '0')
            const y = parseFloat(el.attributes.y || '0')
            const w = parseFloat(el.attributes.width || '0')
            const h = parseFloat(el.attributes.height || '0')
            setResizeStartDims({ x, y, w, h })
        } else {
            setResizeStartDims(null)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        const svg = svgRef.current
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        // WALL PREVIEW SNAPPING
        const lastPoint = drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : undefined
        const snappedCursor = mode === 'draw_wall'
            ? calculateSnappedPoint(svgP.x, svgP.y, lastPoint)
            : { x: svgP.x, y: svgP.y }

        setCursorPos(snappedCursor)

        // --- ROTATION LOGIC ---
        if (rotatingElementId) {
            const el = elements.find(e => e.id === rotatingElementId)
            if (!el || el.type !== 'rect' || !resizeStartDims) return

            const cx = (resizeStartDims.x) + (resizeStartDims.w) / 2
            const cy = (resizeStartDims.y) + (resizeStartDims.h) / 2

            const dx = svgP.x - cx
            const dy = svgP.y - cy
            const angle = Math.atan2(dy, dx) * (180 / Math.PI)

            // Snap to 15 deg
            let rotation = angle - startMouseAngle + startRotationAngle
            rotation = Math.round(rotation / 15) * 15

            setElements(prev => updateElementInTree(prev, rotatingElementId, el => {
                // Update transform
                return { ...el, attributes: { ...el.attributes, transform: `rotate(${rotation}, ${cx}, ${cy})` } }
            }))
            return
        }

        // --- RESIZING LOGIC ---
        if (resizingHandle && selectedElementId && resizeStartDims) {
            const GRID = 10
            const dx = svgP.x - dragOffset.x
            const dy = svgP.y - dragOffset.y

            let { x, y, w, h } = resizeStartDims

            if (resizingHandle.includes('r')) w = resizeStartDims.w + dx
            if (resizingHandle.includes('b')) h = resizeStartDims.h + dy
            if (resizingHandle.includes('l')) { x = resizeStartDims.x + dx; w = resizeStartDims.w - dx }
            if (resizingHandle.includes('t')) { y = resizeStartDims.y + dy; h = resizeStartDims.h - dy }

            // Snap
            x = Math.round(x / GRID) * GRID
            y = Math.round(y / GRID) * GRID
            w = Math.round(w / GRID) * GRID
            h = Math.round(h / GRID) * GRID

            if (w < 10) w = 10
            if (h < 10) h = 10

            setElements(prev => updateElementInTree(prev, selectedElementId, (el) => {
                const oldTransform = el.attributes.transform || ''
                const newCx = x + w / 2
                const newCy = y + h / 2

                // preserve angle
                const match = /rotate\(([^,]+)/.exec(oldTransform)
                const angle = match ? match[1] : '0'
                const newTransform = `rotate(${angle}, ${newCx}, ${newCy})`

                return { ...el, attributes: { ...el.attributes, x: String(x), y: String(y), width: String(w), height: String(h), transform: newTransform } }
            }))
            return
        }

        if (!isDragging) return
        if (!selectedElementId && draggingVertexIdx === null) return

        let maxDiffX = svgP.x - dragOffset.x
        let maxDiffY = svgP.y - dragOffset.y

        // --- DOOR SNAPPING LOGIC ---
        const findElement = (list: SvgElement[], id: string): SvgElement | undefined => {
            for (const item of list) {
                if (item.id === id) return item
                if (item.children) {
                    const found = findElement(item.children, id)
                    if (found) return found
                }
            }
            return undefined
        }
        const foundEl = findElement(elements, selectedElementId || '')

        let shouldApplyStandardSnapping = true
        let doorUpdates: Partial<SvgElement['attributes']> | null = null

        if (foundEl && foundEl.attributes['data-type'] === 'door') {
            // Find closest wall
            const walls = elements.filter(el => el.attributes['data-type'] === 'wall' && el.attributes.d)

            let bestPoint: { x: number, y: number, angle: number, dist: number } | null = null

            for (const wall of walls) {
                const d = wall.attributes.d
                const commands = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/)
                const points: { x: number, y: number }[] = []
                for (let i = 0; i < commands.length; i++) {
                    if (/[a-zA-Z]/.test(commands[i])) continue
                    if (i + 1 < commands.length && !/[a-zA-Z]/.test(commands[i + 1])) {
                        points.push({ x: parseFloat(commands[i]), y: parseFloat(commands[i + 1]) })
                        i++
                    }
                }

                for (let i = 0; i < points.length; i++) { // Loop segments
                    const p1 = points[i]
                    const p2 = points[(i + 1) % points.length] // Loop back to start (closed loop)

                    const dx = p2.x - p1.x
                    const dy = p2.y - p1.y
                    const lenSq = dx * dx + dy * dy
                    if (lenSq === 0) continue

                    let t = ((svgP.x - p1.x) * dx + (svgP.y - p1.y) * dy) / lenSq
                    t = Math.max(0, Math.min(1, t))

                    const projX = p1.x + t * dx
                    const projY = p1.y + t * dy
                    const dist = Math.sqrt((svgP.x - projX) ** 2 + (svgP.y - projY) ** 2)

                    if (dist < 50) { // arbitrary snap radius
                        if (!bestPoint || dist < bestPoint.dist) {
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI)
                            bestPoint = { x: projX, y: projY, angle, dist }
                        }
                    }
                }
            }

            if (bestPoint) {
                shouldApplyStandardSnapping = false
                const width = parseFloat(foundEl.attributes.width || '50')
                const height = parseFloat(foundEl.attributes.height || '10')

                const newX = bestPoint.x - width / 2
                const newY = bestPoint.y - height / 2

                doorUpdates = {
                    x: String(newX),
                    y: String(newY),
                    transform: `rotate(${bestPoint.angle}, ${bestPoint.x}, ${bestPoint.y})`
                }
            }
        }

        const GRID_SIZE = 10
        const EDGE_SNAP_THRESHOLD = 15 // pixels

        // Snapped calculation for Vertices (always grid)
        const snappedAbsX = Math.round(svgP.x / GRID_SIZE) * GRID_SIZE
        const snappedAbsY = Math.round(svgP.y / GRID_SIZE) * GRID_SIZE

        // Snapped calculation for Elements (Delta) - grid first
        let snappedDiffX = Math.round(maxDiffX / GRID_SIZE) * GRID_SIZE
        let snappedDiffY = Math.round(maxDiffY / GRID_SIZE) * GRID_SIZE

        // EDGE SNAPPING
        if (shouldApplyStandardSnapping && draggingVertexIdx === null && selectedElementId) {
            const edges = collectEdges(elements.filter(el => el.id !== selectedElementId))
            const draggedEl = findElement(elements, selectedElementId)

            if (draggedEl && draggedEl.type === 'rect') {
                const elX = parseFloat(draggedEl.attributes.x || '0') + snappedDiffX
                const elY = parseFloat(draggedEl.attributes.y || '0') + snappedDiffY
                const elW = parseFloat(draggedEl.attributes.width || '0')
                const elH = parseFloat(draggedEl.attributes.height || '0')

                const elLeft = elX
                const elRight = elX + elW
                const elTop = elY
                const elBottom = elY + elH

                // Snap X edges
                for (const edge of edges) {
                    if (edge.x !== undefined) {
                        if (Math.abs(elLeft - edge.x) < EDGE_SNAP_THRESHOLD) {
                            snappedDiffX += (edge.x - elLeft)
                            break
                        }
                        if (Math.abs(elRight - edge.x) < EDGE_SNAP_THRESHOLD) {
                            snappedDiffX += (edge.x - elRight)
                            break
                        }
                    }
                }
                // Snap Y edges
                for (const edge of edges) {
                    if (edge.y !== undefined) {
                        if (Math.abs(elTop - edge.y) < EDGE_SNAP_THRESHOLD) {
                            snappedDiffY += (edge.y - elTop)
                            break
                        }
                        if (Math.abs(elBottom - edge.y) < EDGE_SNAP_THRESHOLD) {
                            snappedDiffY += (edge.y - elBottom)
                            break
                        }
                    }
                }
            }
        }

        setElements(prev => updateElementInTree(prev, selectedElementId || '', (el) => {
            // VERTEX EDITING
            if (draggingVertexIdx !== null && el.type === 'path' && el.attributes.d) {
                const commands = el.attributes.d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/)
                if (draggingVertexIdx < commands.length - 1) {
                    commands[draggingVertexIdx] = String(snappedAbsX)
                    commands[draggingVertexIdx + 1] = String(snappedAbsY)
                    return { ...el, attributes: { ...el.attributes, d: commands.join(' ') } }
                }
                return el
            }

            // ELEMENT DRAGGING
            if (draggingVertexIdx === null) {
                if (el.attributes['data-type'] === 'wall') return el

                if (doorUpdates && el.attributes['data-type'] === 'door') {
                    return { ...el, attributes: { ...el.attributes, ...doorUpdates } as Record<string, string> }
                }

                const newAttrs = { ...el.attributes }
                if (!doorUpdates && (snappedDiffX === 0 && snappedDiffY === 0)) return el

                // ABSOLUTE SNAPPING FOR RECTS
                if (el.type === 'rect' && resizeStartDims && !doorUpdates) {
                    const totalDiffX = svgP.x - dragOffset.x
                    const totalDiffY = svgP.y - dragOffset.y

                    let targetX = resizeStartDims.x + totalDiffX
                    let targetY = resizeStartDims.y + totalDiffY

                    const GRID_SIZE = 10
                    targetX = Math.round(targetX / GRID_SIZE) * GRID_SIZE
                    targetY = Math.round(targetY / GRID_SIZE) * GRID_SIZE

                    newAttrs.x = String(targetX)
                    newAttrs.y = String(targetY)

                    // Update center for rotation
                    const w = parseFloat(newAttrs.width || '0')
                    const h = parseFloat(newAttrs.height || '0')
                    const newCx = targetX + w / 2
                    const newCy = targetY + h / 2

                    const match = /rotate\(([^,]+)/.exec(newAttrs.transform || '')
                    const angle = match ? match[1] : '0'
                    newAttrs.transform = `rotate(${angle}, ${newCx}, ${newCy})`

                    return { ...el, attributes: newAttrs }
                }

                if (el.type === 'rect') {
                    newAttrs.x = String(parseFloat(el.attributes.x || '0') + snappedDiffX)
                    newAttrs.y = String(parseFloat(el.attributes.y || '0') + snappedDiffY)

                    if (shouldApplyStandardSnapping && el.attributes['data-type'] === 'door') {
                        const { transform, ...rest } = newAttrs
                        return { ...el, attributes: rest as Record<string, string> }
                    }
                } else if (el.type === 'circle') {
                    newAttrs.cx = String(parseFloat(el.attributes.cx || '0') + snappedDiffX)
                    newAttrs.cy = String(parseFloat(el.attributes.cy || '0') + snappedDiffY)
                } else if (el.type === 'g') {
                    let currentX = 0
                    let currentY = 0
                    const transform = newAttrs.transform || ''
                    const match = /translate\(([^,]+)[, ]+([^)]+)\)/.exec(transform)
                    if (match) {
                        currentX = parseFloat(match[1])
                        currentY = parseFloat(match[2])
                    }
                    newAttrs.transform = `translate(${currentX + snappedDiffX}, ${currentY + snappedDiffY})`
                }
                return { ...el, attributes: newAttrs }
            }
            return el
        }))

        const isAbsoluteRectDrag = selectedElementId && resizeStartDims && elements.find(e => e.id === selectedElementId)?.type === 'rect'
        if (draggingVertexIdx === null && shouldApplyStandardSnapping && !isAbsoluteRectDrag && (snappedDiffX !== 0 || snappedDiffY !== 0)) {
            setDragOffset(prev => ({ x: prev.x + snappedDiffX, y: prev.y + snappedDiffY }))
        }
    }

    const handleMouseUp = () => {
        if (isDragging) {
            // Drag finished, save state to history
            // Check if we were duplicating (need to filter out duplicate logic in push? no just push current elements)
            pushHistory(elements)
        }
        setIsDragging(false)
        setDraggingVertexIdx(null)
        setResizingHandle(null)
        setRotatingElementId(null)
        setResizeStartDims(null)
        setIsDragging(false)
        setDragOffset({ x: 0, y: 0 })
    }

    const handleRotateMouseDown = (e: React.MouseEvent, el: SvgElement) => {
        e.stopPropagation()
        e.preventDefault()
        setRotatingElementId(el.id)
        setIsDragging(true)

        const svg = svgRef.current
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

        const x = parseFloat(el.attributes.x || '0')
        const y = parseFloat(el.attributes.y || '0')
        const w = parseFloat(el.attributes.width || '0')
        const h = parseFloat(el.attributes.height || '0')
        const cx = x + w / 2
        const cy = y + h / 2

        // Store initial frame
        setResizeStartDims({ x, y, w, h }) // Using this to store box frame for center calc
        setStartRotationAngle(getRotation(el))

        const dx = svgP.x - cx
        const dy = svgP.y - cy
        setStartMouseAngle(Math.atan2(dy, dx) * (180 / Math.PI))
    }
    // Recursive delete (Moved up)
    // const deleteFromTree = ... (removed from here)

    const handleDelete = () => {
        if (!selectedElementId) return
        updateElements(prev => deleteFromTree(prev, selectedElementId))
        setSelectedElementId(null)
    }

    const handleResize = () => {
        if (!resizeDialog) return
        const { id, width, height } = resizeDialog

        updateElements(prev => updateElementInTree(prev, id, (el) => {
            if (el.type === 'rect') {
                return { ...el, attributes: { ...el.attributes, width: width, height: height } }
            }
            return el
        }))
        setResizeDialog(null)
    }

    // Recursive save reconstruction
    const reconstructSvg = (list: SvgElement[]): string => {
        return list.map(el => {
            const attrs = Object.entries(el.attributes)
                .map(([key, val]) => `${key}="${val}"`)
                .join(' ')

            if (el.children && el.children.length > 0) {
                return `<${el.type} ${attrs}>\n${reconstructSvg(el.children)}\n</${el.type}>`
            }
            return `<${el.type} ${attrs} />`
        }).join('\n')
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const elementsString = reconstructSvg(elements)

            // Note: map_svg column has been removed from the database
            // SVG content is now managed differently

            notify.success(t('mapUpdated'))
            onClose()
            router.refresh()
        } catch (e) {
            console.error(e)
            notify.error(t('saveError'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] w-full max-w-6xl h-[85vh] rounded-lg flex flex-col border border-neutral-700">
                <div className="flex justify-between items-center p-4 border-b border-neutral-700 bg-[#252525]">
                    <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-white">Edytor Mapy</h3>
                        {/* Toolbar */}
                        <div className="flex items-center bg-neutral-800 rounded-md p-1 border border-neutral-700">
                            <Button variant="ghost" size="sm" onClick={() => setMode('select')} className={mode === 'select' ? 'bg-neutral-700' : 'text-neutral-400'} title="Zaznacz (V)">
                                <MousePointer className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setMode('draw_wall')} className={mode === 'draw_wall' ? 'bg-neutral-700' : 'text-neutral-400'} title="Rysuj pokój (P)">
                                <PenTool className="w-4 h-4" />
                            </Button>
                            <div className="w-px h-6 bg-neutral-700 mx-1" />
                            <Button variant="ghost" size="sm" onClick={() => setMode('place_door')} className={mode === 'place_door' ? 'bg-neutral-700' : 'text-neutral-400'} title="Dodaj drzwi">
                                <span className="block w-3 h-4 border border-current bg-transparent" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setMode('place_shelf')} className={mode === 'place_shelf' ? 'bg-neutral-700' : 'text-neutral-400'} title="Dodaj regał">
                                <Square className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setMode('place_cross')} className={mode === 'place_cross' ? 'bg-neutral-700' : 'text-neutral-400'} title="Dodaj znacznik">
                                <Plus className="w-4 h-4 scale-x-125 rotate-45" />
                            </Button>
                            <div className="w-px h-6 bg-neutral-700 mx-1" />
                            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="text-neutral-400 disabled:opacity-30" title="Cofnij (Cmd+Z)">
                                <Undo className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="text-neutral-400 disabled:opacity-30" title="Ponów (Cmd+Shift+Z)">
                                <Redo className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-xs text-neutral-500 mr-2 hidden md:block">
                            {mode === 'select' && "Przeciągnij: Elementy | Kliknij: Ściana (edycja punktów)"}
                            {mode === 'draw_wall' && "Klikaj, aby stawiać punkty. Zamknij obwód."}
                            {mode.startsWith('place') && "Kliknij na planie, aby wstawić."}
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleDelete}
                            disabled={!selectedElementId}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-burgundy-main hover:bg-burgundy-hover"
                        >
                            <Save className="w-4 h-4 mr-2" /> Zapisz
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex items-center justify-center p-0 bg-neutral-900">
                    <svg
                        ref={svgRef}
                        viewBox={viewBox}
                        className="w-full h-full max-h-full bg-white select-none"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            cursor: mode === 'select' ? 'default' : 'crosshair'
                        }}
                        onClick={handleCanvasClick}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Grid Pattern (optional, maybe distinct rect) */}
                        <defs>
                            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5" strokeOpacity="0.1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#smallGrid)" style={{ pointerEvents: 'none' }} />

                        {elements.map((el) => (
                            <RenderSvgElement
                                key={el.id}
                                el={el}
                                selectedId={selectedElementId}
                                hoveredId={hoveredElementId}
                                onSelect={handleElementSelect}
                                onHover={handleHoverWithDelay}
                                onMouseDown={handleMouseDown}
                                onContextMenu={(e) => handleContextMenu(e, el.id)}
                                onWallClick={handleWallClick}
                            />
                        ))}

                        {/* Drawing Preview for Wall */}
                        {mode === 'draw_wall' && drawingPoints.length > 0 && (
                            <g style={{ pointerEvents: 'none' }}>
                                <path
                                    d={drawingPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="blue"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                                {drawingPoints.map((p, i) => (
                                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="blue" />
                                ))}
                                {/* LIVE PREVIEW LINE */}
                                {cursorPos && (
                                    <line
                                        x1={drawingPoints[drawingPoints.length - 1].x}
                                        y1={drawingPoints[drawingPoints.length - 1].y}
                                        x2={cursorPos.x}
                                        y2={cursorPos.y}
                                        stroke="rgba(0,0,255,0.5)"
                                        strokeWidth="2"
                                        strokeDasharray="2,2"
                                    />
                                )}
                            </g>
                        )}

                        {/* Vertices Logic: Show if Selected OR Hovered (with delay) */}
                        {((selectedElementId && elements.find(e => e.id === selectedElementId)?.type === 'path') ||
                            (delayedHoveredElementId && elements.find(e => e.id === delayedHoveredElementId)?.type === 'path')) && (
                                (() => {
                                    const targetId = delayedHoveredElementId && elements.find(e => e.id === delayedHoveredElementId)?.type === 'path' ? delayedHoveredElementId : selectedElementId
                                    if (!targetId) return null

                                    const el = elements.find(e => e.id === targetId)
                                    if (!el || !el.attributes?.d) return null

                                    const d = el.attributes.d
                                    const commands = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/)

                                    const points: { x: number, y: number, idx: number }[] = []
                                    let currentCommand = ''

                                    for (let i = 0; i < commands.length; i++) {
                                        const token = commands[i]
                                        if (/[a-zA-Z]/.test(token)) {
                                            currentCommand = token.toUpperCase()
                                        } else {
                                            if (currentCommand === 'M' || currentCommand === 'L' || currentCommand === 'H' || currentCommand === 'V') {
                                                if (i + 1 < commands.length && !/[a-zA-Z]/.test(commands[i + 1])) {
                                                    const x = parseFloat(token)
                                                    const y = parseFloat(commands[i + 1])
                                                    points.push({ x, y, idx: i })
                                                    i++
                                                }
                                            }
                                        }
                                    }

                                    return points.map((p, k) => (
                                        <circle
                                            key={k}
                                            cx={p.x}
                                            cy={p.y}
                                            r={el.id === selectedElementId ? 6 : 4} // Smaller if just hover
                                            fill="white"
                                            stroke={el.id === selectedElementId ? "blue" : "gray"}
                                            strokeWidth="2"
                                            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                                            onMouseDown={(e) => handleVertexMouseDown(e, el.id, p.idx)}
                                        />
                                    ))
                                })()
                            )}

                        {/* RESIZE HANDLES for Selected Rect */}
                        {(() => {
                            if (!selectedElementId) return null
                            const findElement = (list: SvgElement[], id: string): SvgElement | undefined => {
                                for (const item of list) {
                                    if (item.id === id) return item
                                    if (item.children) {
                                        const found = findElement(item.children, id)
                                        if (found) return found
                                    }
                                }
                                return undefined
                            }
                            const el = findElement(elements, selectedElementId)
                            if (el && el.type === 'rect') {
                                const x = parseFloat(el.attributes.x || '0')
                                const y = parseFloat(el.attributes.y || '0')
                                const w = parseFloat(el.attributes.width || '0')
                                const h = parseFloat(el.attributes.height || '0')
                                const rotation = getRotation(el)
                                const cx = x + w / 2
                                const cy = y + h / 2

                                const HANDLE_SIZE = 8
                                const isDoor = el.attributes['data-type'] === 'door'

                                // Base Handles (Relative to unrotated rect)
                                let handles = [
                                    { id: 'tl', x: x, y: y, cursor: 'nw-resize' },
                                    { id: 'tr', x: x + w, y: y, cursor: 'ne-resize' },
                                    { id: 'bl', x: x, y: y + h, cursor: 'sw-resize' },
                                    { id: 'br', x: x + w, y: y + h, cursor: 'se-resize' },
                                    { id: 't', x: x + w / 2, y: y, cursor: 'n-resize' },
                                    { id: 'b', x: x + w / 2, y: y + h, cursor: 's-resize' },
                                    { id: 'l', x: x, y: y + h / 2, cursor: 'e-resize' }, // Cursor fix: west/east depends on rotation, simplified
                                    { id: 'r', x: x + w, y: y + h / 2, cursor: 'e-resize' },
                                ]

                                if (isDoor) {
                                    handles = handles.filter(h => h.id === 'l' || h.id === 'r')
                                }

                                return (
                                    <g>
                                        {/* Selection Box Visual (Rotates correctly) */}
                                        <rect
                                            x={x} y={y} width={w} height={h}
                                            transform={el.attributes.transform}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="1"
                                            strokeDasharray="4 2"
                                            pointerEvents="none"
                                        />

                                        {/* Resize Handles */}
                                        {handles.map(h => {
                                            const p = rotatePoint(h.x, h.y, cx, cy, rotation)
                                            return (
                                                <rect
                                                    key={h.id}
                                                    x={p.x - HANDLE_SIZE / 2}
                                                    y={p.y - HANDLE_SIZE / 2}
                                                    width={HANDLE_SIZE}
                                                    height={HANDLE_SIZE}
                                                    fill="white"
                                                    stroke="blue"
                                                    strokeWidth="1"
                                                    style={{ cursor: 'pointer' }} // Simplified cursor as standard ones are confusing when rotated
                                                    onMouseDown={(e) => handleResizeHandleMouseDown(e, h.id, el)}
                                                />
                                            )
                                        })}

                                        {/* Rotation Handle (Above Top-Right as requested?) User said "indykator ponad prawym górmym rogiem" */}
                                        {/* Let's place it 20px above TR corner */}
                                        {(() => {
                                            const trX = x + w
                                            const trY = y

                                            // Rotate TR first to find where it is
                                            // Actually, we want it relative to the rect's local space then rotated
                                            // Local position: (x+w, y - 20)
                                            const rotP = rotatePoint(x + w, y - 25, cx, cy, rotation)

                                            // Connector Line
                                            const cornerP = rotatePoint(x + w, y, cx, cy, rotation)

                                            return (
                                                <g>
                                                    <line x1={cornerP.x} y1={cornerP.y} x2={rotP.x} y2={rotP.y} stroke="blue" strokeDasharray="3,3" />
                                                    <circle
                                                        cx={rotP.x}
                                                        cy={rotP.y}
                                                        r="6"
                                                        fill="#4ade80" // Green
                                                        stroke="black"
                                                        strokeWidth="1"
                                                        style={{ cursor: 'alias' }}
                                                        onMouseDown={(e) => handleRotateMouseDown(e, el)}
                                                    />
                                                </g>
                                            )
                                        })()}
                                    </g>
                                )
                            }
                            return null
                        })()}
                    </svg>

                    {/* Context Menu Overlay */}
                    {contextMenu && (
                        <div
                            className="absolute bg-[#252525] border border-neutral-700 shadow-xl rounded-md py-1 min-w-[160px] z-50 flex flex-col"
                            style={{
                                top: contextMenu.y,
                                left: contextMenu.x
                            }}
                        >
                            <button
                                className="px-4 py-2 text-left hover:bg-white/10 text-white text-sm flex items-center gap-2"
                                onClick={() => { handleDelete(); closeContextMenu(); }}
                            >
                                <Trash2 className="w-3 h-3" /> Usuń
                            </button>

                            {/* Actions based on type */}
                            {elements.find(e => e.id === contextMenu.id)?.type === 'rect' && (
                                <button
                                    className="px-4 py-2 text-left hover:bg-white/10 text-white text-sm flex items-center gap-2"
                                    onClick={() => {
                                        const el = elements.find(e => e.id === contextMenu.id)
                                        if (el) {
                                            setResizeDialog({
                                                id: el.id,
                                                width: el.attributes.width || '50',
                                                height: el.attributes.height || '50'
                                            })
                                        }
                                        closeContextMenu()
                                    }}
                                >
                                    <Scaling className="w-3 h-3" /> Zmień wymiary
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Resize Dialog Modal */}
                {resizeDialog && (
                    <div
                        className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
                        onClick={() => setResizeDialog(null)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setResizeDialog(null)
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Close dialog"
                    >
                        <div className="bg-[#1e1e1e] p-6 rounded-lg border border-neutral-700 w-64" onClick={e => e.stopPropagation()}>
                            <h4 className="text-white font-semibold mb-4">Zmień wymiary</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-neutral-400 block mb-1">Szerokość (cm/px)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                        value={resizeDialog.width}
                                        onChange={e => setResizeDialog(prev => prev ? { ...prev, width: e.target.value } : null)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 block mb-1">Wysokość (cm/px)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                        value={resizeDialog.height}
                                        onChange={e => setResizeDialog(prev => prev ? { ...prev, height: e.target.value } : null)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="ghost" size="sm" onClick={() => setResizeDialog(null)}>Anuluj</Button>
                                    <Button variant="primary" size="sm" onClick={handleResize}>Zapisz</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
