import { useState, useRef } from 'react'
import styles from './Step2Generator.module.css'

export default function Step2Generator({ category, onGenerated }) {
  const [prompt, setPrompt] = useState('')
  const [personFile, setPersonFile] = useState(null)
  const [refFile, setRefFile] = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [refPreview, setRefPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const personInputRef = useRef(null)
  const refInputRef = useRef(null)

  function handleFileChange(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'person') {
      setPersonFile(file)
      setPersonPreview(url)
    } else {
      setRefFile(file)
      setRefPreview(url)
    }
  }

  function handleDrop(e, type) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    if (type === 'person') { setPersonFile(file); setPersonPreview(url) }
    else { setRefFile(file); setRefPreview(url) }
  }

  async function handleGenerate() {
    if (!personFile) { setError('Envie a sua foto para continuar.'); return }
    if (!prompt.trim()) { setError('Descreva como quer a sua thumbnail.'); return }
    setError(null)
    setLoading(true)

    try {
      const form = new FormData()
      form.append('objective', category.id)
      form.append('prompt', prompt)
      form.append('person_image', personFile)
      if (refFile) form.append('reference_image', refFile)

      const res = await fetch('/api/generate', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.detail || 'Erro ao gerar imagem.')
      onGenerated({ url: data.url, elements: data.elements || [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = !!personFile && prompt.trim().length > 0

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.catBadge} style={{ color: category.color }}>
          {category.icon} {category.name}
        </div>
        <h1 className={styles.title}>Configure sua thumbnail</h1>
        <p className={styles.subtitle}>
          A IA vai combinar sua foto + referência + instruções e gerar a imagem pronta.
        </p>
      </div>

      <div className={styles.form}>

        {/* ── Prompt ── */}
        <div className={styles.field}>
          <label htmlFor="prompt">
            Descreva sua thumbnail
            <span className={styles.required}>*</span>
          </label>
          <textarea
            id="prompt"
            className={styles.textarea}
            placeholder={`Ex: Thumbnail mostrando que faturei R$ 50.000 em um mês, expressão de surpresa, fundo escuro com destaque dourado, texto "FATUREI" em amarelo grande...`}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={5}
          />
          <p className={styles.fieldHint}>
            Quanto mais detalhes, melhor o resultado. Descreva cores, texto, expressão, layout.
          </p>
        </div>

        {/* ── Uploads ── */}
        <div className={styles.uploads}>

          {/* Foto da pessoa */}
          <div className={styles.uploadGroup}>
            <label>
              Sua foto
              <span className={styles.required}>*</span>
            </label>
            <div
              className={`${styles.dropzone} ${personPreview ? styles.hasFile : ''}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, 'person')}
              onClick={() => personInputRef.current?.click()}
            >
              {personPreview ? (
                <img src={personPreview} alt="Sua foto" className={styles.preview} />
              ) : (
                <>
                  <span className={styles.dropIcon}>🤳</span>
                  <p>Arraste ou clique</p>
                  <p className={styles.dropSub}>JPG, PNG ou WebP</p>
                </>
              )}
            </div>
            {personPreview && (
              <button
                className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
                onClick={() => { setPersonFile(null); setPersonPreview(null) }}
              >
                Trocar foto
              </button>
            )}
            <input
              ref={personInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => handleFileChange(e, 'person')}
            />
          </div>

          {/* Referência */}
          <div className={styles.uploadGroup}>
            <label>
              Referência visual
              <span className={styles.optional}>(opcional)</span>
            </label>
            <div
              className={`${styles.dropzone} ${refPreview ? styles.hasFile : ''}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, 'ref')}
              onClick={() => refInputRef.current?.click()}
            >
              {refPreview ? (
                <img src={refPreview} alt="Referência" className={styles.preview} />
              ) : (
                <>
                  <span className={styles.dropIcon}>🖼️</span>
                  <p>Thumbnail de referência</p>
                  <p className={styles.dropSub}>Estilo que quer seguir</p>
                </>
              )}
            </div>
            {refPreview && (
              <button
                className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
                onClick={() => { setRefFile(null); setRefPreview(null) }}
              >
                Trocar referência
              </button>
            )}
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => handleFileChange(e, 'ref')}
            />
          </div>
        </div>

        {/* ── Erro ── */}
        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Botão gerar ── */}
        <button
          className={`btn btn-primary btn-lg ${styles.generateBtn}`}
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Gerando com IA… pode levar alguns segundos
            </>
          ) : (
            '✨ Gerar Thumbnail com IA'
          )}
        </button>

        {loading && (
          <p className={styles.loadingHint}>
            O Gemini está combinando sua foto, referência e instruções. Aguarde…
          </p>
        )}
      </div>
    </main>
  )
}
