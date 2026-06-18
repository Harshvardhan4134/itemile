import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllListings,
  getAllReports,
  getAllUsers,
  Listing,
  Report,
  User,
} from "@/lib/firestore";

interface DashboardMetrics {
  openReports: number;
  flaggedListings: number;
  newUsers: number;
  reviewingReports: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [fetchedUsers, fetchedListings, fetchedReports] = await Promise.all([
          getAllUsers(),
          getAllListings(),
          getAllReports(),
        ]);

        if (!active) return;
        setUsers(fetchedUsers);
        setListings(fetchedListings);
        setReports(fetchedReports);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
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

  const metrics = useMemo<DashboardMetrics>(() => {
    const openReports = reports.filter(
      (report) => report.status === "open"
    ).length;
    const reviewingReports = reports.filter(
      (report) => report.status === "reviewing"
    ).length;
    const flaggedListings = listings.filter((listing) => {
      const status = listing.moderation?.status;
      return status === "flagged" || status === "pending_review";
    }).length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newUsers = users.filter((user) => {
      const createdAt = user.createdAt?.toDate?.()?.getTime?.() ?? 0;
      return createdAt >= sevenDaysAgo;
    }).length;

    return {
      openReports,
      flaggedListings,
      newUsers,
      reviewingReports,
    };
  }, [users, listings, reports]);

  const metricCards = [
    {
      label: "Open Reports",
      value: metrics.openReports,
      description: "Items awaiting triage",
    },
    {
      label: "Flagged Listings",
      value: metrics.flaggedListings,
      description: "Requires moderator action",
    },
    {
      label: "New Users (7d)",
      value: metrics.newUsers,
      description: "Recent marketplace signups",
    },
    {
      label: "Reviewing",
      value: metrics.reviewingReports,
      description: "Reports under investigation",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Track the health of the marketplace and open moderation tasks.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="shadow-none border border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? "…" : metric.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-dashed border-2">
        <CardContent className="py-10 text-center space-y-2">
          <Badge variant="secondary">Coming Soon</Badge>
          <h3 className="text-lg font-semibold">Insights & Alerts</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This area will surface risk alerts, trends, and suggested actions to
            keep Itemile safe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;


