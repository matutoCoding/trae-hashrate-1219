import { create } from 'zustand'
import type { CreditPool, CreditRecord } from '@/types/credit'
import { creditPoolManager } from '@/utils/lock'
import { mockCreditPools, mockCreditRecords } from '@/data/mockCredit'

interface CreditState {
  pools: CreditPool[]
  records: CreditRecord[]
  currentPool: CreditPool | null
  loading: boolean
  initialized: boolean
  recordsInitialized: boolean
  fetchPools: () => void
  fetchRecords: (poolId?: string) => void
  getPoolByClassId: (classId: string) => CreditPool | undefined
  getAvailableCredits: (poolId: string) => number
  deductCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => { success: boolean; message?: string }
  refundCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => boolean
  rechargeCredits: (
    poolId: string,
    amount: number,
    operator: string,
    remark?: string
  ) => boolean
  getPoolRecords: (poolId: string) => CreditRecord[]
  setCurrentPool: (pool: CreditPool | null) => void
}

export const useCreditStore = create<CreditState>((set, get) => ({
  pools: [],
  records: [],
  currentPool: null,
  loading: false,
  initialized: false,
  recordsInitialized: false,

  fetchPools: () => {
    const { initialized } = get()
    if (initialized) {
      set({ pools: creditPoolManager.getAllPools() })
      console.log('[CreditStore] 已初始化，更新额度池列表，共', creditPoolManager.getAllPools().length, '个')
      return
    }
    set({ loading: true })
    console.log('[CreditStore] 首次加载，初始化额度池 mock 数据')
    setTimeout(() => {
      creditPoolManager.initPools(mockCreditPools)
      set({
        pools: creditPoolManager.getAllPools(),
        loading: false,
        initialized: true
      })
      console.log('[CreditStore] 额度池初始化完成，共', creditPoolManager.getAllPools().length, '个')
    }, 200)
  },

  fetchRecords: (poolId?: string) => {
    const { recordsInitialized } = get()
    let records = creditPoolManager.getAllRecords()

    if (!recordsInitialized && records.length === 0) {
      console.log('[CreditStore] 首次加载额度明细，初始化 mock 数据')
      creditPoolManager.initRecords(mockCreditRecords)
      records = creditPoolManager.getAllRecords()
      set({ recordsInitialized: true })
    }

    if (poolId) {
      records = records.filter(r => r.poolId === poolId)
    }
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    set({ records })
    console.log('[CreditStore] 额度明细加载完成，共', records.length, '条')
  },

  getPoolByClassId: (classId: string) => {
    return get().pools.find(p => p.classId === classId)
  },

  getAvailableCredits: (poolId: string) => {
    return creditPoolManager.getAvailableCredits(poolId)
  },

  deductCredits: (
    poolId, studentId, studentName, amount, operator, relatedBookingId
  ) => {
    const result = creditPoolManager.deductCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) {
      set({
        pools: creditPoolManager.getAllPools(),
        records: creditPoolManager.getAllRecords()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
      console.log('[CreditStore] 扣减成功:', { 学员: studentName, 额度池: poolId, 数量: amount })
    }
    return result
  },

  refundCredits: (
    poolId, studentId, studentName, amount, operator, relatedBookingId
  ) => {
    const success = creditPoolManager.refundCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (success) {
      set({
        pools: creditPoolManager.getAllPools(),
        records: creditPoolManager.getAllRecords()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
      console.log('[CreditStore] 退还成功:', { 学员: studentName, 额度池: poolId, 数量: amount })
    }
    return success
  },

  rechargeCredits: (poolId, amount, operator, remark) => {
    const success = creditPoolManager.rechargeCredits(poolId, amount, operator, remark)
    if (success) {
      set({
        pools: creditPoolManager.getAllPools(),
        records: creditPoolManager.getAllRecords()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
      console.log('[CreditStore] 充值成功:', { 额度池: poolId, 数量: amount })
    }
    return success
  },

  getPoolRecords: (poolId: string) => {
    return creditPoolManager.getAllRecords()
      .filter(r => r.poolId === poolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  setCurrentPool: (pool: CreditPool | null) => {
    set({ currentPool: pool })
  }
}))
