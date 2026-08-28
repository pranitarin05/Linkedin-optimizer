import { useState, useEffect, useCallback } from 'react'
import { ScoreDisplay } from './components/ScoreDisplay'
import { Checklist } from './components/Checklist'
import { DraftEditor } from './components/DraftEditor'
import { PersonaSelector } from './components/PersonaSelector'
import { UpdatePathPicker } from './components/UpdatePathPicker'
import { CVUpload } from './components/CVUpload'
import { CustomTextInput } from './components/CustomTextInput'
import type { ScrapedProfile, ScoringResult, ContentGenerationResponse, Persona } from '../types'

type Step = 'loading' | 'persona' | 'score' | 'source' | 'generating' | 'review' | 'update'

export default function App() {
  const [step, setStep] = useState<Step>('loading')
  const [profile, setProfile] = useState<ScrapedProfile | null>(null)
  const [score, setScore] = useState<ScoringResult | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [draft, setDraft] = useState<ContentGenerationResponse | null>(null)
  const [persona, setPersona] = useState<Persona | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      // Request profile scrape from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setError('No active tab found')
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PROFILE' })
      setProfile(response)

      // TODO: Call backend for scoring
      // const scoreResult = await apiRequest('/profile/score', { method: 'POST', body: response })
      // setScore(scoreResult)

      setStep('score')
    } catch (err) {
      setError('Failed to scrape profile. Make sure you are on your LinkedIn profile page.')
      console.error(err)
    }
  }, [])

  useEffect(() => {
    // Check if we already have a persona
    chrome.storage.local.get('persona', (data) => {
      if (data.persona) {
        setPersona(data.persona)
        loadProfile()
      } else {
        setStep('persona')
      }
    })
  }, [loadProfile])

  const handlePersonaSelect = async (selectedPersona: Persona) => {
    setPersona(selectedPersona)
    await chrome.storage.local.set({ persona: selectedPersona })
    loadProfile()
  }

  const handleSectionSelect = (section: string) => {
    setSelectedSection(section)
    setStep('source')
  }

  const handleSourceSelect = (source: 'cv' | 'custom') => {
    // CV and Custom input components handle the next step
  }

  const handleGenerate = async (content: string, source: 'cv' | 'custom') => {
    setStep('generating')
    try {
      // TODO: Call backend for content generation
      // const result = await apiRequest('/content/generate', {
      //   method: 'POST',
      //   body: {
      //     source,
      //     section: selectedSection,
      //     customText: source === 'custom' ? content : undefined,
      //     targetRole: persona?.id,
      //   }
      // })
      // setDraft(result)
      setStep('review')
    } catch (err) {
      setError('Failed to generate content')
      console.error(err)
    }
  }

  const handleApprove = async () => {
    if (!draft || !selectedSection) return

    setStep('update')
  }

  const handleUpdateComplete = () => {
    setDraft(null)
    setSelectedSection(null)
    setStep('score')
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => { setError(null); setStep('persona') }}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>LinkedIn Optimizer</h1>
      </header>

      <main className="app-content">
        {step === 'loading' && (
          <div className="loading">
            <p>Loading your profile...</p>
          </div>
        )}

        {step === 'persona' && (
          <PersonaSelector onSelect={handlePersonaSelect} />
        )}

        {step === 'score' && score && (
          <>
            <ScoreDisplay score={score.overallScore} />
            <Checklist
              sections={score.sections}
              onOptimize={handleSectionSelect}
            />
          </>
        )}

        {step === 'source' && (
          <div className="source-selection">
            <h2>Optimize: {selectedSection}</h2>
            <p>How would you like to provide content?</p>
            <div className="source-buttons">
              <button onClick={() => handleSourceSelect('cv')}>
                Upload CV/Resume
              </button>
              <button onClick={() => handleSourceSelect('custom')}>
                Custom Text
              </button>
            </div>
          </div>
        )}

        {step === 'source' && selectedSection && (
          <>
            {selectedSection && (
              <div>
                <CVUpload
                  section={selectedSection}
                  onGenerate={(content) => handleGenerate(content, 'cv')}
                />
                <CustomTextInput
                  section={selectedSection}
                  onGenerate={(content) => handleGenerate(content, 'custom')}
                />
              </div>
            )}
          </>
        )}

        {step === 'generating' && (
          <div className="loading">
            <p>Generating optimized content...</p>
          </div>
        )}

        {step === 'review' && draft && (
          <DraftEditor
            draft={draft}
            onApprove={handleApprove}
            onRegenerate={() => handleGenerate('', 'custom')}
            onDiscard={() => { setDraft(null); setStep('score') }}
          />
        )}

        {step === 'update' && draft && selectedSection && (
          <UpdatePathPicker
            section={selectedSection}
            value={draft.draft}
            onComplete={handleUpdateComplete}
          />
        )}
      </main>
    </div>
  )
}
