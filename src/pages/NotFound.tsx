import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Home, 
  Mail, 
  HelpCircle 
} from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Header />
      <div className="container py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold gradient-text mb-4">404</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Page Not Found</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link to="/">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link to="/explore">
              <Button size="lg" variant="outline" className="glass-effect">
                Explore Items
              </Button>
            </Link>
          </div>

          <Card className="glass-card max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Need Help?</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href="mailto:support@itemile.com" 
                    className="text-primary hover:underline"
                  >
                    support@itemile.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
