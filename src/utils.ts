import { TimeEntryUser } from './harvest/index.ts'
import { Employee } from './personio/index.ts'

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
 * @param include Include People argument. '' to include none. '*' to include all.
 * @param exclude Exclude People argument. '' to exclude none. '*' to exclude all.
 * @return A function which takes a harvest.TimeEntry.User object as input and returns true if this person should be included.
 */
export const generatePersonChecker = (include: string, exclude: string) => {
    const includeList = include.split(',')
    const excludeList = exclude.split(',')
    return (person: TimeEntryUser) => {
        const name = person.name.replaceAll(' ', '')
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
    for (const person of personioPeople) personioIds[`${person.attributes.first_name.value}${person.attributes.last_name.value}`] = person.attributes.id.value
    return (person: TimeEntryUser) => {
        const name = person.name.replaceAll(' ', '')
        return personioIds[name]
    }
}
