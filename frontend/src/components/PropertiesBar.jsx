import { useState, useEffect } from 'react'
import styles from './PropertiesBar.module.css'

const FONTS = ['Impact', 'Arial Black', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS']
const SIZES = [24, 32, 40, 48, 56, 64, 72, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200]

export default function PropertiesBar({ activeObj, editorRef }) {
  const [props, setProps] = useState({
    fontSize: 80,
    fontFamily: 'Impact',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 3,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
  })

  useEffect(() => {
    if (!activeObj) return
    setProps({
      fontSize: Math.round(activeObj.fontSize || 80),
      fontFamily: activeObj.fontFamily || 'Impact',
      fill: activeObj.fill || '#ffffff',
      stroke: activeObj.stroke || '#000000',
      strokeWidth: activeObj.strokeWidth || 0,
      fontWeight: activeObj.fontWeight || 'normal',
      fontStyle: activeObj.fontStyle || 'normal',
      underline: activeObj.underline || false,
    })
  }, [activeObj])

  const isText = activeObj?.type === 'text' || activeObj?.type === 'i-text'

  function apply(key, value) {
    const next = { ...props, [key]: value }
    setProps(next)
    const canvas = editorRef.current?.getFabric()
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj) {
      obj.set({ [key]: value })
      canvas.renderAll()
    }
  }

  function toggleBold() {
    apply('fontWeight', props.fontWeight === 'bold' ? 'normal' : 'bold')
  }
  function toggleItalic() {
    apply('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic')
  }
  function toggleUnderline() {
    apply('underline', !props.underline)
  }

  function deleteObj() {
    editorRef.current?.deleteSelected()
  }

  return (
    <div className={styles.bar}>
      {isText ? (
        <>
          {/* Font family */}
          <select
            className={styles.select}
            value={props.fontFamily}
            onChange={e => apply('fontFamily', e.target.value)}
          >
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Font size */}
          <select
            className={styles.select}
            style={{ width: 80 }}
            value={props.fontSize}
            onChange={e => apply('fontSize', parseInt(e.target.value))}
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Style toggles */}
          <button
            className={`${styles.toggle} ${props.fontWeight === 'bold' ? styles.on : ''}`}
            onClick={toggleBold}
            title="Negrito"
          >
            <b>B</b>
          </button>
          <button
            className={`${styles.toggle} ${props.fontStyle === 'italic' ? styles.on : ''}`}
            onClick={toggleItalic}
            title="Itálico"
          >
            <i>I</i>
          </button>
          <button
            className={`${styles.toggle} ${props.underline ? styles.on : ''}`}
            onClick={toggleUnderline}
            title="Sublinhado"
          >
            <u>U</u>
          </button>

          <div className={styles.sep} />

          {/* Text color */}
          <label className={styles.colorLabel}>
            <span>Texto</span>
            <input
              type="color"
              value={props.fill}
              onChange={e => apply('fill', e.target.value)}
            />
          </label>

          {/* Stroke color */}
          <label className={styles.colorLabel}>
            <span>Contorno</span>
            <input
              type="color"
              value={props.stroke || '#000000'}
              onChange={e => apply('stroke', e.target.value)}
            />
          </label>

          {/* Stroke width */}
          <label className={styles.sliderLabel}>
            <span>Grossura</span>
            <input
              type="range"
              min={0}
              max={12}
              value={props.strokeWidth}
              onChange={e => apply('strokeWidth', parseInt(e.target.value))}
            />
            <span>{props.strokeWidth}</span>
          </label>
        </>
      ) : (
        <span className={styles.objType}>
          {activeObj?.type === 'image' ? '🖼 Imagem selecionada' : '⬛ Forma selecionada'}
        </span>
      )}

      <div className={styles.gap} />

      <button
        className="btn btn-danger btn-sm"
        onClick={deleteObj}
        title="Deletar (Del)"
      >
        🗑 Remover
      </button>
    </div>
  )
}
