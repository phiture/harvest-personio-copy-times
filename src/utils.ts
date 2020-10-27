import { TimeEntry, TimeEntryUser } from './harvest/index.ts'
import { Attendance, Employee } from './personio/index.ts'

/**
 * 
 * @param from From date argument. Null to have no from constraint.
 * @param to To date argument. Null to have no to constraint.
 * @return A function which takes a date as input and returns true if it is within the from and to date constraints.
 */
export const generateDateChecker = (from: string | null, to: string | null) => (date: string) => {
    const dateDate = new Date(date)
    if (from !== null && dateDate < new Date(from)) return false
    if (to !== null && dateDate > new Date(to)) return false
    return true
}


/**
 * 
 * @param name harvest.TimeEntryUser.name or personio.Employee concatnated first and last names.
 * @returns Formatted name as expected from CLI input and used in ID matching.
 */
export const formatName = (name: string) => name.replaceAll(' ', '')


/**
 * 
 * @param include Include People argument. '' to include none. 'all' to include all.
 * @param exclude Exclude People argument. '' to exclude none. 'all' to exclude all.
 * @return A function which takes a harvest.TimeEntry.User object as input and returns true if this person should be included.
 */
export const generatePersonChecker = (include: string, exclude: string) => {
    const includeList = include.split(',')
    const excludeList = exclude.split(',')
    return (person: TimeEntryUser) => {
        const name = formatName(person.name)
        if (exclude === 'all' || excludeList.includes(name)) return false
        if (include !== 'all' && !includeList.includes(name)) return false
        return true
    }
}


/**
 * 
 * @param personioPeople All Personio employees
 * @return A function which takes a harvest.TimeEntry.User object as input and returns the Personio ID for the matching employee or undefined if not found.
 */
export const generatePersonioIdFromHarvestUserFinder = (personioPeople: Employee[]) => {
    const personioIds: { [key: string]: number | undefined } = {}
    for (const { attributes: {
        first_name: { value: firstName },
        last_name: { value: lastName },
        id: { value: id },
    } } of personioPeople) personioIds[formatName(firstName + lastName)] = id
    return (person: TimeEntryUser) => {
        const name = formatName(person.name)
        return personioIds[name]
    }
}

/**
 * 
 * @param timeEntries All time entries
 * @returns An array arrays. Time entries grouped by user ID.
 */
export const groupTimeEntriesByUser = (timeEntries: TimeEntry[]) => {
    const userIds = Array.from(new Set(timeEntries.map(e => e.user.id)))
    return userIds.map(uid => timeEntries.filter(e => e.user.id === uid))
}

/**
 * 
 * @param time Time without date in format 13:59
 * @returns This time represented as a number of minutes since 00:00
 */
const convertTimeToMinutesSinceMidnight = (time: string) => {
    const [ hour, minute ] = time.split(':')
    return Number(hour) * 60 + Number(minute)
}

/**
 * 
 * @param minutes A time represented as a number of minutes since 00:00
 * @returns This time in format 13:59
 */
const convertMinutesSinceMidnightToTime = (minutes: number) => {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * 
 * @param timeEntries A list of time entries for one user
 * @returns One attendance, with start and end times of the first and last time entry, and break in minutes.
 */
export const addDailyTimeEntries = (timeEntries: TimeEntry[]) => {
    const uniqueDates = Array.from(new Set(timeEntries.map(e => e.spent_date)))
    return uniqueDates.map(date => {
        const timeEntriesForDate = timeEntries
        .filter(e => e.spent_date === date)
        .sort((a, b) => convertTimeToMinutesSinceMidnight(a.started_time) - convertTimeToMinutesSinceMidnight(b.started_time))
        const startTime = convertTimeToMinutesSinceMidnight(timeEntriesForDate[0].started_time)
        /**
         * Add up breaks, so as to not count duplicate or partially duplicate entries.
         */
        let totalBreakMinutes = 0
        let currentEndTime = startTime
        for (const timeEntry of timeEntriesForDate) {
            const start = convertTimeToMinutesSinceMidnight(timeEntry.started_time)
            const end = convertTimeToMinutesSinceMidnight(timeEntry.ended_time)
            if (start > currentEndTime) totalBreakMinutes += start - currentEndTime
            if (end > currentEndTime) currentEndTime = end
        }
        return {
            date,
            start_time: convertMinutesSinceMidnightToTime(startTime),
            end_time: convertMinutesSinceMidnightToTime(currentEndTime),
            break: totalBreakMinutes
        } as Attendance
    })
}

/**
 * Generates a random ID
 * @param length Length of the ID. Default 8.
 * @param charset Characters out of which to make up the ID. Default case sensitive alpha-numeric.
 */
export const generateJobId = (length = 8, charset='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' ) => {
    let result = ''
    for (let i = 0; i < length; i++) result += charset[Math.floor(Math.random() * charset.length)]
    return result
}

/**
 * Generates a job log / comment to link server logs to comments created in Personio.
 */
export const jobLog = () => {
    const today = new Date()
    const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    const id = generateJobId()
    return `Date: ${date}. Job ID: ${id}`
}
