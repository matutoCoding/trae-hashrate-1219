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
  initialized: boolean
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
  initialized: false,

  fetchBookings: () => {
    const { initialized, bookings } = get()
    if (initialized) {
      const activeBookings = bookings.filter(b => b.status === 'active')
      set({ mergedBookings: mergeAdjacentBookings(activeBookings) })
      console.log('[BookingStore] 已初始化，跳过重置，当前预约数:', bookings.length, '合并后:', mergeAdjacentBookings(activeBookings).length)
      return
    }
    set({ loading: true })
    console.log('[BookingStore] 首次加载，初始化 mock 数据')
    setTimeout(() => {
      const initialBookings = [...mockBookings]
      const merged = mergeAdjacentBookings(initialBookings.filter(b => b.status === 'active'))
      set({
        bookings: initialBookings,
        mergedBookings: merged,
        loading: false,
        initialized: true
      })
      console.log('[BookingStore] 初始化完成，原始:', initialBookings.length, '条，合并后:', merged.length, '条')
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
        mergedBookings: merged,
        initialized: true
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
        退课时数: booking.slotCount,
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
    if (!booking || booking.status !== 'active') {
      return false
    }

    if (!booking.isMerged && booking.slotCount === 1) {
      return get().cancelBooking(bookingId, reason)
    }

    const cancelStartMin = timeToMinutes(cancelStartTime)
    const cancelEndMin = timeToMinutes(cancelEndTime)
    const bookStartMin = timeToMinutes(booking.startTime)
    const bookEndMin = timeToMinutes(booking.endTime)

    if (cancelStartMin === bookStartMin && cancelEndMin === bookEndMin) {
      return get().cancelBooking(bookingId, reason)
    }

    const remainings = cancelMiddleSlot(booking, cancelStartTime, cancelEndTime, slotDuration)

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
        id: `${bookingId}_cancelled_${Date.now()}`,
        startTime: cancelStartTime,
        endTime: cancelEndTime,
        slotCount: cancelSlotCount,
        isMerged: false,
        mergedFromSlots: undefined,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason
      }
      const newBookings = [...otherBookings, cancelledBooking, ...remainings]
      const activeBookings = newBookings.filter(b => b.status === 'active')
      console.log('[BookingStore] 部分退订成功:', {
        学员: booking.studentName,
        原时段: `${booking.startTime}-${booking.endTime}`,
        退订时段: `${cancelStartTime}-${cancelEndTime}`,
        退课时数: cancelSlotCount,
        剩余段数: remainings.length
      })
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
