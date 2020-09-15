export type Attendance = {
    // Represents Personio REST Attendance object
    employee: number
    date: string
    start_time: string
    end_time: string
    break: number
    comment: string
}
