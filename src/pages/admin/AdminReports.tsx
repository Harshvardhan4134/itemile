import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getAllListings,
  getAllReports,
  type Listing,
  type Report,
} from "@/lib/firestore";

const columns: Array<{
  title: string;
  statuses: Array<Report["status"]>;
  accent: string;
}> = [
  { title: "Open", statuses: ["open"], accent: "border-l-4 border-orange-500" },
  {
    title: "Reviewing",
    statuses: ["reviewing"],
    accent: "border-l-4 border-blue-500",
  },
  {
    title: "Resolved / Dismissed",
    statuses: ["resolved", "dismissed"],
    accent: "border-l-4 border-emerald-500",
  },
];

const formatDate = (value: any) => {
  if (!value) return "—";
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString();
    }
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      try {
        setLoading(true);
        const [reportData, listingData] = await Promise.all([
          getAllReports(),
          getAllListings(),
        ]);

        if (!active) return;

        setReports(reportData);
        setListings(
          listingData.reduce<Record<string, Listing>>((acc, listing) => {
            acc[listing.id] = listing;
            return acc;
          }, {})
        );
      } catch (error) {
        console.error("Failed to load reports", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        reports: reports.filter((report) =>
          column.statuses.includes(report.status)
        ),
      })),
    [reports]
  );

  const resolveListingTitle = (listingId: string) => {
    const listing = listings[listingId];
    return listing?.title ?? listingId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Resolve unsafe content quickly, attach evidence, and keep an audit trail.
        </p>
      </div>
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading reports…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {grouped.map((column) => (
            <Card
              key={column.title}
              className={`${column.accent} border`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {column.title}
                  <Badge variant="outline">{column.reports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[480px]">
                  <div className="p-4 space-y-4">
                    {column.reports.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nothing here yet. All clear!
                      </p>
                    ) : (
                      column.reports.map((report) => (
                        <div
                          key={report.id}
                          className="rounded-lg border bg-card p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(report.createdAt)}</span>
                            <Badge variant="secondary">{report.type}</Badge>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-sm">
                              {resolveListingTitle(report.listingId)}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Reported by {report.reporterId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Owner: {report.ownerId}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              View Details
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1">
                              Start Review
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
