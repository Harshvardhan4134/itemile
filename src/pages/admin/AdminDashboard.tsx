import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const metrics = [
  { label: "Open Reports", value: 0, description: "Items awaiting review" },
  { label: "Flagged Listings", value: 0, description: "Requires action" },
  { label: "New Users (7d)", value: 0, description: "Recent signups" },
  { label: "Active Disputes", value: 0, description: "Under moderation" },
];

const AdminDashboard = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
      <p className="text-sm text-muted-foreground">
        Track the health of the marketplace and open moderation tasks.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="shadow-none border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metric.value}</div>
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
          keep RentShare safe.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default AdminDashboard;


