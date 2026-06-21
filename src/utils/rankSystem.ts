import type { RankLevel } from '@/types/student'

const RANK_ORDER: RankLevel[] = [
  '无级', '10级', '9级', '8级', '7级', '6级', '5级',
  '4级', '3级', '2级', '1级', '1段', '2段', '3段',
  '4段', '5段', '6段', '7段', '8段', '9段'
]

export const getRankLevel = (rank: RankLevel): number => {
  const idx = RANK_ORDER.indexOf(rank)
  return idx >= 0 ? idx : 0
}

export const getNextRank = (currentRank: RankLevel): RankLevel | null => {
  const idx = RANK_ORDER.indexOf(currentRank)
  if (idx < 0 || idx >= RANK_ORDER.length - 1) return null
  return RANK_ORDER[idx + 1]
}

export const rankLevels = RANK_ORDER
