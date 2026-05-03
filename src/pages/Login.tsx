import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { adminExists, bootstrapFirstAdmin } from "@/lib/admin";
import adoLogo from "@/assets/ado-logo.png";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [bootstrapName, setBootstrapName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    adminExists()
      .then((r) => setNeedsBootstrap(!r.exists))
      .catch(() => setNeedsBootstrap(false));
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back");
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bootstrapFirstAdmin({ data: { name: bootstrapName, email, password } });
      toast.success("Admin created. Signing you in…");
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <img
            src={adoLogo}
            alt="ADO Transport logo"
            className="mx-auto mb-4 w-full max-w-xs h-auto object-contain"
          />
          <CardTitle>ADO Transport · Logistics OS</CardTitle>
          <CardDescription>
            {needsBootstrap
              ? "Set up the first administrator account."
              : "Sign in with your staff credentials."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={needsBootstrap ? handleBootstrap : handleLogin} className="space-y-4">
            {needsBootstrap && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={bootstrapName} onChange={(e) => setBootstrapName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={needsBootstrap ? "new-password" : "current-password"} minLength={needsBootstrap ? 8 : undefined} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait…" : needsBootstrap ? "Create admin & sign in" : "Sign in"}
            </Button>
            {!needsBootstrap && (
              <p className="text-xs text-muted-foreground text-center">
                Accounts are created by an administrator. No public signup.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
