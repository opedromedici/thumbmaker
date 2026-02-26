import styles from './Header.module.css'

const STEPS = ['Objetivo', 'Gerador IA', 'Editor']

export default function Header({ step, onBack }) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🎯</span>
        <span className={styles.logoText}>ThumbMaker</span>
        <span className={styles.logoBadge}>MVP</span>
      </div>

      <nav className={styles.steps}>
        {STEPS.map((label, i) => {
          const n = i + 1
          const active = step === n
          const done = step > n
          return (
            <div
              key={n}
              className={`${styles.stepItem} ${active ? styles.active : ''} ${done ? styles.done : ''}`}
            >
              <span className={styles.stepNum}>{done ? '✓' : n}</span>
              <span className={styles.stepLabel}>{label}</span>
              {i < STEPS.length - 1 && <span className={styles.stepSep} />}
            </div>
          )
        })}
      </nav>

      <div className={styles.actions}>
        {onBack && (
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Voltar
          </button>
        )}
      </div>
    </header>
  )
}
