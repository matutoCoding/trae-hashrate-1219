import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Button, Picker, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useCreditStore } from '@/store/creditStore'
import { useStudentStore } from '@/store/studentStore'
import type { CreditRecord, CreditRecordType } from '@/types/credit'
import type { Student } from '@/types/student'

type ManualAction = 'freeze' | 'consume' | 'leave_unfreeze' | 'absent_consume'

const RECORD_TYPE_OPTIONS: { value: CreditRecordType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'recharge', label: '充值' },
  { value: 'freeze', label: '预约冻结' },
  { value: 'consume', label: '签到消课' },
  { value: 'unfreeze', label: '解冻退还' },
  { value: 'refund', label: '退还' },
  { value: 'absent_consume', label: '缺勤扣课' },
  { value: 'leave_unfreeze', label: '请假退还' },
  { value: 'adjust', label: '调整' }
]

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
    refundCredits,
    freezeCredits,
    consumeCredits,
    unfreezeCredits,
    absentConsume,
    leaveUnfreeze
  } = useCreditStore()

  const { students, fetchStudents } = useStudentStore()

  const [selectedPoolId, setSelectedPoolId] = useState(poolId || '')
  const [filterStudentId, setFilterStudentId] = useState('')
  const [filterType, setFilterType] = useState<CreditRecordType | 'all'>('all')

  useEffect(() => {
    fetchPools()
    fetchRecords()
    fetchStudents()
  }, [])

  useEffect(() => {
    if (pools.length > 0 && !selectedPoolId) {
      setSelectedPoolId(pools[0].id)
    }
  }, [pools])

  const currentPool = pools.find(p => p.id === selectedPoolId)

  const poolStudents = useMemo(() => {
    if (!currentPool) return []
    return students.filter(s => s.classId === currentPool.classId && s.status === 'active')
  }, [students, currentPool])

  const poolRecords = useMemo(() => {
    if (!selectedPoolId) return []
    let list = records.filter(r => r.poolId === selectedPoolId)
    if (filterStudentId) {
      list = list.filter(r => r.studentId === filterStudentId)
    }
    if (filterType !== 'all') {
      list = list.filter(r => r.type === filterType)
    }
    return list
  }, [records, selectedPoolId, filterStudentId, filterType])

  const available = useMemo(() => {
    if (!currentPool) return 0
    return currentPool.totalCredits - currentPool.usedCredits - currentPool.frozenCredits
  }, [currentPool])

  const summary = useMemo(() => {
    const s: Record<string, number> = {
      recharge: 0,
      freeze: 0,
      consume: 0,
      unfreeze: 0,
      refund: 0,
      absent_consume: 0,
      leave_unfreeze: 0,
      adjust: 0
    }
    poolRecords.forEach(r => {
      s[r.type] = (s[r.type] || 0) + r.amount
    })
    return s
  }, [poolRecords])

  const studentSummary = useMemo(() => {
    const map = new Map<string, { name: string; consume: number; absent: number; freeze: number; leave: number }>()
    poolRecords.forEach(r => {
      if (!r.studentId) return
      if (!map.has(r.studentId)) {
        map.set(r.studentId, { name: r.studentName, consume: 0, absent: 0, freeze: 0, leave: 0 })
      }
      const item = map.get(r.studentId)!
      if (r.type === 'consume') item.consume += r.amount
      else if (r.type === 'absent_consume') item.absent += r.amount
      else if (r.type === 'freeze') item.freeze += r.amount
      else if (r.type === 'leave_unfreeze') item.leave += r.amount
    })
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }))
  }, [poolRecords])

  const handleRecharge = () => {
    Taro.showModal({
      title: '充值课时',
      editable: true as any,
      placeholderText: '请输入充值课时数',
      confirmText: '确认充值',
      success: (res: any) => {
        if (res.confirm && res.content) {
          const amount = parseInt(res.content)
          if (isNaN(amount) || amount <= 0) {
            Taro.showToast({ title: '请输入有效数量', icon: 'none' })
            return
          }
          const result = rechargeCredits(selectedPoolId, amount, '管理员', '手动充值')
          if (result.success) {
            Taro.showToast({ title: '充值成功', icon: 'success' })
          } else {
            Taro.showToast({ title: result.message || '充值失败', icon: 'none' })
          }
        }
      }
    } as any)
  }

  const handleDemoRefund = () => {
    if (!currentPool) return
    Taro.showModal({
      title: '退还课时',
      editable: true as any,
      placeholderText: '请输入退还课时数',
      confirmText: '确认退还',
      success: (res: any) => {
        if (res.confirm && res.content) {
          const amount = parseInt(res.content)
          if (isNaN(amount) || amount <= 0) {
            Taro.showToast({ title: '请输入有效数量', icon: 'none' })
            return
          }
          const result = refundCredits(
            selectedPoolId,
            'stu_demo_refund',
            '演示学员',
            amount,
            '管理员',
            undefined,
            '演示退还'
          )
          if (result.success) {
            Taro.showToast({ title: '退还成功', icon: 'success' })
          } else {
            Taro.showToast({ title: result.message || '退还失败', icon: 'none' })
          }
        }
      }
    } as any)
  }

  const _pickStudentAndAmount = (
    title: string,
    placeholder: string,
    callback: (student: Student, amount: number, remark: string) => void
  ) => {
    if (poolStudents.length === 0) {
      Taro.showToast({ title: '当前班级暂无在读学员', icon: 'none' })
      return
    }
    Taro.showActionSheet({
      itemList: poolStudents.map(s => `${s.name}（${s.rank}）`),
      success: (res) => {
        const student = poolStudents[res.tapIndex]
        Taro.showModal({
          title: `${title} - ${student.name}`,
          editable: true as any,
          placeholderText: placeholder,
          confirmText: '确认',
          success: (res2: any) => {
            if (res2.confirm && res2.content) {
              const parts = (res2.content as string).split('|').map(x => x.trim())
              const amount = parseInt(parts[0])
              const remark = parts[1] || ''
              if (isNaN(amount) || amount <= 0) {
                Taro.showToast({ title: '请输入有效数量（可加|加备注）', icon: 'none' })
                return
              }
              callback(student, amount, remark)
            }
          }
        } as any)
      }
    })
  }

  const handleManualAction = (action: ManualAction) => {
    const configs: Record<ManualAction, { title: string; ph: string; successText: string }> = {
      freeze: { title: '预约冻结', ph: '请输入冻结课时数，格式: 数量|备注', successText: '冻结成功' },
      consume: { title: '签到消课', ph: '请输入消课课时数，格式: 数量|备注', successText: '消课成功' },
      leave_unfreeze: { title: '请假解冻', ph: '请输入请假课时数，格式: 数量|备注', successText: '请假已处理' },
      absent_consume: { title: '缺勤扣课', ph: '请输入缺勤课时数，格式: 数量|备注', successText: '缺勤已记录' }
    }
    const cfg = configs[action]
    _pickStudentAndAmount(cfg.title, cfg.ph, (student, amount, remark) => {
      let result: { success: boolean; message?: string }
      switch (action) {
        case 'freeze':
          result = freezeCredits(selectedPoolId, student.id, student.name, amount, '管理员')
          break
        case 'consume':
          result = consumeCredits(selectedPoolId, student.id, student.name, amount, '管理员', undefined, remark)
          break
        case 'leave_unfreeze':
          result = leaveUnfreeze(selectedPoolId, student.id, student.name, amount, '管理员')
          break
        case 'absent_consume':
          result = absentConsume(selectedPoolId, student.id, student.name, amount, '管理员')
          break
      }
      if (result.success) {
        Taro.showToast({ title: cfg.successText, icon: 'success' })
      } else {
        Taro.showToast({ title: result.message || '操作失败', icon: 'none' })
      }
    })
  }

  const handleExport = () => {
    const lines: string[] = []
    lines.push(`====== ${currentPool?.className || ''} 额度汇总 ======`)
    lines.push(`生成时间: ${new Date().toLocaleString()}`)
    lines.push(`总额度: ${currentPool?.totalCredits || 0} 课时`)
    lines.push(`已使用: ${currentPool?.usedCredits || 0} 课时`)
    lines.push(`冻结中: ${currentPool?.frozenCredits || 0} 课时`)
    lines.push(`可用余额: ${available} 课时`)
    lines.push('')
    lines.push('------ 类型汇总 ------')
    RECORD_TYPE_OPTIONS.filter(o => o.value !== 'all').forEach(o => {
      const val = summary[o.value] || 0
      if (val > 0) lines.push(`${o.label}: ${val} 课时`)
    })
    lines.push('')
    lines.push('------ 学员汇总 ------')
    lines.push('姓名\t消课\t缺勤\t冻结\t请假')
    studentSummary.forEach(s => {
      lines.push(`${s.name}\t${s.consume}\t${s.absent}\t${s.freeze}\t${s.leave}`)
    })
    lines.push('')
    lines.push('------ 明细流水 ------')
    lines.push('时间\t类型\t学员\t数量\t备注')
    poolRecords.forEach(r => {
      const label = RECORD_TYPE_OPTIONS.find(o => o.value === r.type)?.label || r.type
      lines.push(`${formatDate(r.createdAt)}\t${label}\t${r.studentName || '-'}\t${getAmountDisplay(r)}\t${r.remark || ''}`)
    })
    const text = lines.join('\n')
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showModal({
          title: '汇总已复制',
          content: `${lines.length} 行数据已复制到剪贴板，可直接粘贴到 Excel 或记事本。\n\n前 300 字预览：\n\n${text.slice(0, 300)}...`,
          showCancel: false,
          confirmText: '好的'
        })
      }
    })
  }

  const getRecordTypeConfig = (type: CreditRecordType) => {
    const configs: Record<CreditRecordType, { icon: string; text: string; className: string }> = {
      recharge: { icon: '+', text: '充值', className: 'recharge' },
      adjust: { icon: '⚙', text: '调整', className: 'adjust' },
      freeze: { icon: '❄', text: '预约冻结', className: 'freeze' },
      consume: { icon: '✓', text: '签到消课', className: 'consume' },
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return dateStr.slice(0, 16).replace('T', ' ')
  }

  const studentOptions = [{ id: '', name: '全部学员' }, ...poolStudents.map(s => ({ id: s.id, name: s.name }))]
  const studentPickerIndex = Math.max(0, studentOptions.findIndex(o => o.id === filterStudentId))

  return (
    <View className={styles.page}>
      <View className={styles.poolSelector}>
        {pools.map(pool => (
          <View
            key={pool.id}
            className={classnames(styles.poolChip, selectedPoolId === pool.id && styles.active)}
            onClick={() => {
              setSelectedPoolId(pool.id)
              setFilterStudentId('')
              setFilterType('all')
            }}
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
          onClick={handleExport}
        >
          <Text className={styles.actionBtnIcon}>📤</Text>
          <Text className={styles.actionBtnText}>导出</Text>
        </Button>
      </View>

      <View className={styles.manualSection}>
        <View className={styles.manualTitle}>
          <View className={styles.manualIcon}>🛠</View>
          <Text>手工调账面板</Text>
        </View>
        <Text className={styles.manualDesc}>
          直接对学员额度进行冻结、消课、请假解冻、缺勤扣课操作。每次操作后余额、冻结数、已用数和明细立即同步更新。
        </Text>
        <View className={styles.manualActions}>
          <Button
            className={classnames(styles.manualBtn, styles.freezeBtn)}
            onClick={() => handleManualAction('freeze')}
          >
            <Text className={styles.manualBtnIcon}>❄</Text>
            <Text className={styles.manualBtnText}>预约冻结</Text>
          </Button>
          <Button
            className={classnames(styles.manualBtn, styles.consumeBtn)}
            onClick={() => handleManualAction('consume')}
          >
            <Text className={styles.manualBtnIcon}>✓</Text>
            <Text className={styles.manualBtnText}>签到消课</Text>
          </Button>
          <Button
            className={classnames(styles.manualBtn, styles.leaveBtn)}
            onClick={() => handleManualAction('leave_unfreeze')}
          >
            <Text className={styles.manualBtnIcon}>🏠</Text>
            <Text className={styles.manualBtnText}>请假解冻</Text>
          </Button>
          <Button
            className={classnames(styles.manualBtn, styles.absentBtn)}
            onClick={() => handleManualAction('absent_consume')}
          >
            <Text className={styles.manualBtnIcon}>✕</Text>
            <Text className={styles.manualBtnText}>缺勤扣课</Text>
          </Button>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>汇总统计</Text>
        </View>
        <View className={styles.summaryGrid}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>充值合计</Text>
            <Text className={classnames(styles.summaryValue, styles.recharge)}>+{summary.recharge || 0}</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>冻结合计</Text>
            <Text className={classnames(styles.summaryValue, styles.freeze)}>-{summary.freeze || 0}</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>消课合计</Text>
            <Text className={classnames(styles.summaryValue, styles.consume)}>-{summary.consume || 0}</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>缺勤合计</Text>
            <Text className={classnames(styles.summaryValue, styles.absent)}>-{summary.absent_consume || 0}</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>请假退还</Text>
            <Text className={classnames(styles.summaryValue, styles.leave)}>+{summary.leave_unfreeze || 0}</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>解冻退还</Text>
            <Text className={classnames(styles.summaryValue, styles.refund)}>+{summary.unfreeze + summary.refund || 0}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>筛选条件</Text>
          <Text className={styles.sectionMore}>共 {poolRecords.length} 条</Text>
        </View>
        <View className={styles.filterRow}>
          <Picker
            mode='selector'
            range={studentOptions.map(o => o.name)}
            value={studentPickerIndex}
            onChange={(e) => {
              setFilterStudentId(studentOptions[e.detail.value].id)
            }}
          >
            <View className={styles.filterPicker}>
              <Text className={styles.filterPickerText}>
                {studentOptions[studentPickerIndex].name}
              </Text>
              <Text className={styles.filterPickerArrow}>▼</Text>
            </View>
          </Picker>
        </View>
        <ScrollView scrollX className={styles.typeTabs}>
          {RECORD_TYPE_OPTIONS.map(opt => (
            <View
              key={opt.value}
              className={classnames(
                styles.typeTab,
                filterType === opt.value && styles.typeTabActive
              )}
              onClick={() => setFilterType(opt.value)}
            >
              <Text className={styles.typeTabText}>{opt.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>额度变更记录</Text>
        </View>
        <View className={styles.recordList}>
          {poolRecords.length > 0 ? (
            poolRecords.map(record => {
              const typeConfig = getRecordTypeConfig(record.type)
              return (
                <View
                  key={record.id}
                  className={styles.recordItem}
                  onClick={() => {
                    if (record.relatedBookingId) {
                      Taro.navigateTo({
                        url: `/pages/booking-detail/index?id=${record.relatedBookingId}`
                      })
                    }
                  }}
                >
                  <View className={classnames(styles.recordIcon, typeConfig.className)}>
                    <Text>{typeConfig.icon}</Text>
                  </View>
                  <View className={styles.recordInfo}>
                    <Text className={styles.recordTitle}>
                      {typeConfig.text} · {record.studentName || '系统'}
                    </Text>
                    <Text className={styles.recordSub}>
                      {formatDate(record.createdAt)}
                    </Text>
                    {record.remark && (
                      <Text className={styles.recordSub}>{record.remark}</Text>
                    )}
                    {record.relatedBookingId && (
                      <Text className={styles.recordLink}>👉 查看关联排课</Text>
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
              <Text className={styles.emptyText}>暂无匹配记录</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

export default CreditPoolPage
