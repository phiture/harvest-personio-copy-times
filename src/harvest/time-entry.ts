export type TimeEntry = {
    id: number
    spent_date: string
    user: User
    client: Client
    project: Project
    task: Task
    external_reference: ExternalReference | null
    hours: number
    notes: string | null
    is_locked: boolean
    locked_reason: string
    is_closed: boolean
    timer_started_at: string
    started_time: string
    ended_time: string
    is_running: boolean
    created_at: string
    updated_at: string
}

export type User = {
    // Note: Not identical to the User type in user.ts
    id: number
    name: string
}

type Client = {
    id: number
    name: string
    currency: string
}

type Project = {
    id: number
    name: string
    code: string
}

type Task = {
    id: number
    name: string
}

type ExternalReference = {
    id: number
    group_id: number
    permalink: string
    service: string
    service_icon_url: string
}
