import { useState, useEffect } from 'react'
import styles from './PropertiesBar.module.css'

const FONT_GROUPS = [
  {
    group: 'Impacto / Viral',
    fonts: ['Anton', 'Bebas Neue', 'League Spartan', 'Montserrat', 'Oswald', 'Archivo Black'],
  },
  {
    group: 'Autoridade',
    fonts: ['Poppins', 'Inter', 'Manrope'],
  },
  {
    group: 'Dinheiro / Chamativo',
    fonts: ['Bangers', 'Luckiest Guy'],
  },
  {
    group: 'Clássicas',
    fonts: ['Impact', 'Arial Black', 'Arial', 'Georgia', 'Verdana'],
  },
]

const SIZES = [24, 32, 40, 48, 56, 64, 72, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200]

const DEFAULT_PROPS = {
  fontSize: 80,
  fontFamily: 'Anton',
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 3,
  fontWeight: 'normal',
  fontStyle: 'normal',
  underline: false,
  charSpacing: 0,
  lineHeight: 1.16,
  shadowMode: 'none', // 'none' | 'shadow' | 'glow'
  shadowColor: '#000000',
  shadowBlur: 15,
  shadowOffsetX: 3,
  shadowOffsetY: 3,
  glowBlur: 20,
}

export default function PropertiesBar({ activeObj, editorRef }) {
  const [props, setProps] = useState(DEFAULT_PROPS)

  useEffect(() => {
    if (!activeObj) return

    const shadow = activeObj.shadow
    let shadowMode = 'none'
    let shadowColor = '#000000'
    let shadowBlur = 15
    let shadowOffsetX = 3
    let shadowOffsetY = 3
    let glowBlur = 20

    if (shadow) {
      const isGlow = (shadow.offsetX ?? 0) === 0 && (shadow.offsetY ?? 0) === 0
      shadowMode = isGlow ? 'glow' : 'shadow'
      shadowColor = shadow.color || '#000000'
      shadowBlur = shadow.blur ?? 15
      shadowOffsetX = shadow.offsetX ?? 3
      shadowOffsetY = shadow.offsetY ?? 3
      if (isGlow) glowBlur = shadow.blur ?? 20
    }

    setProps({
      fontSize: Math.round(activeObj.fontSize || 80),
      fontFamily: activeObj.fontFamily || 'Anton',
      fill: activeObj.fill || '#ffffff',
      stroke: activeObj.stroke || '#000000',
      strokeWidth: activeObj.strokeWidth || 0,
      fontWeight: activeObj.fontWeight || 'normal',
      fontStyle: activeObj.fontStyle || 'normal',
      underline: activeObj.underline || false,
      charSpacing: activeObj.charSpacing || 0,
      lineHeight: activeObj.lineHeight || 1.16,
      shadowMode,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      glowBlur,
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

  function applyShadow(updates) {
    const next = { ...props, ...updates }
    setProps(next)
    const canvas = editorRef.current?.getFabric()
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return

    import('fabric').then(({ fabric }) => {
      if (next.shadowMode === 'shadow') {
        obj.set('shadow', new fabric.Shadow({
          color: next.shadowColor,
          blur: next.shadowBlur,
          offsetX: next.shadowOffsetX,
          offsetY: next.shadowOffsetY,
        }))
      } else if (next.shadowMode === 'glow') {
        obj.set('shadow', new fabric.Shadow({
          color: next.fill,
          blur: next.glowBlur,
          offsetX: 0,
          offsetY: 0,
        }))
      } else {
        obj.set('shadow', null)
      }
      canvas.renderAll()
    })
  }

  function toggleBold() { apply('fontWeight', props.fontWeight === 'bold' ? 'normal' : 'bold') }
  function toggleItalic() { apply('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic') }
  function toggleUnderline() { apply('underline', !props.underline) }
  function deleteObj() { editorRef.current?.deleteSelected() }

  return (
    <div className={styles.bar}>
      {isText ? (
        <>
          {/* Font family — grouped dropdown with preview */}
          <select
            className={styles.select}
            value={props.fontFamily}
            style={{ fontFamily: props.fontFamily }}
            onChange={e => apply('fontFamily', e.target.value)}
          >
            {FONT_GROUPS.map(({ group, fonts }) => (
              <optgroup key={group} label={group}>
                {fonts.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Font size */}
          <select
            className={styles.select}
            style={{ width: 72 }}
            value={props.fontSize}
            onChange={e => apply('fontSize', parseInt(e.target.value))}
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Style toggles */}
          <button
            className={`${styles.toggle} ${props.fontWeight === 'bold' ? styles.on : ''}`}
            onClick={toggleBold} title="Negrito"
          ><b>B</b></button>
          <button
            className={`${styles.toggle} ${props.fontStyle === 'italic' ? styles.on : ''}`}
            onClick={toggleItalic} title="Itálico"
          ><i>I</i></button>
          <button
            className={`${styles.toggle} ${props.underline ? styles.on : ''}`}
            onClick={toggleUnderline} title="Sublinhado"
          ><u>U</u></button>

          <div className={styles.sep} />

          {/* Text color */}
          <label className={styles.colorLabel}>
            <span>Texto</span>
            <input type="color" value={props.fill} onChange={e => apply('fill', e.target.value)} />
          </label>

          {/* Stroke color */}
          <label className={styles.colorLabel}>
            <span>Stroke</span>
            <input type="color" value={props.stroke || '#000000'} onChange={e => apply('stroke', e.target.value)} />
          </label>

          {/* Stroke width */}
          <label className={styles.sliderLabel}>
            <span>Grossura</span>
            <input
              type="range" min={0} max={12}
              value={props.strokeWidth}
              onChange={e => apply('strokeWidth', parseInt(e.target.value))}
            />
            <span>{props.strokeWidth}</span>
          </label>

          <div className={styles.sep} />

          {/* Letter spacing */}
          <label className={styles.sliderLabel}>
            <span>Espaço</span>
            <input
              type="range" min={-100} max={800} step={10}
              value={props.charSpacing}
              onChange={e => apply('charSpacing', parseInt(e.target.value))}
            />
            <span>{props.charSpacing}</span>
          </label>

          {/* Line height */}
          <label className={styles.sliderLabel}>
            <span>Altura</span>
            <input
              type="range" min={0.8} max={3} step={0.05}
              value={props.lineHeight}
              onChange={e => apply('lineHeight', parseFloat(e.target.value))}
            />
            <span>{props.lineHeight.toFixed(2)}</span>
          </label>

          <div className={styles.sep} />

          {/* Shadow toggle */}
          <button
            className={`${styles.toggle} ${props.shadowMode === 'shadow' ? styles.on : ''}`}
            onClick={() => applyShadow({ shadowMode: props.shadowMode === 'shadow' ? 'none' : 'shadow' })}
            title="Sombra"
          >S</button>

          {props.shadowMode === 'shadow' && (
            <>
              <label className={styles.colorLabel}>
                <span>Cor</span>
                <input type="color" value={props.shadowColor} onChange={e => applyShadow({ shadowColor: e.target.value })} />
              </label>
              <label className={styles.sliderLabel}>
                <span>Blur</span>
                <input
                  type="range" min={0} max={50}
                  value={props.shadowBlur}
                  onChange={e => applyShadow({ shadowBlur: parseInt(e.target.value) })}
                />
                <span>{props.shadowBlur}</span>
              </label>
            </>
          )}

          {/* Glow toggle */}
          <button
            className={`${styles.toggle} ${props.shadowMode === 'glow' ? styles.on : ''}`}
            onClick={() => applyShadow({ shadowMode: props.shadowMode === 'glow' ? 'none' : 'glow' })}
            title="Brilho (Glow)"
            style={{ fontSize: 11 }}
          >✦</button>

          {props.shadowMode === 'glow' && (
            <label className={styles.sliderLabel}>
              <span>Brilho</span>
              <input
                type="range" min={0} max={60}
                value={props.glowBlur}
                onChange={e => applyShadow({ glowBlur: parseInt(e.target.value) })}
              />
              <span>{props.glowBlur}</span>
            </label>
          )}
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
