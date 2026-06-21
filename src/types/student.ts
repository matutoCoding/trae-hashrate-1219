export type RankLevel =
  | '无级'
  | '10级'
  | '9级'
  | '8级'
  | '7级'
  | '6级'
  | '5级'
  | '4级'
  | '3级'
  | '2级'
  | '1级'
  | '1段'
  | '2段'
  | '3段'
  | '4段'
  | '5段'
  | '6段'
  | '7段'
  | '8段'
  | '9段'

export interface RankRecord {
  id: string
  studentId: string
  studentName: string
  fromRank: RankLevel
  toRank: RankLevel
  recordDate: string
  operator: string
  remark?: string
}

export interface Student {
  id: string
  name: string
  avatar?: string
  phone: string
  rank: RankLevel
  rankUpdatedAt?: string
  classId: string
  className: string
  joinDate: string
  status: 'active' | 'inactive'
  remark?: string
  createdAt?: string
}

export interface ClassInfo {
  id: string
  name: string
  totalCredits: number
  usedCredits: number
  studentCount: number
  description?: string
}

export interface RankUpgradeResult {
  success: boolean
  message?: string
  fromRank?: RankLevel
  toRank?: RankLevel
  record?: RankRecord
}
