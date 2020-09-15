import { TimeEntry, User } from './index.ts'

const expandEndpoint = (endpoint: string) => `https://api.harvestapp.com/v2/${endpoint}`

const sendRequest = async (url: string, method: string, { accountId, personalAccessToken }: BearerAuthProps) => {
    const response = await fetch(url, {
        method,
        headers: {
            // They also provide OAuth if we want to do that.
            'Harvest-Account-ID': accountId,
            Authorization: `Bearer ${personalAccessToken}`,
            'User-Agent': 'Harvest Personio copy times (https://github.com/phiture/harvest-personio-copy-times)',
        }
    })
    const data = await response.json()
    if (response.status >= 400) throw new Error(data.message)
    return data
}

export type BearerAuthProps = {
    accountId: string
    personalAccessToken: string
}

const get = (url: string, bearerAuthProps: BearerAuthProps) => sendRequest(url, 'GET', bearerAuthProps)

export const getPaginated = async (url: string, bearerAuthProps: BearerAuthProps, key: PaginatedResponseKey) => {
    const desiredData: any[] = []
    let page: PaginatedResponse
    do {
        page = await get(url, bearerAuthProps)
        desiredData.push(...page[key] || [])
        url = page.links.next || ''
    } while (page.next_page)
    return desiredData
}

/**
 * 
 * @param bearerAuthProps Account ID and personal access token
 * @param from Fetch time entries on or after this date
 * @param to Fetch time entries on or before this date
 * @param users Comma separated list of user IDs to fetch time entries for
 */
export const getTimes = async (bearerAuthProps: BearerAuthProps, { from, to, users }: GetTimesProps = {} ): Promise<TimeEntry[]> => {
    let url = expandEndpoint('time_entries?per_page=100')
    if (from) url = `${url}&from=${from}`
    if (to) url = `${url}&to=${to}`
    if (users) url = `${url}&user=${users}`
    return await getPaginated(url, bearerAuthProps, PaginatedResponseKey.timeEntries)
}

export type GetTimesProps = {
    from?: string
    to?: string
    users?: string
}

export const getUsers = async (bearerAuthProps: BearerAuthProps): Promise<User[]> => {
    // Try /users first, if not authorized, then check me.json
    try {
        return await getPaginated(expandEndpoint('users'), bearerAuthProps, PaginatedResponseKey.users)
    } catch (e) {
        // Standard users do not have access to /users, only to /users/me.json
        if (e.message !== 'Not authorized!') throw e
        const user = await get(expandEndpoint('users/me.json'), bearerAuthProps)
        return [ user ]
    }
}

export type PaginatedResponse = {
    per_page: number
    total_pages: number
    total_entries: number
    next_page: number | null
    previous_page: number | null
    page: number
    links: {
        first: string
        next: string | null
        previous: string | null
        last: string
    }
    [PaginatedResponseKey.users]?: User[]
    [PaginatedResponseKey.timeEntries]?: TimeEntry[]
}

export enum PaginatedResponseKey {
    users = 'users',
    timeEntries = 'time_entries'
}
