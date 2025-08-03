import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/ui/navigation";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2 } from 'lucide-react';
import { signUpSchema, signInSchema, sanitizeInput, type SignUpFormData, type SignInFormData } from '@/lib/input-validation';
import { secureSignIn, secureSignUp, cleanupAuthState } from '@/lib/auth-cleanup';
import { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Separate form handlers for sign up and sign in
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    // Clean up auth state on component mount
    cleanupAuthState();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer navigation to prevent deadlocks
          setTimeout(() => {
            navigate('/');
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Sanitize inputs
      const sanitizedName = sanitizeInput(data.name);
      const sanitizedEmail = sanitizeInput(data.email);

      const { data: authData, error } = await secureSignUp(
        sanitizedEmail,
        data.password,
        { name: sanitizedName }
      );

      if (error) {
        setError(error.message);
      } else if (authData.user) {
        // Automatically create customer profile for new users
        try {
          await supabase
            .from('customer_profiles')
            .insert([
              {
                user_id: authData.user.id,
                full_name: sanitizedName,
              }
            ]);
        } catch (profileError) {
          console.error('Error creating customer profile:', profileError);
          // Don't fail the signup if profile creation fails
        }
        
        setSuccess("Check your email for the confirmation link!");
        signUpForm.reset();
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    setError("");

    try {
      // Sanitize email input
      const sanitizedEmail = sanitizeInput(data.email);

      const { error } = await secureSignIn(sanitizedEmail, data.password);

      if (error) {
        setError(error.message);
      }
      // Navigation will be handled by the auth state change listener
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms when switching between sign up and sign in
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setSuccess("");
    signUpForm.reset();
    signInForm.reset();
  };

  if (isSignUp) {
    const { handleSubmit, register, formState: { errors }, reset } = signUpForm;

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container py-20">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-center">
                  Create Your Account
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Join our community of adventurers and guides
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      {...register('name')}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      disabled={loading}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register('confirmPassword')}
                      disabled={loading}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </form>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-primary hover:underline"
                    disabled={loading}
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Sign In Form
  const { handleSubmit, register, formState: { errors }, reset } = signInForm;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-center">
                Welcome Back
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Sign in to access your dashboard
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    disabled={loading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;