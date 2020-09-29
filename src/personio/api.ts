import { Attendance, Employee } from './index.ts'

export class API {
    baseUrl = 'https://api.personio.de/v1'
    clientId: string
    clientSecret: string
    token: string | undefined

    constructor({ clientId, clientSecret }: ConstructorProps) {
        this.clientId = clientId
        this.clientSecret = clientSecret
    }
    expandEndpoint(endpoint: string) {
        return `${this.baseUrl}/${endpoint}`
    }
    async basicRequest(endpoint: string, method: string, body: {}) {
        const jsonBody = JSON.stringify(body)
        const response = await fetch(this.expandEndpoint(endpoint), {
            method,
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${this.token}`,
            },
            body: jsonBody,
        })
        this.token = response.headers.get('authorization')?.split(' ')[1]
        const data: PersonioResponse = await response.json()
        if (data.success) return data.data
        throw new Error(`Response: ${JSON.stringify(data)} - Request body: ${jsonBody}`)
    }
    async authorize() {
        const data = await this.basicRequest('auth', 'POST', {
            client_id: this.clientId,
            client_secret: this.clientSecret,
        })
        // The token is not returned in the headers from /auth
        this.token = data.token
    }
    async request(endpoint: string, method: string, body: {} = {}) {
        const authAndSend = async () => {
            if (!this.token) await this.authorize()
            return await this.basicRequest(endpoint, method, body)
        }
        try { return await authAndSend() }
        catch (e) {
            if (e.message === 'The token has been blacklisted') {
                this.token = undefined
                return await authAndSend()
            }
            else throw e
        }
    }    
    get(endpoint: string) {
        return this.request(endpoint, 'GET')
    }
    post(endpoint: string, body: {}) {
        return this.request(endpoint, 'POST', body)
    }
    createAttendances(attendances: Attendance[]) {
        if (!attendances.length) return Promise.resolve()
        return this.post('company/attendances', { attendances })
    }
    async getEmployees() {
        return await this.get('company/employees') as Employee[]
    }
}

export type ConstructorProps = {
    clientId: string
    clientSecret: string
}

type PersonioResponse = {
    success: boolean
    data: any
    error: { code: number, message: string } | undefined
}
