export interface Booking {
  id: string
  studentId: string
  studentName: string
  teacherId?: string
  teacherName?: string
  classroomId: string
  classroomName: string
  date: string
  startTime: string
  endTime: string
  slotCount: number
  isMerged: boolean
  mergedFromSlots?: string[]
  recurringId?: string
  recurringIndex?: number
  status: 'active' | 'cancelled' | 'completed'
  checkInStatus: 'pending' | 'checked_in' | 'absent' | 'leave'
  checkedInAt?: string
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
  remark?: string
}

export interface RecurringBooking {
  id: string
  studentId: string
  studentName: string
  teacherId?: string
  teacherName?: string
  classroomId: string
  classroomName: string
  classId: string
  weekdays: number[]
  startTime: string
  endTime: string
  startDate: string
  endDate: string
  totalWeeks: number
  totalSessions: number
  slotCount: number
  createdAt: string
  status: 'active' | 'cancelled'
}

export interface BookingSlot {
  id: string
  bookingId: string
  classroomId: string
  date: string
  startTime: string
  endTime: string
  studentId: string
}

export type BookingStatus = 'active' | 'cancelled' | 'completed'
export type CheckInStatus = 'pending' | 'checked_in' | 'absent' | 'leave'

export interface RecurringBookingFormData {
  studentId: string
  studentName: string
  teacherId?: string
  teacherName?: string
  classroomId: string
  classroomName: string
  classId: string
  weekdays: number[]
  startTime: string
  endTime: string
  startDate: string
  totalWeeks: number
  slotCount: number
}
