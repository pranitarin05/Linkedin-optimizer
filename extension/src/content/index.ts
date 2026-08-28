import { scrapeProfile } from './scraper'
import { checkAllSelectors, getHealthSummary } from './monitor'
import { fillSection } from './filler'

interface Message {
  action: string
  payload?: unknown
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch(err => {
      console.error('[Content Script] Error:', err)
      sendResponse({ error: String(err) })
    })
    return true // Keep channel open for async response
  }
)

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.action) {
    case 'SCRAPE_PROFILE':
      return scrapeProfile()

    case 'CHECK_SELECTORS':
      return checkAllSelectors()

    case 'GET_HEALTH_SUMMARY':
      return getHealthSummary()

    case 'FILL_SECTION': {
      const { section, value } = message.payload as { section: string; value: string }
      return fillSection(section, value)
    }

    default:
      return { error: `Unknown action: ${message.action}` }
  }
}
