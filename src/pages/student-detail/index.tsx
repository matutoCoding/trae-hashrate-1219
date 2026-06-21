import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import { useStudentStore } from '@/store/studentStore'
import { useCreditStore } from '@/store/creditStore'
import { useBookingStore } from '@/store/bookingStore'

const StudentDetailPage: React.FC = () => {
  const router = useRouter()
  const studentId = router.params.id

  const { getStudent, fetchRankRecords, rankRecords, getStudentRankRecords, students } = useStudentStore()
  const { getPoolByClassId } = useCreditStore()
  const { getBookingsByStudent } = useBookingStore()

  const [student, setStudent] = useState<ReturnType<typeof getStudent>>(undefined)

  useEffect(() => {
    fetchRankRecords()
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

  const handleUpgrade = () => {
    Taro.navigateTo({
      url: `/pages/rank-upgrade/index?studentId=${studentId}`
    })
  }

  const handleViewBookings = () => {
    Taro.showToast({ title: '预约记录功能开发中', icon: 'none' })
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
          <Text>段位历史</Text>
          <Text className={styles.sectionMore} onClick={handleUpgrade}>升级登记</Text>
        </View>
        <View className={styles.rankHistory}>
          {studentRankRecords.length > 0 ? (
            studentRankRecords.map(record => (
              <View key={record.id} className={styles.rankItem}>
                <View className={styles.rankItemContent}>
                  <View className={styles.rankChange}>
                    <Text>{record.fromRank}</Text>
                    <Text className={styles.rankArrow}>↑</Text>
                    <Text>{record.toRank}</Text>
                  </View>
                  <Text className={styles.rankDate}>{record.recordDate.slice(0, 10)}</Text>
                  <Text className={styles.rankOperator}>操作人：{record.operator}</Text>
                  {record.remark && (
                    <View className={styles.rankRemark}>
                      <Text>{record.remark}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无段位记录</Text>
            </View>
          )}
        </View>
        <View className={styles.actionBtn} onClick={handleUpgrade}>
          <Text className={styles.actionBtnText}>+ 登记段位升级</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>预约记录</Text>
          <Text className={styles.sectionMore}>查看全部</Text>
        </View>
        <View className={styles.infoList}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>进行中</Text>
            <Text className={styles.infoValue}>{activeBookings.length} 节</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>已完成</Text>
            <Text className={styles.infoValue}>
              {bookings.filter(b => b.status === 'completed').length} 节
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>已取消</Text>
            <Text className={styles.infoValue}>
              {bookings.filter(b => b.status === 'cancelled').length} 节
            </Text>
          </View>
        </View>
        <View className={styles.actionBtn} onClick={handleViewBookings}>
          <Text className={styles.actionBtnText}>查看全部预约</Text>
        </View>
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
