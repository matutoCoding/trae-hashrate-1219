import { create } from 'zustand'
import type { CreditPool, CreditRecord, DeductResult } from '@/types/credit'
import { mockCreditPools, mockCreditRecords } from '@/data/mockCredit'
import { creditPoolManager } from '@/utils/lock'

interface CreditState {
  pools: CreditPool[]
  records: CreditRecord[]
  loading: boolean
  fetchPools: () => void
  fetchRecords: (poolId?: string, studentId?: string) => void
  getPool: (poolId: string) => CreditPool | undefined
  getPoolByClassId: (classId: string) => CreditPool | undefined
  getAvailableCredits: (poolId: string) => number
  deductCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => DeductResult
  refundCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => DeductResult
  rechargeCredits: (
    poolId: string,
    amount: number,
    operator: string,
    remark?: string
  ) => DeductResult
}

export const useCreditStore = create<CreditState>((set, get) => ({
  pools: [],
  records: [],
  loading: false,

  fetchPools: () => {
    set({ loading: true })
    console.log('[CreditStore] 获取额度池列表')
    setTimeout(() => {
      creditPoolManager.initPools(mockCreditPools)
      set({
        pools: creditPoolManager.getAllPools(),
        loading: false
      })
      console.log('[CreditStore] 额度池加载完成，共', mockCreditPools.length, '个')
    }, 200)
  },

  fetchRecords: (poolId?: string, studentId?: string) => {
    const records = creditPoolManager.getRecords(poolId, studentId)
    if (records.length === 0) {
      set({ records: mockCreditRecords.filter(r =>
        (!poolId || r.poolId === poolId) &&
        (!studentId || r.studentId === studentId)
      )})
    } else {
      set({ records })
    }
  },

  getPool: (poolId: string) => {
    return creditPoolManager.getPool(poolId)
  },

  getPoolByClassId: (classId: string) => {
    return get().pools.find(p => p.classId === classId)
  },

  getAvailableCredits: (poolId: string) => {
    return creditPoolManager.getAvailableCredits(poolId)
  },

  deductCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    const result = creditPoolManager.deductCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) {
      set({ pools: creditPoolManager.getAllPools() })
      console.log('[CreditStore] 扣减额度成功，余额:', result.balance)
    } else {
      console.warn('[CreditStore] 扣减额度失败:', result.message)
    }
    return result
  },

  refundCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    const result = creditPoolManager.refundCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) {
      set({ pools: creditPoolManager.getAllPools() })
      console.log('[CreditStore] 退还额度成功，余额:', result.balance)
    } else {
      console.warn('[CreditStore] 退还额度失败:', result.message)
    }
    return result
  },

  rechargeCredits: (poolId, amount, operator, remark) => {
    const result = creditPoolManager.rechargeCredits(poolId, amount, operator, remark)
    if (result.success) {
      set({ pools: creditPoolManager.getAllPools() })
      console.log('[CreditStore] 充值成功，余额:', result.balance)
    } else {
      console.warn('[CreditStore] 充值失败:', result.message)
    }
    return result
  }
}))
