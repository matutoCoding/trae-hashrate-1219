import React, { useState, useEffect } from 'react'
import { View, Text, Button, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useBookingStore } from '@/store/bookingStore'
import { useStudentStore } from '@/store/studentStore'
import { useCreditStore } from '@/store/creditStore'
import { useClassroomStore } from '@/store/classroomStore'
import type { CheckInStatus } from '@/types/booking'

const BookingDetailPage: React.FC = () => {
  const router = useRouter()
  const bookingId = router.params.id

  const { getBooking, cancelBooking, cancelPartialBooking, fetchBookings, bookings, checkInBooking } = useBookingStore()
  const { getStudent, fetchStudents } = useStudentStore()
  const { getPoolByClassId, fetchPools } = useCreditStore()
  const { getClassroom, fetchClassrooms } = useClassroomStore()

  const [booking, setBooking] = useState<ReturnType<typeof getBooking>>(undefined)
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set())
  const [checkInRemark, setCheckInRemark] = useState('')
  const [showCheckInPanel, setShowCheckInPanel] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchStudents()
    fetchPools()
    fetchClassrooms()
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
  const classroom = booking ? getClassroom(booking.classroomId) : undefined
  const slotDuration = classroom?.slotDuration || 60

  const toggleSlot = (index: number) => {
    setSelectedSlots(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const selectAllSlots = () => {
    if (!booking) return
    const all = new Set<number>()
    for (let i = 0; i < booking.slotCount; i++) {
      all.add(i)
    }
    setSelectedSlots(all)
  }

  const clearSelection = () => {
    setSelectedSlots(new Set())
  }

  const getSlotTime = (index: number): { start: string; end: string } => {
    if (!booking) return { start: '', end: '' }
    const startMinutes = timeToMinutes(booking.startTime) + index * slotDuration
    const endMinutes = startMinutes + slotDuration
    return {
      start: minutesToTime(startMinutes),
      end: minutesToTime(endMinutes)
    }
  }

  const handleCancelAll = () => {
    if (!booking) return
    Taro.showModal({
      title: '确认取消全部预约',
      content: `确定要取消${booking.studentName}的全部预约吗？\n时段：${booking.startTime}-${booking.endTime}（${booking.slotCount}课时）\n\n取消后课时将退回到班级额度池。`,
      confirmText: '取消预约',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          const success = cancelBooking(booking.id, '用户主动取消')
          if (success) {
            Taro.showToast({ title: '取消成功，课时已退还', icon: 'success' })
            setTimeout(() => {
              Taro.navigateBack()
            }, 1200)
          } else {
            Taro.showToast({ title: '取消失败', icon: 'error' })
          }
        }
      }
    })
  }

  const handlePartialCancel = () => {
    if (!booking || selectedSlots.size === 0) return

    const sortedIndices = Array.from(selectedSlots).sort((a, b) => a - b)
    const startIdx = sortedIndices[0]
    const endIdx = sortedIndices[sortedIndices.length - 1]

    const isContinuous = sortedIndices.every((idx, i) => idx === startIdx + i)

    if (!isContinuous) {
      Taro.showToast({
        title: '请选择连续的时段',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const cancelStart = getSlotTime(startIdx).start
    const cancelEnd = getSlotTime(endIdx).end
    const refundCount = selectedSlots.size

    Taro.showModal({
      title: '确认部分退订',
      content: `将退订以下时段：\n${cancelStart} - ${cancelEnd}（${refundCount}课时）\n\n剩余课时将保留，${refundCount}课时将退回到班级额度池。`,
      confirmText: '确认退订',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          const success = cancelPartialBooking(
            booking.id,
            cancelStart,
            cancelEnd,
            slotDuration,
            '用户部分退订'
          )
          if (success) {
            Taro.showToast({
              title: `退订成功，退还${refundCount}课时`,
              icon: 'success',
              duration: 1500
            })
            setSelectedSlots(new Set())
            setTimeout(() => {
              const updated = getBooking(bookingId || '')
              if (updated) {
                setBooking(updated)
              } else {
                Taro.navigateBack()
              }
            }, 1000)
          } else {
            Taro.showToast({ title: '退订失败', icon: 'error' })
          }
        }
      }
    })
  }

  const handleCheckIn = (status: 'checked_in' | 'absent' | 'leave') => {
    if (!booking) return

    const statusText = {
      checked_in: '已到课',
      absent: '缺勤',
      leave: '请假'
    }[status]

    Taro.showModal({
      title: `确认${statusText}`,
      content: status === 'checked_in'
        ? `确认${booking.studentName}已到课？\n确认后将从冻结额度中正式扣除${booking.slotCount}课时。`
        : status === 'absent'
          ? `确认${booking.studentName}缺勤？\n缺勤将照常从冻结额度中扣除${booking.slotCount}课时。`
          : `确认${booking.studentName}请假？\n请假不扣课时，${booking.slotCount}课时将退回额度池。`,
      confirmText: `确认${statusText}`,
      confirmColor: status === 'checked_in' ? '#00B42A' : status === 'absent' ? '#F53F3F' : '#FF7D00',
      success: (res) => {
        if (res.confirm) {
          const success = checkInBooking(
            booking.id,
            status,
            '老师',
            checkInRemark || undefined
          )
          if (success) {
            Taro.showToast({ title: `${statusText}成功`, icon: 'success' })
            setShowCheckInPanel(false)
            setCheckInRemark('')
            setTimeout(() => {
              const updated = getBooking(bookingId || '')
              if (updated) setBooking(updated)
            }, 800)
          } else {
            Taro.showToast({ title: '操作失败', icon: 'error' })
          }
        }
      }
    })
  }

  const checkInStatusConfig: Record<CheckInStatus, { text: string; className: string }> = {
    pending: { text: '待签到', className: styles.checkInPending },
    checked_in: { text: '已到课', className: styles.checkInChecked },
    absent: { text: '缺勤', className: styles.checkInAbsent },
    leave: { text: '请假', className: styles.checkInLeave }
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
  const checkInStatus = checkInStatusConfig[booking.checkInStatus]

  const statusConfig = {
    active: { text: '已预约', className: styles.infoValueSuccess },
    cancelled: { text: '已取消', className: styles.infoValueError },
    completed: { text: '已完成', className: styles.infoValue }
  }
  const status = statusConfig[booking.status]

  const canCheckIn = booking.status === 'active' && booking.checkInStatus === 'pending'

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
          <Text className={styles.infoLabel}>签到状态</Text>
          <Text className={classnames(styles.infoValue, checkInStatus.className)}>
            {checkInStatus.text}
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

        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>授课老师</Text>
          <Text className={classnames(styles.infoValue, styles.infoValueHighlight)}>
            {booking.teacherName || '未安排'}
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

        {booking.remark && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>备注</Text>
            <Text className={styles.infoValue}>{booking.remark}</Text>
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

      {canCheckIn && (
        <View className={styles.checkInCard}>
          <View className={styles.cardTitle}>
            <View className={styles.cardTitleIcon}>✅</View>
            <Text>课后签到</Text>
          </View>

          {!showCheckInPanel ? (
            <View className={styles.checkInBtns}>
              <Button
                className={classnames(styles.checkInBtn, styles.checkInSuccess)}
                onClick={() => handleCheckIn('checked_in')}
              >
                <Text className={styles.checkInBtnText}>已到课</Text>
              </Button>
              <Button
                className={classnames(styles.checkInBtn, styles.checkInWarning)}
                onClick={() => setShowCheckInPanel(true)}
              >
                <Text className={styles.checkInBtnText}>请假</Text>
              </Button>
              <Button
                className={classnames(styles.checkInBtn, styles.checkInDanger)}
                onClick={() => setShowCheckInPanel(true)}
              >
                <Text className={styles.checkInBtnText}>缺勤</Text>
              </Button>
            </View>
          ) : (
            <View className={styles.checkInPanel}>
              <Text className={styles.checkInPanelLabel}>备注（选填）</Text>
              <Textarea
                className={styles.checkInTextarea}
                placeholder='请输入备注信息...'
                value={checkInRemark}
                onInput={(e) => setCheckInRemark(e.detail.value)}
                maxlength={200}
              />
              <View className={styles.checkInPanelActions}>
                <Button
                  className={classnames(styles.checkInPanelBtn, styles.checkInPanelSecondary)}
                  onClick={() => {
                    setShowCheckInPanel(false)
                    setCheckInRemark('')
                  }}
                >
                  <Text className={styles.checkInPanelBtnText}>取消</Text>
                </Button>
                <Button
                  className={classnames(styles.checkInPanelBtn, styles.checkInPanelPrimary)}
                  onClick={() => handleCheckIn('leave')}
                >
                  <Text className={styles.checkInPanelBtnText}>确认请假</Text>
                </Button>
                <Button
                  className={classnames(styles.checkInPanelBtn, styles.checkInPanelDanger)}
                  onClick={() => handleCheckIn('absent')}
                >
                  <Text className={styles.checkInPanelBtnText}>确认缺勤</Text>
                </Button>
              </View>
            </View>
          )}
        </View>
      )}

      {booking.status === 'active' && booking.isMerged && booking.slotCount > 1 && (
        <View className={styles.slotSelectionCard}>
          <View className={styles.cardTitle}>
            <View className={styles.cardTitleIcon}>✂️</View>
            <Text>部分退订 - 选择要退订的时段</Text>
          </View>
          <Text className={styles.slotSelectionHint}>
            点击选择要退订的连续时段，退订后课时将自动退还到班级额度池
          </Text>

          <View className={styles.slotGrid}>
            {Array.from({ length: booking.slotCount }, (_, i) => {
              const time = getSlotTime(i)
              const isSelected = selectedSlots.has(i)
              return (
                <View
                  key={i}
                  className={classnames(styles.slotCard, {
                    [styles.slotCardSelected]: isSelected
                  })}
                  onClick={() => toggleSlot(i)}
                >
                  <View className={styles.slotCheck}>
                    {isSelected && <Text className={styles.slotCheckIcon}>✓</Text>}
                  </View>
                  <Text className={styles.slotIndex}>第{i + 1}节</Text>
                  <Text className={styles.slotTime}>{time.start}</Text>
                  <Text className={styles.slotTimeSub}>至 {time.end}</Text>
                </View>
              )
            })}
          </View>

          <View className={styles.slotSelectionActions}>
            <Button className={classnames(styles.selectionBtn, styles.selectionSecondary)} onClick={clearSelection}>
              <Text className={styles.selectionBtnText}>清空选择</Text>
            </Button>
            <Button className={classnames(styles.selectionBtn, styles.selectionSecondary)} onClick={selectAllSlots}>
              <Text className={styles.selectionBtnText}>全选</Text>
            </Button>
            <Button
              className={classnames(styles.selectionBtn, styles.selectionDanger, { [styles.selectionDisabled]: selectedSlots.size === 0 })}
              disabled={selectedSlots.size === 0}
              onClick={handlePartialCancel}
            >
              <Text className={styles.selectionBtnText}>
                退订{selectedSlots.size > 0 ? `(${selectedSlots.size}课时)` : ''}
              </Text>
            </Button>
          </View>
        </View>
      )}

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
            <Text className={styles.infoLabel}>扣减类型</Text>
            <Text className={styles.infoValue}>
              {booking.checkInStatus === 'pending' && '预约占用（冻结）'}
              {booking.checkInStatus === 'checked_in' && '实际消课'}
              {booking.checkInStatus === 'absent' && '缺勤扣课'}
              {booking.checkInStatus === 'leave' && '请假退还'}
              {booking.status === 'cancelled' && '已取消（已退还）'}
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
            <Text className={styles.infoLabel}>冻结额度</Text>
            <Text className={styles.infoValue}>{pool.frozenCredits} 课时</Text>
          </View>

          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>版本号</Text>
            <Text className={styles.infoValue}>v{pool.version}</Text>
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
            onClick={handleCancelAll}
          >
            <Text className={styles.actionBtnText}>取消全部预约</Text>
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
