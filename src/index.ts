import { config } from 'https://deno.land/x/dotenv@v0.5.0/mod.ts'
import { addDailyTimeEntries, formatName, generateDateChecker, generatePersonChecker, generatePersonioIdFromHarvestUserFinder, groupTimeEntriesByUser, jobLog } from './utils.ts'
import { BearerAuthProps as HarvestCredentials, getMe, getTimes } from './harvest/index.ts'
import { API as PersonioAPI, Attendance } from './personio/index.ts'

const JOB_LOG = jobLog()
console.log(`Starting job: ${JOB_LOG}`)

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
        console.log('Skipping time entry which is still running', entry)
        return false
    }
    return true
})

const attendances: Attendance[] = []
for (const userTimeEntries of groupTimeEntriesByUser(filteredTimeEntries)) {
    const harvestUser = userTimeEntries[0].user
    const personioEmployeeId = findPersonioIdFromHarvestUser(harvestUser)
    if (!personioEmployeeId) {
        console.log(`Could not find user ${harvestUser.name} in Personio. Skipping.`)
        continue
    }
    const userAttendences = addDailyTimeEntries(userTimeEntries)
    .map(attendance => ({
        ...attendance,
        employee: personioEmployeeId,
        comment: `Created from Harvest (${JOB_LOG})`,
    }))
    attendances.push(...userAttendences)
}

personioAPI.createAttendances(attendances)
.then(() => {
    console.log(attendances)
    console.log(`Added ${attendances.length} attendance${attendances.length > 1 ? 's' : ''}!`)
})
.finally(() => console.log(`Completed job: ${JOB_LOG}`))
