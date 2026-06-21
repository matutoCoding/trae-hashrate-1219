import { create } from 'zustand'
import type { Student, RankRecord, RankUpgradeResult } from '@/types/student'
import { mockStudents, mockRankRecords } from '@/data/mockStudent'
import { getNextRank, getRankLevel } from '@/utils/rankSystem'

interface StudentState {
  students: Student[]
  currentStudent: Student | null
  rankRecords: RankRecord[]
  loading: boolean
  initialized: boolean
  rankRecordsInitialized: boolean
  fetchStudents: () => void
  fetchRankRecords: (studentId?: string) => void
  getStudent: (id: string) => Student | undefined
  upgradeRank: (
    studentId: string,
    toRank?: string,
    operator?: string,
    remark?: string
  ) => RankUpgradeResult
  addStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Student
  updateStudent: (id: string, data: Partial<Student>) => Student | undefined
  deleteStudent: (id: string) => boolean
  setCurrentStudent: (student: Student | null) => void
  getStudentRankRecords: (studentId: string) => RankRecord[]
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  currentStudent: null,
  rankRecords: [],
  loading: false,
  initialized: false,
  rankRecordsInitialized: false,

  fetchStudents: () => {
    const { initialized, students } = get()
    if (initialized) {
      console.log('[StudentStore] 已初始化，跳过重置，当前学员数:', students.length)
      return
    }
    set({ loading: true })
    console.log('[StudentStore] 首次加载，初始化学员 mock 数据')
    setTimeout(() => {
      set({
        students: [...mockStudents],
        loading: false,
        initialized: true
      })
      console.log('[StudentStore] 学员数据初始化完成，共', mockStudents.length, '人')
    }, 300)
  },

  fetchRankRecords: (studentId?: string) => {
    const { rankRecordsInitialized } = get()
    let records: RankRecord[]

    if (!rankRecordsInitialized) {
      console.log('[StudentStore] 首次加载段位记录，初始化 mock 数据')
      records = [...mockRankRecords]
      set({ rankRecords: records, rankRecordsInitialized: true })
    } else {
      records = get().rankRecords
    }

    if (studentId) {
      records = records.filter(r => r.studentId === studentId)
    }
    records.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())

    if (studentId) {
      set({ rankRecords: records })
    }
    console.log('[StudentStore] 段位记录加载完成，共', records.length, '条', studentId ? `(学员: ${studentId})` : '')
  },

  getStudent: (id: string) => {
    return get().students.find(s => s.id === id)
  },

  upgradeRank: (studentId, toRank, operator = '系统', remark) => {
    const student = get().students.find(s => s.id === studentId)
    if (!student) {
      return { success: false, message: '学员不存在' }
    }

    const currentLevel = getRankLevel(student.rank)
    const targetRank = toRank || getNextRank(student.rank)

    if (!targetRank) {
      return { success: false, message: '已达到最高段位，无法继续升级' }
    }

    const targetLevel = getRankLevel(targetRank)
    if (targetLevel <= currentLevel) {
      return { success: false, message: '新段位必须高于当前段位' }
    }

    const record: RankRecord = {
      id: `rk_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      fromRank: student.rank,
      toRank: targetRank,
      recordDate: new Date().toISOString(),
      operator,
      remark
    }

    set(state => {
      const students = state.students.map(s =>
        s.id === studentId
          ? { ...s, rank: targetRank, rankUpdatedAt: new Date().toISOString() }
          : s
      )
      const newRankRecords = [...state.rankRecords, record]
      newRankRecords.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
      console.log('[StudentStore] 段位升级:', {
        学员: student.name,
        原段位: student.rank,
        新段位: targetRank,
        备注: remark
      })
      return {
        students,
        rankRecords: newRankRecords,
        currentStudent: state.currentStudent?.id === studentId
          ? { ...state.currentStudent, rank: targetRank, rankUpdatedAt: new Date().toISOString() }
          : state.currentStudent,
        rankRecordsInitialized: true,
        initialized: true
      }
    })

    return {
      success: true,
      fromRank: student.rank,
      toRank: targetRank,
      record
    }
  },

  addStudent: (data) => {
    const newStudent: Student = {
      ...data,
      id: `stu_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    set(state => ({
      students: [...state.students, newStudent],
      initialized: true
    }))
    console.log('[StudentStore] 新增学员:', newStudent.name, '总数:', get().students.length)
    return newStudent
  },

  updateStudent: (id, data) => {
    let updated: Student | undefined
    set(state => {
      const index = state.students.findIndex(s => s.id === id)
      if (index === -1) return state
      updated = { ...state.students[index], ...data }
      const newStudents = [...state.students]
      newStudents[index] = updated
      console.log('[StudentStore] 更新学员:', updated.name)
      return {
        students: newStudents,
        currentStudent: state.currentStudent?.id === id ? updated : state.currentStudent,
        initialized: true
      }
    })
    return updated
  },

  deleteStudent: (id) => {
    const student = get().students.find(s => s.id === id)
    if (!student) return false
    set(state => ({
      students: state.students.filter(s => s.id !== id),
      currentStudent: state.currentStudent?.id === id ? null : state.currentStudent
    }))
    console.log('[StudentStore] 删除学员:', student.name)
    return true
  },

  setCurrentStudent: (student: Student | null) => {
    set({ currentStudent: student })
  },

  getStudentRankRecords: (studentId: string) => {
    return get().rankRecords
      .filter(r => r.studentId === studentId)
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
  }
}))
