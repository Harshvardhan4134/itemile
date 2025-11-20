import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/firestore";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";

interface BookingCalendarProps {
  bookings: Transaction[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  disabled?: boolean;
}

export default function BookingCalendar({
  bookings,
  onDateSelect,
  selectedDate,
  disabled = false,
}: BookingCalendarProps) {
  // Convert bookings to date ranges for calendar display
  const bookedDates = useMemo(() => {
    const dates: Date[] = [];
    bookings.forEach((booking) => {
      if (!booking.startDate || !booking.endDate) return;
      
      const start = booking.startDate.toDate ? booking.startDate.toDate() : new Date(booking.startDate);
      const end = booking.endDate.toDate ? booking.endDate.toDate() : new Date(booking.endDate);
      
      // Add all dates in the range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    return dates;
  }, [bookings]);

  // Check if a date is booked
  const isDateBooked = (date: Date): boolean => {
    return bookedDates.some(
      (bookedDate) =>
        format(bookedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  // Get booking info for a specific date
  const getBookingForDate = (date: Date): Transaction | undefined => {
    return bookings.find((booking) => {
      if (!booking.startDate || !booking.endDate) return false;
      const start = booking.startDate.toDate ? booking.startDate.toDate() : new Date(booking.startDate);
      const end = booking.endDate.toDate ? booking.endDate.toDate() : new Date(booking.endDate);
      return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
    });
  };

  // Disable booked dates
  const isDateDisabled = (date: Date): boolean => {
    if (disabled) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || isDateBooked(date);
  };

  // Custom date modifier for styling
  const modifiers = {
    booked: bookedDates,
    today: new Date(),
  };

  const modifiersClassNames = {
    booked: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 font-semibold",
    today: "bg-blue-100 dark:bg-blue-900/30",
  };

  // Group bookings by status
  const activeBookings = bookings.filter((b) => b.status === "active");
  const pendingBookings = bookings.filter((b) => b.status === "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Booking Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700" />
            <span>Available</span>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date && !isDateDisabled(date) && onDateSelect) {
              onDateSelect(date);
            }
          }}
          disabled={isDateDisabled}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />

        {/* Booking Summary */}
        {bookings.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Active Bookings</span>
              <Badge variant="default" className="text-xs">{activeBookings.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Pending Bookings</span>
              <Badge variant="secondary" className="text-xs">{pendingBookings.length}</Badge>
            </div>
            {bookedDates.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs mt-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-800 dark:text-yellow-200">
                  {bookedDates.length} day(s) are already booked. Please select available dates.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note about same-day pickup */}
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs sm:text-sm mt-2">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">Same-Day Pickup Available</div>
            <div className="text-[10px] sm:text-xs">
              You can get the item on the booking day with additional charges. Contact the owner for same-day pickup options.
            </div>
          </div>
        </div>

        {/* Booking Details */}
        {bookings.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold">Upcoming Bookings</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookings
                .filter((b) => {
                  if (!b.endDate) return false;
                  const end = b.endDate.toDate ? b.endDate.toDate() : new Date(b.endDate);
                  return end >= new Date();
                })
                .sort((a, b) => {
                  const aStart = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
                  const bStart = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
                  return aStart.getTime() - bStart.getTime();
                })
                .slice(0, 3)
                .map((booking) => {
                  const start = booking.startDate?.toDate ? booking.startDate.toDate() : new Date(booking.startDate || 0);
                  const end = booking.endDate?.toDate ? booking.endDate.toDate() : new Date(booking.endDate || 0);
                  return (
                    <div
                      key={booking.id}
                      className="p-2 bg-muted/50 rounded text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {format(start, "MMM dd")} - {format(end, "MMM dd, yyyy")}
                        </span>
                        <Badge
                          variant={
                            booking.status === "active"
                              ? "default"
                              : booking.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

