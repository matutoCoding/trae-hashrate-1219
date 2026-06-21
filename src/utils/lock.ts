import type { LockResult, DeductResult, CreditPool, CreditRecord } from '@/types/credit'

class ConcurrentLock {
  private locks: Map<string, { lockId: string; timestamp: number; holder: string }> = new Map()
  private lockTimeout: number = 30000

  acquire(resourceId: string, holder: string): LockResult {
    const existing = this.locks.get(resourceId)
    const now = Date.now()

    if (existing) {
      if (now - existing.timestamp < this.lockTimeout) {
        console.log('[Lock] 获取锁失败，资源已被锁定:', { resourceId, holder, lockedBy: existing.holder })
        return { success: false, message: '资源已被锁定，请稍后重试' }
      }
      console.log('[Lock] 锁已超时，自动释放:', { resourceId, oldHolder: existing.holder })
    }

    const lockId = `lock_${resourceId}_${now}_${Math.random().toString(36).slice(2, 8)}`
    this.locks.set(resourceId, { lockId, timestamp: now, holder })

    console.log('[Lock] 获取锁成功:', { resourceId, holder, lockId })
    return { success: true, lockId }
  }

  release(resourceId: string, lockId: string): boolean {
    const existing = this.locks.get(resourceId)
    if (!existing || existing.lockId !== lockId) {
      console.log('[Lock] 释放锁失败：锁不匹配:', { resourceId, lockId })
      return false
    }

    this.locks.delete(resourceId)
    console.log('[Lock] 释放锁成功:', { resourceId, lockId })
    return true
  }

  isLocked(resourceId: string): boolean {
    const existing = this.locks.get(resourceId)
    if (!existing) return false
    if (Date.now() - existing.timestamp >= this.lockTimeout) {
      this.locks.delete(resourceId)
      return false
    }
    return true
  }

  cleanupExpired(): number {
    const now = Date.now()
    let count = 0
    for (const [key, value] of this.locks.entries()) {
      if (now - value.timestamp >= this.lockTimeout) {
        this.locks.delete(key)
        count++
      }
    }
    if (count > 0) {
      console.log('[Lock] 清理过期锁:', count, '个')
    }
    return count
  }
}

export const lockManager = new ConcurrentLock()

export class CreditPoolManager {
  private pools: Map<string, CreditPool> = new Map()
  private records: CreditRecord[] = []

  initPools(pools: CreditPool[]): void {
    pools.forEach(pool => {
      this.pools.set(pool.id, { ...pool })
    })
    console.log('[CreditPool] 初始化额度池:', pools.length, '个')
  }

  initRecords(records: CreditRecord[]): void {
    this.records = [...records]
    console.log('[CreditPool] 初始化额度明细:', records.length, '条')
  }

  getAllRecords(): CreditRecord[] {
    return [...this.records]
  }

  getPool(poolId: string): CreditPool | undefined {
    return this.pools.get(poolId)
  }

  getAllPools(): CreditPool[] {
    return Array.from(this.pools.values())
  }

  getAvailableCredits(poolId: string): number {
    const pool = this.pools.get(poolId)
    if (!pool) return 0
    return pool.totalCredits - pool.usedCredits - pool.frozenCredits
  }

  deductCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `deduct_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }

    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }

      const available = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      if (available < amount) {
        console.log('[CreditPool] 额度不足:', {
          poolId,
          available,
          requested: amount
        })
        return { success: false, message: `剩余额度不足，当前可用${available}课时` }
      }

      const balanceBefore = available
      pool.usedCredits += amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits

      const record: CreditRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poolId,
        classId: pool.classId,
        studentId,
        studentName,
        type: 'deduct',
        amount,
        balanceBefore,
        balanceAfter,
        relatedBookingId,
        operator,
        createdAt: new Date().toISOString()
      }
      this.records.push(record)

      console.log('[CreditPool] 扣减成功:', {
        poolId,
        studentName,
        amount,
        扣减前余额: balanceBefore,
        扣减后余额: balanceAfter,
        version: pool.version
      })

      return {
        success: true,
        balance: balanceAfter,
        recordId: record.id
      }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  refundCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `refund_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }

    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }

      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits

      if (pool.usedCredits < amount) {
        console.warn('[CreditPool] 退还额度超过已用额度，按实际已用退还')
        amount = pool.usedCredits
      }

      pool.usedCredits -= amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits

      const record: CreditRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poolId,
        classId: pool.classId,
        studentId,
        studentName,
        type: 'refund',
        amount,
        balanceBefore,
        balanceAfter,
        relatedBookingId,
        operator,
        createdAt: new Date().toISOString()
      }
      this.records.push(record)

      console.log('[CreditPool] 退还成功:', {
        poolId,
        studentName,
        amount,
        退还前余额: balanceBefore,
        退还后余额: balanceAfter,
        version: pool.version
      })

      return {
        success: true,
        balance: balanceAfter,
        recordId: record.id
      }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  rechargeCredits(
    poolId: string,
    amount: number,
    operator: string,
    remark?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, 'recharge')
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }

    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }

      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      pool.totalCredits += amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits

      const record: CreditRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poolId,
        classId: pool.classId,
        studentId: '',
        studentName: '系统充值',
        type: 'recharge',
        amount,
        balanceBefore,
        balanceAfter,
        operator,
        remark,
        createdAt: new Date().toISOString()
      }
      this.records.push(record)

      console.log('[CreditPool] 充值成功:', {
        poolId,
        amount,
        充值前余额: balanceBefore,
        充值后余额: balanceAfter,
        version: pool.version
      })

      return {
        success: true,
        balance: balanceAfter,
        recordId: record.id
      }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  getRecords(poolId?: string, studentId?: string): CreditRecord[] {
    let records = [...this.records]
    if (poolId) {
      records = records.filter(r => r.poolId === poolId)
    }
    if (studentId) {
      records = records.filter(r => r.studentId === studentId)
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export const creditPoolManager = new CreditPoolManager()
