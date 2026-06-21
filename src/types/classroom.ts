export interface Classroom {
  id: string
  name: string
  capacity: number
  description: string
  equipment: string[]
  startTime: string
  endTime: string
  slotDuration: number
  status: 'active' | 'inactive'
  createdAt: string
}

export interface TimeSlot {
  id: string
  classroomId: string
  date: string
  startTime: string
  endTime: string
  status: 'available' | 'booked' | 'merged' | 'disabled'
}

export type ClassroomFormData = Omit<Classroom, 'id' | 'createdAt'>
