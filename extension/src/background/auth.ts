const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function getStoredToken(): Promise<TokenData | null> {
  const data = await chrome.storage.session.get('auth_tokens')
  return data.auth_tokens || null
}

export async function storeTokens(tokens: TokenData): Promise<void> {
  await chrome.storage.session.set({ auth_tokens: tokens })
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.session.remove('auth_tokens')
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', response.status)
      return null
    }

    const data = await response.json()
    const tokens: TokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
    }

    await storeTokens(tokens)
    return tokens
  } catch (err) {
    console.error('[Auth] Token refresh error:', err)
    return null
  }
}

export async function getValidToken(): Promise<string | null> {
  const tokens = await getStoredToken()

  if (!tokens) return null

  // Check if token expires in next 5 minutes
  const fiveMinutes = 5 * 60 * 1000
  if (tokens.expires_at - Date.now() < fiveMinutes) {
    // Refresh
    const refreshed = await refreshAccessToken(tokens.refresh_token)
    if (!refreshed) return null
    return refreshed.access_token
  }

  return tokens.access_token
}

export async function launchAuth(): Promise<TokenData | null> {
  return new Promise((resolve) => {
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_uri=${chrome.identity.getRedirectURL()}`

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error('[Auth] Auth flow failed:', chrome.runtime.lastError)
          resolve(null)
          return
        }

        // Parse the redirect URL for tokens
        // Supabase returns tokens in the URL fragment or as query params
        try {
          const url = new URL(redirectUrl)
          const hashParams = new URLSearchParams(url.hash.substring(1))
          const access_token = hashParams.get('access_token') || ''
          const refresh_token = hashParams.get('refresh_token') || ''
          const expires_in = parseInt(hashParams.get('expires_in') || '3600')

          if (!access_token) {
            resolve(null)
            return
          }

          const tokens: TokenData = {
            access_token,
            refresh_token,
            expires_at: Date.now() + (expires_in * 1000),
          }

          await storeTokens(tokens)
          resolve(tokens)
        } catch (err) {
          console.error('[Auth] Failed to parse auth response:', err)
          resolve(null)
        }
      }
    )
  })
}
