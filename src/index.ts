import { config } from 'https://deno.land/x/dotenv@v0.5.0/mod.ts'
import { addDailyTimeEntries, formatName, generateDateChecker, generatePersonChecker, generatePersonioIdFromHarvestUserFinder, groupTimeEntriesByUser } from './utils.ts'
import { BearerAuthProps as HarvestCredentials, getMe, getTimes } from './harvest/index.ts'
import { API as PersonioAPI, Attendance, UnsuccessfulRequest } from './personio/index.ts'
import { jobLog, AttendanceCreationLog, AttendanceCreationErrorReason, generateJobId } from './log.ts'

const JOB_ID = generateJobId()

let [ fromDate = null, toDate = null, includePeople = '', excludePeople = '', dotEnvPath = './.env', dotEnvExamplePath = '' ] = Deno.args

config({ export: true, safe: true, path: dotEnvPath, example: dotEnvExamplePath || `${dotEnvPath}.example`, defaults: '' })
const personioAPI = new PersonioAPI({
    clientId: Deno.env.get('PERSONIO_CLIENT_ID') || '',
    clientSecret: Deno.env.get('PERSONIO_CLIENT_SECRET') || '',
})
await personioAPI.authorize()
const harvestCredentials: HarvestCredentials = {
    accountId: Deno.env.get('HARVEST_ACCOUNT_ID') || '',
    personalAccessToken: Deno.env.get('HARVEST_PERSONAL_ACCESS_TOKEN') || '',
}

if (fromDate === '_') fromDate = null
if (toDate === '_') toDate = null
if (includePeople === 'me' || excludePeople === 'me') {
    const me = await getMe(harvestCredentials)
    const meName = formatName(`${me.first_name} ${me.last_name}`)
    if (includePeople === 'me') includePeople = meName
    if (excludePeople === 'me') excludePeople = meName
}

const checkDate = generateDateChecker(fromDate, toDate)
const checkPerson = generatePersonChecker(includePeople, excludePeople)

const personioPeople = await personioAPI.getEmployees()
const findPersonioIdFromHarvestUser = generatePersonioIdFromHarvestUserFinder(personioPeople)

const timeEntries = await getTimes(harvestCredentials, {
    from: fromDate || undefined,
    to: toDate || undefined,
})
const filteredTimeEntries = timeEntries.filter(entry => {
    if (!checkDate(entry.spent_date) || !checkPerson(entry.user)) return false
    if (entry.is_running) {
        const log: AttendanceCreationLog = {
            timestamp: new Date(),
            success: false,
            errorReason: AttendanceCreationErrorReason.entryStillRunning,
            harvestUserName: entry.user.name,
            jobId: JOB_ID,
            harvestTimeEntry: entry,
        }
        console.log(log)
        return false
    }
    return true
})

/**
 * The original idea was to push all attendances to Personio at once with `personioAPI.createAttendances(attendances)`.
 * However, in the case of an unsuccessful request (due to e.g. overlapping attendance periods)
 * Personio creates some items in the batch request but not all and does not return the IDs of the created items.
 * Therefore I am now creating the attendances individually to be able to track which were successful and which were not.
 * Since time is not an issue here and I'm not sure how simultaneous requests would work with Personio's authentication system
 * and my implementation of it I am doing these reqeusts synchronously, rather than preprocessing and then using `Promise.all`.
 */
for (const userTimeEntries of groupTimeEntriesByUser(filteredTimeEntries)) {
    const harvestUser = userTimeEntries[0].user
    const personioEmployeeId = findPersonioIdFromHarvestUser(harvestUser)
    const partialLog = {
        harvestUserName: harvestUser.name,
        jobId: JOB_ID,
        attendance: undefined as Attendance | undefined,
    }
    if (!personioEmployeeId) {
        const log: AttendanceCreationLog = {
            timestamp: new Date(),
            success: false,
            errorReason: AttendanceCreationErrorReason.userNotFound,
            ...partialLog,
        }
        console.log(log)
        continue
    }
    for (const attendance of addDailyTimeEntries(userTimeEntries)) {
        attendance.employee = personioEmployeeId
        attendance.comment = `Created from Harvest (${jobLog(JOB_ID)})`
        partialLog.attendance = attendance
        let log: AttendanceCreationLog
        try {
            const response = await personioAPI.createAttendances([attendance])
            log = {
                timestamp: new Date(),
                success: true,
                personioResponse: response,
                ...partialLog,
            }
        } catch (e) {
            if (e instanceof UnsuccessfulRequest) log = {
                timestamp: new Date(),
                success: false,
                errorReason: AttendanceCreationErrorReason.personioFailure,
                personioResponse: e.response,
                personioResponseErrorErrors: e.response.error?.errors,
                personioResponseErrorDetailedMessage: e.response.error?.detailed_message,
                ...partialLog,
            }
            else throw e
        }
        console.log(log)
    }
}
