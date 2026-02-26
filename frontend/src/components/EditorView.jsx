import { useRef, useState, useCallback, useEffect } from 'react'
import CanvasEditor from './CanvasEditor'
import PropertiesBar from './PropertiesBar'
import EditorSidebar from './EditorSidebar'
import styles from './EditorView.module.css'

const CANVAS_W = 1280
const CANVAS_H = 720
const SIDEBAR_W = 240
const MAX_DISPLAY_W = 768

function useDisplayWidth() {
  const [w, setW] = useState(() => {
    if (typeof window === 'undefined') return MAX_DISPLAY_W
    const isMobile = window.innerWidth <= 768
    const padding = isMobile ? 16 : 64
    const available = window.innerWidth - (isMobile ? 0 : SIDEBAR_W) - padding
    return Math.min(MAX_DISPLAY_W, Math.max(280, available))
  })

  useEffect(() => {
    function calc() {
      const isMobile = window.innerWidth <= 768
      const padding = isMobile ? 16 : 64
      const available = window.innerWidth - (isMobile ? 0 : SIDEBAR_W) - padding
      setW(Math.min(MAX_DISPLAY_W, Math.max(280, available)))
    }
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  return w
}

export default function EditorView({ generatedImageUrl, elements = [], category, onBack, onRegenerate }) {
  const editorRef = useRef(null)
  const mobileUploadRef = useRef(null)
  const [activeObj, setActiveObj] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const displayW = useDisplayWidth()
  const displayH = Math.round(displayW * (CANVAS_H / CANVAS_W))
  const scale = displayW / CANVAS_W

  function triggerDownload(dataUrl, filename) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  function handleExportPNG() {
    setDownloading(true)
    setTimeout(() => {
      const url = editorRef.current?.exportPNG()
      if (url) triggerDownload(url, `thumb_${Date.now()}.png`)
      setDownloading(false)
    }, 50)
  }

  function handleExportJPG() {
    setDownloading(true)
    setTimeout(() => {
      const url = editorRef.current?.exportJPG()
      if (url) triggerDownload(url, `thumb_${Date.now()}.jpg`)
      setDownloading(false)
    }, 50)
  }

  async function handleImageUpload(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    editorRef.current?.addImageFromURL(data.url)
  }

  async function handleMobileImageUpload(e) {
    const file = e.target.files?.[0]
    if (file) await handleImageUpload(file)
    e.target.value = ''
  }

  function handleMobileAddText() {
    const canvas = editorRef.current?.getFabric()
    if (!canvas) return
    import('fabric').then(({ fabric }) => {
      const t = new fabric.IText('SEU TEXTO', {
        left: 40,
        top: Math.round(CANVAS_H * 0.4),
        fontSize: 90,
        fontFamily: 'Anton',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        paintFirst: 'stroke',
        selectable: true,
        editable: true,
      })
      canvas.add(t)
      canvas.setActiveObject(t)
      canvas.renderAll()
    })
  }

  const handleSelected = useCallback(obj => setActiveObj(obj || null), [])
  const handleDeselected = useCallback(() => setActiveObj(null), [])

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeObj) {
      const tag = document.activeElement.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        editorRef.current?.deleteSelected()
        setActiveObj(null)
      }
    }
  }

  return (
    <div className={styles.layout} onKeyDown={handleKeyDown} tabIndex={0}>

      {/* ── Sidebar (desktop only) ── */}
      <aside className={styles.sidebar}>
        <EditorSidebar editorRef={editorRef} onImageUpload={handleImageUpload} />
        <div className={styles.exportSection}>
          <button className={styles.regenBtn} onClick={onRegenerate}>
            ↩ Gerar novamente
          </button>
          <div className={styles.divider} />
          <p className={styles.exportLabel}>Exportar thumbnail</p>
          <div className={styles.exportBtns}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={handleExportPNG} disabled={downloading}>
              {downloading ? '…' : '↓ PNG'}
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExportJPG} disabled={downloading}>
              {downloading ? '…' : '↓ JPG'}
            </button>
          </div>
          <p className={styles.exportNote}>1280 × 720 px</p>
        </div>
      </aside>

      {/* ── Área central ── */}
      <div className={styles.canvasArea}>

        {/* Canvas escalado */}
        <div className={styles.canvasWrapper}>
          <div className={styles.canvasScaler} style={{ width: displayW, height: displayH }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H }}>
              <CanvasEditor
                ref={editorRef}
                generatedImageUrl={generatedImageUrl}
                elements={elements}
                onObjectSelected={handleSelected}
                onObjectDeselected={handleDeselected}
              />
            </div>
          </div>
        </div>

        {/* Barra de propriedades */}
        {activeObj && (
          <div className={styles.propsWrap}>
            <PropertiesBar activeObj={activeObj} editorRef={editorRef} />
          </div>
        )}

        <p className={styles.hint}>
          Toque para selecionar • Duplo toque nos textos para editar
        </p>
      </div>

      {/* ── Mobile toolbar (bottom) ── */}
      <div className={styles.mobilebar}>
        <button className={styles.mobileBtn} onClick={handleMobileAddText}>
          <span className={styles.mobileBtnIcon}>T</span>
          <span>Texto</span>
        </button>
        <button className={styles.mobileBtn} onClick={() => mobileUploadRef.current?.click()}>
          <span className={styles.mobileBtnIcon}>📸</span>
          <span>Imagem</span>
        </button>
        <div className={styles.mobileSep} />
        <button className={styles.mobileBtn} onClick={onRegenerate}>
          <span className={styles.mobileBtnIcon}>↩</span>
          <span>Regen</span>
        </button>
        <button className={`${styles.mobileBtn} ${styles.mobileBtnAccent}`} onClick={handleExportPNG} disabled={downloading}>
          <span className={styles.mobileBtnIcon}>↓</span>
          <span>PNG</span>
        </button>
        <button className={`${styles.mobileBtn} ${styles.mobileBtnSecondary}`} onClick={handleExportJPG} disabled={downloading}>
          <span className={styles.mobileBtnIcon}>↓</span>
          <span>JPG</span>
        </button>
        <input ref={mobileUploadRef} type="file" accept="image/*" hidden onChange={handleMobileImageUpload} />
      </div>

    </div>
  )
}
