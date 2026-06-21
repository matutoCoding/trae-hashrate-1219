import type { Student, ClassInfo, RankRecord, RankLevel } from '@/types/student'

export const rankLevels: RankLevel[] = [
  '无级', '10级', '9级', '8级', '7级', '6级', '5级',
  '4级', '3级', '2级', '1级', '1段', '2段', '3段',
  '4段', '5段', '6段', '7段', '8段', '9段'
]

export const mockClasses: ClassInfo[] = [
  {
    id: 'class_001',
    name: '入门班',
    totalCredits: 200,
    usedCredits: 45,
    studentCount: 8,
    description: '零基础入门课程'
  },
  {
    id: 'class_002',
    name: '初级班',
    totalCredits: 300,
    usedCredits: 120,
    studentCount: 6,
    description: '10级-5级学员'
  },
  {
    id: 'class_003',
    name: '中级班',
    totalCredits: 500,
    usedCredits: 280,
    studentCount: 5,
    description: '4级-1级学员'
  },
  {
    id: 'class_004',
    name: '高级班',
    totalCredits: 800,
    usedCredits: 350,
    studentCount: 4,
    description: '1段以上学员'
  }
]

export const mockStudents: Student[] = [
  {
    id: 'stu_001',
    name: '李小明',
    phone: '13800138001',
    rank: '10级',
    classId: 'class_001',
    className: '入门班',
    joinDate: '2024-03-01',
    status: 'active'
  },
  {
    id: 'stu_002',
    name: '王小红',
    phone: '13800138002',
    rank: '8级',
    classId: 'class_002',
    className: '初级班',
    joinDate: '2024-01-15',
    status: 'active'
  },
  {
    id: 'stu_003',
    name: '张小强',
    phone: '13800138003',
    rank: '5级',
    classId: 'class_002',
    className: '初级班',
    joinDate: '2023-12-01',
    status: 'active'
  },
  {
    id: 'stu_004',
    name: '刘小芳',
    phone: '13800138004',
    rank: '3级',
    classId: 'class_003',
    className: '中级班',
    joinDate: '2023-09-10',
    status: 'active'
  },
  {
    id: 'stu_005',
    name: '陈小伟',
    phone: '13800138005',
    rank: '1级',
    classId: 'class_003',
    className: '中级班',
    joinDate: '2023-06-20',
    status: 'active'
  },
  {
    id: 'stu_006',
    name: '赵小龙',
    phone: '13800138006',
    rank: '2段',
    classId: 'class_004',
    className: '高级班',
    joinDate: '2022-09-01',
    status: 'active'
  },
  {
    id: 'stu_007',
    name: '孙小美',
    phone: '13800138007',
    rank: '4段',
    classId: 'class_004',
    className: '高级班',
    joinDate: '2022-03-15',
    status: 'active'
  },
  {
    id: 'stu_008',
    name: '周小琳',
    phone: '13800138008',
    rank: '无级',
    classId: 'class_001',
    className: '入门班',
    joinDate: '2024-04-01',
    status: 'inactive'
  }
]

export const mockRankRecords: RankRecord[] = [
  {
    id: 'rank_001',
    studentId: 'stu_001',
    fromRank: '无级',
    toRank: '10级',
    upgradeDate: '2024-04-15',
    operator: '张老师',
    remark: '入门课程结业考核通过'
  },
  {
    id: 'rank_002',
    studentId: 'stu_002',
    fromRank: '10级',
    toRank: '9级',
    upgradeDate: '2024-02-20',
    operator: '李老师'
  },
  {
    id: 'rank_003',
    studentId: 'stu_002',
    fromRank: '9级',
    toRank: '8级',
    upgradeDate: '2024-04-10',
    operator: '李老师',
    remark: '进步明显，计算力提升'
  },
  {
    id: 'rank_004',
    studentId: 'stu_003',
    fromRank: '8级',
    toRank: '7级',
    upgradeDate: '2024-01-25',
    operator: '王老师'
  },
  {
    id: 'rank_005',
    studentId: 'stu_003',
    fromRank: '7级',
    toRank: '6级',
    upgradeDate: '2024-03-15',
    operator: '王老师'
  },
  {
    id: 'rank_006',
    studentId: 'stu_003',
    fromRank: '6级',
    toRank: '5级',
    upgradeDate: '2024-05-08',
    operator: '王老师',
    remark: '定级赛获胜'
  },
  {
    id: 'rank_007',
    studentId: 'stu_006',
    fromRank: '1级',
    toRank: '1段',
    upgradeDate: '2023-11-20',
    operator: '主教练',
    remark: '升段赛成功升段'
  },
  {
    id: 'rank_008',
    studentId: 'stu_006',
    fromRank: '1段',
    toRank: '2段',
    upgradeDate: '2024-04-05',
    operator: '主教练'
  }
]
