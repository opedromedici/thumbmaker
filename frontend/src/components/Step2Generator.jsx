import { useState, useRef } from 'react'
import styles from './Step2Generator.module.css'

function similarityLabel(v) {
  if (v <= 30) return 'Apenas inspiração leve'
  if (v <= 70) return 'Estrutura semelhante'
  return 'Muito próximo da referência'
}

export default function Step2Generator({ category, onGenerated, onEditorBlank }) {
  const [mode, setMode]               = useState('ai') // 'ai' | 'blank'
  const [prompt, setPrompt]           = useState('')
  const [personFile, setPersonFile]   = useState(null)
  const [refFile, setRefFile]         = useState(null)
  const [extraFile, setExtraFile]     = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [refPreview, setRefPreview]   = useState(null)
  const [extraPreview, setExtraPreview]   = useState(null)
  const [similarity, setSimilarity]   = useState(60)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const personInputRef = useRef(null)
  const refInputRef    = useRef(null)
  const extraInputRef  = useRef(null)

  function handleFileChange(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'person') { setPersonFile(file); setPersonPreview(url) }
    else if (type === 'ref') { setRefFile(file); setRefPreview(url) }
    else { setExtraFile(file); setExtraPreview(url) }
  }

  function handleDrop(e, type) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    if (type === 'person') { setPersonFile(file); setPersonPreview(url) }
    else if (type === 'ref') { setRefFile(file); setRefPreview(url) }
    else { setExtraFile(file); setExtraPreview(url) }
  }

  async function handleGenerate() {
    if (!prompt.trim() && !personFile && !refFile) {
      setError('Preencha pelo menos o prompt ou envie uma imagem.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const form = new FormData()
      form.append('objective', category.id)
      form.append('prompt', prompt)
      form.append('similarity', String(similarity))
      if (personFile) form.append('person_image', personFile)
      if (refFile)    form.append('reference_image', refFile)
      if (extraFile)  form.append('extra_elements', extraFile)

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

  // Precisa de pelo menos um input para gerar
  const canGenerate = prompt.trim().length > 0 || !!personFile || !!refFile

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.catBadge} style={{ color: category.color }}>
          {category.icon} {category.name}
        </div>
        <h1 className={styles.title}>Como você quer criar?</h1>
        <p className={styles.subtitle}>
          Use a IA para gerar sua thumbnail automaticamente, ou abra o editor e monte do jeito que quiser.
        </p>
      </div>

      <div className={styles.form}>

        {/* ── Seletor de modo ── */}
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeCard} ${mode === 'ai' ? styles.modeCardActive : ''}`}
            onClick={() => setMode('ai')}
          >
            <span className={styles.modeIcon}>✨</span>
            <strong>Gerar com IA</strong>
            <span className={styles.modeDesc}>Descreva e a IA cria para você</span>
          </button>
          <button
            className={`${styles.modeCard} ${mode === 'blank' ? styles.modeCardActive : ''}`}
            onClick={() => setMode('blank')}
          >
            <span className={styles.modeIcon}>🎨</span>
            <strong>Editor em branco</strong>
            <span className={styles.modeDesc}>Monte do zero, no seu ritmo</span>
          </button>
        </div>

        {/* ── Modo: Editor em branco ── */}
        {mode === 'blank' && (
          <div className={styles.blankMode}>
            <p className={styles.blankDesc}>
              O canvas abre vazio. Você adiciona textos, imagens e elementos como quiser — sem depender de IA.
            </p>
            <ul className={styles.blankTips}>
              <li>Use "Adicionar texto" na barra lateral para inserir títulos</li>
              <li>Faça upload de qualquer imagem de fundo</li>
              <li>Combine camadas livremente e exporte em PNG ou JPG</li>
            </ul>
            <button
              className={`btn btn-primary btn-lg ${styles.generateBtn}`}
              onClick={onEditorBlank}
            >
              Abrir editor em branco →
            </button>
          </div>
        )}

        {/* ── Modo: Gerar com IA ── */}
        {mode === 'ai' && (
          <>
            {/* Prompt */}
            <div className={styles.field}>
              <label htmlFor="prompt">
                Descreva sua thumbnail
                <span className={styles.optional}>(opcional se enviar imagens)</span>
              </label>
              <textarea
                id="prompt"
                className={styles.textarea}
                placeholder={`Ex: Thumbnail mostrando que faturei R$ 50.000 em um mês, expressão de surpresa, fundo escuro com destaque dourado, texto "FATUREI" em amarelo grande…`}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
              />
              <p className={styles.fieldHint}>
                Quanto mais detalhes, melhor. Descreva cores, texto, expressão, layout. Você pode gerar só com imagens se preferir.
              </p>
            </div>

            {/* Uploads principais */}
            <div className={styles.uploads}>

              {/* Foto da pessoa */}
              <div className={styles.uploadGroup}>
                <label>
                  Sua foto
                  <span className={styles.optional}>(opcional)</span>
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
                  >Trocar foto</button>
                )}
                <input ref={personInputRef} type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'person')} />
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
                  >Trocar referência</button>
                )}
                <input ref={refInputRef} type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'ref')} />
              </div>
            </div>

            {/* Slider de similaridade */}
            {refPreview && (
              <div className={styles.similaritySection}>
                <div className={styles.similarityHeader}>
                  <label className={styles.similarityLabel}>
                    Quão parecido você quer com a referência?
                  </label>
                  <span className={styles.similarityBadge}>{similarity}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={similarity}
                  onChange={e => setSimilarity(parseInt(e.target.value))}
                  className={styles.similaritySlider}
                />
                <div className={styles.similarityTicks}>
                  <span>Livre</span>
                  <span className={styles.similarityHint}>{similarityLabel(similarity)}</span>
                  <span>Idêntico</span>
                </div>
              </div>
            )}

            {/* Elementos extras */}
            <div className={styles.field}>
              <label>
                Elementos visuais extras
                <span className={styles.optional}>(logo, overlay, sticker…)</span>
              </label>
              <div
                className={`${styles.dropzone} ${styles.dropzoneWide} ${extraPreview ? styles.hasFile : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, 'extra')}
                onClick={() => extraInputRef.current?.click()}
              >
                {extraPreview ? (
                  <img src={extraPreview} alt="Elemento extra" className={styles.previewWide} />
                ) : (
                  <>
                    <span className={styles.dropIcon}>🎨</span>
                    <p>Arraste ou clique para enviar</p>
                    <p className={styles.dropSub}>Logo, marca d'água, ícone, sticker — PNG com transparência recomendado</p>
                  </>
                )}
              </div>
              {extraPreview && (
                <button
                  className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
                  onClick={() => { setExtraFile(null); setExtraPreview(null) }}
                >Remover elemento</button>
              )}
              <input ref={extraInputRef} type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'extra')} />
            </div>

            {/* Erro */}
            {error && <div className={styles.error}>⚠️ {error}</div>}

            {/* Botão gerar */}
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
                O Gemini está combinando suas imagens e instruções. Aguarde…
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
