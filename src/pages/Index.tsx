import { useState, useMemo } from "react";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
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
  Instagram,
  Linkedin,
  MessageCircle as DiscordIcon,
  CheckCircle,
  MessageCircle,
  Truck,
  CreditCard,
  ShieldCheck,
  Leaf,
  Package,
  Mouse,
  Volume2,
  Headphones,
  Watch,
  Battery,
  Backpack,
  Laptop,
} from "lucide-react";

/** Example rental categories — icons only (no stock product photos). */
const SHOWCASE_FILTERS = ["All", "Technology", "Gear", "Audio"] as const;
type ShowcaseFilter = (typeof SHOWCASE_FILTERS)[number];

const SHOWCASE_PRODUCTS: {
  id: string;
  title: string;
  category: Exclude<ShowcaseFilter, "All">;
  priceLabel: string;
  icon: LucideIcon;
}[] = [
  {
    id: "1",
    title: "Wireless Mouse",
    category: "Technology",
    priceLabel: "from ₹49 / day",
    icon: Mouse,
  },
  {
    id: "2",
    title: "Bluetooth Speaker",
    category: "Audio",
    priceLabel: "from ₹120 / day",
    icon: Volume2,
  },
  {
    id: "3",
    title: "Studio Headphones",
    category: "Audio",
    priceLabel: "from ₹89 / day",
    icon: Headphones,
  },
  {
    id: "4",
    title: "Smartwatch",
    category: "Technology",
    priceLabel: "from ₹199 / day",
    icon: Watch,
  },
  {
    id: "5",
    title: "Wireless Earbuds",
    category: "Audio",
    priceLabel: "from ₹79 / day",
    icon: Headphones,
  },
  {
    id: "6",
    title: "Power Bank",
    category: "Technology",
    priceLabel: "from ₹35 / day",
    icon: Battery,
  },
  {
    id: "7",
    title: "Daypack",
    category: "Gear",
    priceLabel: "from ₹45 / day",
    icon: Backpack,
  },
  {
    id: "8",
    title: "Laptop Workstation",
    category: "Technology",
    priceLabel: "from ₹299 / day",
    icon: Laptop,
  },
];

function SwapDiscoveryTile({
  title,
  sub,
  icon: Icon,
}: {
  title: string;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <div className="group rounded-xl overflow-hidden border border-zinc-700/70 bg-zinc-900/80 hover:border-sky-500/35 transition-colors duration-200">
      <div className="relative aspect-[5/4] bg-zinc-800 flex items-center justify-center">
        <Icon
          className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-500 group-hover:text-sky-400 transition-colors"
          strokeWidth={1.15}
        />
      </div>
      <div className="px-3 py-3 sm:px-3.5 sm:py-3.5 border-t border-zinc-800 bg-zinc-950 text-left">
        <p className="font-semibold text-sm text-zinc-50 tracking-tight">{title}</p>
        <p className="text-xs text-zinc-400 leading-snug mt-1">{sub}</p>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "Do you support pickups in my city?",
    a: "Lendlly is built around local handoffs. Choose your city in the header, then browse listings near you. Exact pickup spots are arranged in chat with the owner.",
  },
  {
    q: "How do payments work?",
    a: "Renters pay through the platform where checkout is enabled. Owners receive payouts according to your account setup. Always confirm dates and rules in the listing before you book.",
  },
  {
    q: "Can I rent for just a day or a weekend?",
    a: "Yes. Listings show daily or other rates set by owners. Pick dates that match your plan and message the owner if you need something custom.",
  },
  {
    q: "What if the item is not as described?",
    a: "Use in-app chat and booking details to resolve issues. For policy questions, see our refund and contact pages linked in the footer.",
  },
];

const Index = () => {
  const [showcaseFilter, setShowcaseFilter] = useState<ShowcaseFilter>("All");
  const [showcaseSearch, setShowcaseSearch] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterDone, setNewsletterDone] = useState(false);

  const filteredShowcase = useMemo(() => {
    const q = showcaseSearch.trim().toLowerCase();
    return SHOWCASE_PRODUCTS.filter((p) => {
      const catOk =
        showcaseFilter === "All" || p.category === showcaseFilter;
      const searchOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [showcaseFilter, showcaseSearch]);

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

  const featuredCategories = [
    {
      name: "Technology",
      blurb: "Phones, laptops, and gadgets from people near you.",
      value: "Electronics",
      Icon: Smartphone,
    },
    {
      name: "Audio",
      blurb: "Speakers, headphones, and instruments for your next project.",
      value: "Music",
      Icon: Music,
    },
    {
      name: "Gear",
      blurb: "Sports, outdoor, and everyday carry — on flexible rental terms.",
      value: "Sports",
      Icon: Bike,
    },
    {
      name: "Computers",
      blurb: "Laptops, monitors, and desk setups for work or study.",
      value: "Electronics",
      Icon: Laptop,
    },
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
    <div className="app-shell">
      <Header />
      
      <div className="container py-6 sm:py-10">
        {/* Hero — Shopify Digital–inspired: dark panel, electric accent, bold product shot */}
        <section className="mb-10 sm:mb-14 lg:mb-16">
          <div className="rounded-[1.75rem] sm:rounded-[2rem] bg-zinc-950 text-zinc-50 border border-zinc-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 items-stretch">
              <div className="order-2 lg:order-1 text-center lg:text-left px-6 sm:px-10 lg:px-12 py-10 sm:py-12 lg:py-16 flex flex-col justify-center">
                <Badge
                  variant="outline"
                  className="mb-5 rounded-full px-3 py-1 text-xs font-medium border-sky-500/35 bg-sky-500/10 text-sky-300 w-fit mx-auto lg:mx-0"
                >
                  <Sparkles className="w-3 h-3 mr-1.5 text-sky-400" />
                  Peer-to-peer rentals
                </Badge>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] xl:text-5xl font-semibold tracking-tight leading-[1.08] mb-4 sm:mb-5">
                  Rent{" "}
                  <span className="text-sky-400">pro-grade</span> tech &amp; gear locally
                </h1>
                <p className="text-base sm:text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                  High-impact product presentation for renters and owners — browse real listings, list your kit, and skip buying new when you only need it for a while.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                  <Link to="/explore" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto rounded-full px-8 h-12 bg-sky-500 text-zinc-950 font-semibold hover:bg-sky-400 border-0"
                    >
                      Browse products
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#how-it-works" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto rounded-full px-8 h-12 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white"
                    >
                      How it works
                    </Button>
                  </a>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative min-h-[240px] sm:min-h-[320px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.12),transparent_50%)] pointer-events-none" />
                <div className="relative z-[2] flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-8 sm:p-10">
                    <Package className="h-16 w-16 sm:h-20 sm:w-20 text-sky-400" strokeWidth={1.25} />
                  </div>
                  <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                    Browse real listings from people near you — no stock photos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product discovery — Digital-style white panel, sharp cards */}
        <section
          className="mb-12 sm:mb-16 rounded-[1.75rem] bg-white border border-zinc-200/90 shadow-sm px-5 py-7 sm:px-8 sm:py-9"
          aria-labelledby="showcase-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 mb-8">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {SHOWCASE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setShowcaseFilter(f)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    showcaseFilter === f
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-transparent"
                  }`}
                >
                  {f === "All" ? "All" : f}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <Input
                value={showcaseSearch}
                onChange={(e) => setShowcaseSearch(e.target.value)}
                placeholder="Search for products"
                className="h-11 rounded-full pl-10 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                aria-label="Filter showcase products"
              />
            </div>
          </div>

          <h2 id="showcase-heading" className="sr-only">
            Example rental categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredShowcase.map((p) => {
              const Icon = p.icon;
              return (
                <Link key={p.id} to="/explore" className="group block">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200/90 overflow-hidden transition-all group-hover:shadow-md group-hover:border-zinc-300">
                    <div className="aspect-[4/3] overflow-hidden bg-zinc-100 flex items-center justify-center">
                      <Icon className="h-14 w-14 sm:h-16 sm:w-16 text-zinc-400 group-hover:text-sky-600 transition-colors" strokeWidth={1.15} />
                    </div>
                  </div>
                  <div className="mt-3 px-0.5">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {p.category}
                    </p>
                    <p className="font-semibold text-zinc-900 truncate group-hover:text-sky-600 transition-colors">
                      {p.title}
                    </p>
                    <p className="text-sm text-zinc-500">{p.priceLabel}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {filteredShowcase.length === 0 && (
            <p className="text-center text-zinc-500 py-12 text-sm">
              No matches. Try another filter or search term.
            </p>
          )}
          <div className="mt-10 flex justify-center">
            <Link to="/explore">
              <Button
                variant="outline"
                className="rounded-full px-8 h-11 gap-2 border-zinc-300 text-zinc-900 hover:bg-zinc-50"
              >
                Browse all products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Product categories — dark electronics strip (Digital-style) */}
        <section
          className="mb-12 sm:mb-16 rounded-[1.75rem] bg-zinc-950 text-zinc-100 border border-zinc-800 px-5 py-10 sm:px-8 sm:py-12"
          aria-labelledby="categories-heading"
        >
          <div className="mb-8 max-w-2xl">
            <h2
              id="categories-heading"
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
            >
              Product categories
            </h2>
            <p className="text-zinc-400 mt-2 text-sm sm:text-base leading-relaxed">
              Impactful category tiles — open Explore for live listings in each vertical.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {featuredCategories.map((cat) => {
              const CatIcon = cat.Icon;
              return (
                <Link
                  key={cat.name + cat.value}
                  to={`/explore?category=${encodeURIComponent(cat.value)}`}
                  className="group"
                >
                  <Card className="h-full border-zinc-800 bg-zinc-900/80 hover:border-zinc-600 transition-all rounded-xl sm:rounded-2xl overflow-hidden shadow-lg shadow-black/20">
                    <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 min-h-[180px] sm:min-h-[200px]">
                      <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/80 text-sky-400 group-hover:border-sky-500/40 transition-colors">
                        <CatIcon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.15} />
                      </div>
                      <div className="flex-1 flex flex-col justify-center text-left min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold tracking-tight mb-2 text-white">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                          {cat.blurb}
                        </p>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-400 group-hover:gap-2 transition-all">
                          Explore category
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* What is Lendlly Section */}
        <section className="py-6 sm:py-8 mb-8 sm:mb-12">
          <Card className="border-border bg-card shadow-sm rounded-2xl sm:rounded-3xl">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                  What is <span className="gradient-text">Lendlly</span>?
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Lendlly is a community-driven peer-to-peer rental platform. People can rent items to others in their city, earn money from things they already own, and request items they need instead of buying them.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* All categories */}
        <section className="py-6 sm:py-8 mb-8 sm:mb-12 border-t border-border pt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 px-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
                All categories
              </h2>
              <p className="text-sm text-muted-foreground">
                Jump into a category or search on Explore
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-start">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full border-border bg-card hover:bg-muted h-9 sm:h-10 px-4 text-xs sm:text-sm font-normal"
                asChild
              >
                <Link to={`/explore?category=${category.value}`}>
                  <category.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {category.name}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-6 sm:py-8 md:py-12 mb-8 sm:mb-12 scroll-mt-24">
          <div className="text-center mb-6 sm:mb-8 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              How <span className="gradient-text">Lendlly</span> Works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple ways to get what you need
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Rent Items</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Browse available items and rent them for a few days or weeks. Pay securely through our platform.
                </p>
                <Link to="/explore">
                  <Button variant="outline" size="sm" className="w-full">
                    Browse Items
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. Request Items</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Can't find what you need? Post a request! Others who have it can respond and offer to rent or swap.
                </p>
                <Link to="/post-request">
                  <Button variant="outline" size="sm" className="w-full">
                    Post Request
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Swap Items</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Exchange items with others - no money needed! Perfect for trying new things without buying.
                </p>
                <Link to="/explore">
                  <Button variant="outline" size="sm" className="w-full">
                    Find Swaps
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Swap — Digital-style dark panel, bundled imagery, readable copy */}
        <section className="py-6 sm:py-8 md:py-12 mb-8 sm:mb-12">
          <div className="rounded-[1.75rem] overflow-hidden border border-zinc-800 bg-zinc-950 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-zinc-800">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-sky-500 text-zinc-950 shrink-0">
                    <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} />
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-sky-500/40 bg-sky-500/10 text-sky-300 text-xs font-medium px-3"
                  >
                    Smart swapping
                  </Badge>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold tracking-tight text-white mb-4 leading-tight">
                  Swap items, not just{" "}
                  <span className="text-sky-400">rent</span>
                </h2>
                <p className="text-base sm:text-[1.05rem] text-zinc-300 leading-relaxed mb-8 max-w-md">
                  Trade with people nearby—no checkout required for pure swaps. List what you have, message matches, and exchange on your terms.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    {
                      t: "No cash required",
                      d: "Agree trades in chat and meet locally.",
                    },
                    {
                      t: "Try before you buy",
                      d: "Borrow or swap before committing to a purchase.",
                    },
                    {
                      t: "Less waste",
                      d: "Keep quality gear in use in your community.",
                    },
                  ].map((row) => (
                    <li key={row.t} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                        <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-100 text-sm sm:text-[15px]">
                          {row.t}
                        </p>
                        <p className="text-sm text-zinc-400 leading-snug mt-0.5">
                          {row.d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link to="/explore" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full px-8 h-12 bg-sky-500 text-zinc-950 font-semibold hover:bg-sky-400 border-0"
                  >
                    Explore swap listings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 bg-zinc-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
                  Popular swap categories
                </p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <SwapDiscoveryTile
                    title="Sports"
                    sub="Bikes & training gear"
                    icon={Bike}
                  />
                  <SwapDiscoveryTile
                    title="Cameras"
                    sub="Photo & video kits"
                    icon={Camera}
                  />
                  <SwapDiscoveryTile
                    title="Books"
                    sub="Read & pass along"
                    icon={Book}
                  />
                  <SwapDiscoveryTile
                    title="Tools"
                    sub="DIY & home projects"
                    icon={Wrench}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter — static marketing */}
        <section className="py-6 sm:py-10 mb-12 sm:mb-16" aria-labelledby="newsletter-heading">
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12 max-w-2xl mx-auto text-center sm:text-left">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-5 mx-auto sm:mx-0">
                <Mail className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h2
                id="newsletter-heading"
                className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3"
              >
                Subscribe to our email updates
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
                Get occasional tips on listing your gear and finding rentals nearby. This is a static demo form — wire it to your provider when you are ready.
              </p>
              {newsletterDone ? (
                <p className="text-sm font-medium text-foreground">
                  Thanks for subscribing.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.trim()) setNewsletterDone(true);
                  }}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto sm:mx-0"
                >
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="h-11 rounded-full border-border bg-background"
                    autoComplete="email"
                  />
                  <Button
                    type="submit"
                    className="h-11 rounded-full px-6 shrink-0 bg-primary text-primary-foreground"
                  >
                    Subscribe
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="py-8 sm:py-12 mb-12 sm:mb-16 max-w-3xl mx-auto px-1"
          aria-labelledby="faq-heading"
        >
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-2"
          >
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-center mb-8 text-sm sm:text-base px-2">
            Straight answers about renting locally on Lendlly — for policy details, use the links in the footer.
          </p>
          <Accordion type="single" collapsible className="w-full border-t border-border">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-[15px] sm:text-base hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Trust strip */}
        <section className="mb-12 sm:mb-16" aria-label="Why rent with Lendlly">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              {
                icon: Truck,
                t: "Local pickup",
                d: "Coordinate handoffs with owners in your city",
              },
              {
                icon: CreditCard,
                t: "Secure payments",
                d: "Pay through the app where checkout is live",
              },
              {
                icon: ShieldCheck,
                t: "Trust & verification",
                d: "KYC and reviews help you rent with confidence",
              },
              {
                icon: Leaf,
                t: "Less waste",
                d: "Share quality gear instead of buying new every time",
              },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 text-center"
              >
                <x.icon className="h-7 w-7 sm:h-8 sm:w-8 mx-auto mb-3 text-foreground" strokeWidth={1.5} />
                <p className="font-semibold text-sm mb-1">{x.t}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {x.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-6 sm:py-8 md:py-12 mb-8 sm:mb-12">
          <div className="text-center mb-6 sm:mb-8 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Why Choose <span className="gradient-text">Lendlly</span>?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              We've built the most intuitive and secure platform for the sharing economy
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2 sm:px-0">
            {features.map((feature, index) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-6 sm:py-8 md:py-12">
          <Card className="bg-muted/40 border border-border rounded-2xl sm:rounded-3xl">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 sm:mb-4">
                Ready to Start <span className="gradient-text">Sharing</span>?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                Join thousands of users who are already saving money and earning extra income through sharing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Link to="/signup">
                  <Button size="lg" className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                    Get Started Free
                    <Zap className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/explore">
                  <Button size="lg" variant="outline" className="rounded-full px-8 border-foreground/20">
                    Browse Items
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-12 sm:mt-16 md:mt-20">
        <div className="container py-8 sm:py-10 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight">Lendlly</h3>
              <p className="text-sm text-muted-foreground">
                A peer-to-peer rental marketplace connecting people to rent, earn, and request items nearby.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  asChild
                >
                  <a 
                    href="https://discord.gg/dm75Cz6Kjt" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Join our Discord"
                  >
                    <DiscordIcon className="h-5 w-5" />
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  asChild
                >
                  <a 
                    href="https://www.instagram.com/lendlly.in?igsh=amtkYjAyNnU4bWNj" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  asChild
                >
                  <a 
                    href="https://www.linkedin.com/company/lendlly/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow us on LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
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
                  <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/refund" className="text-muted-foreground hover:text-foreground transition-colors">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link to="/shipping" className="text-muted-foreground hover:text-foreground transition-colors">
                    Rentals & Delivery
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
                  <span className="text-muted-foreground">© 2026 Lendlly. All rights reserved.</span>
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
