import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'
import type { Booking } from '@/types/booking'

interface TimeSlotProps {
  startTime: string
  endTime: string
  status: 'available' | 'booked' | 'merged' | 'disabled'
  booking?: Booking
  isSelected?: boolean
  isMergedHead?: boolean
  isMergedTail?: boolean
  onClick?: () => void
}

const TimeSlot: React.FC<TimeSlotProps> = ({
  startTime,
  endTime,
  status,
  booking,
  isSelected,
  isMergedHead,
  isMergedTail,
  onClick
}) => {
  const slotClass = classnames(
    styles.slot,
    status === 'available' && styles.available,
    status === 'booked' && styles.booked,
    status === 'merged' && styles.merged,
    status === 'disabled' && styles.disabled,
    isSelected && styles.selected,
    isMergedHead && styles.mergedHead,
    isMergedTail && styles.mergedTail
  )

  return (
    <View className={slotClass} onClick={onClick}>
      <View className={styles.time}>
        <Text className={styles.startTime}>{startTime}</Text>
        <Text className={styles.endTime}>{endTime}</Text>
      </View>
      {booking && status === 'booked' && (
        <View className={styles.bookingInfo}>
          <Text className={styles.studentName}>{booking.studentName}</Text>
          {booking.isMerged && (
            <View className={styles.mergedTag}>连</View>
          )}
        </View>
      )}
      {booking && status === 'merged' && (
        <View className={styles.bookingInfo}>
          <Text className={styles.studentName}>{booking.studentName}</Text>
        </View>
      )}
    </View>
  )
}

export default TimeSlot
