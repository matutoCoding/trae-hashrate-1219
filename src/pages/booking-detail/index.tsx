import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useBookingStore } from '@/store/bookingStore'
import { useStudentStore } from '@/store/studentStore'
import { useCreditStore } from '@/store/creditStore'

const BookingDetailPage: React.FC = () => {
  const router = useRouter()
  const bookingId = router.params.id

  const { getBooking, cancelBooking, cancelPartialBooking, fetchBookings, bookings } = useBookingStore()
  const { getStudent } = useStudentStore()
  const { getPoolByClassId } = useCreditStore()

  const [booking, setBooking] = useState<ReturnType<typeof getBooking>>(undefined)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    if (bookingId) {
      const b = getBooking(bookingId)
      setBooking(b)
    }
  }, [bookingId, bookings])

  const student = booking ? getStudent(booking.studentId) : undefined
  const classId = student?.classId
  const pool = classId ? getPoolByClassId(classId) : undefined

  const handleCancel = () => {
    if (!booking) return
    Taro.showModal({
      title: '确认取消',
      content: `确定要取消${booking.studentName}的预约吗？\n时段：${booking.startTime}-${booking.endTime}`,
      confirmText: '取消预约',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          const success = cancelBooking(booking.id, '用户主动取消')
          if (success) {
            Taro.showToast({ title: '取消成功', icon: 'success' })
            setTimeout(() => {
              Taro.navigateBack()
            }, 1000)
          } else {
            Taro.showToast({ title: '取消失败', icon: 'error' })
          }
        }
      }
    })
  }

  const handleDemoSplit = () => {
    if (!booking) return
    Taro.showActionSheet({
      itemList: ['从中间拆分成两段', '退订中间时段（保留前后）', '退订前段（保留下段）'],
      success: (res) => {
        const start = timeToMinutes(booking.startTime)
        const end = timeToMinutes(booking.endTime)
        const mid = Math.floor((start + end) / 2 / 60) * 60
        const midTime = minutesToTime(mid)

        if (res.tapIndex === 0) {
          Taro.showToast({
            title: `从${midTime}拆分`,
            icon: 'none'
          })
          console.log('[BookingDetail] 演示拆分：从', midTime, '拆分成两段')
        } else if (res.tapIndex === 1) {
          Taro.showToast({
            title: '退订中间，保留两端',
            icon: 'none'
          })
          console.log('[BookingDetail] 演示中途退订：退订中间时段')
        } else {
          Taro.showToast({
            title: '退订前段',
            icon: 'none'
          })
          console.log('[BookingDetail] 演示部分退订：退订前段')
        }
      }
    })
  }

  const handleDemoMerge = () => {
    Taro.showToast({
      title: '合并：相邻同时段自动合并',
      icon: 'none'
    })
    console.log('[BookingDetail] 演示合并功能')
  }

  if (!booking) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 100, textAlign: 'center' }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    )
  }

  const duration = booking.slotCount

  const statusConfig = {
    active: { text: '已预约', className: styles.infoValueSuccess },
    cancelled: { text: '已取消', className: styles.infoValueError },
    completed: { text: '已完成', className: styles.infoValue }
  }

  const status = statusConfig[booking.status]

  return (
    <View className={styles.page}>
      <View className={styles.infoCard}>
        <View className={styles.timeSection}>
          <View className={styles.timeBlock}>
            <Text className={styles.timeLabel}>开始时间</Text>
            <Text className={styles.timeValue}>{booking.startTime}</Text>
          </View>
          <View className={styles.timeConnector}>
            <View className={styles.durationBadge}>{duration}节课</View>
          </View>
          <View className={styles.timeBlock}>
            <Text className={styles.timeLabel}>结束时间</Text>
            <Text className={styles.timeValue}>{booking.endTime}</Text>
          </View>
        </View>

        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>预约状态</Text>
          <Text className={classnames(styles.infoValue, status.className)}>
            {status.text}
          </Text>
        </View>

        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>预约日期</Text>
          <Text className={styles.infoValue}>{booking.date}</Text>
        </View>

        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>上课教室</Text>
          <Text className={classnames(styles.infoValue, styles.infoValueHighlight)}>
            {booking.classroomName}
          </Text>
        </View>

        {booking.isMerged && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>合并时段</Text>
            <View className={styles.mergedTag}>
              <Text className={styles.mergedTagText}>连订{booking.slotCount}节</Text>
            </View>
          </View>
        )}

        {booking.cancelReason && (
          <View className={styles.cancelReason}>
            <Text className={styles.cancelReasonText}>
              取消原因：{booking.cancelReason}
            </Text>
          </View>
        )}
      </View>

      <View className={styles.infoCard}>
        <View className={styles.cardTitle}>
          <View className={styles.cardTitleIcon}>👤</View>
          <Text>学员信息</Text>
        </View>

        <View className={styles.studentInfo}>
          <View className={styles.studentAvatar}>
            <Text className={styles.studentAvatarText}>
              {booking.studentName.charAt(0)}
            </Text>
          </View>
          <View className={styles.studentDetail}>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <Text className={styles.studentName}>{booking.studentName}</Text>
              {student && (
                <View className={styles.mergedTag}>
                  <Text className={styles.mergedTagText}>{student.rank}</Text>
                </View>
              )}
            </View>
            <Text className={styles.studentMeta}>
              {student?.className || '未知班级'} · {student?.phone || ''}
            </Text>
          </View>
        </View>
      </View>

      {pool && (
        <View className={styles.infoCard}>
          <View className={styles.cardTitle}>
            <View className={styles.cardTitleIcon}>💰</View>
            <Text>课时扣减</Text>
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>扣减课时</Text>
            <Text className={classnames(styles.infoValue, styles.infoValueWarning)}>
              -{booking.slotCount} 课时
            </Text>
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>班级额度池</Text>
            <Text className={styles.infoValue}>{pool.className}</Text>
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>当前可用</Text>
            <Text className={classnames(styles.infoValue, styles.infoValueSuccess)}>
              {pool.totalCredits - pool.usedCredits - pool.frozenCredits} 课时
            </Text>
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>版本号</Text>
            <Text className={styles.infoValue}>v{pool.version}</Text>
          </View>
        </View>
      )}

      {booking.status === 'active' && booking.isMerged && (
        <View className={styles.demoSection}>
          <View className={styles.demoTitle}>
            <View className={styles.demoIcon}>⚡</View>
            <Text>合并拆分演示</Text>
          </View>
          <Text className={styles.demoDesc}>
            此预约为连订合并时段，支持中途退订和拆分操作。系统会自动处理时段的合并与拆分。
          </Text>
          <View className={styles.demoActions}>
            <Button
              className={classnames(styles.demoBtn, styles.primary)}
              onClick={handleDemoMerge}
            >
              <Text className={styles.demoBtnText}>合并原理</Text>
            </Button>
            <Button
              className={classnames(styles.demoBtn, styles.warning)}
              onClick={handleDemoSplit}
            >
              <Text className={styles.demoBtnText}>拆分演示</Text>
            </Button>
          </View>
        </View>
      )}

      {booking.status === 'active' && (
        <View className={styles.actionBar}>
          <Button
            className={classnames(styles.actionBtn, styles.secondary)}
            onClick={() => Taro.navigateBack()}
          >
            <Text className={styles.actionBtnText}>返回</Text>
          </Button>
          <Button
            className={classnames(styles.actionBtn, styles.danger)}
            onClick={handleCancel}
          >
            <Text className={styles.actionBtnText}>取消预约</Text>
          </Button>
        </View>
      )}
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

export default BookingDetailPage
