# 💡 Usage Examples for @arolariu/components

> **Real-world examples to get you building faster!** Copy, paste, and customize these patterns for your projects.

## 🚀 Getting Started

### Installation & Setup

```bash
# Install the package
npm install @arolariu/components

# Install peer dependencies if needed
npm install react react-dom tailwindcss
```

```tsx
// Add to your app's root (App.tsx, main.tsx, or _app.tsx)
import "@arolariu/components/styles";
```

---

## 🎨 Layout Examples

### Simple Card Layout

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@arolariu/components/card";
import { Button } from "@arolariu/components/button";
import { Badge } from "@arolariu/components/badge";

export function ProductCard() {
  return (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Premium Plan</CardTitle>
          <Badge variant="secondary">Popular</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">
          $29<span className="text-sm font-normal">/month</span>
        </p>
        <ul className="mt-4 space-y-2">
          <li>✅ Unlimited projects</li>
          <li>✅ Priority support</li>
          <li>✅ Advanced analytics</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Subscribe Now</Button>
      </CardFooter>
    </Card>
  );
}
```

### Dashboard Layout with Sidebar

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarMenuItem,
} from "@arolariu/components/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import { Progress } from "@arolariu/components/progress";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@arolariu/components/avatar";

export function Dashboard() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar>
        <SidebarContent>
          <SidebarMenuItem href="/dashboard">Dashboard</SidebarMenuItem>
          <SidebarMenuItem href="/projects">Projects</SidebarMenuItem>
          <SidebarMenuItem href="/settings">Settings</SidebarMenuItem>
        </SidebarContent>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={75} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">75% complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                <Avatar className="border-2 border-background">
                  <AvatarImage src="/avatar1.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background">
                  <AvatarImage src="/avatar2.jpg" />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background">
                  <AvatarFallback>+3</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

---

## 📝 Form Examples

### Complete Login Form

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@arolariu/components/card";
import { Input } from "@arolariu/components/input";
import { Button } from "@arolariu/components/button";
import { Label } from "@arolariu/components/label";
import { Checkbox } from "@arolariu/components/checkbox";
import { Alert, AlertDescription } from "@arolariu/components/alert";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Your login logic here
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      console.log("Login successful!");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome Back</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label htmlFor="remember">Remember me</Label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button variant="link" size="sm">
              Forgot your password?
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

### Advanced Form with Validation

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@arolariu/components/form";
import { Input } from "@arolariu/components/input";
import { Button } from "@arolariu/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import { Textarea } from "@arolariu/components/textarea";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Please select a role"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      bio: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-md"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll never share your email with anyone else.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Save Profile</Button>
      </form>
    </Form>
  );
}
```

---

## 🧭 Navigation Examples

### Responsive Header Navigation

```tsx
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@arolariu/components/navigation-menu";
import { Button } from "@arolariu/components/button";
import { Sheet, SheetContent, SheetTrigger } from "@arolariu/components/sheet";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@arolariu/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import { MenuIcon, User, Settings, LogOut } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">MyApp</span>
          </a>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Button variant="ghost" href="/dashboard">
                  Dashboard
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button variant="ghost" href="/projects">
                  Projects
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button variant="ghost" href="/analytics">
                  Analytics
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="flex flex-col space-y-3">
              <Button
                variant="ghost"
                className="justify-start"
                href="/dashboard"
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                href="/projects"
              >
                Projects
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                href="/analytics"
              >
                Analytics
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search or other content can go here */}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

---

## 📊 Data Display Examples

### Interactive Data Table

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components/table";
import { Badge } from "@arolariu/components/badge";
import { Button } from "@arolariu/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  lastLogin: string;
}

const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    status: "active",
    lastLogin: "2 hours ago",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "User",
    status: "active",
    lastLogin: "1 day ago",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "User",
    status: "pending",
    lastLogin: "Never",
  },
];

export function UsersTable() {
  const getStatusBadge = (status: User["status"]) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableCaption>A list of your team members.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 💬 Modal & Dialog Examples

### Confirmation Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@arolariu/components/alert-dialog";
import { Button } from "@arolariu/components/button";
import { Trash } from "lucide-react";

export function DeleteConfirmation({
  itemName,
  onConfirm,
}: {
  itemName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete "
            {itemName}" and remove all associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, delete it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Settings Modal

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@arolariu/components/dialog";
import { Button } from "@arolariu/components/button";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import { Switch } from "@arolariu/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components/tabs";
import { Settings } from "lucide-react";

export function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="utc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive emails about your account activity.
                </div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive push notifications on your devices.
                </div>
              </div>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎨 Background Effects Examples

### Animated Landing Page

```tsx
import { DotBackground } from "@arolariu/components/dot-background";
import { BubbleBackground } from "@arolariu/components/bubble-background";
import { GradientBackground } from "@arolariu/components/gradient-background";
import { Button } from "@arolariu/components/button";
import { Card, CardContent } from "@arolariu/components/card";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <DotBackground className="absolute inset-0" />
      <GradientBackground className="absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
          Build Beautiful Apps
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {" "}
            Faster
          </span>
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
          Create stunning user interfaces with our comprehensive React component
          library. Built with accessibility, performance, and developer
          experience in mind.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" className="px-8">
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="px-8">
            View Components
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-lg font-semibold">60+ Components</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive set of UI components for any project
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-lg font-semibold">TypeScript First</h3>
              <p className="text-sm text-muted-foreground">
                Full type safety and excellent developer experience
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-lg font-semibold">Accessible</h3>
              <p className="text-sm text-muted-foreground">
                Built on Radix UI with WAI-ARIA compliance
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## 📱 Mobile-First Examples

### Mobile-Optimized Form

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@arolariu/components/sheet";
import { Button } from "@arolariu/components/button";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import { Textarea } from "@arolariu/components/textarea";
import { Plus } from "lucide-react";

export function MobileAddForm() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg md:hidden">
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Add New Item</SheetTitle>
          <SheetDescription>
            Fill out the form below to add a new item to your collection.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Enter title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter description"
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1">Save</Button>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 🎯 Tips for Success

### Performance Optimization

```tsx
// ✅ Import only what you need for optimal bundle size
import { Button } from "@arolariu/components/button";
import { Card } from "@arolariu/components/card";

// ❌ Avoid barrel imports
import { Button, Card } from "@arolariu/components";
```

### Accessibility Best Practices

```tsx
// ✅ Always include proper labels and ARIA attributes
<Button aria-label="Close dialog" onClick={handleClose}>
  <X className="h-4 w-4" />
</Button>

// ✅ Use semantic HTML structure
<main role="main">
  <section aria-labelledby="section-title">
    <h2 id="section-title">Section Title</h2>
    {/* content */}
  </section>
</main>
```

### Responsive Design

```tsx
// ✅ Use Tailwind's responsive utilities
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* components */}
</div>

// ✅ Hide/show components based on screen size
<div className="block md:hidden">Mobile only content</div>
<div className="hidden md:block">Desktop only content</div>
```

---

Ready to build something amazing? **[🚀 Start with our Quick Start Guide](./README.md#-quick-start)**
