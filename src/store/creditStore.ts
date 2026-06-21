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
  freezeCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => { success: boolean; message?: string }
  consumeCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ) => { success: boolean; message?: string }
  unfreezeCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ) => boolean
  refundCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ) => boolean
  absentConsume: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => { success: boolean; message?: string }
  leaveUnfreeze: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => { success: boolean; message?: string }
  rechargeCredits: (
    poolId: string,
    amount: number,
    operator: string,
    remark?: string
  ) => boolean
  deductCredits: (
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ) => { success: boolean; message?: string }
  getPoolRecords: (poolId: string) => CreditRecord[]
  setCurrentPool: (pool: CreditPool | null) => void
}

const _syncState = () => {
  return {
    pools: creditPoolManager.getAllPools(),
    records: creditPoolManager.getAllRecords()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
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
      return
    }
    set({ loading: true })
    setTimeout(() => {
      creditPoolManager.initPools(mockCreditPools)
      set({
        pools: creditPoolManager.getAllPools(),
        loading: false,
        initialized: true
      })
      console.log('[CreditStore] 额度池初始化完成')
    }, 200)
  },

  fetchRecords: (poolId?: string) => {
    const { recordsInitialized } = get()
    let records = creditPoolManager.getAllRecords()

    if (!recordsInitialized && records.length === 0) {
      creditPoolManager.initRecords(mockCreditRecords)
      records = creditPoolManager.getAllRecords()
      set({ recordsInitialized: true })
    }

    if (poolId) {
      records = records.filter(r => r.poolId === poolId)
    }
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    set({ records })
  },

  getPoolByClassId: (classId) => {
    return get().pools.find(p => p.classId === classId)
  },

  getAvailableCredits: (poolId) => {
    return creditPoolManager.getAvailableCredits(poolId)
  },

  freezeCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    const result = creditPoolManager.freezeCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) set(_syncState())
    return result
  },

  consumeCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId, remark) => {
    const result = creditPoolManager.consumeCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId, remark
    )
    if (result.success) set(_syncState())
    return result
  },

  unfreezeCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId, remark) => {
    const result = creditPoolManager.unfreezeCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId, remark
    )
    if (result.success) set(_syncState())
    return result.success
  },

  refundCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId, remark) => {
    const result = creditPoolManager.refundCredits(
      poolId, studentId, studentName, amount, operator, relatedBookingId, remark
    )
    if (result.success) set(_syncState())
    return result.success
  },

  absentConsume: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    const result = creditPoolManager.absentConsume(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) set(_syncState())
    return result
  },

  leaveUnfreeze: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    const result = creditPoolManager.leaveUnfreeze(
      poolId, studentId, studentName, amount, operator, relatedBookingId
    )
    if (result.success) set(_syncState())
    return result
  },

  rechargeCredits: (poolId, amount, operator, remark) => {
    const result = creditPoolManager.rechargeCredits(poolId, amount, operator, remark)
    if (result.success) set(_syncState())
    return result.success
  },

  deductCredits: (poolId, studentId, studentName, amount, operator, relatedBookingId) => {
    return get().freezeCredits(poolId, studentId, studentName, amount, operator, relatedBookingId)
  },

  getPoolRecords: (poolId) => {
    return creditPoolManager.getAllRecords()
      .filter(r => r.poolId === poolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  setCurrentPool: (pool) => {
    set({ currentPool: pool })
  }
}))
