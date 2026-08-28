import { useState } from 'react'

interface CustomTextInputProps {
  section: string
  onGenerate: (content: string) => void
}

export function CustomTextInput({ section, onGenerate }: CustomTextInputProps) {
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [keywords, setKeywords] = useState('')

  const handleGenerate = () => {
    if (!text.trim()) return
    onGenerate(text)
  }

  return (
    <div className="custom-text-input">
      <h3>Custom Text</h3>
      <p>Write what you want to say, and we'll optimize it for LinkedIn.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type your content here..."
        rows={6}
        className="custom-textarea"
      />

      <div className="custom-options">
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="Target role (optional)"
          className="role-input"
        />
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Keywords (comma separated)"
          className="keywords-input"
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleGenerate}
        disabled={!text.trim()}
      >
        Generate Optimized Version
      </button>
    </div>
  )
}
