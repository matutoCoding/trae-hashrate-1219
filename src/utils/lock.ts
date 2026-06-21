import type { LockResult, DeductResult, CreditPool, CreditRecord, CreditRecordType } from '@/types/credit'

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

  private _pushRecord(
    pool: CreditPool,
    type: CreditRecordType,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    studentId: string,
    studentName: string,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ): CreditRecord {
    const record: CreditRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      poolId: pool.id,
      classId: pool.classId,
      studentId,
      studentName,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      relatedBookingId,
      operator,
      remark,
      createdAt: new Date().toISOString()
    }
    this.records.push(record)
    return record
  }

  freezeCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `freeze_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }
    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      if (balanceBefore < amount) {
        console.log('[CreditPool] 冻结失败，额度不足:', { poolId, balanceBefore, amount })
        return { success: false, message: `剩余额度不足，当前可用${balanceBefore}课时` }
      }
      pool.frozenCredits += amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'freeze', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId
      )
      console.log('[CreditPool] 冻结成功:', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  consumeCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `consume_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }
    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      if (pool.frozenCredits < amount) {
        console.warn('[CreditPool] 消课时冻结额度不足，按实际冻结扣减')
        amount = pool.frozenCredits
      }
      pool.frozenCredits -= amount
      pool.usedCredits += amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'consume', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId, remark
      )
      console.log('[CreditPool] 签到消课:', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  unfreezeCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string,
    remark?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `unfreeze_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }
    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }
      if (pool.frozenCredits < amount) {
        console.warn('[CreditPool] 解冻额度超过冻结额度，按实际冻结解冻')
        amount = pool.frozenCredits
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      pool.frozenCredits -= amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'unfreeze', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId, remark
      )
      console.log('[CreditPool] 解冻:', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
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
    relatedBookingId?: string,
    remark?: string
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
      if (pool.usedCredits < amount) {
        console.warn('[CreditPool] 退还额度超过已用额度，按实际已用退还')
        amount = pool.usedCredits
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      pool.usedCredits -= amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'refund', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId, remark
      )
      console.log('[CreditPool] 退还(已用):', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  absentConsume(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `absent_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }
    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }
      if (pool.frozenCredits < amount) {
        amount = pool.frozenCredits
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      pool.frozenCredits -= amount
      pool.usedCredits += amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'absent_consume', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId
      )
      console.log('[CreditPool] 缺勤扣课:', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  leaveUnfreeze(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    const lockResult = lockManager.acquire(poolId, `leave_${studentId}`)
    if (!lockResult.success || !lockResult.lockId) {
      return { success: false, message: lockResult.message || '系统繁忙，请稍后重试' }
    }
    try {
      const pool = this.pools.get(poolId)
      if (!pool) {
        return { success: false, message: '额度池不存在' }
      }
      if (pool.frozenCredits < amount) {
        amount = pool.frozenCredits
      }
      const balanceBefore = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      pool.frozenCredits -= amount
      pool.version += 1
      pool.updatedAt = new Date().toISOString()
      const balanceAfter = pool.totalCredits - pool.usedCredits - pool.frozenCredits
      const record = this._pushRecord(
        pool, 'leave_unfreeze', amount, balanceBefore, balanceAfter,
        studentId, studentName, operator, relatedBookingId
      )
      console.log('[CreditPool] 请假解冻:', { studentName, amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
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
      const record = this._pushRecord(
        pool, 'recharge', amount, balanceBefore, balanceAfter,
        '', '系统充值', operator, undefined, remark
      )
      console.log('[CreditPool] 充值:', { amount, 余额: balanceAfter })
      return { success: true, balance: balanceAfter, recordId: record.id }
    } finally {
      lockManager.release(poolId, lockResult.lockId)
    }
  }

  deductCredits(
    poolId: string,
    studentId: string,
    studentName: string,
    amount: number,
    operator: string,
    relatedBookingId?: string
  ): DeductResult {
    return this.freezeCredits(poolId, studentId, studentName, amount, operator, relatedBookingId)
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
