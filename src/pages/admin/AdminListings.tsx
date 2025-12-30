import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adjustUserTrustMetrics,
  getAllListings,
  getAllUsers,
  logAdminAction,
  setListingModeration,
  getUser,
  sendEmailNotification,
  type Listing,
  type User,
} from "@/lib/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";

const moderationStatusStyles: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "secondary",
  flagged: "outline",
  removed: "destructive",
  pending_review: "default",
};

const reasonOptions = [
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "copyright", label: "Copyright violation" },
  { value: "counterfeit", label: "Counterfeit goods" },
  { value: "fraud", label: "Fraudulent activity" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Other" },
];

const AdminListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [takedownOpen, setTakedownOpen] = useState(false);
  const [selectedReason, setSelectedReason] =
    useState<string>("prohibited_item");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [strikeUser, setStrikeUser] = useState(false);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [processingListingId, setProcessingListingId] = useState<string | null>(
    null
  );
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<User | null>(null);

  const { toast} = useToast();
  const { user } = useAuthRole();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetDialogState = () => {
    setSelectedReason("prohibited_item");
    setAdditionalNotes("");
    setStrikeUser(false);
    setNotifyOwner(true);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listingData, usersData] = await Promise.all([
        getAllListings(),
        getAllUsers(),
      ]);
      if (!isMountedRef.current) return;
      setListings(listingData);
      setOwners(
        usersData.reduce<Record<string, User>>((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load listings", error);
      toast({
        title: "Failed to load listings",
        description: "Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper functions - defined before useMemo calls
  const resolveOwner = (ownerId: string) => {
    const owner = owners[ownerId];
    if (!owner) return ownerId;
    return owner.email || owner.name || ownerId;
  };

  const resolveStatus = (listing: Listing) => {
    if (listing.softDeleted) return "removed";
    return listing.moderation?.status ?? (listing.available ? "active" : "pending_review");
  };

  const resolveCity = (listing: Listing) => {
    if (listing.city) return listing.city;
    if (listing.location) {
      return `${listing.location.latitude.toFixed(2)}, ${listing.location.longitude.toFixed(2)}`;
    }
    return "—";
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const status = resolveStatus(listing);
      const matchesStatus =
        statusFilter === "all" ? true : status === statusFilter;
      const matchesCategory =
        categoryFilter === "all"
          ? true
          : listing.category?.toLowerCase() === categoryFilter;
      const matchesCity =
        cityFilter === "all"
          ? true
          : (listing.city ?? "").toLowerCase() === cityFilter;

      return matchesStatus && matchesCategory && matchesCity;
    });
  }, [listings, statusFilter, categoryFilter, cityFilter]);

  const activeListings = useMemo(() => {
    return filteredListings.filter((listing) => {
      const status = resolveStatus(listing);
      return status !== "removed";
    });
  }, [filteredListings]);

  const pendingListings = useMemo(() => {
    return filteredListings.filter((listing) => {
      const status = resolveStatus(listing);
      return status === "pending_review";
    });
  }, [filteredListings]);

  const removedListings = useMemo(() => {
    return filteredListings.filter((listing) => {
      const status = resolveStatus(listing);
      return status === "removed";
    });
  }, [filteredListings]);

  // Active listings should exclude pending and removed
  const trulyActiveListings = useMemo(() => {
    return filteredListings.filter((listing) => {
      const status = resolveStatus(listing);
      return status !== "removed" && status !== "pending_review";
    });
  }, [filteredListings]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    listings.forEach((listing) => {
      if (listing.category) {
        categories.add(listing.category);
      }
    });
    return Array.from(categories).sort();
  }, [listings]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    listings.forEach((listing) => {
      if (listing.city) {
        cities.add(listing.city);
      }
    });
    return Array.from(cities).sort();
  }, [listings]);

  const openTakedownDialog = (listing: Listing) => {
    setSelectedListing(listing);
    resetDialogState();
    setTakedownOpen(true);
  };

  const handleTakedown = async () => {
    if (!selectedListing || !user) {
      toast({
        title: "Unable to remove listing",
        description: "Admin session not detected.",
        variant: "destructive",
      });
      return;
    }

    const reasons = [
      selectedReason,
      ...(additionalNotes.trim() ? [additionalNotes.trim()] : []),
    ];

    setActionLoading(true);
    try {
      await setListingModeration({
        listingId: selectedListing.id,
        status: "removed",
        reasons,
        reviewerId: user.uid,
        softDeleted: true,
        available: false,
      });

      if (strikeUser) {
        await adjustUserTrustMetrics(selectedListing.ownerId, -10, 1);
      }

      // Send email notification to owner (always send, especially for safety concerns)
      try {
        const owner = await getUser(selectedListing.ownerId);
        if (owner?.email) {
          const reasonLabel = reasonOptions.find(r => r.value === selectedReason)?.label || selectedReason;
          
          // Special handling for safety concerns
          let reasonText = reasonLabel;
          let subjectPrefix = 'Listing Removed';
          if (selectedReason === 'safety') {
            reasonText = 'Safety Concern - Your listing has been removed due to safety concerns to protect our community.';
            subjectPrefix = '⚠️ URGENT: Listing Removed - Safety Concern';
          }
          
          const emailMessage = `Hi ${owner.name},\n\nYour listing "${selectedListing.title}" has been removed by our admin team.\n\nReason: ${reasonText}${additionalNotes.trim() ? `\n\nAdditional Notes: ${additionalNotes.trim()}` : ''}${strikeUser ? '\n\n⚠️ Important: Your account has received a strike due to this violation. Repeated violations may result in account suspension.' : ''}\n\nIf you believe this was done in error, please contact our support team at support@lendlly.in or call +91 8547652100.\n\nView your listings: ${window.location.origin}/profile\n\nBest regards,\nRent Share Admin Team`;
          
          await sendEmailNotification({
            email: owner.email,
            subject: `${subjectPrefix}: ${selectedListing.title} - Rent Share`,
            message: emailMessage,
            type: 'admin_action',
            read: false,
            createdAt: new Date(),
          });
        } else {
          console.warn(`Owner email not found for listing ${selectedListing.id}`);
        }
      } catch (error) {
        console.error('Error sending email notification to owner:', error);
        // Don't fail the takedown if email fails, but log it
        toast({
          title: "Warning",
          description: "Listing removed but email notification failed. Please notify the owner manually.",
          variant: "destructive",
        });
      }

      await logAdminAction({
        actorId: user.uid,
        action: "TAKEDOWN",
        targetType: "listing",
        targetId: selectedListing.id,
        reason: selectedReason,
        metadata: {
          additionalNotes: additionalNotes.trim() || undefined,
          notifyOwner,
          strikeUser,
          emailSent: true,
        },
      });

      toast({
        title: "Listing removed",
        description: `${selectedListing.title} has been taken down. Owner has been notified via email.`,
      });
      setTakedownOpen(false);
      await loadData();
    } catch (error) {
      console.error("Failed to take down listing", error);
      toast({
        title: "Failed to remove listing",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (listing: Listing) => {
    if (!user) {
      toast({
        title: "Unable to approve listing",
        description: "Admin session not detected.",
        variant: "destructive",
      });
      return;
    }

    setProcessingListingId(listing.id);
    try {
      await setListingModeration({
        listingId: listing.id,
        status: "active",
        reasons: [],
        reviewerId: user.uid,
        softDeleted: false,
        available: true,
      });

      await logAdminAction({
        actorId: user.uid,
        action: "APPROVE",
        targetType: "listing",
        targetId: listing.id,
        reason: "admin_approval",
        metadata: {},
      });

      toast({
        title: "Listing approved",
        description: `${listing.title} has been approved and is now active.`,
      });
      await loadData();
    } catch (error) {
      console.error("Failed to approve listing", error);
      toast({
        title: "Failed to approve listing",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingListingId(null);
    }
  };

  const handleRestore = async (listing: Listing) => {
    if (!user) {
      toast({
        title: "Unable to restore listing",
        description: "Admin session not detected.",
        variant: "destructive",
      });
      return;
    }

    setProcessingListingId(listing.id);
    try {
      await setListingModeration({
        listingId: listing.id,
        status: "active",
        reasons: [],
        reviewerId: user.uid,
        softDeleted: false,
        available: true,
      });

      await logAdminAction({
        actorId: user.uid,
        action: "RESTORE",
        targetType: "listing",
        targetId: listing.id,
        reason: "restore",
        metadata: {},
      });

      toast({
        title: "Listing restored",
        description: `${listing.title} is visible again.`,
      });
      await loadData();
    } catch (error) {
      console.error("Failed to restore listing", error);
      toast({
        title: "Failed to restore listing",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingListingId(null);
    }
  };

  const handlePreview = (listing: Listing) => {
    // Open the listing detail page in a new tab
    window.open(`/item/${listing.id}`, "_blank");
  };

  const handleContactOwner = (listing: Listing) => {
    // Show owner details in dialog
    const owner = owners[listing.ownerId];
    if (owner) {
      setSelectedOwner(owner);
      setOwnerDialogOpen(true);
    } else {
      toast({
        title: "Owner not found",
        description: "Unable to load owner details.",
        variant: "destructive",
      });
    }
  };

  const renderListingCard = (listing: Listing) => {
    const status = resolveStatus(listing);
    const isRemoved = status === "removed";
    // Only show approve button for items that are pending review (not yet approved/active)
    const isPending = status === "pending_review";
    
    return (
      <Card key={listing.id}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">{listing.title}</h3>
            <Badge variant={moderationStatusStyles[status] ?? "default"}>
              {status.replace("_", " ")}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Owner: {resolveOwner(listing.ownerId)}</p>
            <p>Category: {listing.category ?? "—"}</p>
            <p>City: {resolveCity(listing)}</p>
            <p>Price: ₹{listing.rentPerDay ?? 0}/day</p>
            <p>
              Availability: {listing.available ? "Available" : "Unavailable"}
            </p>
            {isRemoved && listing.moderation?.reasons && (
              <p className="text-destructive font-medium">
                Reason: {listing.moderation.reasons.join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handlePreview(listing)}
            >
              Preview
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => handleContactOwner(listing)}
            >
              Contact Owner
            </Button>
          </div>
          <div className="flex gap-2">
            {isPending ? (
              <Button
                variant="default"
                className="flex-1"
                disabled={processingListingId === listing.id}
                onClick={() => handleApprove(listing)}
              >
                {processingListingId === listing.id ? "Approving..." : "Approve"}
              </Button>
            ) : !isRemoved ? (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => openTakedownDialog(listing)}
              >
                Takedown
              </Button>
            ) : (
              <Button
                variant="default"
                className="flex-1"
                disabled={processingListingId === listing.id}
                onClick={() => handleRestore(listing)}
              >
                {processingListingId === listing.id ? "Restoring..." : "Restore"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Listings</h2>
          <p className="text-sm text-muted-foreground">
            Moderate active items, verify details, and take swift action on violations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
              <SelectItem value="pending_review">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city.toLowerCase()}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading listings…
        </div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Approval ({pendingListings.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Listings ({trulyActiveListings.length})
            </TabsTrigger>
            <TabsTrigger value="removed">
              Removed / Taken Down ({removedListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingListings.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No pending listings. All items have been reviewed.
                  </CardContent>
                </Card>
              ) : (
                pendingListings.map((listing) => renderListingCard(listing))
              )}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trulyActiveListings.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No active listings match the current filters.
                  </CardContent>
                </Card>
              ) : (
                trulyActiveListings.map((listing) => renderListingCard(listing))
              )}
            </div>
          </TabsContent>

          <TabsContent value="removed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {removedListings.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No removed listings. All items are active or pending review.
                  </CardContent>
                </Card>
              ) : (
                removedListings.map((listing) => renderListingCard(listing))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Owner Details Dialog */}
      <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Owner Details</DialogTitle>
            <DialogDescription>
              Contact information and trust metrics for this listing owner.
            </DialogDescription>
          </DialogHeader>
          {selectedOwner && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedOwner.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm">{selectedOwner.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedOwner.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Trust Score</Label>
                  <p className="font-medium">{selectedOwner.trustScore ?? 50}/100</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Flags</Label>
                  <p className="font-medium">{selectedOwner.flagsCount ?? 0}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={selectedOwner.banned ? "destructive" : "secondary"}>
                    {selectedOwner.banned ? "Banned" : "Active"}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 border-t flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/profile/${selectedOwner.uid}`);
                    setOwnerDialogOpen(false);
                  }}
                >
                  View Profile
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/admin/users`);
                    setOwnerDialogOpen(false);
                  }}
                >
                  Manage User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={takedownOpen}
        onOpenChange={(open) => {
          setTakedownOpen(open);
          if (!open) {
            setSelectedListing(null);
            resetDialogState();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove listing</DialogTitle>
            <DialogDescription>
              Choose a policy reason and optionally notify the owner. This action
              soft deletes the listing and hides it from the marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={selectedReason}
                onValueChange={setSelectedReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add moderator notes or instructions"
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Apply actions</Label>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="notify-owner"
                  checked={notifyOwner}
                  onCheckedChange={(value) => setNotifyOwner(Boolean(value))}
                />
                <Label htmlFor="notify-owner" className="text-sm font-normal">
                  Notify owner by email (coming soon)
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="strike-user"
                  checked={strikeUser}
                  onCheckedChange={(value) => setStrikeUser(Boolean(value))}
                />
                <Label htmlFor="strike-user" className="text-sm font-normal">
                  Apply strike (trust -10, flags +1)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTakedownOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTakedown}
              disabled={actionLoading}
            >
              {actionLoading ? "Removing…" : "Confirm takedown"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListings;
