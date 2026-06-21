import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import ClassroomCard from '@/components/ClassroomCard'
import { useClassroomStore } from '@/store/classroomStore'

const ClassroomPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const { classrooms, fetchClassrooms } = useClassroomStore()

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const filteredClassrooms = classrooms.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const handleRefresh = () => {
    fetchClassrooms()
    setTimeout(() => {
      Taro.stopPullDownRefresh()
    }, 500)
  }

  const stats = {
    total: classrooms.length,
    active: classrooms.filter(c => c.status === 'active').length,
    inactive: classrooms.filter(c => c.status === 'inactive').length
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>教室管理</Text>
        <Text className={styles.headerSubtitle}>围棋教室资源统一管理</Text>
      </View>

      <View className={styles.statsCard}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>总教室</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.active}</Text>
          <Text className={styles.statLabel}>使用中</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.inactive}</Text>
          <Text className={styles.statLabel}>已停用</Text>
        </View>
      </View>

      <View className={styles.filterBar}>
        <Button
          className={classnames(styles.filterBtn, filter === 'all' && styles.active)}
          onClick={() => setFilter('all')}
        >
          <Text className={styles.filterBtnText}>全部</Text>
        </Button>
        <Button
          className={classnames(styles.filterBtn, filter === 'active' && styles.active)}
          onClick={() => setFilter('active')}
        >
          <Text className={styles.filterBtnText}>使用中</Text>
        </Button>
        <Button
          className={classnames(styles.filterBtn, filter === 'inactive' && styles.active)}
          onClick={() => setFilter('inactive')}
        >
          <Text className={styles.filterBtnText}>已停用</Text>
        </Button>
      </View>

      <Text className={styles.sectionTitle}>教室列表</Text>

      <View className={styles.classroomList}>
        {filteredClassrooms.length > 0 ? (
          filteredClassrooms.map(classroom => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onClick={() => {
                Taro.navigateTo({
                  url: `/pages/classroom-edit/index?id=${classroom.id}`
                })
              }}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🏫</Text>
            <Text className={styles.emptyText}>暂无教室数据</Text>
          </View>
        )}
      </View>

      <View className={styles.features}>
        <View className={styles.featuresTitle}>
          <View className={styles.featureIcon}>📋</View>
          <Text>教室建档功能</Text>
        </View>
        <View className={styles.featureList}>
          <View className={styles.featureItem}>
            <View className={styles.featureDot} />
            <Text className={styles.featureText}>
              <Text className={styles.featureHighlight}>基础信息</Text>：教室名称、容量、设备配置
            </Text>
          </View>
          <View className={styles.featureItem}>
            <View className={styles.featureDot} />
            <Text className={styles.featureText}>
              <Text className={styles.featureHighlight}>时段配置</Text>：自定义营业时间和课时长度
            </Text>
          </View>
          <View className={styles.featureItem}>
            <View className={styles.featureDot} />
            <Text className={styles.featureText}>
              <Text className={styles.featureHighlight}>状态管理</Text>：启用/停用教室，灵活调配资源
            </Text>
          </View>
        </View>
      </View>

      <View
        className={styles.fab}
        onClick={() => {
          Taro.navigateTo({
            url: '/pages/classroom-edit/index'
          })
        }}
      >
        <Text className={styles.fabIcon}>+</Text>
      </View>
    </View>
  )
}

export default ClassroomPage
