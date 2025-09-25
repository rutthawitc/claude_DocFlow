"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Thai month names
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

interface ThaiDatePickerProps {
  id?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ThaiDatePicker({
  id,
  value,
  onChange,
  placeholder = "เลือกวันที่",
  className,
  disabled = false
}: ThaiDatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    if (newDate && onChange) {
      // Format as YYYY-MM-DD for HTML date input compatibility
      const formattedDate = format(newDate, 'yyyy-MM-dd')
      onChange(formattedDate)
    } else if (!newDate && onChange) {
      onChange('')
    }
  }

  const formatDisplayDate = (date: Date) => {
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear() + 543 // Convert to Buddhist Era
    const thaiMonth = THAI_MONTHS_SHORT[month]
    return `${day} ${thaiMonth} ${year}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDisplayDate(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          formatters={{
            formatMonthDropdown: (date) => THAI_MONTHS_SHORT[date.getMonth()],
            formatCaption: (date) => `${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`,
          }}
        />
        <div className="flex items-center justify-between p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateSelect(undefined)}
          >
            ล้าง
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateSelect(new Date())}
          >
            วันนี้
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}