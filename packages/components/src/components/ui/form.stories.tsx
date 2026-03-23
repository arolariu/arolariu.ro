import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import * as z from "zod";
import {Button} from "./button";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "./form";
import {Input} from "./input";

const meta = {
  title: "Components/Forms/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

const formSchema = z.object({
  username: z.string().min(3, {message: "Username must be at least 3 characters."}),
  email: z.string().email({message: "Invalid email address."}),
});

/**
 * Default form with validation using react-hook-form and zod.
 */
export const Default: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        username: "",
        email: "",
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>): void {
      // eslint-disable-next-line no-console
      console.log(values);
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='w-[400px] space-y-6'>
          <FormField
            control={form.control}
            name='username'
            render={({field}) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder='johndoe'
                    {...field}
                  />
                </FormControl>
                <FormDescription>This is your public display name.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='email'
            render={({field}) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder='john@example.com'
                    type='email'
                    {...field}
                  />
                </FormControl>
                <FormDescription>We'll never share your email.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit'>Submit</Button>
        </form>
      </Form>
    );
  },
};

const profileSchema = z.object({
  name: z.string().min(2, {message: "Name must be at least 2 characters."}),
  bio: z.string().max(160, {message: "Bio must not exceed 160 characters."}).optional(),
  url: z.string().url({message: "Please enter a valid URL."}).optional().or(z.literal("")),
});

/**
 * Form with multiple field types and validation.
 */
export const ProfileForm: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useForm<z.infer<typeof profileSchema>>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        name: "",
        bio: "",
        url: "",
      },
    });

    function onSubmit(values: z.infer<typeof profileSchema>): void {
      // eslint-disable-next-line no-console
      console.log(values);
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='w-[500px] space-y-6'>
          <FormField
            control={form.control}
            name='name'
            render={({field}) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='John Doe'
                    {...field}
                  />
                </FormControl>
                <FormDescription>Your name as it will appear to others.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='bio'
            render={({field}) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <textarea
                    placeholder='Tell us a bit about yourself'
                    className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Brief description for your profile. Max 160 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='url'
            render={({field}) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://example.com'
                    type='url'
                    {...field}
                  />
                </FormControl>
                <FormDescription>Your personal or professional website.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='flex gap-2'>
            <Button type='submit'>Save Changes</Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => form.reset()}>
              Reset
            </Button>
          </div>
        </form>
      </Form>
    );
  },
};

const loginSchema = z.object({
  email: z.string().email({message: "Invalid email address."}),
  password: z.string().min(8, {message: "Password must be at least 8 characters."}),
});

/**
 * Login form with email and password fields.
 */
export const LoginForm: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useForm<z.infer<typeof loginSchema>>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: "",
        password: "",
      },
    });

    function onSubmit(values: z.infer<typeof loginSchema>): void {
      // eslint-disable-next-line no-console
      console.log(values);
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='w-[350px] space-y-4'>
          <FormField
            control={form.control}
            name='email'
            render={({field}) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder='john@example.com'
                    type='email'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({field}) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder='••••••••'
                    type='password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type='submit'
            className='w-full'>
            Sign In
          </Button>
        </form>
      </Form>
    );
  },
};

/**
 * Form with conditional validation and dynamic fields.
 */
export const WithConditionalFields: Story = {
  render: () => {
    const conditionalSchema = z.object({
      accountType: z.enum(["personal", "business"]),
      name: z.string().min(2),
      companyName: z.string().optional(),
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const form = useForm<z.infer<typeof conditionalSchema>>({
      resolver: zodResolver(conditionalSchema),
      defaultValues: {
        accountType: "personal",
        name: "",
        companyName: "",
      },
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const accountType = form.watch("accountType");

    function onSubmit(values: z.infer<typeof conditionalSchema>): void {
      // eslint-disable-next-line no-console
      console.log(values);
    }

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='w-[400px] space-y-6'>
          <FormField
            control={form.control}
            name='accountType'
            render={({field}) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <FormControl>
                  <select
                    className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'
                    {...field}>
                    <option value='personal'>Personal</option>
                    <option value='business'>Business</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='name'
            render={({field}) => (
              <FormItem>
                <FormLabel>{accountType === "business" ? "Contact Name" : "Full Name"}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='John Doe'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {accountType === "business" && (
            <FormField
              control={form.control}
              name='companyName'
              render={({field}) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Acme Inc.'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <Button type='submit'>Create Account</Button>
        </form>
      </Form>
    );
  },
};
