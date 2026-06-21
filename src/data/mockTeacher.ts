import type { Teacher } from '@/types/teacher'

export const mockTeachers: Teacher[] = [
  {
    id: 'tch_001',
    name: '张老师',
    phone: '138****1234',
    level: '高级教练',
    mainClassIds: ['cls_001', 'cls_002'],
    status: 'active',
    createdAt: '2024-01-10T08:00:00.000Z'
  },
  {
    id: 'tch_002',
    name: '李老师',
    phone: '139****5678',
    level: '中级教练',
    mainClassIds: ['cls_003'],
    status: 'active',
    createdAt: '2024-02-15T08:00:00.000Z'
  },
  {
    id: 'tch_003',
    name: '王老师',
    phone: '137****9012',
    level: '初级教练',
    mainClassIds: ['cls_001'],
    status: 'active',
    createdAt: '2024-03-20T08:00:00.000Z'
  }
]
