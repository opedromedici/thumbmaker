import { useRef } from 'react'
import styles from './EditorSidebar.module.css'

export default function EditorSidebar({ editorRef, onImageUpload }) {
  const uploadRef = useRef(null)

  function addText() {
    const canvas = editorRef.current?.getFabric()
    if (!canvas) return
    import('fabric').then(({ fabric }) => {
      const t = new fabric.IText('Seu texto', {
        left: 80,
        top: 300,
        fontSize: 90,
        fontFamily: 'Impact',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        paintFirst: 'stroke',
        selectable: true,
        editable: true,
      })
      canvas.add(t)
      canvas.setActiveObject(t)
      canvas.renderAll()
    })
  }

  function handleFiles(files) {
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) onImageUpload(f)
    })
  }

  return (
    <div className={styles.sidebar}>
      <p className={styles.title}>Editor</p>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Adicionar elementos</p>
        <button className={`btn btn-secondary ${styles.actionBtn}`} onClick={addText}>
          <span>T</span> Adicionar texto
        </button>
        <button
          className={`btn btn-secondary ${styles.actionBtn}`}
          onClick={() => uploadRef.current?.click()}
        >
          <span>📸</span> Adicionar imagem
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Dicas</p>
        <ul className={styles.tips}>
          <li>Selecione um elemento para ver as opções de edição</li>
          <li>Duplo clique nos textos para editar o conteúdo</li>
          <li>Arraste os cantos para redimensionar</li>
          <li>Delete ou Backspace remove o selecionado</li>
        </ul>
      </div>
    </div>
  )
}
