/**
 * TemplatePreview — renderiza um preview estático de um template usando SVG/CSS.
 * Não usa Fabric.js. Apenas para visualização no catálogo.
 */

export default function TemplatePreview({ template, scale = 1 }) {
  const W = 1280
  const H = 720

  const style = {
    width: W * scale,
    height: H * scale,
    position: 'relative',
    background: template.background || '#111',
    overflow: 'hidden',
    flexShrink: 0,
  }

  return (
    <div style={style}>
      {/* Shapes */}
      {(template.shapes || []).map((shape, i) => {
        if (shape.type === 'rect') {
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: shape.x * scale,
                top: shape.y * scale,
                width: shape.width * scale,
                height: shape.height * scale,
                background: shape.fill,
              }}
            />
          )
        }
        return null
      })}

      {/* Image slots — shown as placeholder boxes */}
      {(template.imageSlots || []).map(slot => (
        <div
          key={slot.id}
          style={{
            position: 'absolute',
            left: slot.x * scale,
            top: slot.y * scale,
            width: slot.width * scale,
            height: slot.height * scale,
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)',
            fontSize: 10 * scale,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {slot.label}
        </div>
      ))}

      {/* Text elements */}
      {(template.textElements || []).map(el => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x * scale,
            top: el.y * scale,
            fontSize: el.fontSize * scale,
            fontFamily: el.fontFamily || 'Impact',
            color: el.fill || '#fff',
            WebkitTextStroke: el.stroke
              ? `${(el.strokeWidth || 2) * scale}px ${el.stroke}`
              : 'none',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {el.text}
        </div>
      ))}
    </div>
  )
}
