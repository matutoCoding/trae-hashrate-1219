import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import StudentCard from '@/components/StudentCard'
import { useStudentStore } from '@/store/studentStore'
import { useCreditStore } from '@/store/creditStore'
import { creditPoolManager } from '@/utils/lock'

const StudentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'student' | 'credit'>('student')
  const [selectedClass, setSelectedClass] = useState('all')
  const [searchText, setSearchText] = useState('')

  const { students, classes, fetchStudents, fetchClasses } = useStudentStore()
  const { pools, fetchPools, deductCredits, rechargeCredits } = useCreditStore()

  useEffect(() => {
    fetchStudents()
    fetchClasses()
    fetchPools()
  }, [])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClass !== 'all' && s.classId !== selectedClass) return false
      if (searchText && !s.name.includes(searchText)) return false
      return true
    })
  }, [students, selectedClass, searchText])

  const handleStudentClick = (studentId: string) => {
    Taro.navigateTo({
      url: `/pages/student-detail/index?id=${studentId}`
    })
  }

  const handleCreditPoolClick = (poolId: string) => {
    Taro.navigateTo({
      url: `/pages/credit-pool/index?id=${poolId}`
    })
  }

  const handleDemoConcurrent = () => {
    const pool = pools[0]
    if (!pool) return

    console.log('[Student] 并发扣减演示开始')
    Taro.showLoading({ title: '模拟并发...' })

    const results: boolean[] = []
    let completed = 0

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const result = creditPoolManager.deductCredits(
          pool.id,
          `stu_demo_${i}`,
          `演示学员${i + 1}`,
          10,
          '并发测试'
        )
        results.push(result.success)
        completed++
        console.log(`[Student] 并发请求${i + 1}:`, result.success ? '成功' : '失败', result.message)

        if (completed === 5) {
          Taro.hideLoading()
          const successCount = results.filter(r => r).length
          Taro.showModal({
            title: '并发扣减演示',
            content: `发起5个并发请求（各扣10课时）\n成功：${successCount}个\n失败：${5 - successCount}个\n\n说明：当额度不足时，后续请求会被拒绝，确保不会超额扣减`,
            showCancel: false
          })
          fetchPools()
        }
      }, i * 100)
    }
  }

  const handleDemoRealtime = () => {
    const pool = pools[0]
    if (!pool) return

    const before = creditPoolManager.getAvailableCredits(pool.id)
    const result = creditPoolManager.deductCredits(
      pool.id, 'stu_demo', '演示学员', 2, '实时余额演示'
    )
    const after = creditPoolManager.getAvailableCredits(pool.id)

    Taro.showModal({
      title: '实时余额演示',
      content: `扣减前：${before}课时\n扣减：2课时\n扣减后：${after}课时\n\n余额实时更新，版本号递增`,
      showCancel: false
    })
    fetchPools()
  }

  return (
    <View className={styles.page}>
      <View className={styles.tabBar}>
        <View
          className={classnames(styles.tabItem, activeTab === 'student' && styles.active)}
          onClick={() => setActiveTab('student')}
        >
          <Text className={styles.tabText}>学员管理</Text>
        </View>
        <View
          className={classnames(styles.tabItem, activeTab === 'credit' && styles.active)}
          onClick={() => setActiveTab('credit')}
        >
          <Text className={styles.tabText}>共享额度</Text>
        </View>
      </View>

      {activeTab === 'student' && (
        <>
          <View className={styles.classFilter}>
            <View
              className={classnames(styles.classChip, selectedClass === 'all' && styles.active)}
              onClick={() => setSelectedClass('all')}
            >
              <Text className={styles.classChipText}>全部</Text>
            </View>
            {classes.map(cls => (
              <View
                key={cls.id}
                className={classnames(styles.classChip, selectedClass === cls.id && styles.active)}
                onClick={() => setSelectedClass(cls.id)}
              >
                <Text className={styles.classChipText}>{cls.name}</Text>
              </View>
            ))}
          </View>

          <View className={styles.searchBar}>
            <View className={styles.searchInput} onClick={() => {}}>
              <Text className={styles.searchIcon}>🔍</Text>
              <Text className={styles.searchPlaceholder}>搜索学员姓名</Text>
            </View>
          </View>

          <View className={styles.section}>
            <View className={styles.sectionTitle}>
              <Text>学员列表</Text>
              <Text className={styles.sectionMore}>共 {filteredStudents.length} 人</Text>
            </View>
          </View>

          <View className={styles.studentList}>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onClick={() => handleStudentClick(student.id)}
                />
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>👤</Text>
                <Text className={styles.emptyText}>暂无学员数据</Text>
              </View>
            )}
          </View>

          <View className={styles.features}>
            <View className={styles.featuresTitle}>
              <View className={styles.featureIcon}>🏆</View>
              <Text>段位升级系统</Text>
            </View>
            <View className={styles.featureList}>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>完整段位体系</Text>：从无级到9段共20个级别
                </Text>
              </View>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>升级记录追踪</Text>：完整记录每次升段历史
                </Text>
              </View>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>操作留痕</Text>：记录操作人和操作时间
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {activeTab === 'credit' && (
        <>
          <View className={styles.section}>
            <View className={styles.sectionTitle}>
              <Text>班级额度池</Text>
              <Text className={styles.sectionMore} onClick={() => handleCreditPoolClick('')}>
                管理
              </Text>
            </View>
          </View>

          <View className={styles.creditCards}>
            {pools.map(pool => {
              const usagePercent = pool.totalCredits > 0
                ? Math.round((pool.usedCredits / pool.totalCredits) * 100)
                : 0
              const available = pool.totalCredits - pool.usedCredits - pool.frozenCredits

              return (
                <View
                  key={pool.id}
                  className={styles.creditCard}
                  onClick={() => handleCreditPoolClick(pool.id)}
                >
                  <View className={styles.creditIcon}>
                    <Text className={styles.creditIconText}>⏱</Text>
                  </View>
                  <View className={styles.creditInfo}>
                    <Text className={styles.creditName}>{pool.className}</Text>
                    <View className={styles.creditMeta}>
                      <View className={styles.creditMetaItem}>
                        <Text className={classnames(styles.creditMetaValue, styles.available)}>
                          {available}
                        </Text>
                        <Text className={styles.creditMetaLabel}>可用</Text>
                      </View>
                      <View className={styles.creditMetaItem}>
                        <Text className={classnames(styles.creditMetaValue, styles.used)}>
                          {pool.usedCredits}
                        </Text>
                        <Text className={styles.creditMetaLabel}>已用</Text>
                      </View>
                      <View className={styles.creditMetaItem}>
                        <Text className={styles.creditMetaValue}>{pool.totalCredits}</Text>
                        <Text className={styles.creditMetaLabel}>总额</Text>
                      </View>
                    </View>
                    <View className={styles.creditBar}>
                      <View
                        className={styles.creditBarFill}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </View>
                  </View>
                </View>
              )
            })}
          </View>

          <View className={styles.features}>
            <View className={styles.featuresTitle}>
              <View className={styles.featureIcon}>🔐</View>
              <Text>并发与一致性保障</Text>
            </View>
            <View className={styles.featureList}>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>分布式锁</Text>：扣减前获取锁，防止并发超额
                </Text>
              </View>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>版本号机制</Text>：每次变更版本号递增
                </Text>
              </View>
              <View className={styles.featureItem}>
                <View className={styles.featureDot} />
                <Text className={styles.featureText}>
                  <Text className={styles.featureHighlight}>实时余额</Text>：扣减后余额立即更新
                </Text>
              </View>
            </View>
            <View style={{ display: 'flex', gap: '16rpx', marginTop: '24rpx' }}>
              <Button
                className={styles.classChip}
                onClick={handleDemoConcurrent}
              >
                <Text className={styles.classChipText}>并发演示</Text>
              </Button>
              <Button
                className={styles.classChip}
                onClick={handleDemoRealtime}
              >
                <Text className={styles.classChipText}>实时演示</Text>
              </Button>
            </View>
          </View>
        </>
      )}

      {activeTab === 'student' && (
        <View
          className={styles.fab}
          onClick={() => {
            Taro.showToast({ title: '添加学员功能', icon: 'none' })
          }}
        >
          <Text className={styles.fabIcon}>+</Text>
        </View>
      )}
    </View>
  )
}

export default StudentPage
