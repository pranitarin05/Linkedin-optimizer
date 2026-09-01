import { useState } from 'react'

interface CVUploadProps {
  section: string
  onGenerate: (content: string) => void
}

export function CVUpload({ section, onGenerate }: CVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const API_URL = 'https://linkedin-optimizer-506l.onrender.com'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('section', section)

      const response = await fetch(`${API_URL}/content/extract`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      const extracted = data.extracted
      let text = ''
      if (typeof extracted === 'string') {
        text = extracted
      } else if (extracted && typeof extracted === 'object') {
        text = extracted.raw_text || Object.values(extracted.sections || {}).join('\n') || JSON.stringify(extracted)
      }
      if (!text || text.length < 10) {
        throw new Error('Could not extract meaningful content from the file. Try pasting text instead.')
      }
      onGenerate(text)
    } catch (err: any) {
      console.error('Upload failed:', err)
      alert(err.message || 'Upload failed. Try pasting your CV text instead.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cv-upload">
      <h3>Upload CV/Resume</h3>
      <p>Upload your CV or resume to extract content for this section.</p>

      <div className="upload-area">
        <input
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={handleFileChange}
          id="cv-upload"
          className="file-input"
        />
        <label htmlFor="cv-upload" className="file-label">
          {file ? file.name : 'Choose file (PDF or DOCX)'}
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Generate from CV'}
      </button>
    </div>
  )
}
