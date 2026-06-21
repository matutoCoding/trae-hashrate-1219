import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import Calendar from '@/components/Calendar'
import TimeSlot from '@/components/TimeSlot'
import BookingCard from '@/components/BookingCard'
import { useClassroomStore } from '@/store/classroomStore'
import { useBookingStore } from '@/store/bookingStore'
import { useCreditStore } from '@/store/creditStore'
import { useTeacherStore } from '@/store/teacherStore'
import { formatDate, getWeekday, generateTimeSlots } from '@/utils/date'
import type { Booking } from '@/types/booking'

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const SchedulePage: React.FC = () => {
  const today = formatDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const { classrooms, fetchClassrooms } = useClassroomStore()
  const { bookings, mergedBookings, fetchBookings, getBookingsByDate, getBookingsByTeacher } = useBookingStore()
  const { fetchPools } = useCreditStore()
  const { teachers, fetchTeachers, getActiveTeachers } = useTeacherStore()

  useEffect(() => {
    fetchClassrooms()
    fetchBookings()
    fetchPools()
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClassroomId) {
      const activeClassroom = classrooms.find(c => c.status === 'active')
      if (activeClassroom) {
        setSelectedClassroomId(activeClassroom.id)
      }
    }
  }, [classrooms])

  const currentClassroom = classrooms.find(c => c.id === selectedClassroomId)
  const activeTeachers = getActiveTeachers()
  const isTeacherView = !!selectedTeacherId

  const dayBookings = useMemo(() => {
    if (isTeacherView) {
      const list = bookings.filter(b =>
        b.date === selectedDate
        && b.status === 'active'
        && b.teacherId === selectedTeacherId
      )
      return list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return getBookingsByDate(selectedDate, selectedClassroomId, undefined)
  }, [selectedDate, selectedClassroomId, selectedTeacherId, bookings, isTeacherView])

  const allTeachersBookingsOnDay = useMemo(() => {
    if (isTeacherView) return []
    return bookings.filter(b =>
      b.date === selectedDate
      && b.status === 'active'
    )
  }, [selectedDate, bookings, isTeacherView])

  const timeSlots = useMemo(() => {
    if (isTeacherView) {
      const baseClassroom = classrooms.find(c => c.status === 'active')
      if (!baseClassroom) return []
      return generateTimeSlots(
        baseClassroom.startTime,
        baseClassroom.endTime,
        baseClassroom.slotDuration
      )
    }
    if (!currentClassroom) return []
    return generateTimeSlots(
      currentClassroom.startTime,
      currentClassroom.endTime,
      currentClassroom.slotDuration
    )
  }, [currentClassroom, classrooms, isTeacherView])

  const slotDuration = isTeacherView
    ? (classrooms.find(c => c.status === 'active')?.slotDuration || 60)
    : (currentClassroom?.slotDuration || 60)

  const slotBookings = useMemo(() => {
    const map = new Map<string, Booking>()
    dayBookings.forEach(booking => {
      const start = timeToMinutes(booking.startTime)
      const end = timeToMinutes(booking.endTime)
      for (let t = start; t < end; t += slotDuration) {
        const h = Math.floor(t / 60).toString().padStart(2, '0')
        const m = (t % 60).toString().padStart(2, '0')
        map.set(`${h}:${m}`, booking)
      }
    })
    return map
  }, [dayBookings, slotDuration])

  const crossRoomOccupancy = useMemo(() => {
    if (isTeacherView) return new Map<string, Booking[]>()
    const map = new Map<string, Booking[]>()
    if (!currentClassroom) return map

    const bookingsInClassroom = bookings.filter(b =>
      b.date === selectedDate
      && b.status === 'active'
      && b.classroomId === currentClassroom.id
    )

    const teachersInRoom = new Set(bookingsInClassroom.map(b => b.teacherId).filter(Boolean))

    allTeachersBookingsOnDay.forEach(b => {
      if (b.classroomId === currentClassroom.id) return
      if (!b.teacherId || !teachersInRoom.has(b.teacherId)) return

      const start = timeToMinutes(b.startTime)
      const end = timeToMinutes(b.endTime)
      for (let t = start; t < end; t += slotDuration) {
        const h = Math.floor(t / 60).toString().padStart(2, '0')
        const m = (t % 60).toString().padStart(2, '0')
        const key = `${h}:${m}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(b)
      }
    })
    return map
  }, [allTeachersBookingsOnDay, currentClassroom, isTeacherView, selectedDate, bookings, slotDuration])

  const stats = useMemo(() => {
    if (isTeacherView) {
      const totalMinutes = dayBookings.reduce(
        (sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)), 0
      )
      const totalSlots = Math.floor(totalMinutes / slotDuration)
      const classCount = new Set(dayBookings.map(b => b.classroomId)).size
      return { total: timeSlots.length, booked: totalSlots, available: classCount, isTeacher: true }
    }
    const totalSlots = timeSlots.length
    const bookedSlots = dayBookings.reduce((sum, b) => sum + b.slotCount, 0)
    const available = totalSlots - bookedSlots
    return { total: totalSlots, booked: bookedSlots, available }
  }, [timeSlots, dayBookings, isTeacherView, slotDuration])

  const handleSlotClick = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    const cross = crossRoomOccupancy.get(slot.startTime)

    if (booking) {
      Taro.navigateTo({
        url: `/pages/booking-detail/index?id=${booking.id}`
      })
      return
    }

    if (cross && cross.length > 0) {
      const info = cross.map(c =>
        `⚠ ${c.teacherName || '该老师'} ${c.startTime}-${c.endTime} 在${c.classroomName}给${c.studentName}上课`
      ).join('\n')
      Taro.showModal({
        title: '老师跨教室占用',
        content: `该时段此教室空闲，但：\n\n${info}\n\n是否仍要创建预约？`,
        confirmText: '仍要创建',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const params = new URLSearchParams()
            if (!isTeacherView && currentClassroom) params.set('classroomId', currentClassroom.id)
            if (isTeacherView) params.set('teacherId', selectedTeacherId)
            params.set('date', selectedDate)
            params.set('startTime', slot.startTime)
            params.set('endTime', slot.endTime)
            Taro.navigateTo({ url: `/pages/booking-create/index?${params.toString()}` })
          }
        }
      })
      return
    }

    const params = new URLSearchParams()
    if (!isTeacherView && currentClassroom) params.set('classroomId', currentClassroom.id)
    if (isTeacherView) params.set('teacherId', selectedTeacherId)
    params.set('date', selectedDate)
    params.set('startTime', slot.startTime)
    params.set('endTime', slot.endTime)
    Taro.navigateTo({ url: `/pages/booking-create/index?${params.toString()}` })
  }

  const handleRefresh = () => {
    fetchBookings()
    setTimeout(() => {
      Taro.stopPullDownRefresh()
    }, 500)
  }

  const getSlotStatus = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    if (!booking) {
      const cross = crossRoomOccupancy.get(slot.startTime)
      if (cross && cross.length > 0) return 'cross_room' as any
      return 'available'
    }

    if (booking.isMerged) {
      const startMinutes = timeToMinutes(booking.startTime)
      const currentMinutes = timeToMinutes(slot.startTime)
      if (currentMinutes === startMinutes) {
        return 'booked'
      }
      return 'merged'
    }
    return 'booked'
  }

  const isMergedHead = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    if (!booking || !booking.isMerged) return false
    return slot.startTime === booking.startTime
  }

  const isMergedTail = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    if (!booking || !booking.isMerged) return false

    const endMinutes = timeToMinutes(booking.endTime)
    const slotEndMinutes = timeToMinutes(slot.endTime)
    return slotEndMinutes === endMinutes
  }

  const selectedTeacher = activeTeachers.find(t => t.id === selectedTeacherId)

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.dateInfo}>
          <Text className={styles.dateText}>{selectedDate.slice(5)}</Text>
          <Text className={styles.weekdayText}>{getWeekday(selectedDate)}</Text>
        </View>
        {isTeacherView && selectedTeacher ? (
          <View className={styles.teacherViewBadge}>
            <Text className={styles.teacherViewName}>👨‍🏫 {selectedTeacher.name}的课表</Text>
            <Text className={styles.teacherViewInfo}>
              跨 {stats.available} 间教室 · 共 {stats.booked} 个时段
            </Text>
          </View>
        ) : (
          <View className={styles.statsRow}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.total}</Text>
              <Text className={styles.statLabel}>总时段</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.booked}</Text>
              <Text className={styles.statLabel}>已预约</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.available}</Text>
              <Text className={styles.statLabel}>可预约</Text>
            </View>
          </View>
        )}
      </View>

      <Calendar
        currentDate={today}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        days={14}
      />

      <View className={styles.filterSection}>
        <Text className={styles.filterLabel}>老师筛选：</Text>
        <ScrollView scrollX className={styles.teacherTabs}>
          <View
            className={classnames(
              styles.teacherTab,
              !selectedTeacherId && styles.teacherTabActive
            )}
            onClick={() => setSelectedTeacherId('')}
          >
            <Text className={styles.teacherTabText}>教室视角</Text>
          </View>
          {activeTeachers.map(teacher => (
            <View
              key={teacher.id}
              className={classnames(
                styles.teacherTab,
                selectedTeacherId === teacher.id && styles.teacherTabActive
              )}
              onClick={() => setSelectedTeacherId(teacher.id)}
            >
              <Text className={styles.teacherTabText}>{teacher.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {!isTeacherView && (
        <ScrollView scrollX className={styles.classroomTabs}>
          {classrooms.filter(c => c.status === 'active').map(classroom => (
            <View
              key={classroom.id}
              className={classnames(
                styles.tabItem,
                selectedClassroomId === classroom.id && styles.active
              )}
              onClick={() => setSelectedClassroomId(classroom.id)}
            >
              <Text className={styles.tabText}>{classroom.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View className={styles.content}>
        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.available)} />
            <Text className={styles.legendText}>可预约</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.booked)} />
            <Text className={styles.legendText}>已预约</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.merged)} />
            <Text className={styles.legendText}>连订合并</Text>
          </View>
          {!isTeacherView && (
            <View className={styles.legendItem}>
              <View className={classnames(styles.legendDot, styles.crossRoom)} />
              <Text className={styles.legendText}>老师跨教室占用</Text>
            </View>
          )}
        </View>

        <Text className={styles.sectionTitle}>
          {isTeacherView ? '时段安排（含所有教室）' : '时段安排'}
        </Text>

        {timeSlots.length > 0 ? (
          <View className={styles.timeSlots}>
            {timeSlots.map((slot, index) => {
              const booking = slotBookings.get(slot.startTime)
              const cross = crossRoomOccupancy.get(slot.startTime)
              const status = getSlotStatus(slot)
              return (
                <View key={`${slot.startTime}-${index}`} className={styles.slotWrapper}>
                  <TimeSlot
                    startTime={slot.startTime}
                    endTime={slot.endTime}
                    status={status as any}
                    booking={booking}
                    isMergedHead={isMergedHead(slot)}
                    isMergedTail={isMergedTail(slot)}
                    onClick={() => handleSlotClick(slot)}
                  />
                  {cross && cross.length > 0 && !booking && (
                    <View className={styles.crossRoomTag}>
                      {cross.map(c => (
                        <Text key={c.id} className={styles.crossRoomTagText}>
                          ⚠{c.teacherName}在{c.classroomName}
                        </Text>
                      ))}
                    </View>
                  )}
                  {booking && isTeacherView && (
                    <View className={styles.teacherClassroomTag}>
                      <Text className={styles.teacherClassroomTagText}>📍{booking.classroomName}</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📅</Text>
            <Text className={styles.emptyText}>暂无时段信息</Text>
          </View>
        )}

        <View className={styles.bookingList}>
          <Text className={styles.sectionTitle}>
            {isTeacherView ? `${selectedTeacher?.name || ''} 今日课表` : '今日预约'}
          </Text>
          {dayBookings.length > 0 ? (
            dayBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showClassroom={isTeacherView}
                showTeacher={!isTeacherView}
                onClick={() => {
                  Taro.navigateTo({
                    url: `/pages/booking-detail/index?id=${booking.id}`
                  })
                }}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📭</Text>
              <Text className={styles.emptyText}>
                {isTeacherView ? '今日该老师无课程安排' : '暂无预约'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        className={styles.fab}
        onClick={() => {
          Taro.showActionSheet({
            itemList: ['单节课预约', '周期课预约'],
            success: (res) => {
              const page = res.tapIndex === 0 ? 'booking-create' : 'recurring-booking-create'
              const params = new URLSearchParams()
              if (!isTeacherView && currentClassroom) params.set('classroomId', currentClassroom.id)
              if (isTeacherView) params.set('teacherId', selectedTeacherId)
              params.set('date', selectedDate)
              Taro.navigateTo({ url: `/pages/${page}/index?${params.toString()}` })
            }
          })
        }}
      >
        <Text className={styles.fabIcon}>+</Text>
      </View>
    </View>
  )
}

export default SchedulePage
