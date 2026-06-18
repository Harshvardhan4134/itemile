import { useState, useMemo, useEffect } from "react";
import { addDays, addMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Minus, Plus, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { US_MARKET } from "@/lib/constants";

interface TenureSelectorProps {
  listing: Listing;
  onBookingDataChange?: (data: BookingData) => void;
  disabled?: boolean;
}

export interface BookingData {
  durationType: 'days' | 'months';
  startDate: Date | null;
  endDate: Date | null;
  units: number; // days or months
  rentPerUnit: number;
  totalRent: number;
  deposit: number;
  serviceFee: number;
  payableNow: number;
  requiresDeposit: boolean;
  requiresSecurePay: boolean;
}

// Calculate deposit: 10% of item value, minimum $25 (items $5,000+)
function calcDeposit(itemValue: number): number {
  if (itemValue < US_MARKET.highValueItemUsd) return 0;
  return Math.max(
    Math.ceil(itemValue * US_MARKET.depositRate),
    US_MARKET.minDepositUsd
  );
}

// Calculate service fee: 5% of total rent
function calcServiceFee(totalRent: number): number {
  return Math.ceil(totalRent * US_MARKET.serviceFeeRate);
}

export default function TenureSelector({ listing, onBookingDataChange, disabled = false }: TenureSelectorProps) {
  const [durationType, setDurationType] = useState<'days' | 'months'>('days');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [units, setUnits] = useState<number>(1);

  // Get pricing - support both rentPerDay and rentPerMonth
  const rentPerUnit = useMemo(() => {
    if (durationType === 'days') {
      return listing.rentPerDay || 0;
    } else {
      // If listing has rentPerMonth, use it; otherwise calculate from rentPerDay
      const rentPerMonth = (listing as any).price?.rentPerMonth;
      if (rentPerMonth) {
        return rentPerMonth;
      }
      // Fallback: calculate monthly from daily (×30)
      return (listing.rentPerDay || 0) * 30;
    }
  }, [durationType, listing]);

  // Get item value for deposit calculation
  const itemValue = (listing as any).price?.itemValue || 0;

  // Calculate end date based on start date and duration
  const endDate = useMemo(() => {
    if (!startDate) return null;
    try {
      if (durationType === 'days') {
        return addDays(startDate, units);
      } else {
        return addMonths(startDate, units);
      }
    } catch (error) {
      console.error('Error calculating end date:', error);
      return null;
    }
  }, [startDate, units, durationType]);

  // Calculate pricing breakdown
  const totalRent = rentPerUnit * units;
  const deposit = calcDeposit(itemValue);
  const serviceFee = calcServiceFee(totalRent);
  const requiresDeposit = itemValue >= 5000;
  const requiresSecurePay = requiresDeposit; // SecurePay required if deposit is mandatory
  const payableNow = totalRent + deposit + serviceFee;

  // Create booking data object
  const bookingData: BookingData = useMemo(() => ({
    durationType,
    startDate,
    endDate,
    units,
    rentPerUnit,
    totalRent,
    deposit,
    serviceFee,
    payableNow,
    requiresDeposit,
    requiresSecurePay,
  }), [durationType, startDate, endDate, units, rentPerUnit, totalRent, deposit, serviceFee, payableNow, requiresDeposit, requiresSecurePay]);

  // Notify parent component of changes (use useEffect for side effects, not useMemo)
  useEffect(() => {
    if (onBookingDataChange) {
      onBookingDataChange(bookingData);
    }
  }, [bookingData, onBookingDataChange]);

  const handleUnitsChange = (delta: number) => {
    setUnits(prev => Math.max(1, prev + delta));
  };

  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Duration Type Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={durationType === 'days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setDurationType('days');
              setUnits(1);
            }}
            disabled={disabled}
            className="flex-1 text-xs sm:text-sm"
          >
            Days
          </Button>
          <Button
            type="button"
            variant={durationType === 'months' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setDurationType('months');
              setUnits(1);
            }}
            disabled={disabled}
            className="flex-1 text-xs sm:text-sm"
          >
            Months
          </Button>
        </div>

        {/* Start Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-xs sm:text-sm">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal text-xs sm:text-sm",
                  !startDate && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => setStartDate(date || null)}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Duration Stepper */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">{durationType === 'days' ? 'Number of Days' : 'Number of Months'}</Label>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUnitsChange(-1)}
              disabled={disabled || units <= 1}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <div className="flex-1 text-center">
              <Input
                type="number"
                min="1"
                value={units}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setUnits(Math.max(1, val));
                }}
                disabled={disabled}
                className="text-center text-base sm:text-lg font-semibold"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUnitsChange(1)}
              disabled={disabled}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* End Date Display */}
        {endDate && (
          <div className="p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="text-xs sm:text-sm text-muted-foreground">End Date</div>
            <div className="text-sm sm:text-base font-semibold">{format(endDate, "PPP")}</div>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Rent per {durationType === 'days' ? 'day' : 'month'}
            </span>
            <span className="font-medium">{formatCurrency(rentPerUnit)}</span>
          </div>
          
          {durationType === 'months' && !(listing as any).price?.rentPerMonth && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
              <span>
                Monthly rate calculated from daily rate (×30). Ask owner to set monthly rate for discounts.
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Total Rent</span>
            <span className="font-medium">{formatCurrency(totalRent)}</span>
          </div>

          {deposit > 0 && (
            <div className="flex justify-between text-xs sm:text-sm flex-wrap gap-1">
              <span className="text-muted-foreground flex items-center gap-1">
                Deposit {requiresDeposit && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">Required</Badge>}
              </span>
              <span className="font-medium">{formatCurrency(deposit)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="font-medium">{formatCurrency(serviceFee)}</span>
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm sm:text-base font-semibold">
              <span>Payable Now</span>
              <span>{formatCurrency(payableNow)}</span>
            </div>
          </div>

          {requiresSecurePay && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] sm:text-xs text-blue-800 dark:text-blue-200 mt-2">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
              <span>
                SecurePay required for items valued {formatCurrency(US_MARKET.highValueItemUsd)} or more to enable platform liability and insurance.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

