import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCalendar from "@/components/BookingCalendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  getTransactionsByParticipant,
  Transaction,
  updateTransaction,
  getUser,
  getListing,
  User as UserType,
  Listing,
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sendEmailNotification } from "@/lib/firestore";

export default function OwnerBookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Transaction | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [renterInfo, setRenterInfo] = useState<Record<string, UserType>>({});
  const [listingInfo, setListingInfo] = useState<Record<string, Listing>>({});

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    fetchBookings();
  }, [navigate]);

  const fetchBookings = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      // Get all transactions where user is owner
      const allTransactions = await getTransactionsByParticipant(auth.currentUser.uid);
      
      // Filter to only bookings where user is the owner
      const ownerBookings = allTransactions.filter(
        (t) => t.ownerId === auth.currentUser?.uid && t.type === "rent"
      );

      setBookings(ownerBookings);

      // Fetch renter and listing info
      const renterIds = [...new Set(ownerBookings.map((b) => b.renterId))];
      const listingIds = [...new Set(ownerBookings.map((b) => b.listingId).filter(Boolean))];

      const [renters, listings] = await Promise.all([
        Promise.all(renterIds.map((id) => getUser(id))),
        Promise.all(listingIds.map((id) => id && getListing(id))),
      ]);

      const renterMap: Record<string, UserType> = {};
      renters.forEach((renter) => {
        if (renter) renterMap[renter.uid] = renter;
      });

      const listingMap: Record<string, Listing> = {};
      listings.forEach((listing) => {
        if (listing) listingMap[listing.id] = listing;
      });

      setRenterInfo(renterMap);
      setListingInfo(listingMap);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setCancelling(true);
    try {
      // Calculate refund amount (full refund for cancelled bookings)
      const refundAmount = (selectedBooking.totalRent || selectedBooking.amount || 0) + (selectedBooking.deposit || 0);
      
      // Update booking status to cancelled
      await updateTransaction(selectedBooking.id, {
        status: "cancelled",
        cancelledAt: new Date(),
        refundAmount: refundAmount,
        refundStatus: "pending", // Refund will be processed
      });

      // Send email notification to renter
      const renter = renterInfo[selectedBooking.renterId];
      if (renter?.email) {
        try {
          await sendEmailNotification({
            email: renter.email,
            subject: "Booking Cancelled - Refund Initiated - Rent Share",
            message: `Hi ${renter.name},\n\nYour booking has been cancelled by the owner.\n\nListing: ${selectedBooking.listingTitle}\nCancelled Date: ${format(new Date(), 'MMM dd, yyyy')}\n\nRefund Details:\nTotal Rent: ₹${selectedBooking.totalRent || selectedBooking.amount || 0}\nDeposit: ₹${selectedBooking.deposit || 0}\nTotal Refund: ₹${refundAmount}\n\nYour refund will be processed within 5-7 business days.\n\nView Details: ${window.location.origin}/transactions\n\nIf you have any questions, please contact us.\n\nBest regards,\nRent Share Team`,
            type: 'rental_request',
            read: false,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error('Error sending cancellation email:', error);
        }
      }

      toast({
        title: "Booking Cancelled",
        description: `The booking has been cancelled. Refund of ₹${refundAmount} will be processed.`,
      });

      setShowCancelDialog(false);
      setSelectedBooking(null);
      fetchBookings(); // Refresh bookings
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleApproveBooking = async (booking: Transaction) => {
    try {
      await updateTransaction(booking.id, {
        status: "active",
      });

      // Send email notification to renter
      const renter = renterInfo[booking.renterId];
      if (renter?.email) {
        try {
          const startDate = booking.startDate?.toDate ? booking.startDate.toDate() : new Date(booking.startDate || 0);
          const endDate = booking.endDate?.toDate ? booking.endDate.toDate() : new Date(booking.endDate || 0);
          
          await sendEmailNotification({
            email: renter.email,
            subject: "Booking Approved! ✅ - Rent Share",
            message: `Hi ${renter.name},\n\nGreat news! Your booking has been approved by the owner.\n\nListing: ${booking.listingTitle}\nDuration: ${booking.days || booking.months || 'N/A'} ${booking.durationType || 'days'}\nStart Date: ${format(startDate, 'MMM dd, yyyy')}\nEnd Date: ${format(endDate, 'MMM dd, yyyy')}\nTotal Amount: ₹${booking.totalRent || booking.amount || 0}\n\nYou can now coordinate with the owner for pickup.\n\nView Booking: ${window.location.origin}/transactions\n\nBest regards,\nRent Share Team`,
            type: 'rental_request',
            read: false,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error('Error sending approval email:', error);
        }
      }

      toast({
        title: "Booking Approved",
        description: "The booking has been approved. Renter has been notified.",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error approving booking:", error);
      toast({
        title: "Error",
        description: "Failed to approve booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const activeBookings = bookings.filter((b) => b.status === "active");
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  // Group bookings by listing for calendar view
  const bookingsByListing: Record<string, Transaction[]> = {};
  bookings.forEach((booking) => {
    if (booking.listingId) {
      if (!bookingsByListing[booking.listingId]) {
        bookingsByListing[booking.listingId] = [];
      }
      bookingsByListing[booking.listingId].push(booking);
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading bookings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Manage Bookings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage all bookings for your listings
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-3 sm:space-y-4">
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({bookings.length})</TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">Active ({activeBookings.length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending ({pendingBookings.length})</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed ({completedBookings.length})</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled ({cancelledBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  renter={renterInfo[booking.renterId]}
                  listing={listingInfo[booking.listingId || ""]}
                  onCancel={() => {
                    setSelectedBooking(booking);
                    setShowCancelDialog(true);
                  }}
                  onApprove={() => handleApproveBooking(booking)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {activeBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  renter={renterInfo[booking.renterId]}
                  listing={listingInfo[booking.listingId || ""]}
                  onCancel={() => {
                    setSelectedBooking(booking);
                    setShowCancelDialog(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {pendingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  renter={renterInfo[booking.renterId]}
                  listing={listingInfo[booking.listingId || ""]}
                  onCancel={() => {
                    setSelectedBooking(booking);
                    setShowCancelDialog(true);
                  }}
                  onApprove={() => handleApproveBooking(booking)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {completedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  renter={renterInfo[booking.renterId]}
                  listing={listingInfo[booking.listingId || ""]}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {cancelledBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  renter={renterInfo[booking.renterId]}
                  listing={listingInfo[booking.listingId || ""]}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Calendar View */}
        {Object.keys(bookingsByListing).length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Booking Calendar</h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              {Object.entries(bookingsByListing).map(([listingId, listingBookings]) => (
                <BookingCalendar
                  key={listingId}
                  bookings={listingBookings}
                  disabled={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Cancel Booking</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-xs sm:text-sm">
              <div>
                <strong>Listing:</strong> {selectedBooking.listingTitle}
              </div>
              <div>
                <strong>Renter:</strong> {renterInfo[selectedBooking.renterId]?.name || "Unknown"}
              </div>
              {selectedBooking.startDate && selectedBooking.endDate && (
                <div>
                  <strong>Dates:</strong>{" "}
                  {format(
                    selectedBooking.startDate.toDate
                      ? selectedBooking.startDate.toDate()
                      : new Date(selectedBooking.startDate),
                    "MMM dd, yyyy"
                  )}{" "}
                  -{" "}
                  {format(
                    selectedBooking.endDate.toDate
                      ? selectedBooking.endDate.toDate()
                      : new Date(selectedBooking.endDate),
                    "MMM dd, yyyy"
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingCard({
  booking,
  renter,
  listing,
  onCancel,
  onApprove,
}: {
  booking: Transaction;
  renter?: UserType;
  listing?: Listing;
  onCancel?: () => void;
  onApprove?: () => void;
}) {
  const startDate = booking.startDate?.toDate
    ? booking.startDate.toDate()
    : new Date(booking.startDate || 0);
  const endDate = booking.endDate?.toDate
    ? booking.endDate.toDate()
    : new Date(booking.endDate || 0);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base sm:text-lg leading-tight">{booking.listingTitle || "Unknown Listing"}</CardTitle>
          <Badge
            variant={
              booking.status === "active"
                ? "default"
                : booking.status === "pending"
                ? "secondary"
                : booking.status === "completed"
                ? "outline"
                : "destructive"
            }
            className="text-xs flex-shrink-0"
          >
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{renter?.name || "Unknown Renter"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            {format(startDate, "MMM dd")} - {format(endDate, "MMM dd, yyyy")}
          </span>
        </div>
        {booking.totalRent && (
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span>₹{booking.totalRent.toLocaleString()}</span>
          </div>
        )}
        {booking.deposit && booking.deposit > 0 && (
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            Deposit: ₹{booking.deposit.toLocaleString()}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {booking.status === "pending" && onApprove && (
            <Button size="sm" onClick={onApprove} className="flex-1 text-xs sm:text-sm">
              <CheckCircle className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Approve
            </Button>
          )}
          {(booking.status === "pending" || booking.status === "active") && onCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              className="flex-1 text-xs sm:text-sm"
            >
              <X className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

