import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'
import type { Student } from '@/types/student'

interface StudentCardProps {
  student: Student
  onClick?: () => void
  showRank?: boolean
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onClick,
  showRank = true
}) => {
  const isDan = student.rank.includes('段')

  return (
    <View
      className={classnames(styles.card, student.status === 'inactive' && styles.inactive)}
      onClick={onClick}
    >
      <View className={styles.avatar}>
        <Text className={styles.avatarText}>{student.name.charAt(0)}</Text>
      </View>

      <View className={styles.info}>
        <View className={styles.nameRow}>
          <Text className={styles.name}>{student.name}</Text>
          {showRank && (
            <View className={classnames(styles.rankBadge, isDan && styles.danBadge)}>
              <Text className={styles.rankText}>{student.rank}</Text>
            </View>
          )}
        </View>
        <Text className={styles.className}>{student.className}</Text>
        <Text className={styles.phone}>{student.phone}</Text>
      </View>

      <View className={styles.arrow}>
        <Text className={styles.arrowIcon}>›</Text>
      </View>
    </View>
  )
}

export default StudentCard
