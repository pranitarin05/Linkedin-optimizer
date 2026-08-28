import type { ProfileSection, SectionData, ExperienceEntry, EducationEntry, SkillEntry, CertificationEntry, ScrapedProfile } from '../types'

const SELECTORS = {
  headline: {
    primary: '[data-anonymize="field-name"]',
    fallback: 'h1.text-heading-xlarge',
    structural: '.pv-text-details__left-panel h1',
  },
  about: {
    primary: '#about ~ .display-flex .inline-show-more-text',
    fallback: '.pv-about-section .pv-about__summary-text',
    structural: 'section.pv-about-section .pv-about__summary-text',
  },
  experience: {
    container: '#experience ~ .pvs-list__outer-container',
    item: '.pvs-entity--padded',
    title: '.t-bold span[aria-hidden="true"]',
    company: '.t-normal span[aria-hidden="true"]',
    dates: '.pvs-entity__caption-wrapper',
    description: '.pvs-entity__secondary-title',
  },
  education: {
    container: '#education ~ .pvs-list__outer-container',
    item: '.pvs-entity--padded',
    school: '.t-bold span[aria-hidden="true"]',
    degree: '.pvs-entity__secondary-title',
    dates: '.pvs-entity__caption-wrapper',
  },
  skills: {
    container: '#skills ~ .pvs-list__outer-container',
    item: '.pvs-entity--padded',
    name: '.t-bold span[aria-hidden="true"]',
    endorsements: '.pvs-entity__caption-wrapper',
  },
  certifications: {
    container: '#licenses_and_certifications ~ .pvs-list__outer-container',
    item: '.pvs-entity--padded',
    name: '.t-bold span[aria-hidden="true"]',
    organization: '.pvs-entity__secondary-title',
    dates: '.pvs-entity__caption-wrapper',
  },
  contactInfo: {
    button: '.pv-contact-info__contact-type',
    email: '.pv-contact-info__ci-container a[href^="mailto:"]',
    website: '.pv-contact-info__ci-container a[href^="http"]',
    phone: '.pv-contact-info__ci-container span.t-14',
  },
}

function getProfileUrl(): string {
  return window.location.href
}

function extractText(element: HTMLElement | null): string {
  if (!element) return ''
  return (element.textContent || '').trim()
}

function extractSectionData(text: string): SectionData {
  return {
    text,
    length: text.length,
    exists: text.length > 0,
  }
}

function getElementText(element: HTMLElement): string {
  const paragraphs = element.querySelectorAll('p, span, div')
  if (paragraphs.length > 0) {
    return Array.from(paragraphs)
      .map(p => p.textContent?.trim())
      .filter(Boolean)
      .join('\n')
  }
  return element.textContent || ''
}

function parseExperienceItem(item: HTMLElement): ExperienceEntry {
  const titleEl = item.querySelector(SELECTORS.experience.title)
  const companyEl = item.querySelector(SELECTORS.experience.company)
  const datesEl = item.querySelector(SELECTORS.experience.dates)
  const descEl = item.querySelector(SELECTORS.experience.description)

  const title = extractText(titleEl as HTMLElement)
  const company = extractText(companyEl as HTMLElement)
  const dates = extractText(datesEl as HTMLElement)
  const description = extractText(descEl as HTMLElement)

  const dateParts = dates.split(' - ')
  const startDate = dateParts[0] || ''
  const endDate = dateParts[1] || ''
  const isCurrent = endDate.toLowerCase().includes('present') || endDate === ''

  return {
    title,
    company,
    location: '',
    startDate,
    endDate,
    description,
    isCurrent,
  }
}

function parseEducationItem(item: HTMLElement): EducationEntry {
  const schoolEl = item.querySelector(SELECTORS.education.school)
  const degreeEl = item.querySelector(SELECTORS.education.degree)
  const datesEl = item.querySelector(SELECTORS.education.dates)

  return {
    school: extractText(schoolEl as HTMLElement),
    degree: extractText(degreeEl as HTMLElement),
    field: '',
    startDate: extractText(datesEl as HTMLElement).split(' - ')[0] || '',
    endDate: extractText(datesEl as HTMLElement).split(' - ')[1] || '',
  }
}

function parseSkillItem(item: HTMLElement): SkillEntry {
  const nameEl = item.querySelector(SELECTORS.skills.name)
  const endorsementsEl = item.querySelector(SELECTORS.skills.endorsements)

  return {
    name: extractText(nameEl as HTMLElement),
    endorsements: parseInt(extractText(endorsementsEl as HTMLElement)) || 0,
  }
}

function parseCertificationItem(item: HTMLElement): CertificationEntry {
  const nameEl = item.querySelector(SELECTORS.certifications.name)
  const orgEl = item.querySelector(SELECTORS.certifications.organization)
  const datesEl = item.querySelector(SELECTORS.certifications.dates)

  return {
    name: extractText(nameEl as HTMLElement),
    organization: extractText(orgEl as HTMLElement),
    issueDate: extractText(datesEl as HTMLElement),
    credentialUrl: '',
    credentialId: '',
  }
}

function extractExperience(): ExperienceEntry[] {
  const container = document.querySelector(SELECTORS.experience.container)
  if (!container) return []

  const items = container.querySelectorAll(SELECTORS.experience.item)
  return Array.from(items).map(item => parseExperienceItem(item as HTMLElement))
}

function extractEducation(): EducationEntry[] {
  const container = document.querySelector(SELECTORS.education.container)
  if (!container) return []

  const items = container.querySelectorAll(SELECTORS.education.item)
  return Array.from(items).map(item => parseEducationItem(item as HTMLElement))
}

function extractSkills(): SkillEntry[] {
  const container = document.querySelector(SELECTORS.skills.container)
  if (!container) return []

  const items = container.querySelectorAll(SELECTORS.skills.item)
  return Array.from(items).map(item => parseSkillItem(item as HTMLElement))
}

function extractCertifications(): CertificationEntry[] {
  const container = document.querySelector(SELECTORS.certifications.container)
  if (!container) return []

  const items = container.querySelectorAll(SELECTORS.certifications.item)
  return Array.from(items).map(item => parseCertificationItem(item as HTMLElement))
}

function extractSectionByKey(selectorKey: string): SectionData {
  const selectors = SELECTORS[selectorKey as keyof typeof SELECTORS] as Record<string, string>
  let text = ''

  for (const key of ['primary', 'fallback', 'structural']) {
    const selector = selectors[key]
    if (!selector) continue

    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      text = getElementText(element)
      break
    }
  }

  return extractSectionData(text)
}

export function scrapeProfile(): ScrapedProfile {
  const sections: ProfileSection = {
    headline: extractSectionByKey('headline'),
    about: extractSectionByKey('about'),
    experience: extractExperience(),
    education: extractEducation(),
    skills: extractSkills(),
    featured: [],
    certifications: extractCertifications(),
    recommendations: [],
    contactInfo: {
      email: '',
      website: '',
      phone: '',
      location: '',
    },
  }

  return {
    profileUrl: getProfileUrl(),
    scrapedAt: new Date().toISOString(),
    sections,
  }
}
