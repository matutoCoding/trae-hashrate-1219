import dayjs from 'dayjs'

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format)
}

export const formatTime = (time: string, format = 'HH:mm'): string => {
  return dayjs(time, 'HH:mm').format(format)
}

export const formatDateTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format)
}

export const generateDateList = (startDate: string, days: number): string[] => {
  const dates: string[] = []
  const start = dayjs(startDate)
  for (let i = 0; i < days; i++) {
    dates.push(start.add(i, 'day').format('YYYY-MM-DD'))
  }
  return dates
}

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  duration: number
): { startTime: string; endTime: string }[] => {
  const slots: { startTime: string; endTime: string }[] = []
  let current = dayjs(startTime, 'HH:mm')
  const end = dayjs(endTime, 'HH:mm')

  while (current.isBefore(end)) {
    const slotEnd = current.add(duration, 'minute')
    if (slotEnd.isAfter(end)) break
    slots.push({
      startTime: current.format('HH:mm'),
      endTime: slotEnd.format('HH:mm')
    })
    current = slotEnd
  }

  return slots
}

export const isTimeAdjacent = (
  endTime1: string,
  startTime2: string
): boolean => {
  return endTime1 === startTime2
}

export const isSameDay = (date1: string, date2: string): boolean => {
  return dayjs(date1).isSame(date2, 'day')
}

export const getWeekday = (date: string): string => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[dayjs(date).day()]
}

export const isToday = (date: string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day')
}

export const addMinutes = (time: string, minutes: number): string => {
  return dayjs(time, 'HH:mm').add(minutes, 'minute').format('HH:mm')
}

export const diffMinutes = (startTime: string, endTime: string): number => {
  return dayjs(endTime, 'HH:mm').diff(dayjs(startTime, 'HH:mm'), 'minute')
}
