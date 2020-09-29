export type Supervisor = {
    type: 'Employee'
    attributes: {
        id: {
            label: 'ID'
            value: number
        }
        first_name: {
            label: 'First name'
            value: string
        }
        last_name: {
            label: 'Last name'
            value: string
        }
        email: {
            label: 'Email'
            value: string
        }
    }
}

export type Employee = Supervisor & {
    attributes: {
        status: {
            label: 'Status'
            value: string
        }
        position: {
            label: 'Position'
            value: string
        }
        supervisor: {
            label: 'Supervisor'
            value: Supervisor | null
        }
        hire_date: {
            label: 'Hire date'
            value: string
        }
        department: {
            label: 'Department'
            value: Department | null
        }
    }
}

type Department = {
    type: 'Department'
    attributes: {
        id: number
        name: string
    }
}
