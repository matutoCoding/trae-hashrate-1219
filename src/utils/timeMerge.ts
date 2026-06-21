import type { Booking } from '@/types/booking'
import { isTimeAdjacent, isSameDay } from './date'

export interface SlotItem {
  id: string
  date: string
  startTime: string
  endTime: string
  studentId?: string
  studentName?: string
}

export interface MergedSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  studentId: string
  studentName: string
  slotCount: number
  slotIds: string[]
  bookingIds: string[]
}

export const mergeAdjacentBookings = (bookings: Booking[]): Booking[] => {
  if (bookings.length <= 1) return bookings

  const sorted = [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.startTime.localeCompare(b.startTime)
  })

  const merged: Booking[] = []
  let current: Booking | null = null

  for (const booking of sorted) {
    if (booking.status !== 'active') {
      if (current) {
        merged.push(current)
        current = null
      }
      merged.push(booking)
      continue
    }

    if (!current) {
      current = { ...booking, isMerged: false, mergedFromSlots: [booking.id] }
      continue
    }

    if (
      current.studentId === booking.studentId &&
      current.classroomId === booking.classroomId &&
      isSameDay(current.date, booking.date) &&
      isTimeAdjacent(current.endTime, booking.startTime)
    ) {
      current = {
        ...current,
        endTime: booking.endTime,
        slotCount: current.slotCount + booking.slotCount,
        isMerged: true,
        mergedFromSlots: [...(current.mergedFromSlots || []), booking.id]
      }
    } else {
      merged.push(current)
      current = { ...booking, isMerged: false, mergedFromSlots: [booking.id] }
    }
  }

  if (current) {
    merged.push(current)
  }

  console.log('[TimeMerge] 合并前:', bookings.length, '条，合并后:', merged.length, '条')
  return merged
}

export const splitBookingAtTime = (
  booking: Booking,
  splitTime: string,
  slotDuration: number
): { before: Booking; after: Booking } | null => {
  if (!booking.isMerged) {
    console.log('[TimeMerge] 无法拆分：非合并时段')
    return null
  }

  const startMinutes = timeToMinutes(booking.startTime)
  const endMinutes = timeToMinutes(booking.endTime)
  const splitMinutes = timeToMinutes(splitTime)

  if (splitMinutes <= startMinutes || splitMinutes >= endMinutes) {
    console.log('[TimeMerge] 无法拆分：拆分点不在时段范围内')
    return null
  }

  if ((splitMinutes - startMinutes) % slotDuration !== 0) {
    console.log('[TimeMerge] 无法拆分：拆分点不在时段边界')
    return null
  }

  const beforeSlotCount = Math.floor((splitMinutes - startMinutes) / slotDuration)
  const afterSlotCount = Math.floor((endMinutes - splitMinutes) / slotDuration)

  const beforeSlots = booking.mergedFromSlots?.slice(0, beforeSlotCount) || []
  const afterSlots = booking.mergedFromSlots?.slice(beforeSlotCount) || []

  const before: Booking = {
    ...booking,
    id: `${booking.id}_before`,
    startTime: booking.startTime,
    endTime: splitTime,
    slotCount: beforeSlotCount,
    isMerged: beforeSlotCount > 1,
    mergedFromSlots: beforeSlots
  }

  const after: Booking = {
    ...booking,
    id: `${booking.id}_after`,
    startTime: splitTime,
    endTime: booking.endTime,
    slotCount: afterSlotCount,
    isMerged: afterSlotCount > 1,
    mergedFromSlots: afterSlots
  }

  console.log('[TimeMerge] 拆分成功:', {
    原时段: `${booking.startTime}-${booking.endTime}`,
    拆分点: splitTime,
    前段: `${before.startTime}-${before.endTime}(${beforeSlotCount}节)`,
    后段: `${after.startTime}-${after.endTime}(${afterSlotCount}节)`
  })

  return { before, after }
}

export const cancelMiddleSlot = (
  booking: Booking,
  cancelStartTime: string,
  cancelEndTime: string,
  slotDuration: number
): Booking[] => {
  if (!booking.isMerged) {
    return []
  }

  const startMinutes = timeToMinutes(booking.startTime)
  const endMinutes = timeToMinutes(booking.endTime)
  const cancelStart = timeToMinutes(cancelStartTime)
  const cancelEnd = timeToMinutes(cancelEndTime)

  if (cancelStart < startMinutes || cancelEnd > endMinutes) {
    console.log('[TimeMerge] 退订失败：退订时段超出范围')
    return [booking]
  }

  const result: Booking[] = []

  if (cancelStart > startMinutes) {
    const beforeSlotCount = Math.floor((cancelStart - startMinutes) / slotDuration)
    const beforeSlots = booking.mergedFromSlots?.slice(0, beforeSlotCount) || []
    result.push({
      ...booking,
      id: `${booking.id}_remain_before`,
      startTime: booking.startTime,
      endTime: cancelStartTime,
      slotCount: beforeSlotCount,
      isMerged: beforeSlotCount > 1,
      mergedFromSlots: beforeSlots
    })
  }

  if (cancelEnd < endMinutes) {
    const totalSlots = Math.floor((endMinutes - startMinutes) / slotDuration)
    const cancelSlots = Math.floor((cancelEnd - cancelStart) / slotDuration)
    const afterStartIndex = Math.floor((cancelEnd - startMinutes) / slotDuration)
    const afterSlots = booking.mergedFromSlots?.slice(afterStartIndex) || []
    result.push({
      ...booking,
      id: `${booking.id}_remain_after`,
      startTime: cancelEndTime,
      endTime: booking.endTime,
      slotCount: totalSlots - cancelSlots - (result.length > 0 ? Math.floor((cancelStart - startMinutes) / slotDuration) : 0),
      isMerged: afterSlots.length > 1,
      mergedFromSlots: afterSlots
    })
  }

  console.log('[TimeMerge] 中途退订拆分结果:', {
    原时段: `${booking.startTime}-${booking.endTime}`,
    退订: `${cancelStartTime}-${cancelEndTime}`,
    剩余段数: result.length
  })

  return result
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const canMergeSlots = (
  slot1: SlotItem,
  slot2: SlotItem
): boolean => {
  if (!slot1.studentId || !slot2.studentId) return false
  if (slot1.studentId !== slot2.studentId) return false
  if (!isSameDay(slot1.date, slot2.date)) return false
  return isTimeAdjacent(slot1.endTime, slot2.startTime)
}
