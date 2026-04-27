# 💡 Usage Examples for @arolariu/components

> **Real-world examples to get you building faster.** Copy, paste, and customize these patterns for your projects.

## 🚀 Getting Started

### Installation & Setup

```bash
npm install @arolariu/components

# Peer dependencies (install if not already in your project)
npm install react react-dom @base-ui/react motion
```

```tsx
// Import design tokens only once in your app entry point
import "@arolariu/components/styles";

// Components auto-load their CSS when imported
import { Button, Card } from "@arolariu/components";
```

`@arolariu/components/styles` provides design tokens only. Component CSS is loaded automatically when components are imported.

```tsx
// Use local CSS Modules for application-specific layout and composition
import styles from "./my-component.module.css";
```

No utility CSS framework is required as a peer dependency in v1.0.0.

### Useful Subpath Imports

```tsx
import { Button } from "@arolariu/components/button";
import { useIsMobile } from "@arolariu/components/useIsMobile";
import { cn } from "@arolariu/components/utilities";
import { hexToHsl } from "@arolariu/components/color-conversion-utilities";
```

### Composition with the `render` Prop

```tsx
import { Button } from "@arolariu/components";

// Use render prop instead of asChild
<Button render={<a href="/dashboard" />}>
  Go to Dashboard
</Button>
```

```css
/* my-component.module.css */
.page {
  min-height: 100vh;
  padding: 2rem;
}
```

---

## 🎨 Layout Examples

### Simple Card Layout

```tsx
import { Badge } from "@arolariu/components/badge";
import { Button } from "@arolariu/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import styles from "./product-card.module.css";

export function ProductCard() {
  return (
    <Card className={styles.card}>
      <CardHeader>
        <div className={styles.headerRow}>
          <CardTitle>Premium Plan</CardTitle>
          <Badge variant="secondary">Popular</Badge>
        </div>
      </CardHeader>
      <CardContent className={styles.content}>
        <p className={styles.price}>
          $29<span className={styles.priceSuffix}>/month</span>
        </p>
        <ul className={styles.featureList}>
          <li>✅ Unlimited projects</li>
          <li>✅ Priority support</li>
          <li>✅ Advanced analytics</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className={styles.primaryAction}>Subscribe Now</Button>
      </CardFooter>
    </Card>
  );
}
```

```css
/* product-card.module.css */
.card {
  width: 24rem;
}

.headerRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.content {
  display: grid;
  gap: 1rem;
}

.price {
  font-size: 1.875rem;
  font-weight: 700;
}

.priceSuffix {
  font-size: 0.875rem;
  font-weight: 400;
}

.featureList {
  display: grid;
  gap: 0.5rem;
  padding-left: 1.25rem;
}

.primaryAction {
  width: 100%;
}
```

### Dashboard Layout with Sidebar

```tsx
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@arolariu/components/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import { Progress } from "@arolariu/components/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@arolariu/components/sidebar";
import styles from "./dashboard.module.css";

export function Dashboard() {
  return (
    <SidebarProvider>
      <div className={styles.layout}>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Projects</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Settings</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className={styles.main}>
          <h1 className={styles.title}>Dashboard</h1>

          <div className={styles.cardGrid}>
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent className={styles.stack}>
                <Progress value={75} />
                <p className={styles.mutedText}>75% complete</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.avatarRow}>
                  <Avatar className={styles.avatar}>
                    <AvatarImage src="/avatar1.jpg" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar className={styles.avatar}>
                    <AvatarImage src="/avatar2.jpg" />
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar className={styles.avatar}>
                    <AvatarFallback>+3</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

---

## 📝 Form Examples

### Complete Login Form

```tsx
import { useState } from "react";

import { Alert, AlertDescription } from "@arolariu/components/alert";
import { Button } from "@arolariu/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import { Checkbox } from "@arolariu/components/checkbox";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import styles from "./login-form.module.css";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Login successful");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle className={styles.centeredTitle}>Welcome Back</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className={styles.content}>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className={styles.field}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className={styles.checkboxRow}>
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label htmlFor="remember">Remember me</Label>
            </div>
          </CardContent>

          <CardFooter className={styles.footer}>
            <Button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <a
              className={styles.link}
              href="/forgot-password"
            >
              Forgot your password?
            </a>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

### Advanced Form with Validation

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@arolariu/components/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import { Textarea } from "@arolariu/components/textarea";
import styles from "./profile-form.module.css";

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
        className={styles.form}
      >
        <div className={styles.twoColumnGrid}>
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John"
                    {...field}
                  />
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
                  <Input
                    placeholder="Doe"
                    {...field}
                  />
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
                <Input
                  placeholder="john.doe@example.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                We&apos;ll never share your email with anyone else.
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
              <Select
                defaultValue={field.value}
                onValueChange={field.onChange}
              >
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
                  className={styles.textarea}
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@arolariu/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@arolariu/components/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@arolariu/components/sheet";
import { LogOut, MenuIcon, Settings, User } from "lucide-react";
import styles from "./app-header.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.desktopArea}>
          <a
            className={styles.brandLink}
            href="/"
          >
            <span className={styles.brandName}>MyApp</span>
          </a>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="/dashboard">Dashboard</NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/projects">Projects</NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/analytics">Analytics</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <Sheet>
          <SheetTrigger
            render={<button type="button" className={styles.mobileMenuButton} />}
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left">
            <nav className={styles.mobileNav}>
              <a href="/dashboard">Dashboard</a>
              <a href="/projects">Projects</a>
              <a href="/analytics">Analytics</a>
            </nav>
          </SheetContent>
        </Sheet>

        <div className={styles.actions}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={styles.avatarButton} />}
            >
              <Avatar>
                <AvatarImage
                  src="/avatars/01.png"
                  alt="User"
                />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut />
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
import { Badge } from "@arolariu/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components/table";
import { Edit, Eye, MoreHorizontal, Trash } from "lucide-react";
import styles from "./users-table.module.css";

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
    <div className={styles.wrapper}>
      <div className={styles.tableShell}>
        <Table>
          <TableCaption>A list of your team members.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className={styles.actionsColumn}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className={styles.emphasisCell}>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<button type="button" className={styles.iconButton} />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className={styles.dangerItem}>
                        <Trash />
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
import { Trash } from "lucide-react";
import styles from "./delete-confirmation.module.css";

export function DeleteConfirmation({
  itemName,
  onConfirm,
}: {
  itemName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<button type="button" className={styles.triggerButton} />}
      >
        <Trash />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete
            {" "}
            {itemName}
            {" "}
            and remove all associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
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
import { Button } from "@arolariu/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@arolariu/components/dialog";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import { Switch } from "@arolariu/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@arolariu/components/tabs";
import { Settings } from "lucide-react";
import styles from "./settings-dialog.module.css";

export function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<button type="button" className={styles.trigger} />}
      >
        <Settings />
        Settings
      </DialogTrigger>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="general"
          className={styles.tabs}
        >
          <TabsList className={styles.tabsList}>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent
            value="general"
            className={styles.panel}
          >
            <div className={styles.field}>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                defaultValue="John Doe"
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                defaultValue="john@example.com"
              />
            </div>
            <div className={styles.field}>
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

          <TabsContent
            value="notifications"
            className={styles.panel}
          >
            <div className={styles.switchRow}>
              <div className={styles.switchText}>
                <Label>Email Notifications</Label>
                <div className={styles.mutedText}>
                  Receive emails about your account activity.
                </div>
              </div>
              <Switch />
            </div>
            <div className={styles.switchRow}>
              <div className={styles.switchText}>
                <Label>Push Notifications</Label>
                <div className={styles.mutedText}>
                  Receive push notifications on your devices.
                </div>
              </div>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent
            value="security"
            className={styles.panel}
          >
            <div className={styles.field}>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
              />
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

## 🎨 Theming Examples

### App Theme with `--ac-*` Tokens

```css
:root {
  --ac-primary: oklch(0.6 0.2 250);
  --ac-radius: 0.5rem;
}
```

```css
/* app-theme.module.css */
.themeScope {
  --ac-primary: oklch(0.68 0.2 258);
  --ac-primary-foreground: oklch(0.98 0.01 258);
  --ac-secondary: oklch(0.95 0.02 286);
  --ac-background: oklch(0.99 0 0);
  --ac-radius-md: 0.75rem;
  --ac-radius-lg: 1rem;
}

.themeScope[data-theme="dark"] {
  --ac-background: oklch(0.17 0.01 286);
  --ac-foreground: oklch(0.98 0 0);
  --ac-card: oklch(0.2 0.01 286);
}
```

```tsx
import { Button } from "@arolariu/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@arolariu/components/card";
import styles from "./app-theme.module.css";

export function ThemePreview() {
  return (
    <section
      className={styles.themeScope}
      data-theme="dark"
    >
      <Card>
        <CardHeader>
          <CardTitle>Custom theme scope</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Token-driven button</Button>
        </CardContent>
      </Card>
    </section>
  );
}
```

### Styling Base UI State Attributes

```css
/* checkbox-demo.module.css */
.checkboxRow {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.checkboxRow :global([data-checked]) {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--ac-primary) 25%, transparent);
}

.checkboxRow :global([data-disabled]) {
  opacity: 0.5;
}
```

---

## 📱 Mobile-First Examples

### Mobile-Optimized Form

```tsx
import { Button } from "@arolariu/components/button";
import { Input } from "@arolariu/components/input";
import { Label } from "@arolariu/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@arolariu/components/sheet";
import { Textarea } from "@arolariu/components/textarea";
import { Plus } from "lucide-react";
import styles from "./mobile-add-form.module.css";

export function MobileAddForm() {
  return (
    <Sheet>
      <SheetTrigger
        render={<button type="button" className={styles.fab} />}
      >
        <Plus />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={styles.sheetContent}
      >
        <SheetHeader>
          <SheetTitle>Add New Item</SheetTitle>
          <SheetDescription>
            Fill out the form below to add a new item to your collection.
          </SheetDescription>
        </SheetHeader>

        <div className={styles.formStack}>
          <div className={styles.field}>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter title"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter description"
              className={styles.textarea}
            />
          </div>

          <div className={styles.actionRow}>
            <Button className={styles.flexButton}>Save</Button>
            <Button
              variant="outline"
              className={styles.flexButton}
            >
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

// ❌ Avoid barrel imports when bundle size matters
import { Button, Card } from "@arolariu/components";
```

### Accessibility Best Practices

```tsx
// ✅ Always include proper labels and ARIA attributes
<Button
  aria-label="Close dialog"
  onClick={handleClose}
>
  <X />
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

```css
/* responsive-layout.module.css */
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 48rem) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 64rem) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

Ready to build something amazing? **[🚀 Start with our Quick Start Guide](./README.md#-quick-start)**

---

## 🎓 Pattern Recipes

> **Real-world patterns ready to copy, paste, and customize.** These recipes demonstrate common UI patterns using @arolariu/components with best practices for forms, data, modals, and error handling.

### Recipe 1: Login Form with Validation

**Complete login form with zod validation, error handling, and loading states.**

```tsx
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";

import {Alert, AlertDescription} from "@arolariu/components/alert";
import {Button} from "@arolariu/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@arolariu/components/card";
import {Checkbox} from "@arolariu/components/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@arolariu/components/form";
import {Input} from "@arolariu/components/input";
import {toast} from "@arolariu/components/sonner";
import styles from "./login-form.module.css";

// Define validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check credentials (mock)
      if (values.email === "demo@example.com" && values.password === "password123") {
        toast.success("Login successful! Redirecting...");
        // Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      toast.error("Login failed. Please check your credentials and try again.");
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <CardHeader className={styles.header}>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className={styles.content}>
              {form.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({field}) => (
                  <FormItem className={styles.checkboxItem}>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className={styles.checkboxLabel}>
                      Remember me for 30 days
                    </FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className={styles.footer}>
              <Button
                type="submit"
                className={styles.submitButton}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>

              <div className={styles.links}>
                <a href="/forgot-password" className={styles.link}>
                  Forgot password?
                </a>
                <a href="/signup" className={styles.link}>
                  Create account
                </a>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
```

```css
/* login-form.module.css */
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background-color: var(--ac-muted);
}

.card {
  width: min(28rem, 100%);
}

.header {
  text-align: center;
}

.content {
  display: grid;
  gap: 1rem;
}

.checkboxItem {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkboxLabel {
  margin-top: 0;
  font-weight: 400;
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.submitButton {
  width: 100%;
}

.links {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.link {
  color: var(--ac-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
```

---

### Recipe 2: Data Table with Sorting (TanStack Table)

**Sortable, filterable data table with row actions and pagination.**

```tsx
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal} from "lucide-react";
import {useState} from "react";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import {Input} from "@arolariu/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components/table";
import {toast} from "@arolariu/components/sonner";
import styles from "./data-table.module.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  status: "active" | "inactive";
  createdAt: Date;
}

const data: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    status: "active",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "user",
    status: "active",
    createdAt: new Date("2024-02-20"),
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "guest",
    status: "inactive",
    createdAt: new Date("2024-03-10"),
  },
];

const columnHelper = createColumnHelper<User>();

export function DataTableWithSorting() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = [
    columnHelper.accessor("name", {
      header: ({column}) => (
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className={styles.sortIcon} />
        </button>
      ),
      cell: (info) => <span className={styles.emphasisText}>{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      header: "Email",
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (info) => {
        const role = info.getValue();
        return (
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        return (
          <Badge variant={status === "active" ? "default" : "outline"}>
            {status}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: ({column}) => (
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className={styles.sortIcon} />
        </button>
      ),
      cell: (info) => info.getValue().toLocaleDateString(),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({row}) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" className={styles.iconButton} />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(row.original.id);
                toast.success("User ID copied to clipboard");
              }}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info(`Viewing user: ${row.original.name}`)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info(`Editing user: ${row.original.name}`)}>
              Edit user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Input
          placeholder="Search users..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableWrapper}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className={styles.emptyCell}>
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className={styles.paginationButtons}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

```css
/* data-table.module.css */
.container {
  display: grid;
  gap: 1rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

.searchInput {
  max-width: 20rem;
}

.tableWrapper {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
  overflow: hidden;
}

.sortButton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
}

.sortIcon {
  width: 1rem;
  height: 1rem;
  opacity: 0.5;
}

.emphasisText {
  font-weight: 500;
}

.iconButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  border-radius: var(--ac-radius-sm);
  cursor: pointer;
}

.iconButton:hover {
  background-color: var(--ac-accent);
}

.emptyCell {
  text-align: center;
  padding: 2rem;
  color: var(--ac-muted-foreground);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paginationInfo {
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}

.paginationButtons {
  display: flex;
  gap: 0.5rem;
}
```

---

### Recipe 3: Modal Form (Dialog + Form + Validation)

**Dialog with form validation and async submission.**

```tsx
import {zodResolver} from "@hookform/resolvers/zod";
import {Plus} from "lucide-react";
import {useState} from "react";
import {useForm} from "react-hook-form";
import * as z from "zod";

import {Button} from "@arolariu/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@arolariu/components/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@arolariu/components/form";
import {Input} from "@arolariu/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import {Textarea} from "@arolariu/components/textarea";
import {toast} from "@arolariu/components/sonner";
import styles from "./modal-form.module.css";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  category: z.enum(["web", "mobile", "desktop", "other"], {
    required_error: "Please select a category",
  }),
  budget: z.string().regex(/^\d+$/, "Budget must be a valid number"),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function CreateProjectModal() {
  const [open, setOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      budget: "",
    },
  });

  async function onSubmit(values: ProjectFormValues) {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Project created:", values);
      toast.success("Project created successfully!");

      // Close modal and reset form
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to create project. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Create Project
      </DialogTrigger>

      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormField
              control={form.control}
              name="name"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a unique name for your project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile">Mobile App</SelectItem>
                      <SelectItem value="desktop">Desktop Application</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Budget (USD)</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="10000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project..."
                      className={styles.textarea}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

```css
/* modal-form.module.css */
.content {
  max-width: 32rem;
}

.form {
  display: grid;
  gap: 1rem;
  padding-block: 1rem;
}

.textarea {
  min-height: 6rem;
  resize: vertical;
}
```

---

### Recipe 4: Toast Notifications (Sonner)

**Comprehensive toast notification patterns for all use cases.**

```tsx
import {CheckCircle2, Info, Loader2, XCircle} from "lucide-react";

import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components/card";
import {toast, Toaster} from "@arolariu/components/sonner";
import styles from "./toast-demo.module.css";

export function ToastDemo() {
  // Basic toasts
  const showSuccess = () => {
    toast.success("Operation completed successfully!");
  };

  const showError = () => {
    toast.error("Something went wrong. Please try again.");
  };

  const showInfo = () => {
    toast.info("This is an informational message.");
  };

  const showWarning = () => {
    toast.warning("Warning: This action cannot be undone!");
  };

  // Toast with action
  const showWithAction = () => {
    toast.success("File uploaded successfully", {
      action: {
        label: "View",
        onClick: () => console.log("View clicked"),
      },
    });
  };

  // Toast with description
  const showWithDescription = () => {
    toast.success("Project created", {
      description: "Your project has been created and is now live.",
    });
  };

  // Promise toast (loading → success/error)
  const showPromiseToast = () => {
    const uploadPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve({name: "document.pdf"}) : reject(new Error("Upload failed"));
      }, 2000);
    });

    toast.promise(uploadPromise, {
      loading: "Uploading file...",
      success: (data: {name: string}) => `${data.name} uploaded successfully!`,
      error: "Failed to upload file.",
    });
  };

  // Custom styled toast
  const showCustomToast = () => {
    toast.custom(
      <div className={styles.customToast}>
        <CheckCircle2 className={styles.customIcon} />
        <div className={styles.customContent}>
          <div className={styles.customTitle}>Custom Toast</div>
          <div className={styles.customDescription}>
            This is a fully customized toast notification.
          </div>
        </div>
      </div>
    );
  };

  // Loading toast (manual control)
  const showLoadingToast = () => {
    const toastId = toast.loading("Processing your request...");

    setTimeout(() => {
      toast.success("Request processed!", {id: toastId});
    }, 3000);
  };

  return (
    <>
      <Toaster position="top-right" richColors />

      <div className={styles.container}>
        <Card>
          <CardHeader>
            <CardTitle>Toast Notification Examples</CardTitle>
          </CardHeader>
          <CardContent className={styles.grid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Basic Toasts</h3>
              <div className={styles.buttonGroup}>
                <Button onClick={showSuccess} variant="default">
                  <CheckCircle2 />
                  Success Toast
                </Button>
                <Button onClick={showError} variant="destructive">
                  <XCircle />
                  Error Toast
                </Button>
                <Button onClick={showInfo} variant="outline">
                  <Info />
                  Info Toast
                </Button>
                <Button onClick={showWarning} variant="outline">
                  Warning Toast
                </Button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Advanced Toasts</h3>
              <div className={styles.buttonGroup}>
                <Button onClick={showWithAction} variant="secondary">
                  Toast with Action
                </Button>
                <Button onClick={showWithDescription} variant="secondary">
                  Toast with Description
                </Button>
                <Button onClick={showPromiseToast} variant="secondary">
                  <Loader2 />
                  Promise Toast
                </Button>
                <Button onClick={showLoadingToast} variant="secondary">
                  Loading Toast
                </Button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Custom Toast</h3>
              <Button onClick={showCustomToast} variant="outline">
                Show Custom Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

```css
/* toast-demo.module.css */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.grid {
  display: grid;
  gap: 2rem;
}

.section {
  display: grid;
  gap: 1rem;
}

.sectionTitle {
  font-size: 1rem;
  font-weight: 600;
}

.buttonGroup {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.customToast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--ac-card);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
  box-shadow: var(--ac-shadow-lg);
}

.customIcon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ac-primary);
}

.customContent {
  display: grid;
  gap: 0.25rem;
}

.customTitle {
  font-weight: 600;
}

.customDescription {
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}
```

---

### Recipe 5: Sidebar Navigation (with Keyboard Support)

**Responsive sidebar with keyboard navigation and active states.**

```tsx
import {
  ChevronDown,
  FileText,
  Home,
  Settings,
  Users,
} from "lucide-react";
import {useState} from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@arolariu/components/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@arolariu/components/sidebar";
import styles from "./app-sidebar.module.css";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
  },
  {
    title: "Team",
    icon: Users,
    url: "/team",
    submenu: [
      {title: "Members", url: "/team/members"},
      {title: "Roles", url: "/team/roles"},
      {title: "Invitations", url: "/team/invitations"},
    ],
  },
  {
    title: "Projects",
    icon: FileText,
    url: "/projects",
    submenu: [
      {title: "Active", url: "/projects/active"},
      {title: "Archived", url: "/projects/archived"},
      {title: "Templates", url: "/projects/templates"},
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
  },
];

export function AppSidebar() {
  const [activeItem, setActiveItem] = useState("/dashboard");

  return (
    <SidebarProvider>
      <div className={styles.layout}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = activeItem === item.url || activeItem.startsWith(item.url + "/");

                    if (item.submenu) {
                      return (
                        <Collapsible key={item.title} defaultOpen={isActive}>
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton isActive={isActive}>
                                <item.icon />
                                <span>{item.title}</span>
                                <ChevronDown className={styles.chevron} />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.submenu.map((subitem) => (
                                  <SidebarMenuSubItem key={subitem.title}>
                                    <SidebarMenuSubButton
                                      isActive={activeItem === subitem.url}
                                      onClick={() => setActiveItem(subitem.url)}
                                    >
                                      {subitem.title}
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setActiveItem(item.url)}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className={styles.main}>
          <div className={styles.header}>
            <SidebarTrigger />
            <h1 className={styles.title}>Welcome to Dashboard</h1>
          </div>

          <div className={styles.content}>
            <p>Current route: {activeItem}</p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

```css
/* app-sidebar.module.css */
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  display: grid;
  grid-template-rows: auto 1fr;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--ac-border);
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content {
  padding: 2rem;
}

.chevron {
  margin-left: auto;
  transition: transform 150ms;
}

:global([data-state="open"]) .chevron {
  transform: rotate(180deg);
}
```

---

### Recipe 6: Accessible Dropdown Menu (with Keyboard Nav)

**Fully accessible dropdown menu with keyboard shortcuts.**

```tsx
import {
  Copy,
  Download,
  Edit,
  LogOut,
  MoreVertical,
  Share2,
  Trash2,
  User,
} from "lucide-react";

import {Button} from "@arolariu/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@arolariu/components/dropdown-menu";
import {toast} from "@arolariu/components/sonner";
import styles from "./dropdown-demo.module.css";

export function AccessibleDropdownMenu() {
  const handleAction = (action: string) => {
    toast.info(`Action: ${action}`);
  };

  return (
    <div className={styles.container}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <MoreVertical />
          Actions
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className={styles.content}>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => handleAction("Profile")}>
              <User />
              <span>Profile</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction("Edit")}>
              <Edit />
              <span>Edit</span>
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction("Copy")}>
              <Copy />
              <span>Copy Link</span>
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction("Share")}>
              <Share2 />
              <span>Share</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => handleAction("Download")}>
              <Download />
              <span>Download</span>
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleAction("Delete")}
            className={styles.dangerItem}
          >
            <Trash2 />
            <span>Delete</span>
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleAction("Logout")}>
            <LogOut />
            <span>Log out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className={styles.instructions}>
        <p className={styles.instructionTitle}>Keyboard Navigation:</p>
        <ul className={styles.instructionList}>
          <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Open menu</li>
          <li><kbd>↑</kbd> <kbd>↓</kbd> - Navigate items</li>
          <li><kbd>Enter</kbd> - Select item</li>
          <li><kbd>Esc</kbd> - Close menu</li>
        </ul>
      </div>
    </div>
  );
}
```

```css
/* dropdown-demo.module.css */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 4rem 1rem;
}

.content {
  min-width: 14rem;
}

.dangerItem {
  color: var(--ac-destructive);
}

.instructions {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--ac-muted);
  border-radius: var(--ac-radius-md);
}

.instructionTitle {
  font-weight: 600;
}

.instructionList {
  display: grid;
  gap: 0.25rem;
  padding-left: 1.5rem;
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}

.instructionList kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background-color: var(--ac-background);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  font-family: var(--ac-font-mono);
  font-size: 0.75rem;
}
```

---

### Recipe 7: Date Picker (Calendar Integration)

**Calendar-based date picker with range selection.**

```tsx
import {format} from "date-fns";
import {Calendar as CalendarIcon} from "lucide-react";
import {useState} from "react";

import {Button} from "@arolariu/components/button";
import {Calendar} from "@arolariu/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@arolariu/components/popover";
import {cn} from "@arolariu/components/utilities";
import styles from "./date-picker.module.css";

export function DatePicker() {
  const [date, setDate] = useState<Date | undefined>();

  return (
    <div className={styles.container}>
      <div className={styles.field}>
        <label className={styles.label}>Select Date</label>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" className={styles.trigger} />}>
            <CalendarIcon className={styles.icon} />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </PopoverTrigger>
          <PopoverContent align="start" className={styles.popoverContent}>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function DateRangePicker() {
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({
    from: undefined,
    to: undefined,
  });

  return (
    <div className={styles.container}>
      <div className={styles.field}>
        <label className={styles.label}>Select Date Range</label>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" className={styles.trigger} />}>
            <CalendarIcon className={styles.icon} />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className={styles.popoverContent}>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) =>
                setDateRange({
                  from: range?.from,
                  to: range?.to,
                })
              }
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
```

```css
/* date-picker.module.css */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.field {
  display: grid;
  gap: 0.5rem;
  width: min(24rem, 100%);
}

.label {
  font-weight: 500;
}

.trigger {
  justify-content: flex-start;
  text-align: left;
  font-weight: 400;
}

.icon {
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
}

.popoverContent {
  width: auto;
  padding: 0;
}
```

---

### Recipe 8: File Upload Area (with Progress)

**Drag-and-drop file upload with progress tracking.**

```tsx
import {Upload, X} from "lucide-react";
import {useState} from "react";

import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components/card";
import {Progress} from "@arolariu/components/progress";
import {toast} from "@arolariu/components/sonner";
import styles from "./file-upload.module.css";

interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
}

export function FileUploadArea() {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newUploads: FileUpload[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Simulate upload progress
    newUploads.forEach((upload) => {
      simulateUpload(upload.id);
    });
  };

  const simulateUpload = (id: string) => {
    const interval = setInterval(() => {
      setUploads((prev) =>
        prev.map((upload) => {
          if (upload.id === id) {
            const newProgress = Math.min(upload.progress + 10, 100);
            const newStatus = newProgress === 100 ? "complete" : upload.status;

            if (newStatus === "complete") {
              clearInterval(interval);
              toast.success(`${upload.file.name} uploaded successfully`);
            }

            return {...upload, progress: newProgress, status: newStatus};
          }
          return upload;
        })
      );
    }, 300);
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== id));
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
        </CardHeader>
        <CardContent className={styles.content}>
          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={styles.uploadIcon} />
            <div className={styles.dropZoneText}>
              <p className={styles.dropZoneTitle}>Drop files here or click to upload</p>
              <p className={styles.dropZoneSubtitle}>
                Supports: Images, PDFs, Documents (Max 10MB)
              </p>
            </div>
            <input
              type="file"
              multiple
              className={styles.fileInput}
              onChange={handleFileInput}
            />
          </div>

          {uploads.length > 0 ? (
            <div className={styles.uploadList}>
              {uploads.map((upload) => (
                <div key={upload.id} className={styles.uploadItem}>
                  <div className={styles.uploadInfo}>
                    <div className={styles.uploadName}>{upload.file.name}</div>
                    <div className={styles.uploadSize}>
                      {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>

                  <div className={styles.uploadProgress}>
                    <Progress value={upload.progress} className={styles.progressBar} />
                    <span className={styles.uploadPercent}>{upload.progress}%</span>
                  </div>

                  {upload.status === "complete" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUpload(upload.id)}
                      className={styles.removeButton}
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
```

```css
/* file-upload.module.css */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.card {
  width: min(40rem, 100%);
}

.content {
  display: grid;
  gap: 1.5rem;
}

.dropZone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  border: 2px dashed var(--ac-border);
  border-radius: var(--ac-radius-md);
  background-color: var(--ac-muted);
  cursor: pointer;
  transition: all 150ms;
}

.dropZone:hover {
  border-color: var(--ac-primary);
  background-color: color-mix(in oklch, var(--ac-primary) 5%, var(--ac-muted));
}

.dropZoneActive {
  border-color: var(--ac-primary);
  background-color: color-mix(in oklch, var(--ac-primary) 10%, var(--ac-muted));
}

.uploadIcon {
  width: 3rem;
  height: 3rem;
  color: var(--ac-muted-foreground);
}

.dropZoneText {
  text-align: center;
}

.dropZoneTitle {
  font-weight: 600;
}

.dropZoneSubtitle {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}

.fileInput {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.uploadList {
  display: grid;
  gap: 1rem;
}

.uploadItem {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
}

.uploadInfo {
  display: grid;
  gap: 0.25rem;
}

.uploadName {
  font-weight: 500;
  word-break: break-all;
}

.uploadSize {
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}

.uploadProgress {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progressBar {
  flex: 1;
}

.uploadPercent {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ac-muted-foreground);
}

.removeButton {
  align-self: flex-start;
}
```

---

### Recipe 9: Settings Page (Tabs + Form + Switch)

**Complete settings page with tabs and form controls.**

```tsx
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";

import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@arolariu/components/form";
import {Input} from "@arolariu/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@arolariu/components/select";
import {Switch} from "@arolariu/components/switch";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components/tabs";
import {Textarea} from "@arolariu/components/textarea";
import {toast} from "@arolariu/components/sonner";
import styles from "./settings-page.module.css";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  weeklyDigest: z.boolean(),
});

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
});

export function SettingsPage() {
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "johndoe",
      email: "john@example.com",
      bio: "",
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
    },
  });

  const appearanceForm = useForm<z.infer<typeof appearanceSchema>>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: "system",
      language: "en",
    },
  });

  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    console.log("Profile updated:", values);
    toast.success("Profile updated successfully!");
  };

  const onNotificationSubmit = (values: z.infer<typeof notificationSchema>) => {
    console.log("Notifications updated:", values);
    toast.success("Notification preferences updated!");
  };

  const onAppearanceSubmit = (values: z.infer<typeof appearanceSchema>) => {
    console.log("Appearance updated:", values);
    toast.success("Appearance settings updated!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className={styles.tabs}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className={styles.tabContent}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details and public information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className={styles.form}
                >
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your email address for account notifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself..."
                            className={styles.textarea}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Brief description for your profile. Max 500 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className={styles.tabContent}>
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form
                  onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}
                  className={styles.form}
                >
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({field}) => (
                      <FormItem className={styles.switchItem}>
                        <div className={styles.switchContent}>
                          <FormLabel>Email Notifications</FormLabel>
                          <FormDescription>
                            Receive email updates about your account activity.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="pushNotifications"
                    render={({field}) => (
                      <FormItem className={styles.switchItem}>
                        <div className={styles.switchContent}>
                          <FormLabel>Push Notifications</FormLabel>
                          <FormDescription>
                            Get push notifications on your devices.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="weeklyDigest"
                    render={({field}) => (
                      <FormItem className={styles.switchItem}>
                        <div className={styles.switchContent}>
                          <FormLabel>Weekly Digest</FormLabel>
                          <FormDescription>
                            Receive a weekly summary of your activity.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Preferences</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className={styles.tabContent}>
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how the application looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...appearanceForm}>
                <form
                  onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)}
                  className={styles.form}
                >
                  <FormField
                    control={appearanceForm.control}
                    name="theme"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose your preferred color scheme.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={appearanceForm.control}
                    name="language"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select your preferred language.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

```css
/* settings-page.module.css */
.container {
  max-width: 56rem;
  margin-inline: auto;
  padding: 2rem 1rem;
}

.header {
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
}

.subtitle {
  margin-top: 0.5rem;
  color: var(--ac-muted-foreground);
}

.tabs {
  display: grid;
  gap: 1rem;
}

.tabContent {
  margin-top: 1rem;
}

.form {
  display: grid;
  gap: 1.5rem;
}

.textarea {
  min-height: 6rem;
  resize: vertical;
}

.switchItem {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-md);
}

.switchContent {
  display: grid;
  gap: 0.25rem;
}
```

---

### Recipe 10: Error Handling (ErrorBoundary + AsyncBoundary + Toast)

**Comprehensive error handling pattern with boundaries and toast notifications.**

```tsx
import {AlertTriangle, RefreshCw} from "lucide-react";
import {Component, Suspense, type ReactNode} from "react";

import {Alert, AlertDescription, AlertTitle} from "@arolariu/components/alert";
import {AsyncBoundary} from "@arolariu/components/async-boundary";
import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components/card";
import {ErrorBoundary} from "@arolariu/components/error-boundary";
import {Skeleton} from "@arolariu/components/skeleton";
import {toast} from "@arolariu/components/sonner";
import styles from "./error-handling.module.css";

// Async data fetching component
async function fetchUserData(userId: string) {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate random error
  if (Math.random() > 0.7) {
    throw new Error("Failed to fetch user data");
  }

  return {
    id: userId,
    name: "John Doe",
    email: "john@example.com",
  };
}

function UserProfile({userId}: {userId: string}) {
  const user = use(fetchUserData(userId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className={styles.profile}>
        <div className={styles.profileField}>
          <span className={styles.profileLabel}>Name:</span>
          <span>{user.name}</span>
        </div>
        <div className={styles.profileField}>
          <span className={styles.profileLabel}>Email:</span>
          <span>{user.email}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading fallback
function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={styles.skeletonTitle} />
      </CardHeader>
      <CardContent className={styles.skeletonContent}>
        <Skeleton className={styles.skeletonField} />
        <Skeleton className={styles.skeletonField} />
      </CardContent>
    </Card>
  );
}

// Error fallback
function ProfileError({error, reset}: {error: Error; reset: () => void}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Error Loading Profile</AlertTitle>
      <AlertDescription className={styles.errorDescription}>
        {error.message}
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className={styles.retryButton}
        >
          <RefreshCw />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ErrorHandlingDemo() {
  const handleAPIError = async () => {
    try {
      // Simulate API call that fails
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error("API request failed")), 1000)
      );
    } catch (error) {
      toast.error("Failed to load data. Please try again.", {
        action: {
          label: "Retry",
          onClick: () => handleAPIError(),
        },
      });
    }
  };

  const handleValidationError = () => {
    toast.error("Validation failed: Email is required");
  };

  const handleNetworkError = () => {
    toast.error("Network error. Please check your connection.", {
      duration: 5000,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Error Handling Patterns</h1>
        <p className={styles.subtitle}>
          Comprehensive error handling with boundaries and toast notifications.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Pattern 1: AsyncBoundary (React 19 pattern) */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. AsyncBoundary (Suspense + ErrorBoundary)</h2>
          <AsyncBoundary
            suspenseFallback={<ProfileSkeleton />}
            errorFallback={({error, reset}) => <ProfileError error={error} reset={reset} />}
          >
            <UserProfile userId="123" />
          </AsyncBoundary>
        </div>

        {/* Pattern 2: Toast for API errors */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Toast Notifications for Errors</h2>
          <Card>
            <CardContent className={styles.buttonGroup}>
              <Button onClick={handleAPIError} variant="destructive">
                Trigger API Error
              </Button>
              <Button onClick={handleValidationError} variant="destructive">
                Trigger Validation Error
              </Button>
              <Button onClick={handleNetworkError} variant="destructive">
                Trigger Network Error
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pattern 3: Inline error display */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Inline Error Display</h2>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              Your session has expired. Please log in again to continue.
              <Button
                variant="outline"
                size="sm"
                className={styles.loginButton}
                onClick={() => toast.info("Redirecting to login...")}
              >
                Log In
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

// React 19 use() hook polyfill (remove when React 19 is stable)
function use<T>(promise: Promise<T>): T {
  if ((promise as any).status === "fulfilled") {
    return (promise as any).value;
  } else if ((promise as any).status === "rejected") {
    throw (promise as any).reason;
  } else {
    throw promise.then(
      (value) => {
        (promise as any).status = "fulfilled";
        (promise as any).value = value;
      },
      (reason) => {
        (promise as any).status = "rejected";
        (promise as any).reason = reason;
      }
    );
  }
}
```

```css
/* error-handling.module.css */
.container {
  max-width: 56rem;
  margin-inline: auto;
  padding: 2rem 1rem;
}

.header {
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
}

.subtitle {
  margin-top: 0.5rem;
  color: var(--ac-muted-foreground);
}

.grid {
  display: grid;
  gap: 2rem;
}

.section {
  display: grid;
  gap: 1rem;
}

.sectionTitle {
  font-size: 1.25rem;
  font-weight: 600;
}

.profile {
  display: grid;
  gap: 0.75rem;
}

.profileField {
  display: flex;
  gap: 0.5rem;
}

.profileLabel {
  font-weight: 600;
}

.skeletonTitle {
  height: 1.5rem;
  width: 8rem;
}

.skeletonContent {
  display: grid;
  gap: 0.75rem;
}

.skeletonField {
  height: 1rem;
}

.errorDescription {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.retryButton,
.loginButton {
  margin-left: auto;
}

.buttonGroup {
  display: grid;
  gap: 0.5rem;
  padding: 1.5rem;
}
```

---

## 🎓 Key Takeaways from Pattern Recipes

### ✅ Best Practices Demonstrated

1. **Form Validation**: Always use `zod` + `react-hook-form` for type-safe validation
2. **Error Handling**: Combine boundaries, inline errors, and toast notifications
3. **Loading States**: Use `Skeleton` components and `AsyncBoundary` for async data
4. **Accessibility**: Keyboard navigation, ARIA attributes, and semantic HTML
5. **Responsive Design**: CSS Modules with container queries and media queries
6. **Type Safety**: Leverage namespace types (`Component.Props`, `Component.State`)
7. **Composition**: Use `render` prop for element composition (Base UI pattern)
8. **Toast Notifications**: Use `toast.promise()` for async operations
9. **State Management**: Keep form state close to components, lift when needed
10. **Progressive Enhancement**: Start with semantic HTML, enhance with JavaScript

### 📚 Additional Resources

- [Base UI Documentation](https://base-ui.com/react/components)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [TanStack Table](https://tanstack.com/table)
- [Date-fns](https://date-fns.org/)

Ready to build something amazing? **[🚀 Start with our Quick Start Guide](./README.md#-quick-start)**
