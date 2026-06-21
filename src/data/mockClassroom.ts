import type { Classroom } from '@/types/classroom'

export const mockClassrooms: Classroom[] = [
  {
    id: 'cls_001',
    name: '天元教室',
    capacity: 8,
    description: '主教室，配备专业棋盘和教学设备',
    equipment: ['标准棋盘', '教学大屏', '围棋书籍', '空调'],
    startTime: '09:00',
    endTime: '21:00',
    slotDuration: 60,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cls_002',
    name: '星位教室',
    capacity: 6,
    description: '小班教室，适合精品教学',
    equipment: ['标准棋盘', '投影仪', '空调'],
    startTime: '09:00',
    endTime: '20:00',
    slotDuration: 60,
    status: 'active',
    createdAt: '2024-01-02T00:00:00.000Z'
  },
  {
    id: 'cls_003',
    name: '小目教室',
    capacity: 4,
    description: 'VIP一对一教室',
    equipment: ['高端棋盘', '茶歇服务', '空调'],
    startTime: '10:00',
    endTime: '21:00',
    slotDuration: 90,
    status: 'active',
    createdAt: '2024-01-03T00:00:00.000Z'
  },
  {
    id: 'cls_004',
    name: '三三位教室',
    capacity: 10,
    description: '大班教室，适合集体课程',
    equipment: ['标准棋盘x10', '教学大屏', '空调'],
    startTime: '08:00',
    endTime: '22:00',
    slotDuration: 60,
    status: 'inactive',
    createdAt: '2024-01-04T00:00:00.000Z'
  }
]
