import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'

const CANVAS_W = 1280
const CANVAS_H = 720

const CanvasEditor = forwardRef(function CanvasEditor(
  { generatedImageUrl, elements = [], onObjectSelected, onObjectDeselected },
  ref
) {
  const canvasElRef = useRef(null)
  const fabricRef = useRef(null)
  const [ready, setReady] = useState(false)

  useImperativeHandle(ref, () => ({
    exportPNG() {
      if (!fabricRef.current) return null
      return fabricRef.current.toDataURL({ format: 'png', multiplier: 1 })
    },
    exportJPG() {
      if (!fabricRef.current) return null
      return fabricRef.current.toDataURL({ format: 'jpeg', quality: 0.92, multiplier: 1 })
    },
    addImageFromURL(url) {
      if (!fabricRef.current) return
      import('fabric').then(({ fabric }) => {
        fabric.Image.fromURL(
          url,
          img => {
            const maxW = CANVAS_W * 0.5
            const maxH = CANVAS_H * 0.9
            const scale = Math.min(maxW / img.width, maxH / img.height, 1)
            img.set({ left: 100, top: 50, scaleX: scale, scaleY: scale })
            fabricRef.current.add(img)
            fabricRef.current.setActiveObject(img)
            fabricRef.current.renderAll()
          },
          { crossOrigin: 'anonymous' }
        )
      })
    },
    deleteSelected() {
      if (!fabricRef.current) return
      const obj = fabricRef.current.getActiveObject()
      if (obj && !obj._isBackground) {
        fabricRef.current.remove(obj)
        fabricRef.current.discardActiveObject()
        fabricRef.current.renderAll()
      }
    },
    getFabric() {
      return fabricRef.current
    },
  }))

  // Init canvas once
  useEffect(() => {
    let destroyed = false
    import('fabric').then(({ fabric }) => {
      if (destroyed || !canvasElRef.current) return
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        selection: true,
        preserveObjectStacking: true,
      })
      fabricRef.current = canvas
      canvas.on('selection:created', e => onObjectSelected?.(e.selected?.[0]))
      canvas.on('selection:updated', e => onObjectSelected?.(e.selected?.[0]))
      canvas.on('selection:cleared', () => onObjectDeselected?.())
      setReady(true)
    })
    return () => {
      destroyed = true
      fabricRef.current?.dispose()
      fabricRef.current = null
      setReady(false)
    }
  }, [])

  // Load generated image as background, then overlay editable text elements
  useEffect(() => {
    if (!ready || !fabricRef.current || !generatedImageUrl) return
    const canvas = fabricRef.current

    import('fabric').then(({ fabric }) => {
      canvas.clear()
      canvas.setBackgroundColor('#111111', () => {})

      fabric.Image.fromURL(
        generatedImageUrl,
        img => {
          const scaleX = CANVAS_W / img.width
          const scaleY = CANVAS_H / img.height
          img.set({
            left: 0,
            top: 0,
            scaleX,
            scaleY,
            selectable: false,
            evented: false,
            _isBackground: true,
          })
          canvas.add(img)
          canvas.sendToBack(img)

          // Overlay editable text elements from AI extraction
          elements.forEach(el => {
            const textObj = new fabric.IText(el.text || '', {
              left: el.x ?? 60,
              top: el.y ?? 100,
              fontSize: el.fontSize ?? 80,
              fontFamily: el.fontFamily || 'Impact',
              fill: el.fill || '#FFFFFF',
              stroke: el.stroke || null,
              strokeWidth: el.strokeWidth ?? 0,
              paintFirst: 'stroke',
              fontWeight: el.fontWeight || 'normal',
              selectable: true,
              editable: true,
            })
            canvas.add(textObj)
          })

          canvas.renderAll()
        },
        { crossOrigin: 'anonymous' }
      )
    })
  }, [ready, generatedImageUrl, elements])

  return (
    <div style={{ position: 'relative', lineHeight: 0 }}>
      <canvas ref={canvasElRef} />
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#666', fontSize: 14,
        }}>
          Carregando editor…
        </div>
      )}
    </div>
  )
})

export default CanvasEditor
