import { create } from 'zustand'
import type { Student, RankRecord, RankUpgradeResult, RankLevel } from '@/types/student'
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
  fetchRankRecords: () => void
  getStudent: (id: string) => Student | undefined
  upgradeRank: (
    studentId: string,
    toRank?: RankLevel,
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
    const { initialized } = get()
    if (initialized) return
    set({ loading: true })
    setTimeout(() => {
      set({
        students: [...mockStudents],
        loading: false,
        initialized: true
      })
    }, 300)
  },

  fetchRankRecords: () => {
    const { rankRecordsInitialized } = get()
    if (rankRecordsInitialized) return
    const records = [...mockRankRecords]
    records.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
    set({ rankRecords: records, rankRecordsInitialized: true })
  },

  getStudent: (id) => {
    return get().students.find(s => s.id === id)
  },

  upgradeRank: (studentId, toRank, operator = '系统', remark) => {
    const student = get().students.find(s => s.id === studentId)
    if (!student) {
      return { success: false, message: '学员不存在' }
    }

    const currentLevel = getRankLevel(student.rank)
    const targetRank: RankLevel | null = toRank || getNextRank(student.rank) || null

    if (!targetRank) {
      return { success: false, message: '已达到最高段位，无法继续升级' }
    }

    const targetLevel = getRankLevel(targetRank)
    if (targetLevel <= currentLevel) {
      return { success: false, message: '新段位必须高于当前段位' }
    }

    const now = new Date().toISOString()
    const record: RankRecord = {
      id: `rk_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      fromRank: student.rank,
      toRank: targetRank,
      recordDate: now,
      operator,
      remark
    }

    set(state => {
      const newStudents = state.students.map(s =>
        s.id === studentId
          ? { ...s, rank: targetRank, rankUpdatedAt: now }
          : s
      )
      const newRankRecords = [record, ...state.rankRecords]
      newRankRecords.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
      return {
        students: newStudents,
        rankRecords: newRankRecords,
        currentStudent: state.currentStudent?.id === studentId
          ? { ...state.currentStudent, rank: targetRank, rankUpdatedAt: now }
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
    return true
  },

  setCurrentStudent: (student) => {
    set({ currentStudent: student })
  },

  getStudentRankRecords: (studentId) => {
    return get().rankRecords
      .filter(r => r.studentId === studentId)
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
  }
}))
