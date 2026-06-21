export interface Booking {
  id: string
  studentId: string
  studentName: string
  classroomId: string
  classroomName: string
  date: string
  startTime: string
  endTime: string
  slotCount: number
  isMerged: boolean
  mergedFromSlots?: string[]
  status: 'active' | 'cancelled' | 'completed'
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
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
