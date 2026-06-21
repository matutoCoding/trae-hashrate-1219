import React, { useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import { useClassroomStore } from '@/store/classroomStore'
import { useStudentStore } from '@/store/studentStore'
import { useBookingStore } from '@/store/bookingStore'
import { useCreditStore } from '@/store/creditStore'

const MinePage: React.FC = () => {
  const { classrooms, fetchClassrooms } = useClassroomStore()
  const { students, fetchStudents } = useStudentStore()
  const { bookings, fetchBookings } = useBookingStore()
  const { pools, fetchPools } = useCreditStore()

  useEffect(() => {
    fetchClassrooms()
    fetchStudents()
    fetchBookings()
    fetchPools()
  }, [])

  const activeBookings = bookings.filter(b => b.status === 'active').length
  const totalCredits = pools.reduce((sum, p) => sum + p.totalCredits, 0)
  const usedCredits = pools.reduce((sum, p) => sum + p.usedCredits, 0)

  const handleMenuItemClick = (key: string) => {
    const routes: Record<string, string> = {
      'rank-upgrade': '/pages/rank-upgrade/index',
      'credit-pool': '/pages/credit-pool/index',
    }
    if (routes[key]) {
      Taro.navigateTo({ url: routes[key] })
    } else {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>管</Text>
          </View>
          <View className={styles.userDetail}>
            <Text className={styles.userName}>管理员</Text>
            <Text className={styles.userRole}>围棋教室 · 教务管理</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsCard}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{classrooms.length}</Text>
          <Text className={styles.statLabel}>教室</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{students.length}</Text>
          <Text className={styles.statLabel}>学员</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{activeBookings}</Text>
          <Text className={styles.statLabel}>预约中</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{totalCredits - usedCredits}</Text>
          <Text className={styles.statLabel}>可用课时</Text>
        </View>
      </View>

      <View className={styles.featureBanner}>
        <Text className={styles.bannerTitle}>核心功能模块</Text>
        <Text className={styles.bannerDesc}>
          围棋教室排课系统，支持时段合并拆分、共享额度池、并发扣减加锁等高级功能
        </Text>
        <View className={styles.bannerActions}>
          <View
            className={styles.bannerBtn}
            onClick={() => handleMenuItemClick('rank-upgrade')}
          >
            <Text className={styles.bannerBtnText}>段位升级</Text>
          </View>
          <View
            className={styles.bannerBtn}
            onClick={() => handleMenuItemClick('credit-pool')}
          >
            <Text className={styles.bannerBtnText}>额度管理</Text>
          </View>
        </View>
      </View>

      <Text className={styles.menuTitle}>教务管理</Text>
      <View className={styles.menuGroup}>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('rank-upgrade')}
        >
          <View className={styles.menuIcon}>🏆</View>
          <Text className={styles.menuText}>段位升级登记</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('credit-pool')}
        >
          <View className={styles.menuIcon}>💰</View>
          <Text className={styles.menuText}>共享额度管理</Text>
          <View className={styles.menuBadge}>
            <Text className={styles.menuBadgeText}>新</Text>
          </View>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('booking-history')}
        >
          <View className={styles.menuIcon}>📅</View>
          <Text className={styles.menuText}>预约记录</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>

      <Text className={styles.menuTitle}>系统设置</Text>
      <View className={styles.menuGroup}>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('operation-log')}
        >
          <View className={styles.menuIcon}>📋</View>
          <Text className={styles.menuText}>操作日志</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('about')}
        >
          <View className={styles.menuIcon}>ℹ️</View>
          <Text className={styles.menuText}>关于我们</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View
          className={styles.menuItem}
          onClick={() => handleMenuItemClick('settings')}
        >
          <View className={styles.menuIcon}>⚙️</View>
          <Text className={styles.menuText}>系统设置</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>

      <View className={styles.versionInfo}>
        <Text className={styles.versionText}>围棋教室排课系统 v1.0.0</Text>
      </View>
    </View>
  )
}

export default MinePage
