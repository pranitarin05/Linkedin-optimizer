interface ScoreDisplayProps {
  score: number
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const getColor = () => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#eab308'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  const getLabel = () => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Needs Work'
    return 'Critical'
  }

  return (
    <div className="score-display">
      <div className="score-circle" style={{ borderColor: getColor() }}>
        <span className="score-value">{score}</span>
        <span className="score-label">/ 100</span>
      </div>
      <div className="score-status" style={{ color: getColor() }}>
        {getLabel()}
      </div>
    </div>
  )
}
