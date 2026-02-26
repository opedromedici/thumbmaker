import { useRef, useState } from 'react'
import styles from './SidebarPanel.module.css'

/* ─── Upload Tab ─────────────────────────────────────────────── */
function UploadTab({ onImageUpload }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) onImageUpload(f)
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <p className={styles.sectionTitle}>Adicionar Imagens</p>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span className={styles.dropIcon}>📸</span>
        <p>Arraste ou clique para enviar</p>
        <p className={styles.dropSub}>PNG, JPG, WebP</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      <div className={styles.divider} />
      <p className={styles.sectionTitle}>Dicas</p>
      <ul className={styles.tipList}>
        <li>Use foto com fundo removido para melhor resultado</li>
        <li>Resolução mínima recomendada: 800×800</li>
        <li>Redimensione e posicione livremente no canvas</li>
      </ul>
    </div>
  )
}

/* ─── Text Tab ───────────────────────────────────────────────── */
function TextTab({ editorRef }) {
  function addText() {
    const fabric = editorRef.current?.getFabric()
    if (!fabric) return
    import('fabric').then(({ fabric: f }) => {
      const t = new f.IText('Seu texto aqui', {
        left: 100,
        top: 300,
        fontSize: 80,
        fontFamily: 'Impact',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3,
        paintFirst: 'stroke',
        selectable: true,
        editable: true,
      })
      fabric.add(t)
      fabric.setActiveObject(t)
      fabric.renderAll()
    })
  }

  const fonts = [
    'Impact', 'Arial Black', 'Arial', 'Georgia',
    'Courier New', 'Verdana', 'Trebuchet MS',
  ]

  return (
    <div>
      <p className={styles.sectionTitle}>Adicionar Texto</p>
      <button className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={addText}>
        + Adicionar Texto
      </button>

      <p className={styles.tip}>
        Selecione um texto no canvas e use a barra de propriedades para editar fonte, tamanho e cor.
      </p>

      <div className={styles.divider} />
      <p className={styles.sectionTitle}>Fontes Disponíveis</p>
      <ul className={styles.fontList}>
        {fonts.map(f => (
          <li key={f} style={{ fontFamily: f }}>{f}</li>
        ))}
      </ul>
    </div>
  )
}

/* ─── AI Tab ─────────────────────────────────────────────────── */
function AITab({ category, template, editorRef }) {
  const [topic, setTopic] = useState('')
  const [headlines, setHeadlines] = useState([])
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category: category?.id || 'dinheiro' }),
      })
      const data = await res.json()
      setHeadlines(data.headlines || [])
    } catch {
      setHeadlines(['RESULTADO REAL', 'MÉTODO VALIDADO', 'ISSO FUNCIONA'])
    } finally {
      setLoading(false)
    }
  }

  function applyHeadline(text) {
    const canvas = editorRef.current?.getFabric()
    if (!canvas) return
    // Apply to first IText found
    const obj = canvas.getObjects().find(o => o.type === 'i-text')
    if (obj) {
      obj.set({ text })
      canvas.renderAll()
    }
  }

  return (
    <div>
      <p className={styles.sectionTitle}>Sugestões de Headline</p>

      <div style={{ marginBottom: 10 }}>
        <label>Tema do seu vídeo</label>
        <input
          type="text"
          placeholder="Ex: Como vender no WhatsApp"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
        />
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 16 }}
        onClick={generate}
        disabled={loading || !topic.trim()}
      >
        {loading ? 'Gerando…' : '✨ Gerar Headlines'}
      </button>

      {headlines.length > 0 && (
        <>
          <p className={styles.sectionTitle}>Clique para aplicar</p>
          <ul className={styles.headlineList}>
            {headlines.map((h, i) => (
              <li key={i} onClick={() => applyHeadline(h)}>
                {h}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function SidebarPanel({ tab, editorRef, activeObj, category, template, onImageUpload }) {
  if (tab === 'upload') return <UploadTab onImageUpload={onImageUpload} />
  if (tab === 'text')   return <TextTab editorRef={editorRef} />
  if (tab === 'ai')     return <AITab category={category} template={template} editorRef={editorRef} />
  return null
}
