import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'
import type { Booking } from '@/types/booking'

interface BookingCardProps {
  booking: Booking
  onClick?: () => void
  showClassroom?: boolean
  showTeacher?: boolean
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onClick,
  showClassroom = true,
  showTeacher = false
}) => {
  const statusConfig = {
    active: { text: '已预约', className: styles.statusActive },
    cancelled: { text: '已取消', className: styles.statusCancelled },
    completed: { text: '已完成', className: styles.statusCompleted }
  }

  const status = statusConfig[booking.status]

  return (
    <View
      className={classnames(styles.card, booking.status !== 'active' && styles.inactive)}
      onClick={onClick}
    >
      <View className={styles.timeSection}>
        <Text className={styles.timeText}>{booking.startTime}</Text>
        <View className={styles.timeLine}>
          <View className={styles.timeDot} />
          <View className={styles.timeBar} />
          <View className={styles.timeDot} />
        </View>
        <Text className={styles.timeText}>{booking.endTime}</Text>
      </View>

      <View className={styles.infoSection}>
        <View className={styles.header}>
          <Text className={styles.studentName}>{booking.studentName}</Text>
          <View className={classnames(styles.statusBadge, status.className)}>
            <Text className={styles.statusText}>{status.text}</Text>
          </View>
        </View>

        {showClassroom && (
          <Text className={styles.classroom}>{booking.classroomName}</Text>
        )}

        {showTeacher && booking.teacherName && (
          <Text className={styles.teacher}>👨‍🏫 {booking.teacherName}</Text>
        )}

        <View className={styles.meta}>
          {booking.isMerged && (
            <View className={styles.mergedTag}>
              <Text className={styles.mergedText}>连订{booking.slotCount}节</Text>
            </View>
          )}
          <Text className={styles.date}>{booking.date}</Text>
        </View>

        {booking.cancelReason && (
          <Text className={styles.cancelReason}>取消原因：{booking.cancelReason}</Text>
        )}
      </View>
    </View>
  )
}

export default BookingCard
