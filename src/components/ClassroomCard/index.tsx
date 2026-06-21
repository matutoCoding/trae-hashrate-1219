import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'
import type { Classroom } from '@/types/classroom'

interface ClassroomCardProps {
  classroom: Classroom
  onClick?: () => void
  showActions?: boolean
}

const ClassroomCard: React.FC<ClassroomCardProps> = ({
  classroom,
  onClick,
  showActions = false
}) => {
  return (
    <View
      className={classnames(styles.card, classroom.status === 'inactive' && styles.inactive)}
      onClick={onClick}
    >
      <View className={styles.header}>
        <Text className={styles.name}>{classroom.name}</Text>
        <View className={classnames(
          styles.statusBadge,
          classroom.status === 'active' ? styles.statusActive : styles.statusInactive
        )}>
          <Text className={styles.statusText}>
            {classroom.status === 'active' ? '使用中' : '已停用'}
          </Text>
        </View>
      </View>

      <View className={styles.info}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>容量</Text>
          <Text className={styles.infoValue}>{classroom.capacity}人</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>时段</Text>
          <Text className={styles.infoValue}>{classroom.startTime}-{classroom.endTime}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>课时长</Text>
          <Text className={styles.infoValue}>{classroom.slotDuration}分钟</Text>
        </View>
      </View>

      <View className={styles.equipment}>
        {classroom.equipment.slice(0, 4).map((item, index) => (
          <View key={index} className={styles.equipTag}>
            <Text className={styles.equipText}>{item}</Text>
          </View>
        ))}
      </View>

      {classroom.description && (
        <Text className={styles.description}>{classroom.description}</Text>
      )}
    </View>
  )
}

export default ClassroomCard
