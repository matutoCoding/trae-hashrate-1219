import { create } from 'zustand'
import type { Booking, RecurringBooking, RecurringBookingFormData, CheckInStatus, TeacherConflictInfo } from '@/types/booking'
import { mockBookings } from '@/data/mockBooking'
import { mergeAdjacentBookings, splitBookingAtTime, cancelMiddleSlot } from '@/utils/timeMerge'
import { useCreditStore } from './creditStore'
import { useStudentStore } from './studentStore'
import { useTeacherStore } from './teacherStore'

interface BookingState {
  bookings: Booking[]
  recurringBookings: RecurringBooking[]
  mergedBookings: Booking[]
  currentBooking: Booking | null
  loading: boolean
  initialized: boolean
  fetchBookings: (classroomId?: string, date?: string) => void
  fetchRecurringBookings: () => void
  getBookingsByDate: (date: string, classroomId?: string, teacherId?: string) => Booking[]
  getBookingsByStudent: (studentId: string) => Booking[]
  getBookingsByTeacher: (teacherId: string) => Booking[]
  checkTeacherConflict: (
    teacherId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => TeacherConflictInfo
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
    slotDuration: number,
    teacherId?: string,
    teacherName?: string
  ) => { success: boolean; booking?: Booking; message?: string }
  createRecurringBookings: (
    formData: RecurringBookingFormData,
    slotDuration: number
  ) => { success: boolean; recurring?: RecurringBooking; bookings?: Booking[]; message?: string }
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
  checkInBooking: (
    bookingId: string,
    status: 'checked_in' | 'absent' | 'leave',
    operator?: string,
    remark?: string
  ) => boolean
  getRecurringBooking: (id: string) => RecurringBooking | undefined
  getBookingsByRecurringId: (recurringId: string) => Booking[]
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  recurringBookings: [],
  mergedBookings: [],
  currentBooking: null,
  loading: false,
  initialized: false,

  fetchBookings: () => {
    const { initialized, bookings } = get()
    if (initialized) {
      const activeBookings = bookings.filter(b => b.status === 'active')
      set({ mergedBookings: mergeAdjacentBookings(activeBookings) })
      return
    }
    set({ loading: true })
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

  fetchRecurringBookings: () => {
    set({})
  },

  getBookingsByDate: (date, classroomId?, teacherId?) => {
    let bookings = get().bookings.filter(b => b.date === date && b.status === 'active')
    if (classroomId) {
      bookings = bookings.filter(b => b.classroomId === classroomId)
    }
    if (teacherId) {
      bookings = bookings.filter(b => b.teacherId === teacherId)
    }
    return mergeAdjacentBookings(bookings)
  },

  getBookingsByStudent: (studentId) => {
    return get().bookings
      .filter(b => b.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
  },

  getBookingsByTeacher: (teacherId) => {
    return get().bookings
      .filter(b => b.teacherId === teacherId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
  },

  checkTeacherConflict: (teacherId, date, startTime, endTime, excludeBookingId) => {
    if (!teacherId) return { hasConflict: false }
    const bookings = get().bookings.filter(
      b => b.teacherId === teacherId
        && b.date === date
        && b.status === 'active'
        && b.id !== excludeBookingId
    )
    const newStart = timeToMinutes(startTime)
    const newEnd = timeToMinutes(endTime)
    for (const b of bookings) {
      const bStart = timeToMinutes(b.startTime)
      const bEnd = timeToMinutes(b.endTime)
      if (newStart < bEnd && newEnd > bStart) {
        const message = `${b.teacherName || '该老师'} ${b.startTime}-${b.endTime} 在${b.classroomName}给${b.studentName}上课`
        return {
          hasConflict: true,
          conflictingBooking: b,
          message
        }
      }
    }
    return { hasConflict: false }
  },

  createBooking: (
    classroomId, classroomName, studentId, studentName, classId,
    date, startTime, endTime, slotCount, slotDuration, teacherId, teacherName
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

    if (teacherId) {
      const conflict = get().checkTeacherConflict(teacherId, date, startTime, endTime)
      if (conflict.hasConflict) {
        return { success: false, message: conflict.message || `${teacherName || '该老师'}在该时段已有其他课程安排` }
      }
    }

    const deductResult = creditStore.freezeCredits(
      pool.id, studentId, studentName, slotCount, '系统'
    )

    if (!deductResult.success) {
      return { success: false, message: deductResult.message || '额度冻结失败' }
    }

    const booking: Booking = {
      id: `bk_${Date.now()}`,
      studentId,
      studentName,
      teacherId,
      teacherName,
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
      checkInStatus: 'pending',
      createdAt: new Date().toISOString()
    }

    set(state => {
      const newBookings = [...state.bookings, booking]
      const merged = mergeAdjacentBookings(newBookings.filter(b => b.status === 'active'))
      console.log('[BookingStore] 创建预约成功:', {
        学员: studentName,
        老师: teacherName || '未指定',
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

  createRecurringBookings: (formData, slotDuration) => {
    const {
      studentId, studentName, teacherId, teacherName,
      classroomId, classroomName, classId,
      weekdays, startTime, endTime, startDate, totalWeeks, slotCount
    } = formData

    const creditStore = useCreditStore.getState()
    const pool = creditStore.getPoolByClassId(classId)
    if (!pool) {
      return { success: false, message: '未找到对应班级额度池' }
    }

    const totalSessions = weekdays.length * totalWeeks
    const totalCreditsNeeded = totalSessions * slotCount
    const available = creditStore.getAvailableCredits(pool.id)
    if (available < totalCreditsNeeded) {
      return { success: false, message: `课时不足，周期课共需${totalCreditsNeeded}课时，当前可用${available}课时` }
    }

    const start = new Date(startDate)
    const bookingDates: string[] = []
    const dayMs = 86400000
    for (let week = 0; week < totalWeeks; week++) {
      for (const wd of weekdays) {
        const d = new Date(start.getTime() + week * 7 * dayMs)
        const currentDay = d.getDay()
        const diff = (wd + 7 - currentDay) % 7
        const targetDate = new Date(d.getTime() + diff * dayMs)
        if (targetDate < start) continue
        const dateStr = targetDate.toISOString().slice(0, 10)
        if (!bookingDates.includes(dateStr)) {
          bookingDates.push(dateStr)
        }
      }
    }
    bookingDates.sort()

    for (const date of bookingDates) {
      const roomConflict = get().bookings.some(b =>
        b.classroomId === classroomId
        && b.date === date
        && b.status === 'active'
        && timeToMinutes(b.startTime) < timeToMinutes(endTime)
        && timeToMinutes(b.endTime) > timeToMinutes(startTime)
      )
      if (roomConflict) {
        return { success: false, message: `${date} 该教室时段已被占用，周期课创建失败` }
      }

      if (teacherId) {
        const conflict = get().checkTeacherConflict(teacherId, date, startTime, endTime)
        if (conflict.hasConflict) {
          return { success: false, message: `${date} ${conflict.message}，周期课创建失败` }
        }
      }
    }

    const freezeResult = creditStore.freezeCredits(
      pool.id, studentId, studentName, totalCreditsNeeded, '系统'
    )
    if (!freezeResult.success) {
      return { success: false, message: freezeResult.message || '额度冻结失败' }
    }

    const recurringId = `rcr_${Date.now()}`
    const endDate = bookingDates[bookingDates.length - 1] || startDate

    const recurring: RecurringBooking = {
      id: recurringId,
      studentId,
      studentName,
      teacherId,
      teacherName,
      classroomId,
      classroomName,
      classId,
      weekdays: [...weekdays].sort(),
      startTime,
      endTime,
      startDate,
      endDate,
      totalWeeks,
      totalSessions: bookingDates.length,
      slotCount,
      createdAt: new Date().toISOString(),
      status: 'active'
    }

    const bookings: Booking[] = bookingDates.map((date, idx) => ({
      id: `bk_${Date.now()}_${idx}`,
      studentId,
      studentName,
      teacherId,
      teacherName,
      classroomId,
      classroomName,
      date,
      startTime,
      endTime,
      slotCount,
      isMerged: slotCount > 1,
      recurringId,
      recurringIndex: idx,
      status: 'active',
      checkInStatus: 'pending',
      createdAt: new Date().toISOString()
    }))

    set(state => {
      const newBookings = [...state.bookings, ...bookings]
      const newRecurring = [...state.recurringBookings, recurring]
      const active = newBookings.filter(b => b.status === 'active')
      console.log('[BookingStore] 周期课创建成功:', {
        学员: studentName,
        周期数: totalWeeks,
        课节数: bookingDates.length,
        总课时: totalCreditsNeeded
      })
      return {
        bookings: newBookings,
        recurringBookings: newRecurring,
        mergedBookings: mergeAdjacentBookings(active),
        initialized: true
      }
    })

    return { success: true, recurring, bookings }
  },

  cancelBooking: (bookingId, reason) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking || booking.status !== 'active') {
      return false
    }

    const studentStore = useStudentStore.getState()
    const student = studentStore.getStudent(booking.studentId)
    const creditStore = useCreditStore.getState()

    if (student) {
      const pool = creditStore.getPoolByClassId(student.classId)
      if (pool) {
        if (booking.checkInStatus === 'pending') {
          creditStore.unfreezeCredits(
            pool.id, booking.studentId, booking.studentName,
            booking.slotCount, '系统', bookingId, reason
          )
        } else if (booking.checkInStatus === 'leave') {
          // 已请假的，之前已经解冻了
        } else {
          // 已消课的，退回已用额度
          creditStore.refundCredits(
            pool.id, booking.studentId, booking.studentName,
            booking.slotCount, '系统', bookingId, reason
          )
        }
      }
    }

    set(state => {
      const newBookings = state.bookings.map(b =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled' as const,
              cancelledAt: new Date().toISOString(),
              cancelReason: reason
            }
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
    const creditStore = useCreditStore.getState()

    if (student && cancelSlotCount > 0) {
      const pool = creditStore.getPoolByClassId(student.classId)
      if (pool) {
        if (booking.checkInStatus === 'pending') {
          creditStore.unfreezeCredits(
            pool.id, booking.studentId, booking.studentName,
            cancelSlotCount, '系统', `${bookingId}_partial`, reason
          )
        }
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
        checkInStatus: 'pending',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason
      }
      const remainingsWithStatus = remainings.map(r => ({
        ...r,
        checkInStatus: 'pending' as CheckInStatus,
        teacherId: booking.teacherId,
        teacherName: booking.teacherName
      }))
      const newBookings = [...otherBookings, cancelledBooking, ...remainingsWithStatus]
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
      const before = { ...result.before, teacherId: booking.teacherId, teacherName: booking.teacherName, checkInStatus: booking.checkInStatus }
      const after = { ...result.after, teacherId: booking.teacherId, teacherName: booking.teacherName, checkInStatus: booking.checkInStatus }
      const newBookings = [...otherBookings, before, after]
      const activeBookings = newBookings.filter(b => b.status === 'active')
      return {
        bookings: newBookings,
        mergedBookings: mergeAdjacentBookings(activeBookings)
      }
    })

    return [
      { ...result.before, teacherId: booking.teacherId, teacherName: booking.teacherName },
      { ...result.after, teacherId: booking.teacherId, teacherName: booking.teacherName }
    ]
  },

  getBooking: (id) => {
    return get().bookings.find(b => b.id === id)
  },

  setCurrentBooking: (booking) => {
    set({ currentBooking: booking })
  },

  refreshMergedBookings: () => {
    const activeBookings = get().bookings.filter(b => b.status === 'active')
    set({ mergedBookings: mergeAdjacentBookings(activeBookings) })
  },

  checkInBooking: (bookingId, status, operator = '系统', remark) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking || booking.status !== 'active') return false
    if (booking.checkInStatus !== 'pending') return false

    const studentStore = useStudentStore.getState()
    const student = studentStore.getStudent(booking.studentId)
    const creditStore = useCreditStore.getState()

    if (student) {
      const pool = creditStore.getPoolByClassId(student.classId)
      if (pool) {
        if (status === 'checked_in') {
          creditStore.consumeCredits(
            pool.id, booking.studentId, booking.studentName,
            booking.slotCount, operator, bookingId, remark
          )
        } else if (status === 'absent') {
          creditStore.absentConsume(
            pool.id, booking.studentId, booking.studentName,
            booking.slotCount, operator, bookingId
          )
        } else if (status === 'leave') {
          creditStore.leaveUnfreeze(
            pool.id, booking.studentId, booking.studentName,
            booking.slotCount, operator, bookingId
          )
        }
      }
    }

    set(state => {
      const newBookings = state.bookings.map(b =>
        b.id === bookingId
          ? {
              ...b,
              checkInStatus: status,
              checkedInAt: new Date().toISOString(),
              remark: remark || b.remark,
              status: (status === 'checked_in' || status === 'absent') ? 'completed' as const : b.status
            }
          : b
      )
      const active = newBookings.filter(b => b.status === 'active')
      console.log('[BookingStore] 签到:', {
        学员: booking.studentName,
        状态: status,
        课时: booking.slotCount
      })
      return {
        bookings: newBookings,
        mergedBookings: mergeAdjacentBookings(active)
      }
    })

    return true
  },

  getRecurringBooking: (id) => {
    return get().recurringBookings.find(r => r.id === id)
  },

  getBookingsByRecurringId: (recurringId) => {
    return get().bookings
      .filter(b => b.recurringId === recurringId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}))

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
