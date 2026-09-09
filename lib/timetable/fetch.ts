import type { SheetRows, Workbook } from './types'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  sheetId: string
}

export class MissingCredentialsError extends Error {
  constructor(missing: string[]) {
    super(`Missing Google credentials: ${missing.join(', ')}`)
    this.name = 'MissingCredentialsError'
  }
}

/**
 * Read credentials from the environment.
 *
 * Returns null rather than throwing when nothing is configured, so the app can
 * fall back to the committed snapshot instead of failing to render.
 */
export function readGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const config = {
    clientId: env.GOOGLE_CLIENT_ID?.trim() ?? '',
    clientSecret: env.GOOGLE_CLIENT_SECRET?.trim() ?? '',
    refreshToken: env.GOOGLE_REFRESH_TOKEN?.trim() ?? '',
    sheetId: env.GOOGLE_SHEET_ID?.trim() ?? '',
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length === Object.keys(config).length) return null
  if (missing.length > 0) throw new MissingCredentialsError(missing)

  return config
}

async function getAccessToken(config: GoogleConfig): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    // The body echoes back client_id, so report only the error code.
    const detail = await response.json().catch(() => ({}))
    const code = (detail as { error?: string }).error ?? response.statusText
    throw new Error(`Google token refresh failed (${response.status}: ${code})`)
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Google token response contained no access_token')
  return data.access_token
}

async function apiGet<T>(url: string, token: string, fresh: boolean): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // A no-store fetch opts the whole page out of static rendering, turning one
    // render per 5 minutes into one per visitor. Only ?refresh=1 pays that cost.
    ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
  })

  if (!response.ok) {
    throw new Error(`Sheets API ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

/**
 * Pull every tab of the spreadsheet as rows of strings.
 *
 * Uses the Sheets API rather than a Drive xlsx export so the OAuth token only
 * needs `spreadsheets.readonly`. The Drive export path the old sync script used
 * required `drive.readonly`, which grants read access to the user's entire
 * Drive -- far more than a token sitting in a deploy environment should carry.
 */
export async function fetchWorkbook(
  config: GoogleConfig,
  options: { fresh?: boolean } = {},
): Promise<Workbook> {
  const fresh = options.fresh ?? false
  const token = await getAccessToken(config)

  const meta = await apiGet<{ sheets?: Array<{ properties?: { title?: string } }> }>(
    `${SHEETS_API}/${config.sheetId}?fields=sheets(properties(title))`,
    token,
    fresh,
  )

  const titles = (meta.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title))

  if (titles.length === 0) {
    throw new Error('Spreadsheet reported no tabs')
  }

  const params = new URLSearchParams({
    majorDimension: 'ROWS',
    valueRenderOption: 'FORMATTED_VALUE',
  })
  for (const title of titles) params.append('ranges', `'${title.replace(/'/g, "''")}'`)

  const values = await apiGet<{ valueRanges?: Array<{ values?: string[][] }> }>(
    `${SHEETS_API}/${config.sheetId}/values:batchGet?${params}`,
    token,
    fresh,
  )

  const ranges = values.valueRanges ?? []
  if (ranges.length !== titles.length) {
    throw new Error(`Sheets API returned ${ranges.length} ranges for ${titles.length} tabs`)
  }

  const workbook: Workbook = {}
  titles.forEach((title, index) => {
    // Rows come back ragged (trailing empty cells omitted); the parser reads
    // cells defensively, so no padding is needed here.
    workbook[title] = (ranges[index]?.values ?? []) as SheetRows
  })

  return workbook
}
