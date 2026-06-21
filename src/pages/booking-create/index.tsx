import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useClassroomStore } from '@/store/classroomStore'
import { useStudentStore } from '@/store/studentStore'
import { useBookingStore } from '@/store/bookingStore'
import { useCreditStore } from '@/store/creditStore'
import { generateTimeSlots } from '@/utils/date'

const BookingCreatePage: React.FC = () => {
  const router = useRouter()
  const { classroomId, date, startTime, endTime } = router.params

  const { classrooms, fetchClassrooms, getClassroom } = useClassroomStore()
  const { students, fetchStudents } = useStudentStore()
  const { createBooking } = useBookingStore()
  const { getPoolByClassId, getAvailableCredits } = useCreditStore()

  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomId || '')
  const [selectedDate, setSelectedDate] = useState(date || '')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [slotCount, setSlotCount] = useState(1)
  const [startTimeVal, setStartTimeVal] = useState(startTime || '09:00')
  const [endTimeVal, setEndTimeVal] = useState(endTime || '10:00')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchClassrooms()
    fetchStudents()
  }, [])

  const currentClassroom = selectedClassroomId ? getClassroom(selectedClassroomId) : undefined

  const timeSlots = useMemo(() => {
    if (!currentClassroom) return []
    return generateTimeSlots(
      currentClassroom.startTime,
      currentClassroom.endTime,
      currentClassroom.slotDuration
    )
  }, [currentClassroom])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const pool = selectedStudent ? getPoolByClassId(selectedStudent.classId) : undefined
  const availableCredits = pool ? getAvailableCredits(pool.id) : 0

  const totalCost = slotCount * (currentClassroom?.slotDuration ? 1 : 1)

  const canSubmit = selectedClassroomId && selectedStudentId && slotCount > 0 && availableCredits >= slotCount

  useEffect(() => {
    if (currentClassroom && startTimeVal) {
      const startIdx = timeSlots.findIndex(s => s.startTime === startTimeVal)
      if (startIdx >= 0) {
        const endIdx = Math.min(startIdx + slotCount, timeSlots.length)
        if (endIdx > startIdx) {
          setEndTimeVal(timeSlots[endIdx - 1]?.endTime || startTimeVal)
        }
      }
    }
  }, [startTimeVal, slotCount, currentClassroom, timeSlots])

  const handleSelectClassroom = () => {
    const activeClassrooms = classrooms.filter(c => c.status === 'active')
    Taro.showActionSheet({
      itemList: activeClassrooms.map(c => c.name),
      success: (res) => {
        const classroom = activeClassrooms[res.tapIndex]
        setSelectedClassroomId(classroom.id)
        setStartTimeVal(classroom.startTime)
        setSlotCount(1)
      }
    })
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId)
  }

  const handleSlotChange = (delta: number) => {
    const newCount = slotCount + delta
    if (newCount < 1) return

    if (currentClassroom) {
      const startIdx = timeSlots.findIndex(s => s.startTime === startTimeVal)
      const maxSlots = timeSlots.length - startIdx
      if (newCount > maxSlots) {
        Taro.showToast({ title: '已到当日最大时段', icon: 'none' })
        return
      }
    }
    setSlotCount(newCount)
  }

  const handleSubmit = () => {
    if (!canSubmit || !currentClassroom || !selectedStudent || submitting) return

    setSubmitting(true)

    const result = createBooking(
      selectedClassroomId,
      currentClassroom.name,
      selectedStudentId,
      selectedStudent.name,
      selectedStudent.classId,
      selectedDate || new Date().toISOString().split('T')[0],
      startTimeVal,
      endTimeVal,
      slotCount,
      currentClassroom.slotDuration
    )

    setTimeout(() => {
      setSubmitting(false)
      if (result.success) {
        Taro.showToast({ title: '预约成功', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1000)
      } else {
        Taro.showToast({ title: result.message || '预约失败', icon: 'none' })
      }
    }, 500)
  }

  const activeStudents = students.filter(s => s.status === 'active')

  return (
    <View className={styles.page}>
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>🏫</View>
          <Text>教室信息</Text>
        </View>

        <View className={styles.formItem} onClick={handleSelectClassroom}>
          <Text className={styles.formLabel}>选择教室</Text>
          <Text className={styles.formValue}>
            {currentClassroom?.name || '请选择'}
          </Text>
          <Text className={styles.formArrow}>›</Text>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>预约日期</Text>
          <Text className={styles.formValue}>
            {selectedDate || new Date().toISOString().split('T')[0]}
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>⏰</View>
          <Text>时段选择</Text>
        </View>

        <View className={styles.timeSelector}>
          <View className={styles.timeItem}>
            <Text className={styles.timeItemLabel}>开始时间</Text>
            <Text className={styles.timeItemValue}>{startTimeVal}</Text>
          </View>
          <Text className={styles.timeConnector}>→</Text>
          <View className={styles.timeItem}>
            <Text className={styles.timeItemLabel}>结束时间</Text>
            <Text className={styles.timeItemValue}>{endTimeVal}</Text>
          </View>
        </View>

        <View className={styles.slotSelector}>
          <Button
            className={styles.slotBtn}
            onClick={() => handleSlotChange(-1)}
            disabled={slotCount <= 1}
          >
            <Text className={styles.slotBtnText}>−</Text>
          </Button>
          <View>
            <Text className={styles.slotCount}>{slotCount}</Text>
            <Text className={styles.slotUnit}>节课</Text>
          </View>
          <Button
            className={styles.slotBtn}
            onClick={() => handleSlotChange(1)}
          >
            <Text className={styles.slotBtnText}>+</Text>
          </Button>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>👤</View>
          <Text>选择学员</Text>
        </View>

        <View className={styles.studentList}>
          {activeStudents.map(student => (
            <View
              key={student.id}
              className={classnames(
                styles.studentOption,
                selectedStudentId === student.id && styles.selected
              )}
              onClick={() => handleSelectStudent(student.id)}
            >
              <View className={styles.studentOptionAvatar}>
                <Text className={styles.studentOptionAvatarText}>
                  {student.name.charAt(0)}
                </Text>
              </View>
              <View className={styles.studentOptionInfo}>
                <Text className={styles.studentOptionName}>{student.name}</Text>
                <Text className={styles.studentOptionMeta}>
                  {student.className} · {student.rank}
                </Text>
              </View>
              <View className={styles.studentOptionCheck} />
            </View>
          ))}
        </View>

        {pool && (
          <View className={styles.creditInfo}>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>班级额度池</Text>
              <Text className={styles.creditInfoValue}>{pool.className}</Text>
            </View>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>可用课时</Text>
              <Text className={classnames(
                styles.creditInfoValue,
                styles.highlight,
                availableCredits < 10 && styles.warning,
                availableCredits === 0 && styles.error
              )}>
                {availableCredits} 课时
              </Text>
            </View>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>本次扣减</Text>
              <Text className={classnames(
                styles.creditInfoValue,
                slotCount > availableCredits ? styles.error : styles.success
              )}>
                -{slotCount} 课时
              </Text>
            </View>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>扣减后剩余</Text>
              <Text className={classnames(
                styles.creditInfoValue,
                availableCredits - slotCount >= 0 ? styles.success : styles.error
              )}>
                {Math.max(0, availableCredits - slotCount)} 课时
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className={styles.tipBox}>
        <Text className={styles.tipText}>
          💡 提示：同一学员连续多节课会自动合并为一个时段，中途退订会智能拆分剩余课时
        </Text>
      </View>

      <View className={styles.actionBar}>
        <Button
          className={classnames(
            styles.actionBtn,
            styles.primary,
            !canSubmit && styles.disabled
          )}
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          <Text className={styles.actionBtnText}>
            {submitting ? '提交中...' : '确认预约'}
          </Text>
        </Button>
      </View>
    </View>
  )
}

export default BookingCreatePage
