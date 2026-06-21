import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useCreditStore } from '@/store/creditStore'
import { creditPoolManager } from '@/utils/lock'
import type { CreditRecord, CreditRecordType } from '@/types/credit'

const CreditPoolPage: React.FC = () => {
  const router = useRouter()
  const poolId = router.params.id

  const {
    pools,
    records,
    fetchPools,
    fetchRecords,
    getAvailableCredits,
    rechargeCredits,
    refundCredits
  } = useCreditStore()

  const [selectedPoolId, setSelectedPoolId] = useState(poolId || '')

  useEffect(() => {
    fetchPools()
    fetchRecords()
  }, [])

  useEffect(() => {
    if (pools.length > 0 && !selectedPoolId) {
      setSelectedPoolId(pools[0].id)
    }
  }, [pools])

  const currentPool = pools.find(p => p.id === selectedPoolId)

  const poolRecords = useMemo(() => {
    if (!selectedPoolId) return []
    return records.filter(r => r.poolId === selectedPoolId)
  }, [records, selectedPoolId])

  const available = useMemo(() => {
    if (!currentPool) return 0
    return currentPool.totalCredits - currentPool.usedCredits - currentPool.frozenCredits
  }, [currentPool])

  const handleRecharge = () => {
    Taro.showModal({
      title: '充值课时',
      editable: true,
      placeholderText: '请输入充值课时数',
      confirmText: '确认充值',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseInt(res.content)
          if (isNaN(amount) || amount <= 0) {
            Taro.showToast({ title: '请输入有效数量', icon: 'none' })
            return
          }
          const result = rechargeCredits(selectedPoolId, amount, '管理员', '手动充值')
          if (result.success) {
            Taro.showToast({ title: '充值成功', icon: 'success' })
            fetchRecords()
          } else {
            Taro.showToast({ title: result.message || '充值失败', icon: 'none' })
          }
        }
      }
    })
  }

  const handleDemoConcurrent = () => {
    if (!currentPool) return

    Taro.showLoading({ title: '模拟并发...' })

    const results: boolean[] = []
    let completed = 0

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const result = creditPoolManager.deductCredits(
          selectedPoolId,
          `stu_demo_${i}`,
          `演示学员${i + 1}`,
          10,
          '并发测试'
        )
        results.push(result.success)
        completed++
        console.log(`[CreditPool] 并发请求${i + 1}:`, result.success ? '成功' : '失败', result.message)

        if (completed === 5) {
          Taro.hideLoading()
          fetchPools()
          fetchRecords()
          const successCount = results.filter(r => r).length
          Taro.showModal({
            title: '并发扣减演示',
            content: `发起5个并发请求（各扣10课时）\n\n成功：${successCount}个\n失败：${5 - successCount}个\n\n当前余额：${getAvailableCredits(selectedPoolId)}课时\n\n说明：当额度不足时，后续请求会被拒绝，确保不会超额扣减`,
            showCancel: false,
            confirmText: '知道了'
          })
        }
      }, i * 50)
    }
  }

  const handleDemoRefund = () => {
    if (!currentPool) return

    const result = refundCredits(
      selectedPoolId,
      'stu_demo_refund',
      '演示学员',
      5,
      '管理员',
      '演示退还'
    )

    if (result.success) {
      fetchPools()
      fetchRecords()
      Taro.showToast({ title: '退还成功', icon: 'success' })
    } else {
      Taro.showToast({ title: result.message || '退还失败', icon: 'none' })
    }
  }

  const handleDemoBalance = () => {
    const balance = getAvailableCredits(selectedPoolId)
    const pool = creditPoolManager.getPool(selectedPoolId)
    Taro.showModal({
      title: '实时余额',
      content: `当前可用额度：${balance}课时\n版本号：v${pool?.version || 0}\n\n每次操作后余额即时更新，版本号递增，确保数据一致性`,
      showCancel: false
    })
  }

  const getRecordTypeConfig = (type: CreditRecordType) => {
    const configs: Record<CreditRecordType, { icon: string; text: string; className: string }> = {
      recharge: { icon: '+', text: '充值', className: 'recharge' },
      adjust: { icon: '⚙', text: '调整', className: 'adjust' },
      freeze: { icon: '❄', text: '预约冻结', className: 'freeze' },
      consume: { icon: '✓', text: '实际消课', className: 'consume' },
      unfreeze: { icon: '↩', text: '解冻退还', className: 'refund' },
      refund: { icon: '↩', text: '退还', className: 'refund' },
      absent_consume: { icon: '✕', text: '缺勤扣课', className: 'absent' },
      leave_unfreeze: { icon: '🏠', text: '请假退还', className: 'leave' }
    }
    return configs[type] || { icon: '•', text: type, className: 'adjust' }
  }

  const getAmountDisplay = (record: CreditRecord) => {
    const negativeTypes: CreditRecordType[] = ['freeze', 'consume', 'absent_consume']
    const prefix = negativeTypes.includes(record.type) ? '-' : '+'
    return `${prefix}${record.amount}`
  }

  return (
    <View className={styles.page}>
      <View className={styles.poolSelector}>
        {pools.map(pool => (
          <View
            key={pool.id}
            className={classnames(styles.poolChip, selectedPoolId === pool.id && styles.active)}
            onClick={() => setSelectedPoolId(pool.id)}
          >
            <Text className={styles.poolChipText}>{pool.className}</Text>
          </View>
        ))}
      </View>

      {currentPool && (
        <View className={styles.poolHeader}>
          <View className={styles.versionBadge}>
            <Text className={styles.versionText}>v{currentPool.version}</Text>
          </View>
          <Text className={styles.poolName}>{currentPool.className} · 共享额度池</Text>
          <View style={{ display: 'flex', alignItems: 'baseline' }}>
            <Text className={styles.poolBalance}>{available}</Text>
            <Text className={styles.poolUnit}>课时可用</Text>
          </View>
          <View className={styles.poolStats}>
            <View className={styles.poolStatItem}>
              <Text className={styles.poolStatValue}>{currentPool.totalCredits}</Text>
              <Text className={styles.poolStatLabel}>总额度</Text>
            </View>
            <View className={styles.poolStatItem}>
              <Text className={styles.poolStatValue}>{currentPool.usedCredits}</Text>
              <Text className={styles.poolStatLabel}>已使用</Text>
            </View>
            <View className={styles.poolStatItem}>
              <Text className={styles.poolStatValue}>{currentPool.frozenCredits}</Text>
              <Text className={styles.poolStatLabel}>冻结中</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.actionBar}>
        <Button
          className={classnames(styles.actionBtn, styles.primary)}
          onClick={handleRecharge}
        >
          <Text className={styles.actionBtnIcon}>+</Text>
          <Text className={styles.actionBtnText}>充值</Text>
        </Button>
        <Button
          className={styles.actionBtn}
          onClick={handleDemoRefund}
        >
          <Text className={styles.actionBtnIcon}>↩</Text>
          <Text className={styles.actionBtnText}>退还</Text>
        </Button>
        <Button
          className={styles.actionBtn}
          onClick={handleDemoBalance}
        >
          <Text className={styles.actionBtnIcon}>📊</Text>
          <Text className={styles.actionBtnText}>余额</Text>
        </Button>
      </View>

      <View className={styles.demoSection}>
        <View className={styles.demoTitle}>
          <View className={styles.demoIcon}>🔐</View>
          <Text>并发控制演示</Text>
        </View>
        <Text className={styles.demoDesc}>
          采用分布式锁机制，确保多人同时约课时不会超额扣减。每次扣减前获取锁，操作完成后释放锁。
        </Text>
        <View className={styles.demoActions}>
          <Button
            className={classnames(styles.demoBtn, styles.primary)}
            onClick={handleDemoConcurrent}
          >
            <Text className={styles.demoBtnText}>并发扣减演示</Text>
          </Button>
          <Button
            className={classnames(styles.demoBtn, styles.success)}
            onClick={handleDemoBalance}
          >
            <Text className={styles.demoBtnText}>查看实时余额</Text>
          </Button>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>额度变更记录</Text>
          <Text className={styles.sectionMore}>共 {poolRecords.length} 条</Text>
        </View>
        <View className={styles.recordList}>
          {poolRecords.length > 0 ? (
            poolRecords.slice(0, 10).map(record => {
              const typeConfig = getRecordTypeConfig(record.type)
              return (
                <View key={record.id} className={styles.recordItem}>
                  <View className={classnames(styles.recordIcon, typeConfig.className)}>
                    <Text>{typeConfig.icon}</Text>
                  </View>
                  <View className={styles.recordInfo}>
                    <Text className={styles.recordTitle}>
                      {typeConfig.text} · {record.studentName}
                    </Text>
                    <Text className={styles.recordSub}>
                      {record.createdAt.slice(0, 19).replace('T', ' ')}
                    </Text>
                    {record.remark && (
                      <Text className={styles.recordSub}>{record.remark}</Text>
                    )}
                  </View>
                  <Text className={classnames(styles.recordAmount, typeConfig.className)}>
                    {getAmountDisplay(record)}
                  </Text>
                </View>
              )
            })
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无变更记录</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.demoSection}>
        <View className={styles.demoTitle}>
          <View className={styles.demoIcon}>💡</View>
          <Text>核心特性说明</Text>
        </View>
        <View style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <View style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, background: '#2D5B89', marginTop: 8, flexShrink: 0 }} />
            <Text style={{ fontSize: 26, color: '#4E5969', lineHeight: 1.6, flex: 1 }}>
              <Text style={{ color: '#2D5B89', fontWeight: 500 }}>共享额度池</Text>：班级共享课时总额，多人共同使用
            </Text>
          </View>
          <View style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, background: '#2D5B89', marginTop: 8, flexShrink: 0 }} />
            <Text style={{ fontSize: 26, color: '#4E5969', lineHeight: 1.6, flex: 1 }}>
              <Text style={{ color: '#2D5B89', fontWeight: 500 }}>并发锁机制</Text>：扣减前加锁，防止并发超额
            </Text>
          </View>
          <View style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, background: '#2D5B89', marginTop: 8, flexShrink: 0 }} />
            <Text style={{ fontSize: 26, color: '#4E5969', lineHeight: 1.6, flex: 1 }}>
              <Text style={{ color: '#2D5B89', fontWeight: 500 }}>版本号控制</Text>：每次变更版本号递增，确保一致性
            </Text>
          </View>
          <View style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, background: '#2D5B89', marginTop: 8, flexShrink: 0 }} />
            <Text style={{ fontSize: 26, color: '#4E5969', lineHeight: 1.6, flex: 1 }}>
              <Text style={{ color: '#2D5B89', fontWeight: 500 }}>实时余额</Text>：操作后余额立即更新，数据准确
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default CreditPoolPage
