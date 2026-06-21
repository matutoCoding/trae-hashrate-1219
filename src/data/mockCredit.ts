import type { CreditPool, CreditRecord } from '@/types/credit'

export const mockCreditPools: CreditPool[] = [
  {
    id: 'pool_001',
    classId: 'class_001',
    className: '入门班',
    totalCredits: 200,
    usedCredits: 45,
    frozenCredits: 0,
    version: 12,
    updatedAt: '2024-06-20T10:30:00.000Z'
  },
  {
    id: 'pool_002',
    classId: 'class_002',
    className: '初级班',
    totalCredits: 300,
    usedCredits: 120,
    frozenCredits: 5,
    version: 28,
    updatedAt: '2024-06-20T14:20:00.000Z'
  },
  {
    id: 'pool_003',
    classId: 'class_003',
    className: '中级班',
    totalCredits: 500,
    usedCredits: 280,
    frozenCredits: 10,
    version: 45,
    updatedAt: '2024-06-20T16:45:00.000Z'
  },
  {
    id: 'pool_004',
    classId: 'class_004',
    className: '高级班',
    totalCredits: 800,
    usedCredits: 350,
    frozenCredits: 0,
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
    type: 'deduct',
    amount: 2,
    balanceBefore: 160,
    balanceAfter: 158,
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
    type: 'deduct',
    amount: 1,
    balanceBefore: 158,
    balanceAfter: 157,
    relatedBookingId: 'bk_002',
    operator: '系统',
    createdAt: '2024-06-20T10:00:00.000Z'
  },
  {
    id: 'rec_003',
    poolId: 'pool_002',
    classId: 'class_002',
    studentId: 'stu_002',
    studentName: '王小红',
    type: 'deduct',
    amount: 3,
    balanceBefore: 183,
    balanceAfter: 180,
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
    type: 'deduct',
    amount: 2,
    balanceBefore: 180,
    balanceAfter: 178,
    relatedBookingId: 'bk_004',
    operator: '系统',
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
    balanceBefore: 100,
    balanceAfter: 200,
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
    type: 'refund',
    amount: 1,
    balanceBefore: 218,
    balanceAfter: 219,
    relatedBookingId: 'bk_005',
    operator: '张老师',
    remark: '临时有事取消',
    createdAt: '2024-06-18T16:00:00.000Z'
  }
]
