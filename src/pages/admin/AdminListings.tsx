import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const moderationStatusStyles: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  flagged: "outline",
  removed: "destructive",
  "pending_review": "default",
};

const mockListings = Array.from({ length: 6 }).map((_, index) => ({
  id: `listing-${index}`,
  title: `Listing ${index + 1}`,
  owner: `owner${index + 1}@example.com`,
  category: index % 2 === 0 ? "Electronics" : "Sports",
  city: "Hyderabad",
  status: index % 3 === 0 ? "flagged" : index % 3 === 1 ? "active" : "pending_review",
  price: 499 + index * 50,
}));

const AdminListings = () => {
  const listings = useMemo(() => mockListings, []);

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
          <Select>
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
          <Select>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="hyderabad">Hyderabad</SelectItem>
              <SelectItem value="mumbai">Mumbai</SelectItem>
              <SelectItem value="delhi">Delhi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">{listing.title}</h3>
                <Badge variant={moderationStatusStyles[listing.status] ?? "default"}>
                  {listing.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Owner: {listing.owner}</p>
                <p>Category: {listing.category}</p>
                <p>City: {listing.city}</p>
                <p>Price: ₹{listing.price}/day</p>
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
        ))}
      </div>
    </div>
  );
};

export default AdminListings;


