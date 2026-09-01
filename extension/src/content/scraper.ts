import type { ProfileSection, SectionData, ExperienceEntry, EducationEntry, SkillEntry, CertificationEntry, ScrapedProfile } from '../types'

function getProfileUrl(): string {
  return window.location.href
}

function extractText(element: Element | null): string {
  if (!element) return ''
  return (element.textContent || '').trim()
}

function makeSection(text: string): SectionData {
  return { text, length: text.length, exists: text.length > 0 }
}

function trySelectors(selectors: string[]): string {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el && el.textContent?.trim()) return el.textContent.trim()
    } catch (_) {}
  }
  return ''
}

function trySelectorsHTML(selectors: string[]): string {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el && el.textContent?.trim()) {
        return Array.from(el.querySelectorAll('p, span, li'))
          .map(p => p.textContent?.trim())
          .filter(Boolean)
          .join('\n')
          || el.textContent!.trim()
      }
    } catch (_) {}
  }
  return ''
}

function extractHeadline(): SectionData {
  const text = trySelectors([
    'h1.text-heading-xlarge',
    '[data-anonymize="field-name"]',
    '.pv-text-details__left-panel h1',
    'section.pv-top-card h1',
    '.pv-top-card-v2-ctas h1',
    '.artdeco-entity-lockup__title h1',
    '.display-flex h1',
    'main h1',
    'h1',
  ])
  // Filter out placeholder text like "--" or empty
  if (text === '--' || text === '-') return makeSection('')
  return makeSection(text)
}

function extractAbout(): SectionData {
  const text = trySelectorsHTML([
    '#about ~ .display-flex .inline-show-more-text',
    '.pv-about-section .pv-about__summary-text',
    'section#about .inline-show-more-text',
    '[data-field="about"] .inline-show-more-text',
    'section.pv-about',
    '#about ~ div .display-flex',
    '#about ~ div span[aria-hidden="true"]',
    'section.pv-about__summary-text',
    '#about',
  ])
  return makeSection(text)
}

function extractExperience(): ExperienceEntry[] {
  // Try multiple container selectors
  const containerSelectors = [
    '#experience ~ .pvs-list__outer-container',
    'section#experience',
    '#experience',
    '#experience ~ div',
    '[data-section="experience"]',
    'section.pv-profile-section--experience',
  ]

  let container: Element | null = null
  for (const sel of containerSelectors) {
    container = document.querySelector(sel)
    if (container) break
  }
  if (!container) return []

  const items = container.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item, [data-view-name="profile-card"], .pvs-list__paged-list-item, .pvs-entity--padded')
  if (items.length === 0) {
    // Fallback: try to extract any experience-like content
    const allText = container.textContent || ''
    if (allText.length > 20) {
      return [{
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: allText.substring(0, 500),
        isCurrent: false,
      }]
    }
    return []
  }

  return Array.from(items).map(item => {
    const titleEl = item.querySelector('.t-bold span[aria-hidden="true"], .display-flex .visually-hidden, span[aria-hidden="true"]')
    const companyEl = item.querySelector('.t-normal span[aria-hidden="true"], .pvs-entity__secondary-title span[aria-hidden="true"]')
    const datesEl = item.querySelector('.pvs-entity__caption-wrapper, .pv-entity__date-range, span[aria-hidden="false"]')
    const descEl = item.querySelector('.pvs-entity__secondary-title, .pv-entity__description, span[aria-hidden="false"]')

    const title = extractText(titleEl)
    const company = extractText(companyEl)
    const dates = extractText(datesEl)
    const description = extractText(descEl)

    const dateParts = dates.split(' - ')
    const startDate = dateParts[0]?.trim() || ''
    const endDate = dateParts[1]?.trim() || ''
    const isCurrent = endDate.toLowerCase().includes('present') || endDate === ''

    return { title, company, location: '', startDate, endDate, description, isCurrent }
  }).filter(e => e.title || e.company || e.description)
}

function extractEducation(): EducationEntry[] {
  const containerSelectors = [
    '#education ~ .pvs-list__outer-container',
    'section#education',
    '#education',
    '#education ~ div',
    '[data-section="education"]',
    'section.pv-profile-section--education',
  ]

  let container: Element | null = null
  for (const sel of containerSelectors) {
    container = document.querySelector(sel)
    if (container) break
  }
  if (!container) return []

  const items = container.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
  return Array.from(items).map(item => {
    const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]')
    const degreeEl = item.querySelector('.pvs-entity__secondary-title')
    const datesEl = item.querySelector('.pvs-entity__caption-wrapper')

    return {
      school: extractText(schoolEl),
      degree: extractText(degreeEl),
      field: '',
      startDate: extractText(datesEl).split(' - ')[0]?.trim() || '',
      endDate: extractText(datesEl).split(' - ')[1]?.trim() || '',
    }
  }).filter(e => e.school)
}

function extractSkills(): SkillEntry[] {
  const containerSelectors = [
    '#skills ~ .pvs-list__outer-container',
    'section#skills',
    '#skills',
    '#skills ~ div',
    '[data-section="skills"]',
    'section.pv-profile-section--skills',
  ]

  let container: Element | null = null
  for (const sel of containerSelectors) {
    container = document.querySelector(sel)
    if (container) break
  }
  if (!container) return []

  const items = container.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
  return Array.from(items).map(item => {
    const nameEl = item.querySelector('.t-bold span[aria-hidden="true"]')
    const endEl = item.querySelector('.pvs-entity__caption-wrapper')

    return {
      name: extractText(nameEl),
      endorsements: parseInt(extractText(endEl)) || 0,
    }
  }).filter(s => s.name)
}

function extractCertifications(): CertificationEntry[] {
  const containerSelectors = [
    '#licenses_and_certifications ~ .pvs-list__outer-container',
    'section#licenses_and_certifications',
    '#licenses_and_certifications',
    '#licenses_and_certifications ~ div',
    '[data-section="licenses_and_certifications"]',
  ]

  let container: Element | null = null
  for (const sel of containerSelectors) {
    container = document.querySelector(sel)
    if (container) break
  }
  if (!container) return []

  const items = container.querySelectorAll('.pvs-entity--padded, li.artdeco-list__item')
  return Array.from(items).map(item => {
    const nameEl = item.querySelector('.t-bold span[aria-hidden="true"]')
    const orgEl = item.querySelector('.pvs-entity__secondary-title')
    const datesEl = item.querySelector('.pvs-entity__caption-wrapper')

    return {
      name: extractText(nameEl),
      organization: extractText(orgEl),
      issueDate: extractText(datesEl),
      credentialUrl: '',
      credentialId: '',
    }
  }).filter(c => c.name)
}

export function scrapeProfile(): ScrapedProfile {
  const sections: ProfileSection = {
    headline: extractHeadline(),
    about: extractAbout(),
    experience: extractExperience(),
    education: extractEducation(),
    skills: extractSkills(),
    featured: [],
    certifications: extractCertifications(),
    recommendations: [],
    contactInfo: { email: '', website: '', phone: '', location: '' },
  }

  return {
    profileUrl: getProfileUrl(),
    scrapedAt: new Date().toISOString(),
    sections,
  }
}
