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
import { formatDate, getWeekday, generateTimeSlots } from '@/utils/date'

const SchedulePage: React.FC = () => {
  const today = formatDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClassroomId, setSelectedClassroomId] = useState('')

  const { classrooms, fetchClassrooms } = useClassroomStore()
  const { bookings, mergedBookings, fetchBookings, getBookingsByDate } = useBookingStore()
  const { fetchPools, pools } = useCreditStore()

  useEffect(() => {
    fetchClassrooms()
    fetchBookings()
    fetchPools()
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

  const dayBookings = useMemo(() => {
    if (!selectedClassroomId) return []
    return getBookingsByDate(selectedDate, selectedClassroomId)
  }, [selectedDate, selectedClassroomId, bookings, mergedBookings])

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
    fetchBookings(selectedClassroomId, selectedDate)
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

  const handleDemoMerge = () => {
    Taro.showToast({ title: '合并演示：相邻同时段自动合并', icon: 'none' })
    console.log('[Schedule] 演示：时段合并功能')
  }

  const handleDemoSplit = () => {
    Taro.showToast({ title: '拆分演示：中途退订自动拆分', icon: 'none' })
    console.log('[Schedule] 演示：时段拆分功能')
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

        <View className={styles.demoSection}>
          <View className={styles.demoTitle}>
            <View className={styles.demoIcon}>⚙</View>
            <Text>核心功能演示</Text>
          </View>
          <Text className={styles.demoDesc}>
            时段合并拆分：同一学员连续多节预约自动合并显示，中途退订智能拆分剩余时段
          </Text>
          <View className={styles.demoActions}>
            <Button
              className={classnames(styles.demoBtn, styles.primary)}
              onClick={handleDemoMerge}
            >
              <Text className={styles.demoBtnText}>合并演示</Text>
            </Button>
            <Button
              className={classnames(styles.demoBtn, styles.warning)}
              onClick={handleDemoSplit}
            >
              <Text className={styles.demoBtnText}>拆分演示</Text>
            </Button>
          </View>
        </View>
      </View>

      <View
        className={styles.fab}
        onClick={() => {
          Taro.navigateTo({
            url: `/pages/booking-create/index?classroomId=${selectedClassroomId}&date=${selectedDate}`
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
