# 💡 Usage Examples for @arolariu/components

> **Real-world examples to get you building faster.** Copy, paste, and customize these patterns for your projects.

## 🚀 Getting Started

### Installation & Setup

```bash
# Install the package
npm install @arolariu/components

# Install peer dependencies if needed
npm install react react-dom
```

```tsx
// Add to your app's root (App.tsx, main.tsx, or _app.tsx)
import "@arolariu/components/styles";
```

```tsx
// Use local CSS Modules for application-specific layout and composition
import styles from "./my-component.module.css";
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
