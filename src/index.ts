import { API } from './personio/index.ts'

const personioAPI = new API({
    clientId: Deno.env.get('PERSONIO_CLIENT_ID') || '',
    clientSecret: Deno.env.get('PERSONIO_CLIENT_SECRET') || '',
})

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
