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
      // TODO: Upload to backend and generate content
      // const formData = new FormData()
      // formData.append('file', file)
      // const response = await apiRequest('/content/extract', { method: 'POST', body: formData })
      // onGenerate(response)

      // For now, simulate
      await new Promise(resolve => setTimeout(resolve, 1000))
      onGenerate(file.name)
    } catch (err) {
      console.error('Upload failed:', err)
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
