import { create } from 'zustand'
import type { Booking } from '@/types/booking'
import { mockBookings } from '@/data/mockBooking'
import { mergeAdjacentBookings, splitBookingAtTime, cancelMiddleSlot } from '@/utils/timeMerge'
import { useCreditStore } from './creditStore'
import { useStudentStore } from './studentStore'

interface BookingState {
  bookings: Booking[]
  mergedBookings: Booking[]
  currentBooking: Booking | null
  loading: boolean
  fetchBookings: (classroomId?: string, date?: string) => void
  getBookingsByDate: (date: string, classroomId?: string) => Booking[]
  getBookingsByStudent: (studentId: string) => Booking[]
  createBooking: (
    classroomId: string,
    classroomName: string,
    studentId: string,
    studentName: string,
    classId: string,
    date: string,
    startTime: string,
    endTime: string,
    slotCount: number,
    slotDuration: number
  ) => { success: boolean; booking?: Booking; message?: string }
  cancelBooking: (bookingId: string, reason?: string) => boolean
  cancelPartialBooking: (
    bookingId: string,
    cancelStartTime: string,
    cancelEndTime: string,
    slotDuration: number,
    reason?: string
  ) => boolean
  splitBooking: (bookingId: string, splitTime: string, slotDuration: number) => Booking[] | null
  getBooking: (id: string) => Booking | undefined
  setCurrentBooking: (booking: Booking | null) => void
  refreshMergedBookings: () => void
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  mergedBookings: [],
  currentBooking: null,
  loading: false,

  fetchBookings: (classroomId?: string, date?: string) => {
    set({ loading: true })
    console.log('[BookingStore] 获取预约列表')
    setTimeout(() => {
      let bookings = mockBookings
      if (classroomId) {
        bookings = bookings.filter(b => b.classroomId === classroomId)
      }
      if (date) {
        bookings = bookings.filter(b => b.date === date)
      }
      const merged = mergeAdjacentBookings(bookings)
      set({
        bookings,
        mergedBookings: merged,
        loading: false
      })
      console.log('[BookingStore] 预约加载完成，原始:', bookings.length, '条，合并后:', merged.length, '条')
    }, 300)
  },

  getBookingsByDate: (date: string, classroomId?: string) => {
    let bookings = get().bookings.filter(b => b.date === date)
    if (classroomId) {
      bookings = bookings.filter(b => b.classroomId === classroomId)
    }
    return mergeAdjacentBookings(bookings)
  },

  getBookingsByStudent: (studentId: string) => {
    return get().bookings
      .filter(b => b.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
  },

  createBooking: (
    classroomId, classroomName, studentId, studentName, classId,
    date, startTime, endTime, slotCount, slotDuration
  ) => {
    const creditStore = useCreditStore.getState()
    const pool = creditStore.getPoolByClassId(classId)

    if (!pool) {
      return { success: false, message: '未找到对应班级额度池' }
    }

    const available = creditStore.getAvailableCredits(pool.id)
    if (available < slotCount) {
      return { success: false, message: `课时不足，当前可用${available}课时，需要${slotCount}课时` }
    }

    const allBookings = get().bookings.filter(
      b => b.classroomId === classroomId && b.date === date && b.status === 'active'
    )
    const existingStart = timeToMinutes(startTime)
    const existingEnd = timeToMinutes(endTime)

    for (const b of allBookings) {
      const bStart = timeToMinutes(b.startTime)
      const bEnd = timeToMinutes(b.endTime)
      if (existingStart < bEnd && existingEnd > bStart) {
        return { success: false, message: `该时段已被${b.studentName}预约` }
      }
    }

    const deductResult = creditStore.deductCredits(
      pool.id, studentId, studentName, slotCount, '系统'
    )

    if (!deductResult.success) {
      return { success: false, message: deductResult.message || '额度扣减失败' }
    }

    const booking: Booking = {
      id: `bk_${Date.now()}`,
      studentId,
      studentName,
      classroomId,
      classroomName,
      date,
      startTime,
      endTime,
      slotCount,
      isMerged: slotCount > 1,
      mergedFromSlots: slotCount > 1
        ? Array.from({ length: slotCount }, (_, i) => `bk_${Date.now()}_s${i + 1}`)
        : undefined,
      status: 'active',
      createdAt: new Date().toISOString()
    }

    set(state => {
      const newBookings = [...state.bookings, booking]
      const merged = mergeAdjacentBookings(newBookings.filter(b => b.status === 'active'))
      console.log('[BookingStore] 创建预约成功:', {
        学员: studentName,
        教室: classroomName,
        时段: `${startTime}-${endTime}`,
        课时: slotCount
      })
      return {
        bookings: newBookings,
        mergedBookings: merged
      }
    })

    return { success: true, booking }
  },

  cancelBooking: (bookingId: string, reason?: string) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking || booking.status !== 'active') {
      return false
    }

    const studentStore = useStudentStore.getState()
    const student = studentStore.getStudent(booking.studentId)
    if (student) {
      const creditStore = useCreditStore.getState()
      const pool = creditStore.getPoolByClassId(student.classId)
      if (pool) {
        creditStore.refundCredits(
          pool.id, booking.studentId, booking.studentName,
          booking.slotCount, '系统', bookingId
        )
      }
    }

    set(state => {
      const newBookings = state.bookings.map(b =>
        b.id === bookingId
          ? { ...b, status: 'cancelled' as const, cancelledAt: new Date().toISOString(), cancelReason: reason }
          : b
      )
      const activeBookings = newBookings.filter(b => b.status === 'active')
      console.log('[BookingStore] 取消预约:', {
        学员: booking.studentName,
        时段: `${booking.date} ${booking.startTime}-${booking.endTime}`,
        原因: reason
      })
      return {
        bookings: newBookings,
        mergedBookings: mergeAdjacentBookings(activeBookings)
      }
    })

    return true
  },

  cancelPartialBooking: (bookingId, cancelStartTime, cancelEndTime, slotDuration, reason) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking || !booking.isMerged || booking.status !== 'active') {
      return false
    }

    const remainings = cancelMiddleSlot(booking, cancelStartTime, cancelEndTime, slotDuration)
    if (remainings.length === 0 && booking.startTime === cancelStartTime && booking.endTime === cancelEndTime) {
      return get().cancelBooking(bookingId, reason)
    }

    const cancelSlotCount = Math.floor(
      (timeToMinutes(cancelEndTime) - timeToMinutes(cancelStartTime)) / slotDuration
    )

    const studentStore = useStudentStore.getState()
    const student = studentStore.getStudent(booking.studentId)
    if (student && cancelSlotCount > 0) {
      const creditStore = useCreditStore.getState()
      const pool = creditStore.getPoolByClassId(student.classId)
      if (pool) {
        creditStore.refundCredits(
          pool.id, booking.studentId, booking.studentName,
          cancelSlotCount, '系统', `${bookingId}_partial`
        )
      }
    }

    set(state => {
      const otherBookings = state.bookings.filter(b => b.id !== bookingId)
      const cancelledBooking: Booking = {
        ...booking,
        startTime: cancelStartTime,
        endTime: cancelEndTime,
        slotCount: cancelSlotCount,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason
      }
      const newBookings = [...otherBookings, cancelledBooking, ...remainings]
      const activeBookings = newBookings.filter(b => b.status === 'active')
      return {
        bookings: newBookings,
        mergedBookings: mergeAdjacentBookings(activeBookings)
      }
    })

    return true
  },

  splitBooking: (bookingId, splitTime, slotDuration) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking) return null

    const result = splitBookingAtTime(booking, splitTime, slotDuration)
    if (!result) return null

    set(state => {
      const otherBookings = state.bookings.filter(b => b.id !== bookingId)
      const newBookings = [...otherBookings, result.before, result.after]
      const activeBookings = newBookings.filter(b => b.status === 'active')
      console.log('[BookingStore] 拆分时段:', {
        原时段: `${booking.startTime}-${booking.endTime}`,
        拆分点: splitTime
      })
      return {
        bookings: newBookings,
        mergedBookings: mergeAdjacentBookings(activeBookings)
      }
    })

    return [result.before, result.after]
  },

  getBooking: (id: string) => {
    return get().bookings.find(b => b.id === id)
  },

  setCurrentBooking: (booking: Booking | null) => {
    set({ currentBooking: booking })
  },

  refreshMergedBookings: () => {
    const activeBookings = get().bookings.filter(b => b.status === 'active')
    set({ mergedBookings: mergeAdjacentBookings(activeBookings) })
  }
}))

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
