import React, { useState, useEffect, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useStudentStore } from '@/store/studentStore'
import { useCreditStore } from '@/store/creditStore'
import { useBookingStore } from '@/store/bookingStore'
import type { CreditRecord, CreditRecordType } from '@/types/credit'

type GrowthTab = 'rank' | 'bookings' | 'consume'

const RECORD_TYPE_CONFIG: Record<CreditRecordType, { icon: string; text: string; className: string }> = {
  recharge: { icon: '+', text: '充值', className: 'recharge' },
  adjust: { icon: '⚙', text: '调整', className: 'adjust' },
  freeze: { icon: '❄', text: '预约冻结', className: 'freeze' },
  consume: { icon: '✓', text: '签到消课', className: 'consume' },
  unfreeze: { icon: '↩', text: '解冻退还', className: 'refund' },
  refund: { icon: '↩', text: '退还', className: 'refund' },
  absent_consume: { icon: '✕', text: '缺勤扣课', className: 'absent' },
  leave_unfreeze: { icon: '🏠', text: '请假退还', className: 'leave' }
}

const StudentDetailPage: React.FC = () => {
  const router = useRouter()
  const studentId = router.params.id

  const { getStudent, fetchRankRecords, rankRecords, getStudentRankRecords, students, fetchStudents } = useStudentStore()
  const { getPoolByClassId, records: allCreditRecords, fetchRecords, fetchPools } = useCreditStore()
  const { getBookingsByStudent, fetchBookings } = useBookingStore()

  const [student, setStudent] = useState<ReturnType<typeof getStudent>>(undefined)
  const [growthTab, setGrowthTab] = useState<GrowthTab>('rank')

  useEffect(() => {
    fetchRankRecords()
    fetchStudents()
    fetchRecords()
    fetchPools()
    fetchBookings()
  }, [])

  useEffect(() => {
    if (studentId) {
      const s = getStudent(studentId)
      setStudent(s)
    }
  }, [studentId, students])

  const studentRankRecords = studentId ? getStudentRankRecords(studentId) : []

  const pool = student ? getPoolByClassId(student.classId) : undefined
  const bookings = student ? getBookingsByStudent(student.id) : []
  const activeBookings = bookings.filter(b => b.status === 'active')
  const completedBookings = bookings.filter(b => b.status === 'completed')

  const studentCreditRecords = useMemo(() => {
    if (!studentId) return []
    return allCreditRecords
      .filter(r => r.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [allCreditRecords, studentId])

  const consumeRecords = useMemo(() => {
    return studentCreditRecords.filter(r =>
      r.type === 'consume' || r.type === 'absent_consume'
    )
  }, [studentCreditRecords])

  const creditStats = useMemo(() => {
    const s = { consume: 0, absent: 0, freeze: 0, leave: 0, unfreeze: 0, refund: 0, recharge: 0 }
    studentCreditRecords.forEach(r => {
      if (r.type === 'consume') s.consume += r.amount
      else if (r.type === 'absent_consume') s.absent += r.amount
      else if (r.type === 'freeze') s.freeze += r.amount
      else if (r.type === 'leave_unfreeze') s.leave += r.amount
      else if (r.type === 'unfreeze') s.unfreeze += r.amount
      else if (r.type === 'refund') s.refund += r.amount
      else if (r.type === 'recharge') s.recharge += r.amount
    })
    return s
  }, [studentCreditRecords])

  const handleUpgrade = () => {
    Taro.navigateTo({
      url: `/pages/rank-upgrade/index?studentId=${studentId}`
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return dateStr.slice(0, 16).replace('T', ' ')
  }

  if (!student) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 100, textAlign: 'center' }}>
          <Text style={{ color: '#86909C' }}>加载中...</Text>
        </View>
      </View>
    )
  }

  const isDan = student.rank.includes('段')

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.avatar}>
          <Text className={styles.avatarText}>{student.name.charAt(0)}</Text>
        </View>
        <View className={styles.studentInfo}>
          <Text className={styles.studentName}>{student.name}</Text>
          <View className={styles.rankBadge}>
            <Text className={styles.rankText}>{student.rank}</Text>
          </View>
          <Text className={styles.studentMeta}>{student.className} · {student.phone}</Text>
        </View>
      </View>

      {pool && (
        <View className={styles.creditCard}>
          <Text className={styles.creditTitle}>班级共享额度</Text>
          <Text className={styles.creditValue}>
            {pool.totalCredits - pool.usedCredits - pool.frozenCredits} <Text style={{ fontSize: 24 }}>课时</Text>
          </Text>
          <Text className={styles.creditSub}>{pool.className} · 总额 {pool.totalCredits} 课时</Text>
          <View className={styles.creditRow}>
            <View className={styles.creditRowItem}>
              <Text className={styles.creditRowValue}>{pool.usedCredits}</Text>
              <Text className={styles.creditRowLabel}>已用</Text>
            </View>
            <View className={styles.creditRowItem}>
              <Text className={styles.creditRowValue}>{pool.frozenCredits}</Text>
              <Text className={styles.creditRowLabel}>冻结</Text>
            </View>
            <View className={styles.creditRowItem}>
              <Text className={styles.creditRowValue}>{activeBookings.length}</Text>
              <Text className={styles.creditRowLabel}>预约中</Text>
            </View>
            <View className={styles.creditRowItem}>
              <Text className={styles.creditRowValue}>v{pool.version}</Text>
              <Text className={styles.creditRowLabel}>版本</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>基本信息</Text>
        </View>
        <View className={styles.infoList}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>学员姓名</Text>
            <Text className={styles.infoValue}>{student.name}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>联系电话</Text>
            <Text className={styles.infoValue}>{student.phone}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>所在班级</Text>
            <Text className={styles.infoValue}>{student.className}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>当前段位</Text>
            <Text className={styles.infoValue} style={{ color: isDan ? '#D4A574' : '#2D5B89', fontWeight: 600 }}>
              {student.rank}
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>入学日期</Text>
            <Text className={styles.infoValue}>{student.joinDate}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>学员状态</Text>
            <Text className={styles.infoValue}>
              {student.status === 'active' ? '在读' : '已结业'}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>课时统计</Text>
        </View>
        <View className={styles.creditStats}>
          <View className={styles.creditStatItem}>
            <Text className={classnames(styles.creditStatValue, styles.consume)}>{creditStats.consume}</Text>
            <Text className={styles.creditStatLabel}>累计消课</Text>
          </View>
          <View className={styles.creditStatItem}>
            <Text className={classnames(styles.creditStatValue, styles.absent)}>{creditStats.absent}</Text>
            <Text className={styles.creditStatLabel}>缺勤扣课</Text>
          </View>
          <View className={styles.creditStatItem}>
            <Text className={classnames(styles.creditStatValue, styles.freeze)}>{creditStats.freeze}</Text>
            <Text className={styles.creditStatLabel}>累计冻结</Text>
          </View>
          <View className={styles.creditStatItem}>
            <Text className={classnames(styles.creditStatValue, styles.leave)}>{creditStats.leave + creditStats.unfreeze}</Text>
            <Text className={styles.creditStatLabel}>解冻退还</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.growthTabs}>
          <View
            className={classnames(styles.growthTab, growthTab === 'rank' && styles.growthTabActive)}
            onClick={() => setGrowthTab('rank')}
          >
            <Text className={styles.growthTabText}>段位历史</Text>
            <View className={styles.growthTabBadge}>{studentRankRecords.length}</View>
          </View>
          <View
            className={classnames(styles.growthTab, growthTab === 'bookings' && styles.growthTabActive)}
            onClick={() => setGrowthTab('bookings')}
          >
            <Text className={styles.growthTabText}>预约记录</Text>
            <View className={styles.growthTabBadge}>{bookings.length}</View>
          </View>
          <View
            className={classnames(styles.growthTab, growthTab === 'consume' && styles.growthTabActive)}
            onClick={() => setGrowthTab('consume')}
          >
            <Text className={styles.growthTabText}>消课记录</Text>
            <View className={styles.growthTabBadge}>{consumeRecords.length}</View>
          </View>
        </View>

        {growthTab === 'rank' && (
          <View className={styles.growthContent}>
            {studentRankRecords.length > 0 ? (
              <View className={styles.timeline}>
                {studentRankRecords.map((record, idx) => (
                  <View key={record.id} className={styles.timelineItem}>
                    <View className={styles.timelineDot} />
                    {idx < studentRankRecords.length - 1 && <View className={styles.timelineLine} />}
                    <View className={styles.timelineContent}>
                      <View className={styles.rankChange}>
                        <Text className={styles.rankFrom}>{record.fromRank}</Text>
                        <View className={styles.rankArrowBox}>
                          <Text className={styles.rankArrow}>↑</Text>
                        </View>
                        <Text className={styles.rankTo}>{record.toRank}</Text>
                      </View>
                      <View className={styles.rankMeta}>
                        <Text className={styles.rankDate}>{record.recordDate.slice(0, 10)}</Text>
                        <Text className={styles.rankOperator}>操作人：{record.operator}</Text>
                      </View>
                      {record.remark && (
                        <View className={styles.rankRemark}>
                          <Text>{record.remark}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyText}>暂无段位记录</Text>
              </View>
            )}
            <View className={styles.actionBtn} onClick={handleUpgrade}>
              <Text className={styles.actionBtnText}>+ 登记段位升级</Text>
            </View>
          </View>
        )}

        {growthTab === 'bookings' && (
          <View className={styles.growthContent}>
            <View className={styles.bookingTabs}>
              <Text className={styles.bookingTabActive}>
                进行中 {activeBookings.length}
              </Text>
              <Text className={styles.bookingTab}>
                已完成 {completedBookings.length}
              </Text>
              <Text className={styles.bookingTab}>
                已取消 {bookings.filter(b => b.status === 'cancelled').length}
              </Text>
            </View>
            {bookings.length > 0 ? (
              bookings.slice(0, 30).map(booking => (
                <View
                  key={booking.id}
                  className={classnames(
                    styles.bookingRow,
                    booking.status !== 'active' && styles.inactive
                  )}
                  onClick={() => {
                    Taro.navigateTo({
                      url: `/pages/booking-detail/index?id=${booking.id}`
                    })
                  }}
                >
                  <View className={styles.bookingTime}>
                    <Text className={styles.bookingDate}>{booking.date.slice(5)}</Text>
                    <Text className={styles.bookingHour}>{booking.startTime}</Text>
                  </View>
                  <View className={styles.bookingInfo}>
                    <Text className={styles.bookingRoom}>📍 {booking.classroomName}</Text>
                    {booking.teacherName && (
                      <Text className={styles.bookingTeacher}>👨‍🏫 {booking.teacherName}</Text>
                    )}
                    <Text className={styles.bookingHourRange}>
                      {booking.startTime}-{booking.endTime} · {booking.slotCount}课时
                    </Text>
                  </View>
                  <View className={classnames(
                    styles.bookingStatus,
                    booking.status === 'active' && styles.statusActive,
                    booking.status === 'completed' && styles.statusCompleted,
                    booking.status === 'cancelled' && styles.statusCancelled
                  )}>
                    <Text>
                      {booking.status === 'active' && (booking.checkInStatus === 'pending' ? '待上课' : booking.checkInStatus)}
                      {booking.status === 'completed' && (booking.checkInStatus === 'checked_in' ? '已签到' : '已完成')}
                      {booking.status === 'cancelled' && '已取消'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyText}>暂无预约记录</Text>
              </View>
            )}
            <View
              className={styles.actionBtn}
              onClick={() => {
                if (pool) {
                  Taro.navigateTo({
                    url: `/pages/credit-pool/index?id=${pool.id}`
                  })
                }
              }}
            >
              <Text className={styles.actionBtnText}>查看额度池明细</Text>
            </View>
          </View>
        )}

        {growthTab === 'consume' && (
          <View className={styles.growthContent}>
            {consumeRecords.length > 0 ? (
              consumeRecords.map(record => {
                const cfg = RECORD_TYPE_CONFIG[record.type]
                return (
                  <View
                    key={record.id}
                    className={styles.recordRow}
                    onClick={() => {
                      if (record.relatedBookingId) {
                        Taro.navigateTo({
                          url: `/pages/booking-detail/index?id=${record.relatedBookingId}`
                        })
                      }
                    }}
                  >
                    <View className={classnames(styles.recordIcon, cfg.className)}>
                      <Text>{cfg.icon}</Text>
                    </View>
                    <View className={styles.recordInfo}>
                      <Text className={styles.recordTitle}>{cfg.text}</Text>
                      <Text className={styles.recordSub}>
                        {formatDate(record.createdAt)}
                      </Text>
                      {record.remark && (
                        <Text className={styles.recordSub}>备注：{record.remark}</Text>
                      )}
                      {record.relatedBookingId && (
                        <Text className={styles.recordLink}>👉 查看关联排课</Text>
                      )}
                    </View>
                    <View className={classnames(styles.recordAmount, cfg.className)}>
                      -{record.amount}
                    </View>
                  </View>
                )
              })
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyText}>暂无消课记录</Text>
              </View>
            )}
            <View
              className={styles.actionBtn}
              onClick={() => {
                if (pool) {
                  Taro.navigateTo({
                    url: `/pages/credit-pool/index?id=${pool.id}`
                  })
                }
              }}
            >
              <Text className={styles.actionBtnText}>查看完整额度明细</Text>
            </View>
          </View>
        )}
      </View>

      {student.remark && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            <Text>备注</Text>
          </View>
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 28, color: '#4E5969', lineHeight: 1.6 }}>
              {student.remark}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

export default StudentDetailPage
