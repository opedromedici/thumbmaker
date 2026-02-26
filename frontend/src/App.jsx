import { useState } from 'react'
import Step1Category from './components/Step1Category'
import Step2Generator from './components/Step2Generator'
import EditorView from './components/EditorView'
import Header from './components/Header'
import styles from './App.module.css'

export default function App() {
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null)
  const [generatedElements, setGeneratedElements] = useState([])

  function handleSelectCategory(cat) {
    setSelectedCategory(cat)
    setStep(2)
  }

  function handleGenerated({ url, elements }) {
    setGeneratedImageUrl(url)
    setGeneratedElements(elements || [])
    setStep(3)
  }

  function handleEditorBlank() {
    setGeneratedImageUrl(null)
    setGeneratedElements([])
    setStep(3)
  }

  function handleBack() {
    if (step === 2) { setStep(1); setSelectedCategory(null) }
    if (step === 3) { setStep(2); setGeneratedImageUrl(null); setGeneratedElements([]) }
  }

  return (
    <div className={styles.app}>
      <Header step={step} onBack={step > 1 ? handleBack : null} />

      {step === 1 && (
        <Step1Category onSelect={handleSelectCategory} />
      )}

      {step === 2 && selectedCategory && (
        <Step2Generator
          category={selectedCategory}
          onGenerated={handleGenerated}
          onEditorBlank={handleEditorBlank}
        />
      )}

      {step === 3 && (
        <EditorView
          generatedImageUrl={generatedImageUrl}
          elements={generatedElements}
          category={selectedCategory}
          onBack={handleBack}
          onRegenerate={handleBack}
        />
      )}
    </div>
  )
}
