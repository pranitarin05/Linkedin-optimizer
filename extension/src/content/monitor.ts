interface SelectorStrategy {
  primary: string
  fallback: string
  structural: string
}

interface SelectorHealth {
  section: string
  strategyUsed: string
  success: boolean
  timestamp: string
}

const SECTION_SELECTORS: Record<string, SelectorStrategy> = {
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
    primary: '#experience ~ .pvs-list__outer-container',
    fallback: '.pvs-profile-activity__message',
    structural: 'section#experience',
  },
  education: {
    primary: '#education ~ .pvs-list__outer-container',
    fallback: '.pv-education-list',
    structural: 'section#education',
  },
  skills: {
    primary: '#skills ~ .pvs-list__outer-container',
    fallback: '.pv-skill-categories',
    structural: 'section#skills',
  },
  certifications: {
    primary: '#licenses_and_certifications ~ .pvs-list__outer-container',
    fallback: '.pv-certifications-section',
    structural: 'section#licenses_and_certifications',
  },
}

const healthLog: SelectorHealth[] = []

export function checkSelector(section: string): SelectorHealth {
  const selectors = SECTION_SELECTORS[section]
  if (!selectors) {
    return {
      section,
      strategyUsed: 'none',
      success: false,
      timestamp: new Date().toISOString(),
    }
  }

  // Try primary
  if (document.querySelector(selectors.primary)) {
    const health: SelectorHealth = {
      section,
      strategyUsed: 'primary',
      success: true,
      timestamp: new Date().toISOString(),
    }
    healthLog.push(health)
    return health
  }

  // Try fallback
  if (document.querySelector(selectors.fallback)) {
    const health: SelectorHealth = {
      section,
      strategyUsed: 'fallback',
      success: true,
      timestamp: new Date().toISOString(),
    }
    healthLog.push(health)
    return health
  }

  // Try structural
  if (document.querySelector(selectors.structural)) {
    const health: SelectorHealth = {
      section,
      strategyUsed: 'structural',
      success: true,
      timestamp: new Date().toISOString(),
    }
    healthLog.push(health)
    return health
  }

  // All failed
  const health: SelectorHealth = {
    section,
    strategyUsed: 'none',
    success: false,
    timestamp: new Date().toISOString(),
  }
  healthLog.push(health)
  return health
}

export function getHealthLog(): SelectorHealth[] {
  return [...healthLog]
}

export function getHealthSummary(): Record<string, { successRate: number; lastCheck: string }> {
  const summary: Record<string, { successRate: number; lastCheck: string }> = {}

  for (const [section, _] of Object.entries(SECTION_SELECTORS)) {
    const sectionLogs = healthLog.filter(h => h.section === section)
    if (sectionLogs.length === 0) {
      summary[section] = { successRate: 1, lastCheck: 'never' }
      continue
    }

    const successes = sectionLogs.filter(h => h.success).length
    summary[section] = {
      successRate: successes / sectionLogs.length,
      lastCheck: sectionLogs[sectionLogs.length - 1].timestamp,
    }
  }

  return summary
}

export function checkAllSelectors(): SelectorHealth[] {
  return Object.keys(SECTION_SELECTORS).map(section => checkSelector(section))
}
