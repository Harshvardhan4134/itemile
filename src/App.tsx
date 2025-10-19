import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import ProductDetail from "./pages/ProductDetail";
import PostItem from "./pages/PostItem";
import PostRequest from "./pages/PostRequest";
import RequestsFeed from "./pages/RequestsFeed";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Chat from "./pages/Chat";
import ChatInbox from "./pages/ChatInbox";
import SimpleChat from "./pages/SimpleChat";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import AdminKYC from "./pages/AdminKYC";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/item/:id" element={<ProductDetail />} />
          <Route path="/post" element={<PostItem />} />
          <Route path="/post-request" element={<PostRequest />} />
          <Route path="/requests" element={<RequestsFeed />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:transactionId" element={<Chat />} />
          <Route path="/chat" element={<ChatInbox />} />
          <Route path="/chat/:chatId" element={<SimpleChat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/verify-users" element={<AdminKYC />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;