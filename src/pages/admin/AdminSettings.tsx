import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AdminSettings = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      <p className="text-sm text-muted-foreground">
        Manage policy text, templates, and moderator access. This MVP stores values locally; integrate Firestore or CMS later.
      </p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Prohibited Items Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="h-48"
            defaultValue={`Weapons, drugs, prescription meds
Hazardous chemicals, industrial machines without licenses
Adult content items
Counterfeit goods
Government-issued IDs/docs`}
          />
          <Button>Save Policy</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Takedown Subject</label>
            <Input defaultValue="Your listing was removed on Itemile" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Takedown Body</label>
            <Textarea
              className="h-40"
              defaultValue={`Hi {name},

Your listing "{title}" was removed for violating our policy: {reason}.
If you believe this was a mistake, reply within 48 hours with details/evidence.

– Itemile Moderation Team`}
            />
          </div>
          <Button>Save Templates</Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promote or demote moderators. This MVP will later call a Cloud Function to set Firebase custom claims.
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input placeholder="Enter user UID or email" />
            <Button>Make Moderator</Button>
            <Button variant="outline">Remove Moderator</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AdminSettings;


