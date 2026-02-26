import { useState, useEffect } from 'react'
import TemplatePreview from './TemplatePreview'
import styles from './Step2Templates.module.css'

export default function Step2Templates({ category, onSelect }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/templates/${category.id}`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category.id])

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p>Carregando templates…</p>
      </div>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.catBadge} style={{ color: category.color }}>
          {category.icon} {category.name}
        </div>
        <h1 className={styles.title}>Escolha seu template</h1>
        <p className={styles.subtitle}>
          {templates.length} templates otimizados para conversão
        </p>
      </div>

      <div className={styles.grid}>
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className={`${styles.card} ${hovered === tpl.id ? styles.hovered : ''}`}
            onMouseEnter={() => setHovered(tpl.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(tpl)}
          >
            <div className={styles.preview}>
              <TemplatePreview template={tpl} scale={0.24} />
            </div>
            <div className={styles.info}>
              <h3 className={styles.tplName}>{tpl.name}</h3>
              <p className={styles.archetype}>{tpl.archetype}</p>
            </div>
            <button className={`btn btn-primary btn-sm ${styles.useBtn}`}>
              Usar este →
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
