import { useState, useEffect } from 'react'
import styles from './Step1Category.module.css'

export default function Step1Category({ onSelect }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { setCategories(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p>Carregando categorias…</p>
      </div>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <span className={styles.eyebrow}>Passo 1 de 3</span>
        <h1 className={styles.title}>
          Qual é o <span className={styles.highlight}>objetivo</span> do seu vídeo?
        </h1>
        <p className={styles.subtitle}>
          Escolha a categoria certa para ativar o estilo psicológico da sua thumbnail.
        </p>
      </div>

      <div className={styles.grid}>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={styles.card}
            style={{ '--cat-color': cat.color }}
            onClick={() => onSelect(cat)}
          >
            <span className={styles.cardIcon}>{cat.icon}</span>
            <h3 className={styles.cardName}>{cat.name}</h3>
            <div className={styles.cardBar} />
          </button>
        ))}
      </div>
    </main>
  )
}
