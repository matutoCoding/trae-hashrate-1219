import { create } from 'zustand'
import type { Student, RankRecord, ClassInfo, RankLevel } from '@/types/student'
import { mockStudents, mockRankRecords, mockClasses, rankLevels } from '@/data/mockStudent'

interface StudentState {
  students: Student[]
  classes: ClassInfo[]
  rankRecords: RankRecord[]
  currentStudent: Student | null
  loading: boolean
  fetchStudents: () => void
  fetchClasses: () => void
  fetchRankRecords: (studentId?: string) => RankRecord[]
  getStudent: (id: string) => Student | undefined
  addStudent: (data: Partial<Student> & { name: string; classId: string; className: string; phone: string }) => Student
  updateStudent: (id: string, data: Partial<Student>) => Student | undefined
  upgradeRank: (studentId: string, toRank: RankLevel, operator: string, remark?: string) => RankRecord | null
  setCurrentStudent: (student: Student | null) => void
  getRankLevels: () => RankLevel[]
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  classes: [],
  rankRecords: [],
  currentStudent: null,
  loading: false,

  fetchStudents: () => {
    set({ loading: true })
    console.log('[StudentStore] 获取学员列表')
    setTimeout(() => {
      set({ students: mockStudents, loading: false })
      console.log('[StudentStore] 学员列表加载完成，共', mockStudents.length, '人')
    }, 300)
  },

  fetchClasses: () => {
    console.log('[StudentStore] 获取班级列表')
    set({ classes: mockClasses })
  },

  fetchRankRecords: (studentId?: string) => {
    let records = mockRankRecords
    if (studentId) {
      records = records.filter(r => r.studentId === studentId)
    }
    set({ rankRecords: records })
    console.log('[StudentStore] 段位记录加载完成，共', records.length, '条')
    return records
  },

  getStudent: (id: string) => {
    return get().students.find(s => s.id === id)
  },

  addStudent: (data) => {
    const newStudent: Student = {
      id: `stu_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      rank: '无级',
      classId: data.classId,
      className: data.className,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      remark: data.remark
    }
    set(state => ({
      students: [...state.students, newStudent]
    }))
    console.log('[StudentStore] 新增学员:', newStudent.name)
    return newStudent
  },

  updateStudent: (id: string, data: Partial<Student>) => {
    let updated: Student | undefined
    set(state => {
      const index = state.students.findIndex(s => s.id === id)
      if (index === -1) return state
      updated = { ...state.students[index], ...data }
      const newStudents = [...state.students]
      newStudents[index] = updated
      console.log('[StudentStore] 更新学员:', updated.name)
      return { students: newStudents }
    })
    return updated
  },

  upgradeRank: (studentId: string, toRank: RankLevel, operator: string, remark?: string) => {
    const student = get().students.find(s => s.id === studentId)
    if (!student) return null

    const fromRank = student.rank
    const record: RankRecord = {
      id: `rank_${Date.now()}`,
      studentId,
      fromRank,
      toRank,
      upgradeDate: new Date().toISOString().split('T')[0],
      operator,
      remark
    }

    set(state => ({
      rankRecords: [...state.rankRecords, record],
      students: state.students.map(s =>
        s.id === studentId ? { ...s, rank: toRank } : s
      ),
      currentStudent: state.currentStudent?.id === studentId
        ? { ...state.currentStudent, rank: toRank }
        : state.currentStudent
    }))

    console.log('[StudentStore] 段位升级:', {
      学员: student.name,
      原段位: fromRank,
      新段位: toRank
    })

    return record
  },

  setCurrentStudent: (student: Student | null) => {
    set({ currentStudent: student })
  },

  getRankLevels: () => rankLevels
}))
