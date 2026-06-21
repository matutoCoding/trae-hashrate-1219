import type { CreditPool, CreditRecord } from '@/types/credit'

export const mockCreditPools: CreditPool[] = [
  {
    id: 'pool_001',
    classId: 'class_001',
    className: '入门班',
    totalCredits: 200,
    usedCredits: 25,
    frozenCredits: 12,
    version: 15,
    updatedAt: '2024-06-20T10:30:00.000Z'
  },
  {
    id: 'pool_002',
    classId: 'class_002',
    className: '初级班',
    totalCredits: 300,
    usedCredits: 65,
    frozenCredits: 8,
    version: 28,
    updatedAt: '2024-06-20T14:20:00.000Z'
  },
  {
    id: 'pool_003',
    classId: 'class_003',
    className: '中级班',
    totalCredits: 500,
    usedCredits: 180,
    frozenCredits: 15,
    version: 45,
    updatedAt: '2024-06-20T16:45:00.000Z'
  },
  {
    id: 'pool_004',
    classId: 'class_004',
    className: '高级班',
    totalCredits: 800,
    usedCredits: 320,
    frozenCredits: 5,
    version: 52,
    updatedAt: '2024-06-19T18:00:00.000Z'
  }
]

export const mockCreditRecords: CreditRecord[] = [
  {
    id: 'rec_001',
    poolId: 'pool_001',
    classId: 'class_001',
    studentId: 'stu_001',
    studentName: '李小明',
    type: 'freeze',
    amount: 2,
    balanceBefore: 163,
    balanceAfter: 161,
    relatedBookingId: 'bk_001',
    operator: '系统',
    createdAt: '2024-06-20T09:00:00.000Z'
  },
  {
    id: 'rec_002',
    poolId: 'pool_001',
    classId: 'class_001',
    studentId: 'stu_008',
    studentName: '周小琳',
    type: 'consume',
    amount: 1,
    balanceBefore: 175,
    balanceAfter: 175,
    relatedBookingId: 'bk_002',
    operator: '张老师',
    createdAt: '2024-06-20T10:00:00.000Z'
  },
  {
    id: 'rec_003',
    poolId: 'pool_002',
    classId: 'class_002',
    studentId: 'stu_002',
    studentName: '王小红',
    type: 'freeze',
    amount: 3,
    balanceBefore: 235,
    balanceAfter: 232,
    relatedBookingId: 'bk_003',
    operator: '系统',
    createdAt: '2024-06-19T14:00:00.000Z'
  },
  {
    id: 'rec_004',
    poolId: 'pool_002',
    classId: 'class_002',
    studentId: 'stu_003',
    studentName: '张小强',
    type: 'consume',
    amount: 2,
    balanceBefore: 238,
    balanceAfter: 238,
    relatedBookingId: 'bk_010',
    operator: '李老师',
    createdAt: '2024-06-19T15:30:00.000Z'
  },
  {
    id: 'rec_005',
    poolId: 'pool_001',
    classId: 'class_001',
    studentId: '',
    studentName: '系统充值',
    type: 'recharge',
    amount: 100,
    balanceBefore: 80,
    balanceAfter: 180,
    operator: '管理员',
    remark: '月初充值',
    createdAt: '2024-06-01T08:00:00.000Z'
  },
  {
    id: 'rec_006',
    poolId: 'pool_003',
    classId: 'class_003',
    studentId: 'stu_004',
    studentName: '刘小芳',
    type: 'unfreeze',
    amount: 1,
    balanceBefore: 304,
    balanceAfter: 305,
    relatedBookingId: 'bk_011',
    operator: '王老师',
    remark: '临时有事取消',
    createdAt: '2024-06-18T16:00:00.000Z'
  },
  {
    id: 'rec_007',
    poolId: 'pool_004',
    classId: 'class_004',
    studentId: 'stu_006',
    studentName: '赵小龙',
    type: 'absent_consume',
    amount: 1,
    balanceBefore: 480,
    balanceAfter: 480,
    relatedBookingId: 'bk_006',
    operator: '张老师',
    remark: '无故缺勤，照常扣课',
    createdAt: '2024-06-18T10:30:00.000Z'
  },
  {
    id: 'rec_008',
    poolId: 'pool_003',
    classId: 'class_003',
    studentId: 'stu_005',
    studentName: '陈小伟',
    type: 'leave_unfreeze',
    amount: 1,
    balanceBefore: 310,
    balanceAfter: 311,
    relatedBookingId: 'bk_005',
    operator: '李老师',
    remark: '生病请假',
    createdAt: '2024-06-17T14:00:00.000Z'
  }
]
