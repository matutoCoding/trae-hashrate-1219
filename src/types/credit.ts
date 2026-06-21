export interface CreditPool {
  id: string
  classId: string
  className: string
  totalCredits: number
  usedCredits: number
  frozenCredits: number
  version: number
  updatedAt: string
}

export interface CreditRecord {
  id: string
  poolId: string
  classId: string
  studentId: string
  studentName: string
  type: 'deduct' | 'recharge' | 'refund' | 'adjust'
  amount: number
  balanceBefore: number
  balanceAfter: number
  relatedBookingId?: string
  operator: string
  remark?: string
  createdAt: string
}

export interface LockResult {
  success: boolean
  lockId?: string
  message?: string
}

export interface DeductResult {
  success: boolean
  balance?: number
  recordId?: string
  message?: string
}
