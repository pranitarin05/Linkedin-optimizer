import { useState, useEffect } from 'react'
import type { ProfileUpdate } from '../../types'

export function HistoryView() {
  const [updates, setUpdates] = useState<ProfileUpdate[]>([])

  useEffect(() => {
    // TODO: Fetch from backend
    // apiRequest('/updates/history').then(setUpdates)
  }, [])

  const getStatusLabel = (status: ProfileUpdate['status']) => {
    switch (status) {
      case 'synced': return 'Synced'
      case 'manual_copy': return 'Copied'
      case 'deep_linked': return 'Deep Linked'
      case 'failed': return 'Failed'
      default: return 'Pending'
    }
  }

  return (
    <div className="history-view">
      <h2>Update History</h2>
      {updates.length === 0 ? (
        <p className="no-history">No updates yet.</p>
      ) : (
        <ul className="history-list">
          {updates.map((update) => (
            <li key={update.id} className="history-item">
              <div className="history-info">
                <span className="history-section">{update.section}</span>
                <span className="history-status">{getStatusLabel(update.status)}</span>
              </div>
              <div className="history-date">
                {update.createdAt ? new Date(update.createdAt).toLocaleDateString() : '-'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
