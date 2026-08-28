import { useState } from 'react'
import { PERSONAS } from '../../types'
import type { Persona } from '../../types'

interface PersonaSelectorProps {
  onSelect: (persona: Persona) => void
}

export function PersonaSelector({ onSelect }: PersonaSelectorProps) {
  return (
    <div className="persona-selector">
      <h2>Who are you?</h2>
      <p>Select your profile to get personalized recommendations.</p>
      <div className="persona-options">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            className="persona-option"
            onClick={() => onSelect(persona)}
          >
            <strong>{persona.label}</strong>
            <span>{persona.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
