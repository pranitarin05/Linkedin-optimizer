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

// This function runs inside the LinkedIn page via chrome.scripting.executeScript
function scrapeLinkedInProfile() {
  function extractText(el) {
    if (!el) return ''
    return (el.textContent || '').trim()
  }

  function trySels(sels) {
    for (const s of sels) {
      try {
        const el = document.querySelector(s)
        if (el && el.textContent && el.textContent.trim()) return el.textContent.trim()
      } catch (_) {}
    }
    return ''
  }

  function trySelsHTML(sels) {
    for (const s of sels) {
      try {
        const el = document.querySelector(s)
        if (el && el.textContent && el.textContent.trim()) {
          const parts = Array.from(el.querySelectorAll('p, span, li')).map(p => p.textContent.trim()).filter(Boolean)
          return parts.length > 0 ? parts.join('\n') : el.textContent.trim()
        }
      } catch (_) {}
    }
    return ''
  }

  // Headline
  const headline = trySels([
    'h1.text-heading-xlarge',
    '[data-anonymize="field-name"]',
    '.pv-text-details__left-panel h1',
    'section.pv-top-card h1',
    '.pv-top-card-v2-ctas h1',
    '.artdeco-entity-lockup__title h1',
    'main h1',
    'h1',
  ]).replace(/^--$/, '')

  // About
  const about = trySelsHTML([
    '#about ~ .display-flex .inline-show-more-text',
    '.pv-about-section .pv-about__summary-text',
    'section#about .inline-show-more-text',
    '[data-field="about"] .inline-show-more-text',
    'section.pv-about',
    '#about ~ div .display-flex',
    '#about ~ div span[aria-hidden="true"]',
    '#about',
  ])

  // Experience
  let experience = []
  const expContainer = document.querySelector('#experience ~ .pvs-list__outer-container') ||
    document.querySelector('section#experience') ||
    document.querySelector('#experience') ||
    document.querySelector('#experience ~ div') ||
    document.querySelector('[data-section="experience"]')
  if (expContainer) {
    const items = expContainer.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item, [data-view-name="profile-card"], .pvs-list__paged-list-item')
    experience = Array.from(items).map(item => {
      const title = extractText(item.querySelector('.t-bold span[aria-hidden="true"], span[aria-hidden="true"]'))
      const company = extractText(item.querySelector('.t-normal span[aria-hidden="true"], .pvs-entity__secondary-title span[aria-hidden="true"]'))
      const dates = extractText(item.querySelector('.pvs-entity__caption-wrapper, span[aria-hidden="false"]'))
      const description = extractText(item.querySelector('.pvs-entity__secondary-title, span[aria-hidden="false"]'))
      const parts = dates.split(' - ')
      return { title, company, location: '', startDate: (parts[0]||'').trim(), endDate: (parts[1]||'').trim(), description, isCurrent: (parts[1]||'').toLowerCase().includes('present') }
    }).filter(e => e.title || e.company || e.description)
  }

  // Skills
  let skills = []
  const skillsContainer = document.querySelector('#skills ~ .pvs-list__outer-container') ||
    document.querySelector('section#skills') ||
    document.querySelector('#skills') ||
    document.querySelector('#skills ~ div') ||
    document.querySelector('[data-section="skills"]')
  if (skillsContainer) {
    const items = skillsContainer.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
    skills = Array.from(items).map(item => ({
      name: extractText(item.querySelector('.t-bold span[aria-hidden="true"]')),
      endorsements: parseInt(extractText(item.querySelector('.pvs-entity__caption-wrapper'))) || 0,
    })).filter(s => s.name)
  }

  // Education
  let education = []
  const eduContainer = document.querySelector('#education ~ .pvs-list__outer-container') ||
    document.querySelector('section#education') ||
    document.querySelector('#education') ||
    document.querySelector('#education ~ div') ||
    document.querySelector('[data-section="education"]')
  if (eduContainer) {
    const items = eduContainer.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
    education = Array.from(items).map(item => {
      const school = extractText(item.querySelector('.t-bold span[aria-hidden="true"]'))
      const degree = extractText(item.querySelector('.pvs-entity__secondary-title'))
      const dates = extractText(item.querySelector('.pvs-entity__caption-wrapper'))
      const parts = dates.split(' - ')
      return { school, degree, field: '', startDate: (parts[0]||'').trim(), endDate: (parts[1]||'').trim() }
    }).filter(e => e.school)
  }

  // Certifications
  let certifications = []
  const certContainer = document.querySelector('#licenses_and_certifications ~ .pvs-list__outer-container') ||
    document.querySelector('section#licenses_and_certifications') ||
    document.querySelector('#licenses_and_certifications') ||
    document.querySelector('#licenses_and_certifications ~ div') ||
    document.querySelector('[data-section="licenses_and_certifications"]')
  if (certContainer) {
    const items = certContainer.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
    certifications = Array.from(items).map(item => ({
      name: extractText(item.querySelector('.t-bold span[aria-hidden="true"]')),
      organization: extractText(item.querySelector('.pvs-entity__secondary-title')),
      issueDate: extractText(item.querySelector('.pvs-entity__caption-wrapper')),
      credentialUrl: '', credentialId: '',
    })).filter(c => c.name)
  }

  return {
    profileUrl: window.location.href,
    scrapedAt: new Date().toISOString(),
    sections: {
      headline: { text: headline, length: headline.length, exists: headline.length > 0 },
      about: { text: about, length: about.length, exists: about.length > 0 },
      experience, education, skills,
      featured: [], certifications, recommendations: [],
      contactInfo: { email: '', website: '', phone: '', location: '' },
    },
  }
}

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
        return
      }

      // Execute scraper directly in the page context
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeLinkedInProfile,
      })

      const response = results?.[0]?.result
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
      } catch (_) {
        setScore(buildLocalScore(response))
      }

      setStep('score')
    } catch (err) {
      console.error('Scrape error:', err)
      setError('Failed to scrape profile. Make sure you are on your own LinkedIn profile page.')
    }
  }, [])

  function buildLocalScore(p: ScrapedProfile): ScoringResult {
    const s: Record<string, any> = {}
    const hl = p.sections.headline
    const hlS = !hl.exists ? 0 : hl.length < 40 ? 40 : hl.length < 100 ? 65 : 85
    s.headline = { score: hlS, status: hlS >= 80 ? 'excellent' : hlS >= 60 ? 'good' : 'needs_work', issues: hlS < 40 ? ['Missing'] : hlS < 65 ? ['Too short'] : [], tips: hlS < 80 ? ['Add job title + skills'] : [] }

    const ab = p.sections.about
    const abS = !ab.exists ? 0 : ab.length < 200 ? 35 : ab.length < 500 ? 60 : 85
    s.about = { score: abS, status: abS >= 80 ? 'excellent' : abS >= 60 ? 'good' : 'needs_work', issues: abS < 35 ? ['Missing'] : abS < 60 ? ['Too short'] : [], tips: abS < 80 ? ['Add metrics + CTA'] : [] }

    const ex = p.sections.experience
    const exS = ex.length === 0 ? 0 : ex.length < 2 ? 40 : 75
    s.experience = { score: exS, status: exS >= 80 ? 'excellent' : exS >= 60 ? 'good' : 'needs_work', issues: exS < 40 ? ['No entries'] : [], tips: exS < 80 ? ['Use bullets + metrics'] : [] }

    const sk = p.sections.skills
    const skS = sk.length === 0 ? 0 : sk.length < 5 ? 40 : 80
    s.skills = { score: skS, status: skS >= 80 ? 'excellent' : skS >= 60 ? 'good' : 'needs_work', issues: skS < 40 ? ['No skills'] : skS < 60 ? ['Add 5+ skills'] : [], tips: skS < 80 ? ['Pin top 3'] : [] }

    const overall = Math.round(hlS * 0.25 + abS * 0.25 + exS * 0.3 + skS * 0.2)
    return { overallScore: overall, sections: s }
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

  const handlePersonaSelect = async (p: Persona) => {
    setPersona(p)
    await chrome.storage.local.set({ persona: p })
    loadProfile()
  }

  const handleSectionSelect = (section: string) => { setSelectedSection(section); setStep('source') }

  const handleGenerate = async (content: string, source: 'cv' | 'custom') => {
    setStep('generating')
    try {
      const currentSectionContent = profile?.sections?.[selectedSection as keyof typeof profile.sections]
      const currentText = typeof currentSectionContent === 'object' && currentSectionContent !== null && 'text' in currentSectionContent
        ? (currentSectionContent as { text: string }).text
        : ''

      const result = await fetch(`${API_URL}/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          section: selectedSection,
          customText: content,
          targetRole: persona?.id,
          currentHeadline: selectedSection === 'headline' ? currentText : undefined,
          currentAbout: selectedSection === 'about' ? currentText : undefined,
        }),
      })

      if (!result.ok) {
        const err = await result.json().catch(() => ({ detail: 'Generation failed' }))
        throw new Error(err.detail || `Server error: ${result.status}`)
      }

      const data = await result.json()
      if (!data.draft) throw new Error('No draft returned from server')
      setDraft({
        draft: data.draft,
        matchScore: data.matchScore ?? data.match_score ?? 0,
        section: data.section || selectedSection || '',
        source: data.source || source,
        appliedRules: data.appliedRules ?? data.applied_rules ?? [],
      })
      setStep('review')
    } catch (err: any) {
      console.error('Generate error:', err)
      setDraft({
        draft: content || 'Generation failed. Please try again.',
        matchScore: 0,
        section: selectedSection || '',
        source,
        appliedRules: [`Error: ${err.message}`],
      })
      setStep('review')
    }
  }

  const handleApprove = () => { if (draft && selectedSection) setStep('update') }
  const handleUpdateComplete = () => { setDraft(null); setSelectedSection(null); setStep('score') }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => { setError(null); loadProfile() }}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header"><h1>LinkedIn Optimizer</h1></header>
      <main className="app-content">
        {step === 'loading' && <div className="loading"><p>Loading your profile...</p></div>}
        {step === 'persona' && <PersonaSelector onSelect={handlePersonaSelect} />}
        {step === 'score' && score && (
          <>
            <ScoreDisplay score={score.overallScore} />
            <Checklist sections={score.sections} onOptimize={handleSectionSelect} />
          </>
        )}
        {step === 'source' && selectedSection && (
          <div>
            <button className="btn-secondary" onClick={() => setStep('score')} style={{ marginBottom: 12 }}>Back</button>
            <h2 style={{ marginBottom: 8 }}>Optimize: {selectedSection}</h2>
            <CVUpload section={selectedSection} onGenerate={(c) => handleGenerate(c, 'cv')} />
            <CustomTextInput section={selectedSection} onGenerate={(c) => handleGenerate(c, 'custom')} />
          </div>
        )}
        {step === 'generating' && <div className="loading"><p>Generating...</p></div>}
        {step === 'review' && draft && (
          <DraftEditor draft={draft} onApprove={handleApprove} onRegenerate={() => handleGenerate('', 'custom')} onDiscard={() => { setDraft(null); setStep('score') }} />
        )}
        {step === 'update' && draft && selectedSection && (
          <UpdatePathPicker section={selectedSection} value={draft.draft} onComplete={handleUpdateComplete} />
        )}
      </main>
    </div>
  )
}
