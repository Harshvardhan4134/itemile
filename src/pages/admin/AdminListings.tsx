import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllListings, getAllUsers, type Listing, type User } from "@/lib/firestore";

const moderationStatusStyles: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  flagged: "outline",
  removed: "destructive",
  "pending_review": "default",
};

const AdminListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [listingData, usersData] = await Promise.all([
          getAllListings(),
          getAllUsers(),
        ]);
        if (!active) return;
        setListings(listingData);
        setOwners(
          usersData.reduce<Record<string, User>>((acc, user) => {
            acc[user.uid] = user;
            return acc;
          }, {})
        );
      } catch (error) {
        console.error("Failed to load listings", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const status =
        listing.moderation?.status ?? (listing.softDeleted ? "removed" : "active");
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
                <SelectItem
                  key={category}
                  value={category.toLowerCase()}
                >
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No listings match the current filters.
              </CardContent>
            </Card>
          ) : (
            filteredListings.map((listing) => {
              const status = resolveStatus(listing);
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
                      <p>Availability: {listing.available ? "Available" : "Unavailable"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        Preview
                      </Button>
                      <Button variant="secondary" className="flex-1">
                        Contact Owner
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="destructive" className="flex-1">
                        Takedown
                      </Button>
                      <Button variant="ghost" className="flex-1">
                        Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AdminListings;
