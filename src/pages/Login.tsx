import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import GoogleAuth from '@/components/GoogleAuth';
import { ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fromPath = (location.state as { from?: string } | null)?.from || '/explore';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('Login successful!');
      
      // Redirect to explore after successful login
      setTimeout(() => {
        navigate(fromPath, { replace: true });
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden flex flex-col">
      <button onClick={() => window.location.href = '/signup'} className="absolute top-6 left-6 flex items-center text-muted-foreground hover:text-primary transition-colors z-20">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Signup
      </button>
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-1/4 top-1/4 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-float-slow" />
        <div className="absolute right-1/4 bottom-1/4 w-40 h-40 bg-secondary/10 rounded-full blur-2xl animate-float-slow" />
      </div>
      <div className="flex-1 flex items-center justify-center z-10 px-4 py-8">
        <Card className="glass-card w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl sm:text-3xl font-bold gradient-text">Lendlly</span>
            </div>
            <Badge className="mb-2 glass-effect text-xs sm:text-sm" variant="outline">✨ Welcome Back</Badge>
            <CardTitle className="text-xl sm:text-2xl font-urbanist font-bold">Sign In</CardTitle>
            <p className="text-sm sm:text-base text-muted-foreground">Sign in to continue your sharing journey</p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="flex justify-end text-sm mb-2">
                <a href="/forgot-password" className="text-primary hover:underline font-medium">Forgot Password?</a>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <GoogleAuth 
              className="w-full" 
              onSuccess={() => navigate(fromPath, { replace: true })}
            />
            
            {error && <Alert variant="destructive">{error}</Alert>}
            {message && <Alert>{message}</Alert>}
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login; 