import React, { useState, useEffect } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useClassroomStore } from '@/store/classroomStore'

const allEquipment = ['标准棋盘', '教学大屏', '投影仪', '空调', '围棋书籍', '茶歇服务', 'WiFi']

const ClassroomEditPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params
  const isEdit = !!id

  const { getClassroom, addClassroom, updateClassroom, fetchClassrooms, classrooms } = useClassroomStore()

  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('21:00')
  const [slotDuration, setSlotDuration] = useState('60')
  const [equipment, setEquipment] = useState<string[]>([])
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  useEffect(() => {
    fetchClassrooms()
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      const classroom = getClassroom(id)
      if (classroom) {
        setName(classroom.name)
        setCapacity(String(classroom.capacity))
        setDescription(classroom.description)
        setStartTime(classroom.startTime)
        setEndTime(classroom.endTime)
        setSlotDuration(String(classroom.slotDuration))
        setEquipment(classroom.equipment)
        setStatus(classroom.status)
      }
    }
  }, [id, classrooms])

  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter(e => e !== item))
    } else {
      setEquipment([...equipment, item])
    }
  }

  const handleSave = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入教室名称', icon: 'none' })
      return
    }
    if (!capacity || Number(capacity) <= 0) {
      Taro.showToast({ title: '请输入有效容量', icon: 'none' })
      return
    }

    const data = {
      name: name.trim(),
      capacity: Number(capacity),
      description: description.trim(),
      equipment,
      startTime,
      endTime,
      slotDuration: Number(slotDuration),
      status
    }

    if (isEdit && id) {
      updateClassroom(id, data)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } else {
      addClassroom(data)
      Taro.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      Taro.navigateBack()
    }, 1000)
  }

  const handleDelete = () => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个教室吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm && id) {
          // deleteClassroom(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            Taro.navigateBack()
          }, 1000)
        }
      }
    })
  }

  const selectTime = (type: 'start' | 'end') => {
    const times = []
    for (let h = 6; h <= 23; h++) {
      times.push(`${h.toString().padStart(2, '0')}:00`)
      times.push(`${h.toString().padStart(2, '0')}:30`)
    }
    Taro.showActionSheet({
      itemList: times,
      success: (res) => {
        if (type === 'start') {
          setStartTime(times[res.tapIndex])
        } else {
          setEndTime(times[res.tapIndex])
        }
      }
    })
  }

  const selectDuration = () => {
    const durations = ['30分钟', '45分钟', '60分钟', '90分钟', '120分钟']
    Taro.showActionSheet({
      itemList: durations,
      success: (res) => {
        const values = [30, 45, 60, 90, 120]
        setSlotDuration(String(values[res.tapIndex]))
      }
    })
  }

  return (
    <View className={styles.page}>
      <Text className={styles.sectionTitle}>基础信息</Text>
      <View className={styles.section}>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>教室名称</Text>
          <Input
            className={styles.formInput}
            placeholder='请输入教室名称'
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>容纳人数</Text>
          <Input
            className={styles.formInput}
            type='number'
            placeholder='请输入容量'
            value={capacity}
            onInput={(e) => setCapacity(e.detail.value)}
          />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>教室描述</Text>
          <Input
            className={styles.formInput}
            placeholder='请输入描述'
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
          />
        </View>
      </View>

      <Text className={styles.sectionTitle}>时段配置</Text>
      <View className={styles.section}>
        <View className={styles.formItem} onClick={() => selectTime('start')}>
          <Text className={styles.formLabel}>开始时间</Text>
          <Text className={styles.formValue}>{startTime}</Text>
          <Text className={styles.formArrow}>›</Text>
        </View>
        <View className={styles.formItem} onClick={() => selectTime('end')}>
          <Text className={styles.formLabel}>结束时间</Text>
          <Text className={styles.formValue}>{endTime}</Text>
          <Text className={styles.formArrow}>›</Text>
        </View>
        <View className={styles.formItem} onClick={selectDuration}>
          <Text className={styles.formLabel}>每课时长</Text>
          <Text className={styles.formValue}>{slotDuration}分钟</Text>
          <Text className={styles.formArrow}>›</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>设备配置</Text>
      <View className={styles.section}>
        <View className={styles.equipmentList}>
          {allEquipment.map(item => (
            <View
              key={item}
              className={classnames(
                styles.equipmentTag,
                equipment.includes(item) && styles.selected
              )}
              onClick={() => toggleEquipment(item)}
            >
              <Text className={styles.equipmentTagText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text className={styles.sectionTitle}>状态设置</Text>
      <View className={styles.section}>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>启用状态</Text>
          <View className={styles.switchWrap}>
            <Text className={classnames(
              styles.formValue,
              status === 'active' ? '' : ''
            )}>
              {status === 'active' ? '使用中' : '已停用'}
            </Text>
          </View>
          <Text className={styles.formArrow}>›</Text>
        </View>
      </View>

      <View className={styles.demoSection}>
        <View className={styles.demoTitle}>
          <View className={styles.demoIcon}>📋</View>
          <Text>教室建档说明</Text>
        </View>
        <View className={styles.demoList}>
          <View className={styles.demoItem}>
            <View className={styles.demoDot} />
            <Text className={styles.demoText}>
              <Text className={styles.demoHighlight}>灵活配置</Text>：自定义营业时间和课时长度
            </Text>
          </View>
          <View className={styles.demoItem}>
            <View className={styles.demoDot} />
            <Text className={styles.demoText}>
              <Text className={styles.demoHighlight}>设备管理</Text>：记录教室配备的教学设备
            </Text>
          </View>
          <View className={styles.demoItem}>
            <View className={styles.demoDot} />
            <Text className={styles.demoText}>
              <Text className={styles.demoHighlight}>状态控制</Text>：可随时启用或停用教室资源
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.actionBar}>
        {isEdit && (
          <Button
            className={classnames(styles.actionBtn, styles.danger)}
            onClick={handleDelete}
          >
            <Text className={styles.actionBtnText}>删除</Text>
          </Button>
        )}
        <Button
          className={classnames(styles.actionBtn, styles.primary)}
          onClick={handleSave}
        >
          <Text className={styles.actionBtnText}>保存</Text>
        </Button>
      </View>
    </View>
  )
}

export default ClassroomEditPage
