import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { 
  DollarSign, 
  ArrowRightLeft, 
  Repeat2, 
  CheckCircle,
  Loader2
} from 'lucide-react';

interface OnboardingProps {
  onComplete?: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [selectedRole, setSelectedRole] = useState<'rent' | 'swap' | 'both' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const roles = [
    {
      id: 'rent' as const,
      title: 'Rent Items',
      description: 'List your items for others to rent and earn money',
      icon: DollarSign,
      color: 'bg-green-500',
      features: ['Earn passive income', 'Flexible pricing', 'Secure payments']
    },
    {
      id: 'swap' as const,
      title: 'Swap Items',
      description: 'Exchange items with others without spending money',
      icon: ArrowRightLeft,
      color: 'bg-blue-500',
      features: ['Save money', 'Try new items', 'Reduce waste']
    },
    {
      id: 'both' as const,
      title: 'Rent & Swap',
      description: 'Get the best of both worlds - earn and save',
      icon: Repeat2,
      color: 'bg-purple-500',
      features: ['Maximum flexibility', 'Diverse options', 'Full experience']
    }
  ];

  const handleComplete = async () => {
    if (!selectedRole || !auth.currentUser) return;

    try {
      setLoading(true);
      
      await updateUser(auth.currentUser.uid, { role: selectedRole });
      
      toast({
        title: "Welcome to Lendlly!",
        description: "Your preferences have been saved. Let's start exploring!"
      });

      onComplete?.();
      navigate('/explore');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Badge className="mb-4 glass-effect" variant="outline">
            ✨ Welcome to Lendlly
          </Badge>
          <h1 className="text-3xl md:text-4xl font-urbanist font-bold mb-4">
            How would you like to <span className="gradient-text">get started</span>?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your primary way of using Lendlly. You can always change this later in your settings.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <Card 
              key={role.id}
              className={`cursor-pointer transition-all hover-scale glass-card ${
                selectedRole === role.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <role.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{role.title}</CardTitle>
                <p className="text-muted-foreground">{role.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            size="lg"
            onClick={handleComplete}
            disabled={!selectedRole || loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up your account...
              </>
            ) : (
              <>
                Continue
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          
          {selectedRole && (
            <p className="text-sm text-muted-foreground mt-4">
              You selected: <span className="font-semibold text-primary">
                {roles.find(r => r.id === selectedRole)?.title}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
