import {useForm} from "react-hook-form";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
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

function BasicFormDemo(): React.JSX.Element {
  const form = useForm<{username: string; email: string}>({
    defaultValues: {username: "", email: ""},
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // eslint-disable-next-line no-console
          console.log(values);
        })}
        style={{width: 400, display: "flex", flexDirection: "column", gap: 16}}>
        <FormField
          control={form.control}
          name='username'
          rules={{required: "Username is required", minLength: {value: 3, message: "Min 3 characters"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder='johndoe' {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required", pattern: {value: /^\S+@\S+$/i, message: "Invalid email"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='john@example.com' type='email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Submit</Button>
      </form>
    </Form>
  );
}

/**
 * Default form with react-hook-form validation.
 */
export const Default: Story = {
  render: () => <BasicFormDemo />,
};

function LoginFormDemo(): React.JSX.Element {
  const form = useForm<{email: string; password: string}>({
    defaultValues: {email: "", password: ""},
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // eslint-disable-next-line no-console
          console.log(values);
        })}
        style={{width: 350, display: "flex", flexDirection: "column", gap: 12}}>
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required"}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='john@example.com' type='email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          rules={{required: "Password is required", minLength: {value: 8, message: "Min 8 characters"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder='••••••••' type='password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' style={{width: "100%"}}>
          Sign In
        </Button>
      </form>
    </Form>
  );
}

/**
 * Login form with email and password fields.
 */
export const LoginForm: Story = {
  render: () => <LoginFormDemo />,
};
