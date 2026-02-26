import { useRef, useState, useCallback } from 'react'
import CanvasEditor from './CanvasEditor'
import PropertiesBar from './PropertiesBar'
import EditorSidebar from './EditorSidebar'
import styles from './EditorView.module.css'

const CANVAS_W = 1280
const CANVAS_H = 720
const DISPLAY_W = 768
const DISPLAY_H = 432

export default function EditorView({ generatedImageUrl, elements = [], category, onBack, onRegenerate }) {
  const editorRef = useRef(null)
  const [activeObj, setActiveObj] = useState(null)
  const [downloading, setDownloading] = useState(false)

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

  const scale = DISPLAY_W / CANVAS_W

  return (
    <div className={styles.layout} onKeyDown={handleKeyDown} tabIndex={0}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <EditorSidebar
          editorRef={editorRef}
          onImageUpload={handleImageUpload}
        />

        <div className={styles.exportSection}>
          <button className={styles.regenBtn} onClick={onRegenerate}>
            ↩ Gerar novamente
          </button>
          <div className={styles.divider} />
          <p className={styles.exportLabel}>Exportar thumbnail</p>
          <div className={styles.exportBtns}>
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              onClick={handleExportPNG}
              disabled={downloading}
            >
              {downloading ? '…' : '↓ PNG'}
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleExportJPG}
              disabled={downloading}
            >
              {downloading ? '…' : '↓ JPG'}
            </button>
          </div>
          <p className={styles.exportNote}>1280 × 720 px</p>
        </div>
      </aside>

      {/* ── Canvas ── */}
      <div className={styles.canvasArea}>
        <div className={styles.canvasWrapper}>
          <div className={styles.canvasScaler} style={{ width: DISPLAY_W, height: DISPLAY_H }}>
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

        {activeObj && (
          <PropertiesBar activeObj={activeObj} editorRef={editorRef} />
        )}

        <p className={styles.hint}>
          Clique para selecionar • Duplo clique nos textos para editar • Delete para remover
        </p>
      </div>
    </div>
  )
}
