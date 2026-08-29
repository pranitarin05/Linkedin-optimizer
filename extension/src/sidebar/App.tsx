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

const API_URL = 'https://linkedin-optimizer-506l.onrender.com'

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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url?.includes('linkedin.com/in/')) {
        setError('Please navigate to your LinkedIn profile page first.')
        setStep('loading')
        return
      }

      // Ensure content script is injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/index.ts'],
        })
      } catch (_) {
        // Already injected, ignore
      }

      // Small delay to let content script initialize
      await new Promise(r => setTimeout(r, 500))

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PROFILE' })

      if (!response || !response.sections) {
        setError('Could not parse profile. The LinkedIn DOM may have changed.')
        return
      }

      setProfile(response)

      // Call backend for scoring
      try {
        const scoreResult = await fetch(`${API_URL}/profile/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        }).then(r => r.json())

        setScore(scoreResult)
      } catch (scoreErr) {
        console.error('Scoring failed:', scoreErr)
        // Use a basic local score as fallback
        setScore(buildLocalScore(response))
      }

      setStep('score')
    } catch (err) {
      console.error('Scrape error:', err)
      setError('Failed to scrape profile. Make sure you are on your own LinkedIn profile page.')
    }
  }, [])

  // Local scoring fallback when backend is unreachable
  function buildLocalScore(p: ScrapedProfile): ScoringResult {
    const sections: Record<string, { score: number; status: string; issues: string[]; tips: string[] }> = {}

    const headline = p.sections.headline
    const hScore = !headline.exists ? 0 : headline.length < 40 ? 40 : headline.length < 100 ? 65 : 85
    sections.headline = {
      score: hScore,
      status: hScore >= 80 ? 'excellent' : hScore >= 60 ? 'good' : 'needs_work',
      issues: hScore < 40 ? ['Headline is missing'] : hScore < 65 ? ['Headline is too short'] : [],
      tips: hScore < 80 ? ['Include your job title', 'Add key skills', 'Keep it 40-220 characters'] : [],
    }

    const about = p.sections.about
    const aScore = !about.exists ? 0 : about.length < 200 ? 35 : about.length < 500 ? 60 : 85
    sections.about = {
      score: aScore,
      status: aScore >= 80 ? 'excellent' : aScore >= 60 ? 'good' : 'needs_work',
      issues: aScore < 35 ? ['About section is missing'] : aScore < 60 ? ['About section is too short (aim for 200+ chars)'] : [],
      tips: aScore < 80 ? ['Start with a strong opening', 'Include metrics', 'End with a call to action'] : [],
    }

    const exp = p.sections.experience
    const eScore = exp.length === 0 ? 0 : exp.length < 2 ? 40 : 75
    sections.experience = {
      score: eScore,
      status: eScore >= 80 ? 'excellent' : eScore >= 60 ? 'good' : 'needs_work',
      issues: eScore < 40 ? ['No experience entries found'] : eScore < 60 ? ['Add more experience entries'] : [],
      tips: eScore < 80 ? ['Use bullet points', 'Include metrics', 'Start with action verbs'] : [],
    }

    const skills = p.sections.skills
    const sScore = skills.length === 0 ? 0 : skills.length < 5 ? 40 : 80
    sections.skills = {
      score: sScore,
      status: sScore >= 80 ? 'excellent' : sScore >= 60 ? 'good' : 'needs_work',
      issues: sScore < 40 ? ['No skills found'] : sScore < 60 ? ['Add at least 5 skills'] : [],
      tips: sScore < 80 ? ['Add both technical and soft skills', 'Pin your top 3'] : [],
    }

    const overall = Math.round(
      (sections.headline.score * 0.25) +
      (sections.about.score * 0.25) +
      (sections.experience.score * 0.3) +
      (sections.skills.score * 0.2)
    )

    return { overallScore: overall, sections }
  }

  useEffect(() => {
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
    // handled by child components
  }

  const handleGenerate = async (content: string, source: 'cv' | 'custom') => {
    setStep('generating')
    try {
      const result = await fetch(`${API_URL}/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          section: selectedSection,
          customText: source === 'custom' ? content : undefined,
          targetRole: persona?.id,
        }),
      }).then(r => r.json())

      setDraft(result)
      setStep('review')
    } catch (err) {
      console.error('Generate failed:', err)
      // Fallback: show the raw content as draft
      setDraft({
        draft: content,
        matchScore: 50,
        section: selectedSection || '',
        source,
        appliedRules: ['Backend unavailable — showing raw input'],
      })
      setStep('review')
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
          <button onClick={() => { setError(null); setStep('loading'); loadProfile() }}>
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

        {step === 'source' && selectedSection && (
          <div>
            <button className="btn-secondary" onClick={() => setStep('score')} style={{ marginBottom: 12 }}>
              Back
            </button>
            <h2 style={{ marginBottom: 8 }}>Optimize: {selectedSection}</h2>
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
