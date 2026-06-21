import React, { useState, useEffect } from 'react'
import { View, Text, Button, Input, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useStudentStore } from '@/store/studentStore'
import { rankLevels, mockRankRecords } from '@/data/mockStudent'
import type { RankLevel } from '@/types/student'

const kyuLevels: RankLevel[] = [
  '无级', '10级', '9级', '8级', '7级', '6级', '5级',
  '4级', '3级', '2级', '1级'
]

const danLevels: RankLevel[] = [
  '1段', '2段', '3段', '4段', '5段', '6段', '7段', '8段', '9段'
]

const RankUpgradePage: React.FC = () => {
  const router = useRouter()
  const studentId = router.params.studentId

  const { getStudent, upgradeRank, students, fetchStudents } = useStudentStore()

  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '')
  const [currentRank, setCurrentRank] = useState<RankLevel>('无级')
  const [targetRank, setTargetRank] = useState<RankLevel>('10级')
  const [levelType, setLevelType] = useState<'kyu' | 'dan'>('kyu')
  const [remark, setRemark] = useState('')
  const operator = '管理员'

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (selectedStudentId) {
      const student = getStudent(selectedStudentId)
      if (student) {
        setCurrentRank(student.rank)
        const isDan = student.rank.includes('段')
        setLevelType(isDan ? 'dan' : 'kyu')
      }
    }
  }, [selectedStudentId, students])

  const student = selectedStudentId ? getStudent(selectedStudentId) : undefined
  const historyRecords = mockRankRecords
    .filter(r => r.studentId === selectedStudentId)
    .sort((a, b) => b.upgradeDate.localeCompare(a.upgradeDate))

  const canSubmit = selectedStudentId && targetRank && targetRank !== currentRank

  const currentLevelType = currentRank.includes('段') ? 'dan' : 'kyu'
  const targetLevelType = targetRank.includes('段') ? 'dan' : 'kyu'

  const handleSelectStudent = () => {
    const activeStudents = students.filter(s => s.status === 'active')
    Taro.showActionSheet({
      itemList: activeStudents.map(s => `${s.name} (${s.rank})`),
      success: (res) => {
        setSelectedStudentId(activeStudents[res.tapIndex].id)
      }
    })
  }

  const handleSelectTargetRank = (rank: RankLevel) => {
    setTargetRank(rank)
  }

  const handleSubmit = () => {
    if (!canSubmit || !selectedStudentId) return

    Taro.showModal({
      title: '确认升级',
      content: `确定将${student?.name}的段位从${currentRank}升级为${targetRank}吗？`,
      confirmText: '确认升级',
      confirmColor: '#D4A574',
      success: (res) => {
        if (res.confirm) {
          const record = upgradeRank(selectedStudentId, targetRank, operator, remark)
          if (record) {
            Taro.showToast({ title: '登记成功', icon: 'success' })
            setTimeout(() => {
              Taro.navigateBack()
            }, 1000)
          } else {
            Taro.showToast({ title: '登记失败', icon: 'none' })
          }
        }
      }
    })
  }

  const displayLevels = levelType === 'kyu' ? kyuLevels : danLevels

  return (
    <View className={styles.page}>
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>段位升级登记</Text>
        <Text className={styles.headerDesc}>记录学员段位晋升，完整追踪成长历程</Text>
      </View>

      <Text className={styles.sectionTitle}>基本信息</Text>
      <View className={styles.section}>
        <View className={styles.formItem} onClick={handleSelectStudent}>
          <Text className={styles.formLabel}>选择学员</Text>
          <Text className={styles.formValue}>
            {student ? `${student.name} (${currentRank})` : '请选择'}
          </Text>
          <Text className={styles.formArrow}>›</Text>
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>当前段位</Text>
          <Text className={styles.formValue} style={{ color: currentLevelType === 'dan' ? '#D4A574' : '#2D5B89' }}>
            {currentRank}
          </Text>
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>操作人</Text>
          <Text className={styles.formValue}>{operator}</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>目标段位</Text>
      <View className={styles.section}>
        <View className={styles.levelTabs}>
          <View
            className={classnames(styles.levelTab, levelType === 'kyu' && styles.active)}
            onClick={() => setLevelType('kyu')}
          >
            <Text className={styles.levelTabText}>级位</Text>
          </View>
          <View
            className={classnames(styles.levelTab, levelType === 'dan' && styles.active)}
            onClick={() => setLevelType('dan')}
          >
            <Text className={styles.levelTabText}>段位</Text>
          </View>
        </View>

        <View className={styles.rankSelector}>
          <View className={styles.rankGrid}>
            {displayLevels.map(rank => (
              <View
                key={rank}
                className={classnames(
                  styles.rankItem,
                  targetRank === rank && styles.selected,
                  levelType === 'dan' && styles.dan
                )}
                onClick={() => handleSelectTargetRank(rank)}
              >
                <Text className={styles.rankItemText}>{rank}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.previewCard}>
        <Text className={styles.previewTitle}>升级预览</Text>
        <View className={styles.previewChange}>
          <View className={styles.previewRank}>
            <Text className={classnames(styles.previewRankText, styles.current)}>{currentRank}</Text>
          </View>
          <Text className={styles.previewArrow}>→</Text>
          <View className={styles.previewRank}>
            <Text className={classnames(
              styles.previewRankText,
              styles.target,
              targetLevelType === 'dan' && styles.dan
            )}>
              {targetRank}
            </Text>
          </View>
        </View>
        <Text className={styles.previewSub}>
          {targetRank === currentRank
            ? '目标段位与当前相同'
            : `将从${currentRank}升至${targetRank}`}
        </Text>
      </View>

      <Text className={styles.sectionTitle}>备注</Text>
      <View className={styles.section}>
        <View style={{ padding: 24 }}>
          <Textarea
            className={styles.remarkTextarea}
            placeholder='请输入备注信息（选填）'
            value={remark}
            onInput={(e) => setRemark(e.detail.value)}
            autoHeight
            maxlength={200}
          />
        </View>
      </View>

      <Text className={styles.sectionTitle}>升级历史</Text>
      <View className={styles.section}>
        <View className={styles.historyList}>
          {historyRecords.length > 0 ? (
            historyRecords.map(record => (
              <View key={record.id} className={styles.historyItem}>
                <View className={styles.historyInfo}>
                  <Text className={styles.historyRank}>
                    {record.fromRank} → {record.toRank}
                  </Text>
                  <Text className={styles.historyDate}>{record.upgradeDate}</Text>
                </View>
                <Text className={styles.historyOperator}>{record.operator}</Text>
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无升级记录</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.actionBar}>
        <Button
          className={classnames(styles.submitBtn, !canSubmit && styles.disabled)}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <Text className={styles.submitBtnText}>确认登记</Text>
        </Button>
      </View>
    </View>
  )
}

export default RankUpgradePage
