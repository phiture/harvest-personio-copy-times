import { config } from 'https://deno.land/x/dotenv@v0.5.0/mod.ts'
import { findOverlappingTimeEntries, generateDateChecker, generatePersonChecker, generatePersonioIdFromHarvestUserFinder } from './utils.ts'
import { BearerAuthProps as HarvestCredentials, getMe, getTimes } from './harvest/index.ts'
import { API as PersonioAPI, Attendance } from './personio/index.ts'

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
const overlaps = findOverlappingTimeEntries(timeEntries)
if (overlaps.length) {
    console.log('Overlapping time entries found. Aborting.')
    console.log(overlaps.map(attendances => attendances.map(a => ({
        id: a.id,
        spent_date: a.spent_date,
        user: a.user,
        started_time: a.started_time,
        ended_time: a.ended_time,
    }))))
    Deno.exit()
}
const attendances: Attendance[] = []
for (const timeEntry of timeEntries) {
    if (!checkDate(timeEntry.spent_date) || !checkPerson(timeEntry.user) || timeEntry.is_running) continue
    const personioId = findPersonioIdFromHarvestUser(timeEntry.user)
    if (!personioId) {
        console.log(`Could not find ${timeEntry.user.name} in Personio.`)
        continue
    }
    const textualData = [
        timeEntry.project.name,
        timeEntry.task.name,
    ]
    if (timeEntry.notes) textualData.push(timeEntry.notes)
    if (timeEntry.external_reference) textualData.push(timeEntry.external_reference.permalink)
    attendances.push({
        employee: personioId,
        date: timeEntry.spent_date,
        start_time: timeEntry.started_time,
        end_time: timeEntry.ended_time,
        break: 0,
        comment: textualData.join(' > '),
    })
}
personioAPI.createAttendances(attendances)
.then(() => {
    console.log(attendances)
    console.log(`Added ${attendances.length} attendance${attendances.length > 1 ? 's' : ''}!`)
})
