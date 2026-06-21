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
import { useTeacherStore } from '@/store/teacherStore'
import { generateTimeSlots } from '@/utils/date'
import type { RecurringBookingFormData } from '@/types/booking'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const RecurringBookingCreatePage: React.FC = () => {
  const router = useRouter()
  const { classroomId, date } = router.params

  const { classrooms, fetchClassrooms, getClassroom } = useClassroomStore()
  const { students, fetchStudents } = useStudentStore()
  const { createRecurringBookings } = useBookingStore()
  const { getPoolByClassId, getAvailableCredits } = useCreditStore()
  const { teachers, fetchTeachers, getActiveTeachers } = useTeacherStore()

  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomId || '')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([2, 4])
  const [weekCount, setWeekCount] = useState(8)
  const [startTime, setStartTime] = useState('09:00')
  const [slotCount, setSlotCount] = useState(1)
  const [startDate, setStartDate] = useState(date || new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchClassrooms()
    fetchStudents()
    fetchTeachers()
  }, [])

  const currentClassroom = selectedClassroomId ? getClassroom(selectedClassroomId) : undefined
  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId)
  const pool = selectedStudent ? getPoolByClassId(selectedStudent.classId) : undefined
  const availableCredits = pool ? getAvailableCredits(pool.id) : 0

  const timeSlots = useMemo(() => {
    if (!currentClassroom) return []
    return generateTimeSlots(
      currentClassroom.startTime,
      currentClassroom.endTime,
      currentClassroom.slotDuration
    )
  }, [currentClassroom])

  const endTime = useMemo(() => {
    const startIdx = timeSlots.findIndex(s => s.startTime === startTime)
    if (startIdx < 0) return startTime
    const endIdx = Math.min(startIdx + slotCount, timeSlots.length)
    return timeSlots[endIdx - 1]?.endTime || startTime
  }, [startTime, slotCount, timeSlots])

  const totalSessions = selectedWeekdays.length * weekCount
  const totalCost = totalSessions * slotCount

  const canSubmit =
    selectedClassroomId &&
    selectedStudentId &&
    selectedTeacherId &&
    selectedWeekdays.length > 0 &&
    weekCount > 0 &&
    totalCost > 0 &&
    availableCredits >= totalCost &&
    !submitting

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      }
      return [...prev, day].sort()
    })
  }

  const handleSelectClassroom = () => {
    const active = classrooms.filter(c => c.status === 'active')
    Taro.showActionSheet({
      itemList: active.map(c => c.name),
      success: (res) => {
        const classroom = active[res.tapIndex]
        setSelectedClassroomId(classroom.id)
        setStartTime(classroom.startTime)
      }
    })
  }

  const handleSelectTeacher = () => {
    const active = getActiveTeachers()
    Taro.showActionSheet({
      itemList: active.map(t => `${t.name}（${t.level}）`),
      success: (res) => {
        const teacher = active[res.tapIndex]
        setSelectedTeacherId(teacher.id)
      }
    })
  }

  const handleWeekCountChange = (delta: number) => {
    const newCount = weekCount + delta
    if (newCount < 1 || newCount > 52) return
    setWeekCount(newCount)
  }

  const handleSlotChange = (delta: number) => {
    const newCount = slotCount + delta
    if (newCount < 1) return
    if (currentClassroom) {
      const startIdx = timeSlots.findIndex(s => s.startTime === startTime)
      const maxSlots = timeSlots.length - startIdx
      if (newCount > maxSlots) {
        Taro.showToast({ title: '已到当日最大时段', icon: 'none' })
        return
      }
    }
    setSlotCount(newCount)
  }

  const handleSelectStartTime = () => {
    const startTimes = timeSlots.map(s => s.startTime)
    Taro.showActionSheet({
      itemList: startTimes,
      success: (res) => {
        setStartTime(startTimes[res.tapIndex])
      }
    })
  }

  const handleSubmit = () => {
    if (!canSubmit || !currentClassroom || !selectedStudent || !selectedTeacher) return

    setSubmitting(true)

    const formData: RecurringBookingFormData = {
      classroomId: selectedClassroomId,
      classroomName: currentClassroom.name,
      studentId: selectedStudentId,
      studentName: selectedStudent.name,
      classId: selectedStudent.classId,
      teacherId: selectedTeacherId,
      teacherName: selectedTeacher.name,
      weekdays: selectedWeekdays,
      startDate,
      startTime,
      endTime,
      slotCount,
      totalWeeks: weekCount
    }

    setTimeout(() => {
      const result = createRecurringBookings(formData, currentClassroom.slotDuration)
      setSubmitting(false)
      if (result.success) {
        Taro.showToast({
          title: `成功生成${result.bookings?.length || 0}节课`,
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({
          title: result.message || '创建失败',
          icon: 'none',
          duration: 2000
        })
      }
    }, 500)
  }

  const activeStudents = students.filter(s => s.status === 'active')

  const generatePreviewDates = () => {
    const dates: string[] = []
    const start = new Date(startDate)
    for (let w = 0; w < weekCount && dates.length < 8; w++) {
      for (const day of selectedWeekdays.sort()) {
        const d = new Date(start)
        const currentDay = d.getDay() === 0 ? 7 : d.getDay()
        const diff = day - currentDay + w * 7
        d.setDate(d.getDate() + diff)
        if (d >= start) {
          dates.push(`${d.getMonth() + 1}/${d.getDate()} 周${WEEKDAYS[day - 1]}`)
        }
      }
    }
    return dates
  }

  const previewDates = generatePreviewDates()

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>创建周期课</Text>
        <Text className={styles.subtitle}>批量排课，每周固定时段自动生成</Text>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>🏫</View>
          <Text>基础信息</Text>
        </View>

        <View className={styles.formItem} onClick={handleSelectClassroom}>
          <Text className={styles.formLabel}>教室</Text>
          <Text className={styles.formValue}>
            {currentClassroom?.name || '请选择教室'}
          </Text>
          <Text className={styles.formArrow}>›</Text>
        </View>

        <View className={styles.formItem} onClick={handleSelectTeacher}>
          <Text className={styles.formLabel}>授课老师</Text>
          <Text className={classnames(
            styles.formValue,
            !selectedTeacherId && styles.formValuePlaceholder
          )}>
            {selectedTeacher ? selectedTeacher.name : '请选择老师'}
          </Text>
          <Text className={styles.formArrow}>›</Text>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>开始日期</Text>
          <Text className={styles.formValue}>{startDate}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>📅</View>
          <Text>排课规则</Text>
        </View>

        <View className={styles.weekdaySelector}>
          <Text className={styles.formLabel}>每周上课</Text>
          <View className={styles.weekdayBtns}>
            {WEEKDAYS.map((day, i) => {
              const dayNum = i + 1
              const isSelected = selectedWeekdays.includes(dayNum)
              return (
                <View
                  key={dayNum}
                  className={classnames(
                    styles.weekdayBtn,
                    isSelected && styles.weekdayBtnActive
                  )}
                  onClick={() => toggleWeekday(dayNum)}
                >
                  <Text className={styles.weekdayBtnText}>{day}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className={styles.weekSelector}>
          <Text className={styles.formLabel}>连续周数</Text>
          <View className={styles.counter}>
            <Button
              className={styles.counterBtn}
              onClick={() => handleWeekCountChange(-1)}
              disabled={weekCount <= 1}
            >
              <Text className={styles.counterBtnText}>−</Text>
            </Button>
            <View className={styles.counterValue}>
              <Text className={styles.counterNum}>{weekCount}</Text>
              <Text className={styles.counterUnit}>周</Text>
            </View>
            <Button
              className={styles.counterBtn}
              onClick={() => handleWeekCountChange(1)}
              disabled={weekCount >= 52}
            >
              <Text className={styles.counterBtnText}>+</Text>
            </Button>
          </View>
        </View>

        <View className={styles.timeSelector}>
          <View className={styles.timeItem} onClick={handleSelectStartTime}>
            <Text className={styles.formLabel}>开始时间</Text>
            <Text className={styles.timeValue}>{startTime}</Text>
          </View>
          <Text className={styles.timeConnector}>→</Text>
          <View className={styles.timeItem}>
            <Text className={styles.formLabel}>结束时间</Text>
            <Text className={styles.timeValue}>{endTime}</Text>
          </View>
        </View>

        <View className={styles.slotSelector}>
          <Text className={styles.formLabel}>每次课时</Text>
          <View className={styles.counter}>
            <Button
              className={styles.counterBtn}
              onClick={() => handleSlotChange(-1)}
              disabled={slotCount <= 1}
            >
              <Text className={styles.counterBtnText}>−</Text>
            </Button>
            <View className={styles.counterValue}>
              <Text className={styles.counterNum}>{slotCount}</Text>
              <Text className={styles.counterUnit}>节</Text>
            </View>
            <Button
              className={styles.counterBtn}
              onClick={() => handleSlotChange(1)}
            >
              <Text className={styles.counterBtnText}>+</Text>
            </Button>
          </View>
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
              onClick={() => setSelectedStudentId(student.id)}
            >
              <View className={styles.studentAvatar}>
                <Text className={styles.studentAvatarText}>
                  {student.name.charAt(0)}
                </Text>
              </View>
              <View className={styles.studentInfo}>
                <Text className={styles.studentName}>{student.name}</Text>
                <Text className={styles.studentMeta}>
                  {student.className} · {student.rank}
                </Text>
              </View>
              <View className={styles.studentCheck} />
            </View>
          ))}
        </View>
      </View>

      <View className={styles.previewCard}>
        <View className={styles.previewHeader}>
          <View className={styles.sectionIcon}>📋</View>
          <Text className={styles.previewTitle}>排课预览</Text>
        </View>
        <View className={styles.previewStats}>
          <View className={styles.previewStat}>
            <Text className={styles.previewStatValue}>{totalSessions}</Text>
            <Text className={styles.previewStatLabel}>总课次</Text>
          </View>
          <View className={styles.previewStat}>
            <Text className={styles.previewStatValue}>{totalCost}</Text>
            <Text className={styles.previewStatLabel}>总课时</Text>
          </View>
          <View className={styles.previewStat}>
            <Text className={styles.previewStatValue}>{weekCount}</Text>
            <Text className={styles.previewStatLabel}>周</Text>
          </View>
        </View>
        {previewDates.length > 0 && (
          <View className={styles.previewDates}>
            <Text className={styles.previewDatesLabel}>部分预览：</Text>
            <View className={styles.previewDateList}>
              {previewDates.map((d, i) => (
                <View key={i} className={styles.previewDateTag}>
                  <Text className={styles.previewDateText}>{d}</Text>
                </View>
              ))}
              {totalSessions > 8 && (
                <Text className={styles.previewMore}>...等{totalSessions}节</Text>
              )}
            </View>
          </View>
        )}
        {pool && (
          <View className={styles.creditInfo}>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>可用额度</Text>
              <Text className={classnames(
                styles.creditInfoValue,
                availableCredits < totalCost && styles.error
              )}>
                {availableCredits} 课时
              </Text>
            </View>
            <View className={styles.creditInfoRow}>
              <Text className={styles.creditInfoLabel}>扣除后剩余</Text>
              <Text className={classnames(
                styles.creditInfoValue,
                availableCredits - totalCost >= 0 ? styles.success : styles.error
              )}>
                {Math.max(0, availableCredits - totalCost)} 课时
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className={styles.tipBox}>
        <Text className={styles.tipText}>
          💡 周期课创建后，每节课为独立预约，可单独取消或请假，不影响其他课次
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
            {submitting ? '创建中...' : `创建周期课（${totalCost}课时）`}
          </Text>
        </Button>
      </View>
    </View>
  )
}

export default RecurringBookingCreatePage
