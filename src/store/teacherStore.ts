import { create } from 'zustand'
import type { Teacher, TeacherFormData } from '@/types/teacher'
import { mockTeachers } from '@/data/mockTeacher'

interface TeacherState {
  teachers: Teacher[]
  currentTeacher: Teacher | null
  loading: boolean
  initialized: boolean
  fetchTeachers: () => void
  getTeacher: (id: string) => Teacher | undefined
  addTeacher: (data: TeacherFormData) => Teacher
  updateTeacher: (id: string, data: Partial<TeacherFormData>) => Teacher | undefined
  deleteTeacher: (id: string) => boolean
  setCurrentTeacher: (teacher: Teacher | null) => void
  getActiveTeachers: () => Teacher[]
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  teachers: [],
  currentTeacher: null,
  loading: false,
  initialized: false,

  fetchTeachers: () => {
    const { initialized, teachers } = get()
    if (initialized) {
      console.log('[TeacherStore] 已初始化，跳过重置，当前老师数:', teachers.length)
      return
    }
    set({ loading: true })
    console.log('[TeacherStore] 首次加载，初始化 mock 数据')
    setTimeout(() => {
      set({
        teachers: [...mockTeachers],
        loading: false,
        initialized: true
      })
      console.log('[TeacherStore] 初始化完成，共', mockTeachers.length, '位老师')
    }, 200)
  },

  getTeacher: (id: string) => {
    return get().teachers.find(t => t.id === id)
  },

  addTeacher: (data) => {
    const newTeacher: Teacher = {
      ...data,
      id: `tch_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    set(state => ({
      teachers: [...state.teachers, newTeacher],
      initialized: true
    }))
    console.log('[TeacherStore] 新增老师:', newTeacher.name)
    return newTeacher
  },

  updateTeacher: (id, data) => {
    let updated: Teacher | undefined
    set(state => {
      const index = state.teachers.findIndex(t => t.id === id)
      if (index === -1) return state
      updated = { ...state.teachers[index], ...data }
      const newTeachers = [...state.teachers]
      newTeachers[index] = updated
      console.log('[TeacherStore] 更新老师:', updated.name)
      return {
        teachers: newTeachers,
        currentTeacher: state.currentTeacher?.id === id ? updated : state.currentTeacher,
        initialized: true
      }
    })
    return updated
  },

  deleteTeacher: (id) => {
    const teacher = get().teachers.find(t => t.id === id)
    if (!teacher) return false
    set(state => ({
      teachers: state.teachers.filter(t => t.id !== id),
      currentTeacher: state.currentTeacher?.id === id ? null : state.currentTeacher
    }))
    console.log('[TeacherStore] 删除老师:', teacher.name)
    return true
  },

  setCurrentTeacher: (teacher) => {
    set({ currentTeacher: teacher })
  },

  getActiveTeachers: () => {
    return get().teachers.filter(t => t.status === 'active')
  }
}))
