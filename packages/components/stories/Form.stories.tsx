import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  toast,
} from "../dist";

const meta: Meta<typeof Form> = {
  title: "Design System/Form",
  component: Form,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof Form>;

// Basic login form
export const LoginForm: Story = {
  render: function LoginFormExample() {
    // Define form schema
    const formSchema = z.object({
      email: z.string().email({ message: "Invalid email address" }),
      password: z.string().min(6, {
        message: "Password must be at least 6 characters",
      }),
      rememberMe: z.boolean().default(false),
    });

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        email: "",
        password: "",
        rememberMe: false,
      },
    });

    // Form submission handler
    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "Form submitted",
        description: (
          <pre className="mt-2 w-full rounded-md bg-neutral-100 p-2 dark:bg-neutral-900">
            <code>{JSON.stringify(values, null, 2)}</code>
          </pre>
        ),
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[350px]"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Email" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your email address to log in.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Remember me</FormLabel>
                  <FormDescription>
                    Stay logged in on this device
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
      </Form>
    );
  },
};

// Registration form with more fields
export const RegistrationForm: Story = {
  render: function RegistrationFormExample() {
    // Define form schema
    const formSchema = z
      .object({
        name: z
          .string()
          .min(2, { message: "Name must be at least 2 characters" }),
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(8, {
          message: "Password must be at least 8 characters",
        }),
        confirmPassword: z.string(),
        role: z.enum(["user", "admin", "manager"], {
          required_error: "Please select a role",
        }),
        bio: z.string().max(160).optional(),
        terms: z.boolean().refine((val) => val === true, {
          message: "You must accept the terms and conditions",
        }),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: undefined,
        bio: "",
        terms: false,
      },
    });

    // Form submission handler
    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[400px]"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm Password"
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
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
                    className="h-20 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Brief description for your profile (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Accept terms and conditions</FormLabel>
                  <FormDescription>
                    You agree to our terms of service and privacy policy.
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Create account</Button>
        </form>
      </Form>
    );
  },
};

// Form with different field types
export const DifferentFieldTypes: Story = {
  render: function FieldTypesExample() {
    // Define form schema
    const formSchema = z.object({
      textInput: z.string(),
      textarea: z.string(),
      select: z.string(),
      checkbox: z.boolean().default(false),
      switch: z.boolean().default(false),
      radioGroup: z.enum(["option1", "option2", "option3"]),
    });

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        textInput: "",
        textarea: "",
        select: "",
        checkbox: false,
        switch: false,
        radioGroup: "option1",
      },
    });

    // Form submission handler
    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "Form submitted",
        description: (
          <pre className="mt-2 w-full rounded-md bg-neutral-100 p-2 dark:bg-neutral-900">
            <code>{JSON.stringify(values, null, 2)}</code>
          </pre>
        ),
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[400px]"
        >
          <FormField
            control={form.control}
            name="textInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text Input</FormLabel>
                <FormControl>
                  <Input placeholder="Enter some text" {...field} />
                </FormControl>
                <FormDescription>Standard text input field</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="textarea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Textarea</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Type your message here"
                    className="h-20 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Multi-line text input field</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="select"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select from predefined options
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkbox"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Checkbox</FormLabel>
                  <FormDescription>
                    Boolean selection (true/false)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="switch"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Switch</FormLabel>
                  <FormDescription>Toggle switch (on/off)</FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="radioGroup"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Radio Group</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="option1" />
                      </FormControl>
                      <FormLabel className="font-normal">Option 1</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="option2" />
                      </FormControl>
                      <FormLabel className="font-normal">Option 2</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="option3" />
                      </FormControl>
                      <FormLabel className="font-normal">Option 3</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  Select one option from a group
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    );
  },
};

// Form with validation
export const ValidationForm: Story = {
  render: function ValidationFormExample() {
    // Define form schema with validation
    const formSchema = z.object({
      username: z
        .string()
        .min(3, { message: "Username must be at least 3 characters" })
        .max(20, { message: "Username cannot exceed 20 characters" })
        .regex(/^[a-z0-9_-]+$/, {
          message:
            "Username can only contain lowercase letters, numbers, underscores and hyphens",
        }),
      email: z
        .string()
        .min(1, { message: "Email is required" })
        .email({ message: "Invalid email address" }),
      age: z
        .string()
        .refine((val) => !isNaN(parseInt(val)), {
          message: "Age must be a number",
        })
        .refine((val) => parseInt(val) >= 18, {
          message: "You must be at least 18 years old",
        }),
      url: z
        .string()
        .url({ message: "Please enter a valid URL" })
        .optional()
        .or(z.literal("")),
      acceptTerms: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms and conditions",
      }),
    });

    // Initialize form
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: "",
        email: "",
        age: "",
        url: "",
        acceptTerms: false,
      },
      mode: "onChange",
    });

    // Form submission handler
    function onSubmit(values: z.infer<typeof formSchema>) {
      toast({
        title: "Form validation passed",
        description: "All fields have been validated successfully.",
      });
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 w-[400px]"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" {...field} />
                </FormControl>
                <FormDescription>
                  Your unique username (3-20 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your email address will be verified
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input placeholder="25" {...field} />
                </FormControl>
                <FormDescription>
                  You must be at least 18 years old
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your personal or company website
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Accept terms and conditions</FormLabel>
                  <FormDescription>
                    By checking this, you agree to our terms of service.
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    );
  },
};
