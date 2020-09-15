export type User = {
    id: number
    first_name: string
    last_name: string
    email: string
    telephone: string
    timezone: string
    weekly_capacity: number
    has_access_to_all_future_projects: boolean
    is_contractor: boolean
    is_admin: boolean
    is_project_manager: boolean
    can_see_rates: boolean
    can_create_projects: boolean
    can_create_invoices: boolean
    is_active: boolean
    calendar_integration_enabled: boolean
    calendar_integration_source: null
    created_at: string
    updated_at: string
    default_hourly_rate: null
    cost_rate: null
    roles: string[]
    avatar_url: string
}
