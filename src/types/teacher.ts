export interface Teacher {
  id: string
  name: string
  avatar?: string
  phone: string
  level: string
  mainClassIds: string[]
  status: 'active' | 'inactive'
  createdAt: string
}

export type TeacherFormData = Omit<Teacher, 'id' | 'createdAt'>
