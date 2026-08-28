import { useState } from 'react'

interface UpdatePathPickerProps {
  section: string
  value: string
  onComplete: () => void
}

export function UpdatePathPicker({ section, value, onComplete }: UpdatePathPickerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAutoSync = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'FILL_SECTION',
        payload: { section, value },
      })

      if (response.success) {
        // Show success message
        alert('Content synced! Please review and click Save on LinkedIn.')
      } else {
        // Fallback to manual copy
        alert(`Auto-sync failed: ${response.error}. Please copy manually.`)
      }
    } catch (err) {
      alert('Auto-sync unavailable. Please copy manually.')
    }
  }

  const isCertification = section === 'certifications'

  return (
    <div className="update-path-picker">
      <h2>Apply Changes</h2>
      <p>Choose how to apply the optimized content:</p>

      {isCertification && (
        <button className="path-option path-deeplink" onClick={() => {
          // Build deep-link URL
          const params = new URLSearchParams({
            startTask: 'CERTIFICATION_NAME',
            name: '',
            organizationName: '',
          })
          const url = `https://www.linkedin.com/profile/add?${params.toString()}`
          chrome.tabs.create({ url })
        }}>
          <strong>Add to Profile (Deep Link)</strong>
          <span>Opens LinkedIn's native dialog. Zero risk.</span>
        </button>
      )}

      <button className="path-option path-sync" onClick={handleAutoSync}>
        <strong>Auto-Sync</strong>
        <span>Fills LinkedIn form automatically. You review and save.</span>
      </button>

      <button className="path-option path-copy" onClick={handleCopy}>
        <strong>{copied ? 'Copied!' : 'Copy to Clipboard'}</strong>
        <span>Copy content and paste into LinkedIn manually.</span>
      </button>

      <button className="btn-secondary" onClick={onComplete}>
        Back to Score
      </button>
    </div>
  )
}
