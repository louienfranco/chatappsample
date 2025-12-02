1. `lib/supabase/client.ts`

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
}
```

2. `lib/supabase/server.ts`

```ts
// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function createClient() {
  // In your Next version, cookies() returns a Promise
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

3. `app/page.tsx`

```tsx
// app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/40 to-background px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          Supabase Auth
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Minimal Auth Demo
        </h1>
        <p className="text-xs text-muted-foreground">
          Sign in or create an account to access your dashboard.
        </p>
        <div className="mt-2 flex justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

4. Login

```tsx
// app/login/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
```

```tsx
// app/login/LoginForm.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);

      const msg = (error.message || "").toLowerCase();
      if (msg.includes("invalid login credentials")) {
        toast.error("Invalid login credentials");
      } else {
        toast.error(error.message || "Login failed. Please try again.");
      }

      return;
    }

    toast.success("Logged in successfully.");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/40 to-background px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Heading */}
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Supabase Auth
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-xs text-muted-foreground">
            Access your dashboard with your email and password.
          </p>
        </div>

        {/* Card */}
        <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm">Welcome back</CardTitle>
            <CardDescription className="text-[11px]">
              Enter your credentials to continue.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-1">
            <form className="space-y-3" onSubmit={handleLogin}>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-9 text-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                size="sm"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bottom text */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => router.push("/register")}
            disabled={loading}
          >
            Create one
          </button>
        </p>
      </div>
    </main>
  );
}
```

5. Register

```tsx
// app/register/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
```

```tsx
// app/register/RegisterForm.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Step = 1 | 2;

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Name is required.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      handleNext();
      return;
    }

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The DB trigger reads this as raw_user_meta_data->>'username'
        data: {
          username,
          display_name: displayName,
        },
      },
    });

    if (error) {
      setLoading(false);

      const msg = (error.message || "").toLowerCase();

      // Email already used
      if (msg.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
        return;
      }

      // DB error from trigger (e.g. username uniqueness failure)
      if (msg.includes("database error saving new user")) {
        toast.error("That username is already taken. Please choose another one.");
        return;
      }

      toast.error(error.message || "Failed to register.");
      return;
    }

    const { user, session } = data;

    // If email confirmations are enabled, you may have user but no session.
    // The profile has already been created by the trigger if signup succeeded.
    if (!user || !session) {
      setLoading(false);
      toast.success(
        "Registration succeeded. Please check your email to confirm your account."
      );
      return;
    }

    setLoading(false);
    toast.success("Registered successfully! You can now sign in.");
    router.push("/login");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/40 to-background px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Heading */}
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Supabase Auth
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Create account
          </h1>
          <p className="text-xs text-muted-foreground">
            A simple two-step sign up process.
          </p>
        </div>

        {/* Card */}
        <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">
                Step {step} <span className="text-muted-foreground/70">of 2</span>
              </span>
              <span>{step === 1 ? "Basic info" : "Account details"}</span>
            </div>
            <CardTitle className="mt-1 text-sm">
              {step === 1 ? "Who are you?" : "How can we reach you?"}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {step === 1
                ? "Pick a username and a name. Usernames are unique (case-insensitive)."
                : "Use a valid email address and a secure password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-1">
            <form className="space-y-3" onSubmit={handleSubmit}>
              {step === 1 && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="username" className="text-xs">
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="your-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      required
                      className="h-9 text-sm"
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      This will be your unique handle.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="displayName" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-md border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    <p className="flex justify-between">
                      <span>Username</span>
                      <span className="font-medium text-foreground">
                        {username}
                      </span>
                    </p>
                    <p className="mt-0.5 flex justify-between">
                      <span>Name</span>
                      <span className="font-medium text-foreground">
                        {displayName}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Button grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {step === 1 ? (
                  <>
                    <span />
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      size="sm"
                    >
                      Next
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={loading} size="sm">
                      {loading ? "Creating..." : "Create account"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bottom text */}
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => router.push("/login")}
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}
```

6. Dashboard

```tsx
// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("username, verified, verified_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    // You might log this somewhere, but don't break the page
    console.error("Failed to load user profile:", profileError.message);
  }

  const meta = (user.user_metadata || {}) as {
    username?: string;
    display_name?: string;
  };

  const username = profile?.username ?? meta.username ?? "(not set)";
  const isVerified = profile?.verified === true;

  const display =
    meta.display_name ||
    username ||
    user.email ||
    "Unknown user";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/40 to-background px-4">
      <div className="w-full max-w-lg">
        <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Dashboard</CardTitle>
                  <span
                    className={
                      "rounded-full border px-2 py-[2px] text-[10px] font-medium " +
                      (isVerified
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-600"
                        : "border-muted-foreground/30 bg-muted/40 text-muted-foreground")
                    }
                  >
                    {isVerified ? "Verified account" : "Standard account"}
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Welcome back,{" "}
                  <span className="font-semibold text-foreground">
                    {display}
                  </span>
                  .
                </CardDescription>
              </div>
              <LogoutButton />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Username:{" "}
              <span className="font-medium">
                {username}
              </span>
            </p>
            <p>
              Email:{" "}
              <span className="font-medium">
                {user.email ?? "(no email)"}
              </span>
            </p>
            {profile?.verified_at && (
              <p className="text-[11px] text-muted-foreground">
                Verified at:{" "}
                {new Date(profile.verified_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

```tsx
// app/dashboard/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message || "Failed to log out.");
      return;
    }

    toast.success("Logged out successfully.");
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}
```

```sql
-- 1) App-level user_profiles table (store canonical username and verified flag)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  username_ci text GENERATED ALWAYS AS (lower(username)) STORED,
  verified boolean DEFAULT false,
  verified_at timestamptz
);

-- 2) Unique index on case-insensitive username
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_ci_unique
  ON public.user_profiles(username_ci)
  WHERE username IS NOT NULL;

 
-- Optional: use the citext extension for simpler case-insensitive usernames
-- Uncomment and run these lines (once) if you prefer citext instead of the generated column + partial index.
-- CREATE EXTENSION IF NOT EXISTS citext;
-- ALTER TABLE public.user_profiles ALTER COLUMN username TYPE citext USING username::citext;
-- ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);
-- If you want to require usernames (no NULLs):
-- ALTER TABLE public.user_profiles ALTER COLUMN username SET NOT NULL;
-- Function to create a profile for every new auth user
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
begin
  -- Read username from auth.user's raw_user_meta_data
  raw_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  -- If no username was provided, just skip profile creation
  if raw_username is null then
    return new;
  end if;

  -- Quick existence check to provide a clearer error message when username is taken.
  if exists (
    select 1 from public.user_profiles
    where username_ci = lower(raw_username)
  ) then
    raise exception 'username % is already taken', raw_username;
  end if;

  -- Attempt insert; still catch unique_violation in case of a race.
  begin
    insert into public.user_profiles (user_id, username)
    values (new.id, raw_username);
  exception when unique_violation then
    -- Another session claimed the username between the check and insert.
    raise exception 'username % is already taken', raw_username;
  end;

  return new;
end;
$$;

-- Trigger on auth.users to call the function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
```
