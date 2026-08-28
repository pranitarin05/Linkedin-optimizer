import { useState } from 'react'
import type { ContentGenerationResponse } from '../../types'

interface DraftEditorProps {
  draft: ContentGenerationResponse
  onApprove: () => void
  onRegenerate: () => void
  onDiscard: () => void
}

export function DraftEditor({ draft, onApprove, onRegenerate, onDiscard }: DraftEditorProps) {
  const [editedText, setEditedText] = useState(draft.draft)

  return (
    <div className="draft-editor">
      <div className="draft-header">
        <h2>Optimized Draft</h2>
        <div className="match-score">
          Match Score: <strong>{draft.matchScore}</strong>/100
        </div>
      </div>

      <div className="draft-content">
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={10}
          className="draft-textarea"
        />
      </div>

      {draft.appliedRules.length > 0 && (
        <div className="applied-rules">
          <h3>Applied Rules</h3>
          <ul>
            {draft.appliedRules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="draft-actions">
        <button className="btn-secondary" onClick={onDiscard}>
          Discard
        </button>
        <button className="btn-secondary" onClick={onRegenerate}>
          Regenerate
        </button>
        <button className="btn-primary" onClick={onApprove}>
          Approve
        </button>
      </div>
    </div>
  )
}
