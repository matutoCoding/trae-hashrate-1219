import React from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'
import { formatDate, getWeekday, isToday } from '@/utils/date'

interface CalendarProps {
  currentDate: string
  selectedDate: string
  onDateSelect: (date: string) => void
  days?: number
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  selectedDate,
  onDateSelect,
  days = 7
}) => {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + i)
    return formatDate(d)
  })

  return (
    <View className={styles.calendar}>
      <ScrollView scrollX className={styles.dateScroll}>
        <View className={styles.dateList}>
          {dates.map(date => {
            const selected = date === selectedDate
            const today = isToday(date)
            return (
              <View
                key={date}
                className={classnames(
                  styles.dateItem,
                  selected && styles.selected,
                  today && styles.today
                )}
                onClick={() => onDateSelect(date)}
              >
                <Text className={styles.weekday}>
                  {getWeekday(date)}
                </Text>
                <Text className={styles.dayNum}>
                  {new Date(date).getDate()}
                </Text>
                {today && (
                  <View className={styles.todayDot} />
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

export default Calendar
