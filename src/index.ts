import { BearerAuthProps, getTimes, getUsers } from './harvest/index.ts'
import { API } from './personio/index.ts'

const personioAPI = new API({
    clientId: Deno.env.get('PERSONIO_CLIENT_ID') || '',
    clientSecret: Deno.env.get('PERSONIO_CLIENT_SECRET') || '',
})

// const [ fromDate, toDate, employees ] = Deno.args

const harvestCredentials: BearerAuthProps = {
    accountId: Deno.env.get('HARVEST_ACCOUNT_ID') || '',
    personalAccessToken: Deno.env.get('HARVEST_PERSONAL_ACCESS_TOKEN') || '',
}

const users = await getUsers(harvestCredentials)
console.log(users)

const timeEntries = await getTimes(harvestCredentials, {
    from: '2020-09-15'
})
console.log(timeEntries.length)
console.log(timeEntries.map(e => e.user.name))

const personioEmployees = await personioAPI.getEmployees()
console.log(personioEmployees)


try {
    await personioAPI.authorize()
    personioAPI.createAttendances([
        {
            employee: 1269894, // William Dry's employee number
            date: '2020-09-15',
            start_time: '07:00',
            end_time: '07:01',
            break: 0,
            comment: 'test'
        }
    ])
} catch (e) {
    console.log(e)
}
