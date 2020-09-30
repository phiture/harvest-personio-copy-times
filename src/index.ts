import { config } from 'https://deno.land/x/dotenv@v0.5.0/mod.ts'
import { generateDateChecker, generatePersonChecker, generatePersonioIdFromHarvestUserFinder } from './utils.ts'
import { BearerAuthProps as HarvestCredentials, getMe, getTimes } from './harvest/index.ts'
import { API as PersonioAPI, Attendance } from './personio/index.ts'

config({ export: true, safe: true })
const personioAPI = new PersonioAPI({
    clientId: Deno.env.get('PERSONIO_CLIENT_ID') || '',
    clientSecret: Deno.env.get('PERSONIO_CLIENT_SECRET') || '',
})
await personioAPI.authorize()
const harvestCredentials: HarvestCredentials = {
    accountId: Deno.env.get('HARVEST_ACCOUNT_ID') || '',
    personalAccessToken: Deno.env.get('HARVEST_PERSONAL_ACCESS_TOKEN') || '',
}
let [ fromDate = null, toDate = null, includePeople, excludePeople ] = Deno.args
if (fromDate === '_') fromDate = null
if (toDate === '_') toDate = null
if (includePeople === 'me' || excludePeople === 'me') {
    const me = await getMe(harvestCredentials)
    if (includePeople === 'me') includePeople = `${me.first_name}${me.last_name}`
    if (excludePeople === 'me') excludePeople = `${me.first_name}${me.last_name}`
}

const checkDate = generateDateChecker(fromDate, toDate)
const checkPerson = generatePersonChecker(includePeople, excludePeople)

const personioPeople = await personioAPI.getEmployees()
const findPersonioIdFromHarvestUser = generatePersonioIdFromHarvestUserFinder(personioPeople)

const timeEntries = await getTimes(harvestCredentials, {
    from: fromDate || undefined,
    to: toDate || undefined,
})
const attendances: Attendance[] = []
for (const timeEntry of timeEntries) {
    if (!checkDate(timeEntry.spent_date) || !checkPerson(timeEntry.user) || timeEntry.is_running) continue
    const personioId = findPersonioIdFromHarvestUser(timeEntry.user)
    if (!personioId) console.log(`Could not find ${timeEntry.user.name} in Personio.`)
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
    console.log(`Added ${attendances.length} attendances!`)
})
