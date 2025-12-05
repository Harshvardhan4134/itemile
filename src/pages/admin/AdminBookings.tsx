import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllTransactions, Transaction, getHandoverMedia, HandoverMedia, getUser, User } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, User as UserIcon, Image as ImageIcon, Video, Package, Search, DollarSign } from "lucide-react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminBookings() {
  const { role, loading: authLoading } = useAuthRole();
  const isAdmin = role === 'admin';
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Transaction | null>(null);
  const [handoverMedia, setHandoverMedia] = useState<HandoverMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<Record<string, User>>({});

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchAllBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading]);

  const fetchAllBookings = async () => {
    try {
      setLoading(true);
      console.log('Fetching all bookings for admin...');
      const allBookings = await getAllTransactions();
      console.log('Bookings fetched:', allBookings.length);
      console.log('Sample booking:', allBookings[0]);
      
      // Ensure bookings is an array
      const validBookings = Array.isArray(allBookings) ? allBookings : [];
      setBookings(validBookings);
      
      if (validBookings.length > 0) {
        // Fetch user info for all bookings
        const userIds = [...new Set(validBookings.flatMap(b => {
          const ids: string[] = [];
          if (b.ownerId) ids.push(b.ownerId);
          if (b.renterId) ids.push(b.renterId);
          return ids;
        }).filter(Boolean))];
        
        console.log('Fetching user info for', userIds.length, 'users');
        const users = await Promise.all(userIds.map(id => getUser(id).catch(err => {
          console.warn(`Failed to fetch user ${id}:`, err);
          return null;
        })));
        
        const userMap: Record<string, User> = {};
        users.forEach(user => {
          if (user) userMap[user.uid] = user;
        });
        setUserInfo(userMap);
        console.log('User info loaded:', Object.keys(userMap).length, 'users');
      }
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: error.message || "Failed to load bookings. Please check the browser console for more details.",
        variant: "destructive"
      });
      setBookings([]); // Ensure bookings is set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleViewMedia = async (booking: Transaction) => {
    setSelectedBooking(booking);
    setMediaDialogOpen(true);
    setLoadingMedia(true);
    setHandoverMedia([]); // Clear previous media
    
    try {
      console.log('Fetching handover media for booking:', booking.id);
      const media = await getHandoverMedia(booking.id);
      console.log('Handover media fetched:', media);
      setHandoverMedia(media);
      
      if (media.length === 0) {
        toast({
          title: "No Media Found",
          description: "No handover media has been uploaded for this booking yet.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error fetching handover media:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        bookingId: booking.id
      });
      toast({
        title: "Error",
        description: error.message || "Failed to load handover media. Please check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoadingMedia(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.listingTitle?.toLowerCase().includes(query) ||
      userInfo[booking.ownerId]?.name?.toLowerCase().includes(query) ||
      userInfo[booking.renterId]?.name?.toLowerCase().includes(query) ||
      booking.id.toLowerCase().includes(query)
    );
  });

  const pickupMedia = handoverMedia.filter(m => m.stage === 'pickup');
  const returnMedia = handoverMedia.filter(m => m.stage === 'return');

  if (!isAdmin) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bookings Management</h1>
          <p className="text-muted-foreground">View all bookings and handover media for dispute resolution</p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by listing, user, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {authLoading || loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">
              {authLoading ? "Checking permissions..." : "Loading bookings..."}
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No bookings found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search query." : "There are no bookings in the system yet."}
              </p>
            </CardContent>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No bookings match your search</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term. Found {bookings.length} total booking(s).
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredBookings.length} of {bookings.length} booking(s)
              </p>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Listing</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Renter</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No bookings to display
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-[200px] truncate" title={booking.listingTitle || "Unknown Listing"}>
                            {booking.listingTitle || "Unknown Listing"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {booking.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]" title={userInfo[booking.ownerId]?.name || "Unknown"}>
                              {userInfo[booking.ownerId]?.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]" title={userInfo[booking.renterId]?.name || "Unknown"}>
                              {userInfo[booking.renterId]?.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.startDate ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="text-xs">
                                  {format(
                                    booking.startDate.toDate ? booking.startDate.toDate() : new Date(booking.startDate),
                                    "MMM dd, yyyy"
                                  )}
                                </span>
                                {booking.endDate && (
                                  <span className="text-xs text-muted-foreground">
                                    to {format(
                                      booking.endDate.toDate ? booking.endDate.toDate() : new Date(booking.endDate),
                                      "MMM dd, yyyy"
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.amount || booking.totalRent ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                ₹{(booking.amount || booking.totalRent || 0).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              booking.status === 'completed' || booking.status === 'returned' ? 'outline' :
                              booking.status === 'picked_up' || booking.status === 'return_otp_generated' ? 'default' :
                              booking.status === 'cancelled' ? 'destructive' : 
                              booking.status === 'pending' ? 'secondary' : 'default'
                            }
                          >
                            {booking.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.hasPickupMedia && (
                              <Badge variant="outline" className="text-xs">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                Pickup
                              </Badge>
                            )}
                            {booking.hasReturnMedia && (
                              <Badge variant="outline" className="text-xs">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                Return
                              </Badge>
                            )}
                            {!booking.hasPickupMedia && !booking.hasReturnMedia && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMedia(booking)}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            View Media
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Handover Media Dialog */}
        <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Handover Media</DialogTitle>
              <DialogDescription>
                {selectedBooking?.listingTitle} - Booking ID: {selectedBooking?.id}
              </DialogDescription>
            </DialogHeader>

            {loadingMedia ? (
              <div className="text-center py-10 text-muted-foreground">Loading media...</div>
            ) : handoverMedia.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-muted-foreground">No handover media available.</p>
                <p className="text-xs text-muted-foreground">
                  Booking ID: {selectedBooking?.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  Has Pickup Media: {selectedBooking?.hasPickupMedia ? 'Yes' : 'No'} | 
                  Has Return Media: {selectedBooking?.hasReturnMedia ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Check browser console (F12) for detailed logs.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="pickup" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="pickup">
                    Pickup Media ({pickupMedia.length})
                  </TabsTrigger>
                  <TabsTrigger value="return">
                    Return Media ({returnMedia.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pickup" className="space-y-4">
                  {pickupMedia.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No pickup media available.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pickupMedia.map((media) => (
                        <Card key={media.id} className="overflow-hidden">
                          <div className="relative bg-muted min-h-[300px] flex items-center justify-center">
                            {media.type === 'image' ? (
                              <>
                                <img
                                  src={media.url}
                                  alt={`Pickup ${media.id}`}
                                  className="w-full h-auto max-h-[500px] object-contain"
                                  onError={(e) => {
                                    console.error('Error loading image:', media.url);
                                    const imgEl = e.target as HTMLImageElement;
                                    imgEl.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'w-full h-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center';
                                    errorDiv.innerHTML = '<p>Failed to load image</p>';
                                    imgEl.parentElement?.appendChild(errorDiv);
                                  }}
                                />
                                <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs z-10">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  Image
                                </Badge>
                              </>
                            ) : (
                              <>
                                <video
                                  src={media.url}
                                  controls
                                  preload="metadata"
                                  className="w-full h-auto max-h-[500px] object-contain"
                                  playsInline
                                  controlsList="nodownload"
                                  onError={(e) => {
                                    console.error('Error loading video:', media.url);
                                    const videoEl = e.target as HTMLVideoElement;
                                    videoEl.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center';
                                    errorDiv.innerHTML = '<p class="mb-2">Failed to load video</p><p class="text-xs break-all">' + media.url + '</p>';
                                    videoEl.parentElement?.appendChild(errorDiv);
                                  }}
                                  onLoadedMetadata={(e) => {
                                    console.log('Video loaded successfully:', media.url);
                                  }}
                                >
                                  <source src={media.url} type="video/mp4" />
                                  <source src={media.url} type="video/webm" />
                                  <source src={media.url} type="video/ogg" />
                                  Your browser does not support the video tag.
                                </video>
                                <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs z-10">
                                  <Video className="h-3 w-3 mr-1" />
                                  Video
                                </Badge>
                              </>
                            )}
                          </div>
                          <CardContent className="p-3 space-y-1 border-t">
                            <p className="text-xs text-muted-foreground break-all line-clamp-2">
                              {media.url}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {media.createdAt ? format(
                                media.createdAt.toDate ? media.createdAt.toDate() : new Date(media.createdAt),
                                "MMM dd, yyyy 'at' h:mm a"
                              ) : 'Unknown date'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="return" className="space-y-4">
                  {returnMedia.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No return media available.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {returnMedia.map((media) => (
                        <Card key={media.id} className="overflow-hidden">
                          <div className="relative bg-muted min-h-[300px] flex items-center justify-center">
                            {media.type === 'image' ? (
                              <>
                                <img
                                  src={media.url}
                                  alt={`Return ${media.id}`}
                                  className="w-full h-auto max-h-[500px] object-contain"
                                  onError={(e) => {
                                    console.error('Error loading image:', media.url);
                                    const imgEl = e.target as HTMLImageElement;
                                    imgEl.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'w-full h-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center';
                                    errorDiv.innerHTML = '<p>Failed to load image</p>';
                                    imgEl.parentElement?.appendChild(errorDiv);
                                  }}
                                />
                                <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs z-10">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  Image
                                </Badge>
                              </>
                            ) : (
                              <>
                                <video
                                  src={media.url}
                                  controls
                                  preload="metadata"
                                  className="w-full h-auto max-h-[500px] object-contain"
                                  playsInline
                                  controlsList="nodownload"
                                  onError={(e) => {
                                    console.error('Error loading video:', media.url);
                                    const videoEl = e.target as HTMLVideoElement;
                                    videoEl.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center';
                                    errorDiv.innerHTML = '<p class="mb-2">Failed to load video</p><p class="text-xs break-all">' + media.url + '</p>';
                                    videoEl.parentElement?.appendChild(errorDiv);
                                  }}
                                  onLoadedMetadata={(e) => {
                                    console.log('Video loaded successfully:', media.url);
                                  }}
                                >
                                  <source src={media.url} type="video/mp4" />
                                  <source src={media.url} type="video/webm" />
                                  <source src={media.url} type="video/ogg" />
                                  Your browser does not support the video tag.
                                </video>
                                <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs z-10">
                                  <Video className="h-3 w-3 mr-1" />
                                  Video
                                </Badge>
                              </>
                            )}
                          </div>
                          <CardContent className="p-3 space-y-1 border-t">
                            <p className="text-xs text-muted-foreground break-all line-clamp-2">
                              {media.url}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {media.createdAt ? format(
                                media.createdAt.toDate ? media.createdAt.toDate() : new Date(media.createdAt),
                                "MMM dd, yyyy 'at' h:mm a"
                              ) : 'Unknown date'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}

