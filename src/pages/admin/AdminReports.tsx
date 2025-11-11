import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const columns = [
  { title: "Open", status: "open", accent: "border-l-4 border-orange-500" },
  { title: "Reviewing", status: "reviewing", accent: "border-l-4 border-blue-500" },
  { title: "Resolved", status: "resolved", accent: "border-l-4 border-emerald-500" },
];

const mockReports = Array.from({ length: 6 }).map((_, index) => ({
  id: `report-${index}`,
  type: index % 2 === 0 ? "inappropriate" : "spam",
  listingTitle: `Item ${index + 1}`,
  reporter: `user${index + 1}@example.com`,
  status: columns[index % columns.length].status,
  createdAt: "2025-11-10",
}));

const AdminReports = () => {
  const grouped = columns.map((column) => ({
    ...column,
    reports: mockReports.filter((report) => report.status === column.status),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Resolve unsafe content quickly, attach evidence, and keep an audit trail.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <Card key={column.status} className={column.accent}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {column.title}
                <Badge variant="outline">{column.reports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[480px]">
                <div className="p-4 space-y-4">
                  {column.reports.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nothing here yet. All clear!
                    </p>
                  )}
                  {column.reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-lg border bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{report.createdAt}</span>
                        <Badge variant="secondary">{report.type}</Badge>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {report.listingTitle}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Reported by {report.reporter}
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
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminReports;


