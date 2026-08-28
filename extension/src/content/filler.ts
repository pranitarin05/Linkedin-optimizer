import type { ProfileSection } from '../types'

interface FillerResult {
  success: boolean
  field: string
  error?: string
}

const EDIT_SELECTORS = {
  headline: {
    editButton: '[aria-label="Edit headline"]',
    input: '#headline-input',
    textarea: 'input#headline',
  },
  about: {
    editButton: '[aria-label="Edit about"]',
    input: '#about-input',
    textarea: 'textarea#about',
  },
  experience: {
    editButton: '[aria-label="Edit experience"]',
    addButton: '[aria-label="Add experience"]',
  },
  education: {
    editButton: '[aria-label="Edit education"]',
    addButton: '[aria-label="Add education"]',
  },
  skills: {
    editButton: '[aria-label="Edit skills"]',
    addButton: '[aria-label="Add skill"]',
  },
  certifications: {
    editButton: '[aria-label="Edit licenses & certifications"]',
    addButton: '[aria-label="Add license or certification"]',
  },
}

function dispatchEvents(element: HTMLElement, value: string) {
  // For React-controlled inputs, we need to trigger the right events
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set

  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set

  if (element instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
  } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, value)
  } else {
    element.textContent = value
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function waitForElement(selector: string, timeout = 5000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector) as HTMLElement
    if (existing) {
      resolve(existing)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

export async function fillHeadline(text: string): Promise<FillerResult> {
  try {
    // Click edit button
    const editBtn = document.querySelector(EDIT_SELECTORS.headline.editButton) as HTMLElement
    if (!editBtn) {
      return { success: false, field: 'headline', error: 'Edit button not found' }
    }
    editBtn.click()

    // Wait for input to appear
    const input = await waitForElement(EDIT_SELECTORS.headline.input)
      || await waitForElement(EDIT_SELECTORS.headline.textarea)

    if (!input) {
      return { success: false, field: 'headline', error: 'Input field not found after clicking edit' }
    }

    // Fill the value
    dispatchEvents(input, text)

    return { success: true, field: 'headline' }
  } catch (err) {
    return { success: false, field: 'headline', error: String(err) }
  }
}

export async function fillAbout(text: string): Promise<FillerResult> {
  try {
    const editBtn = document.querySelector(EDIT_SELECTORS.about.editButton) as HTMLElement
    if (!editBtn) {
      return { success: false, field: 'about', error: 'Edit button not found' }
    }
    editBtn.click()

    const input = await waitForElement(EDIT_SELECTORS.about.input)
      || await waitForElement(EDIT_SELECTORS.about.textarea)

    if (!input) {
      return { success: false, field: 'about', error: 'Input field not found after clicking edit' }
    }

    dispatchEvents(input, text)

    return { success: true, field: 'about' }
  } catch (err) {
    return { success: false, field: 'about', error: String(err) }
  }
}

export async function fillSection(
  section: string,
  value: string
): Promise<FillerResult> {
  switch (section) {
    case 'headline':
      return fillHeadline(value)
    case 'about':
      return fillAbout(value)
    default:
      return {
        success: false,
        field: section,
        error: `Auto-fill not supported for ${section}. Use manual copy-paste.`,
      }
  }
}
