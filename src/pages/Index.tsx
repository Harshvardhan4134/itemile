import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  MapPin,
  Sparkles,
  ArrowRight,
  Smartphone,
  Bike,
  Camera,
  Gamepad2,
  Music,
  Wrench,
  Dumbbell,
  Book,
  Shirt,
  Home,
  Shield,
  Clock,
  Users,
  Zap,
  RefreshCw,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  CheckCircle,
} from "lucide-react";

const Index = () => {

  const categories = [
    { icon: Smartphone, name: "Electronics", value: "Electronics" },
    { icon: Bike, name: "Sports & Outdoor", value: "Sports" },
    { icon: Camera, name: "Photography", value: "Photography" },
    { icon: Gamepad2, name: "Gaming", value: "Gaming" },
    { icon: Music, name: "Music", value: "Music" },
    { icon: Wrench, name: "Tools", value: "Tools" },
    { icon: Dumbbell, name: "Fitness", value: "Fitness" },
    { icon: Book, name: "Books", value: "Books" },
    { icon: Shirt, name: "Clothing", value: "Clothing" },
    { icon: Home, name: "Furniture", value: "Furniture" },
  ];

  const features = [
    {
      icon: MapPin,
      title: "Location-Based Discovery",
      description: "Find items near you with our interactive map interface"
    },
    {
      icon: Shield,
      title: "Secure Transactions",
      description: "Protected payments and verified user profiles"
    },
    {
      icon: Clock,
      title: "Flexible Timing",
      description: "Rent for hours, days, or weeks - you choose"
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Join a community of sharers and makers"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative p-12 text-center">
            <Badge className="mb-4" variant="outline">
              <Sparkles className="w-3 h-3 mr-2" />
              Rent Anything, Anytime
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Items to <span className="gradient-text">Rent</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              Find the perfect items for your needs. Rent from trusted community members.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/explore">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                  Browse All Items
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/post">
                <Button size="lg" variant="outline">
                  List Your Item
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="py-8 mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Browse by <span className="gradient-text">Category</span>
            </h2>
            <p className="text-muted-foreground">
              Find exactly what you need from our wide range of categories
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant="outline"
                size="lg"
                className="gap-2 h-auto py-4 px-6"
                asChild
              >
                <Link to={`/explore?category=${category.value}`}>
                  <category.icon className="h-5 w-5" />
                  {category.name}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        {/* Swap Feature Section */}
        <section className="py-12 mb-12">
          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-0">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-sm">
                      Smart Swapping
                    </Badge>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Swap Items, Not Just <span className="gradient-text">Rent</span>
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Exchange items with other community members! No money needed - just swap what you have for what you need. Perfect for trying new items without the commitment of buying.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">No Cash Required</p>
                        <p className="text-sm text-muted-foreground">Trade items directly with other users</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Try Before You Buy</p>
                        <p className="text-sm text-muted-foreground">Test items you're considering purchasing</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Sustainable Sharing</p>
                        <p className="text-sm text-muted-foreground">Reduce waste by sharing resources with your community</p>
                      </div>
                    </div>
                  </div>
                  <Link to="/explore">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                      Explore Swap Options
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 text-center">
                        <Bike className="h-12 w-12 mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-sm">Sports Equipment</p>
                        <p className="text-xs text-muted-foreground">Swap bikes, gear & more</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-sm">Electronics</p>
                        <p className="text-xs text-muted-foreground">Try cameras, gadgets</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 text-center">
                        <Book className="h-12 w-12 mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-sm">Books & Media</p>
                        <p className="text-xs text-muted-foreground">Exchange knowledge</p>
                      </CardContent>
                    </Card>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 text-center">
                        <Wrench className="h-12 w-12 mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-sm">Tools & Equipment</p>
                        <p className="text-xs text-muted-foreground">Share DIY tools</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features Section */}
        <section className="py-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="gradient-text">Lendlly</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We've built the most intuitive and secure platform for the sharing economy
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12">
          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start <span className="gradient-text">Sharing</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of users who are already saving money and earning extra income through sharing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                    Get Started Free
                    <Zap className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/explore">
                  <Button size="lg" variant="outline">
                    Browse Items
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold gradient-text">Lendlly</h3>
              <p className="text-sm text-muted-foreground">
                The modern marketplace for renting and swapping items within your community.
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Facebook className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Instagram className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Linkedin className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/explore" className="text-muted-foreground hover:text-foreground transition-colors">
                    Explore Items
                  </Link>
                </li>
                <li>
                  <Link to="/post" className="text-muted-foreground hover:text-foreground transition-colors">
                    List Your Item
                  </Link>
                </li>
                <li>
                  <Link to="/post-request" className="text-muted-foreground hover:text-foreground transition-colors">
                    Post a Request
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:rentshare11@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground">Built with ❤️ for the sharing community</span>
                </li>
                <li>
                  <span className="text-muted-foreground">© 2025 Lendlly. All rights reserved.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>Promoting sustainability through the sharing economy</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
