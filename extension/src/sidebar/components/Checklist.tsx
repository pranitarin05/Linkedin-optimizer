import type { SectionScore } from '../../types'

interface ChecklistProps {
  sections: Record<string, SectionScore>
  onOptimize: (section: string) => void
}

const SECTION_LABELS: Record<string, string> = {
  headline: 'Headline',
  about: 'About',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  featured: 'Featured',
  recommendations: 'Recommendations',
}

export function Checklist({ sections, onOptimize }: ChecklistProps) {
  const getStatusIcon = (status: SectionScore['status']) => {
    switch (status) {
      case 'excellent': return '✓'
      case 'good': return '○'
      case 'needs_work': return '△'
      case 'critical': return '✗'
    }
  }

  const getStatusColor = (status: SectionScore['status']) => {
    switch (status) {
      case 'excellent': return '#22c55e'
      case 'good': return '#3b82f6'
      case 'needs_work': return '#eab308'
      case 'critical': return '#ef4444'
    }
  }

  return (
    <div className="checklist">
      <h2>Profile Sections</h2>
      <ul>
        {Object.entries(sections).map(([key, section]) => (
          <li key={key} className="checklist-item">
            <div className="checklist-info">
              <span
                className="checklist-icon"
                style={{ color: getStatusColor(section.status) }}
              >
                {getStatusIcon(section.status)}
              </span>
              <span className="checklist-label">
                {SECTION_LABELS[key] || key}
              </span>
              <span className="checklist-score">{section.score}</span>
            </div>
            {section.status !== 'excellent' && (
              <button
                className="optimize-btn"
                onClick={() => onOptimize(key)}
              >
                Optimize
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
