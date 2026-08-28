import { getValidToken, refreshAccessToken, getStoredToken } from './auth'

// Set up alarm for token refresh
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refresh-token', { periodInMinutes: 5 })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh-token') {
    const tokens = await getStoredToken()
    if (!tokens) return

    // Check if token needs refresh (within 5 minutes of expiry)
    const fiveMinutes = 5 * 60 * 1000
    if (tokens.expires_at - Date.now() < fiveMinutes) {
      await refreshAccessToken(tokens.refresh_token)
    }
  }
})

// Handle messages from content script and sidebar
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.action === 'GET_TOKEN') {
      getValidToken().then(sendResponse)
      return true
    }

    if (message.action === 'REFRESH_TOKEN') {
      getStoredToken().then(tokens => {
        if (tokens) {
          refreshAccessToken(tokens.refresh_token).then(refreshed => {
            sendResponse(refreshed)
          })
        } else {
          sendResponse(null)
        }
      })
      return true
    }

    return false
  }
)
