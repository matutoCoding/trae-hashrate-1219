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

const SchedulePage: React.FC = () => {
  const today = formatDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const { classrooms, fetchClassrooms } = useClassroomStore()
  const { bookings, mergedBookings, fetchBookings, getBookingsByDate } = useBookingStore()
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

  const dayBookings = useMemo(() => {
    return getBookingsByDate(selectedDate, selectedClassroomId, selectedTeacherId || undefined)
  }, [selectedDate, selectedClassroomId, selectedTeacherId, bookings, mergedBookings])

  const timeSlots = useMemo(() => {
    if (!currentClassroom) return []
    return generateTimeSlots(
      currentClassroom.startTime,
      currentClassroom.endTime,
      currentClassroom.slotDuration
    )
  }, [currentClassroom])

  const slotBookings = useMemo(() => {
    const map = new Map<string, typeof dayBookings[0]>()
    dayBookings.forEach(booking => {
      const start = timeToMinutes(booking.startTime)
      const end = timeToMinutes(booking.endTime)
      const slotDuration = currentClassroom?.slotDuration || 60
      for (let t = start; t < end; t += slotDuration) {
        const timeKey = minutesToTime(t)
        map.set(timeKey, booking)
      }
    })
    return map
  }, [dayBookings, currentClassroom])

  const stats = useMemo(() => {
    const totalSlots = timeSlots.length
    const bookedSlots = dayBookings.reduce((sum, b) => sum + b.slotCount, 0)
    const available = totalSlots - bookedSlots
    return { total: totalSlots, booked: bookedSlots, available }
  }, [timeSlots, dayBookings])

  const handleSlotClick = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    if (booking) {
      Taro.navigateTo({
        url: `/pages/booking-detail/index?id=${booking.id}`
      })
    } else {
      Taro.navigateTo({
        url: `/pages/booking-create/index?classroomId=${selectedClassroomId}&date=${selectedDate}&startTime=${slot.startTime}&endTime=${slot.endTime}`
      })
    }
  }

  const handleRefresh = () => {
    fetchBookings()
    setTimeout(() => {
      Taro.stopPullDownRefresh()
    }, 500)
  }

  const getSlotStatus = (slot: { startTime: string; endTime: string }) => {
    const booking = slotBookings.get(slot.startTime)
    if (!booking) return 'available'

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

    const slotDuration = currentClassroom?.slotDuration || 60
    const endMinutes = timeToMinutes(booking.endTime)
    const slotEndMinutes = timeToMinutes(slot.endTime)
    return slotEndMinutes === endMinutes
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.dateInfo}>
          <Text className={styles.dateText}>{selectedDate.slice(5)}</Text>
          <Text className={styles.weekdayText}>{getWeekday(selectedDate)}</Text>
        </View>
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
            <Text className={styles.teacherTabText}>全部</Text>
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
        </View>

        <Text className={styles.sectionTitle}>时段安排</Text>

        {timeSlots.length > 0 ? (
          <View className={styles.timeSlots}>
            {timeSlots.map((slot, index) => {
              const booking = slotBookings.get(slot.startTime)
              const status = getSlotStatus(slot)
              return (
                <TimeSlot
                  key={`${slot.startTime}-${index}`}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  status={status as any}
                  booking={booking}
                  isMergedHead={isMergedHead(slot)}
                  isMergedTail={isMergedTail(slot)}
                  onClick={() => handleSlotClick(slot)}
                />
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
          <Text className={styles.sectionTitle}>今日预约</Text>
          {dayBookings.length > 0 ? (
            dayBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showClassroom={false}
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
              <Text className={styles.emptyText}>暂无预约</Text>
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
              if (res.tapIndex === 0) {
                Taro.navigateTo({
                  url: `/pages/booking-create/index?classroomId=${selectedClassroomId}&date=${selectedDate}`
                })
              } else if (res.tapIndex === 1) {
                Taro.navigateTo({
                  url: `/pages/recurring-booking-create/index?classroomId=${selectedClassroomId}&date=${selectedDate}`
                })
              }
            }
          })
        }}
      >
        <Text className={styles.fabIcon}>+</Text>
      </View>
    </View>
  )
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default SchedulePage
