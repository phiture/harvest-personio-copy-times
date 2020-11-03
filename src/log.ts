import { TimeEntry } from './harvest/index.ts'
import { PersonioResponse, Attendance, PersonioResponseErrorErrors, PersonioResponseErrorDetailedMessage } from './personio/index.ts'

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
export const jobLog = (jobId?: string) => {
    const today = new Date()
    const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    const id = jobId || generateJobId()
    return `Date: ${date}. Job ID: ${id}`
}

export type AttendanceCreationLog = {
    timestamp: Date,
    success: boolean
    jobId: string
    errorReason?: AttendanceCreationErrorReason
    persionoAttendance?: Attendance
    personioResponse?: PersonioResponse
    harvestUserName: string
    harvestTimeEntry?: TimeEntry
    personioResponseErrorErrors?: PersonioResponseErrorErrors
    personioResponseErrorDetailedMessage?: PersonioResponseErrorDetailedMessage
}

export enum AttendanceCreationErrorReason {
    userNotFound = 'Could not find Harvest user in Personio',
    entryStillRunning = 'Skipping time entry which is still running',
    personioFailure = 'Unsuccessful Personio request',
}
