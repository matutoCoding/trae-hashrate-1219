import { create } from 'zustand'
import type { Classroom, ClassroomFormData } from '@/types/classroom'
import { mockClassrooms } from '@/data/mockClassroom'

interface ClassroomState {
  classrooms: Classroom[]
  currentClassroom: Classroom | null
  loading: boolean
  fetchClassrooms: () => void
  getClassroom: (id: string) => Classroom | undefined
  addClassroom: (data: ClassroomFormData) => Classroom
  updateClassroom: (id: string, data: Partial<ClassroomFormData>) => Classroom | undefined
  deleteClassroom: (id: string) => boolean
  setCurrentClassroom: (classroom: Classroom | null) => void
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  classrooms: [],
  currentClassroom: null,
  loading: false,

  fetchClassrooms: () => {
    set({ loading: true })
    console.log('[ClassroomStore] 获取教室列表')
    setTimeout(() => {
      set({ classrooms: mockClassrooms, loading: false })
      console.log('[ClassroomStore] 教室列表加载完成，共', mockClassrooms.length, '个')
    }, 300)
  },

  getClassroom: (id: string) => {
    return get().classrooms.find(c => c.id === id)
  },

  addClassroom: (data: ClassroomFormData) => {
    const newClassroom: Classroom = {
      ...data,
      id: `cls_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    set(state => ({
      classrooms: [...state.classrooms, newClassroom]
    }))
    console.log('[ClassroomStore] 新增教室:', newClassroom.name)
    return newClassroom
  },

  updateClassroom: (id: string, data: Partial<ClassroomFormData>) => {
    let updated: Classroom | undefined
    set(state => {
      const index = state.classrooms.findIndex(c => c.id === id)
      if (index === -1) return state
      updated = { ...state.classrooms[index], ...data }
      const newClassrooms = [...state.classrooms]
      newClassrooms[index] = updated
      console.log('[ClassroomStore] 更新教室:', updated.name)
      return { classrooms: newClassrooms }
    })
    return updated
  },

  deleteClassroom: (id: string) => {
    const classroom = get().classrooms.find(c => c.id === id)
    if (!classroom) return false
    set(state => ({
      classrooms: state.classrooms.filter(c => c.id !== id)
    }))
    console.log('[ClassroomStore] 删除教室:', classroom.name)
    return true
  },

  setCurrentClassroom: (classroom: Classroom | null) => {
    set({ currentClassroom: classroom })
  }
}))
