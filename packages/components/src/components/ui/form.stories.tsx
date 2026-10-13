import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFieldArray, useForm, useWatch} from "./form";
import styles from "./form.module.css";
import {Input} from "./input";

const meta = {
  title: "Components/Forms/Form",
  component: BasicFormDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Form is React Hook Form's FormProvider, not an HTML form. Each example owns its native form and a single submission announcement; inline messages are linked descriptions, not duplicate live alerts.",
      },
    },
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

function BasicFormDemo(): React.JSX.Element {
  const form = useForm<{username: string; email: string}>({
    defaultValues: {username: "", email: ""},
  });
  const [submitted, setSubmitted] = React.useState<{username: string; email: string} | null>(null);

  return (
    <Form {...form}>
      <form
        className={styles.demoForm}
        noValidate
        onSubmit={form.handleSubmit(setSubmitted)}>
        <FormField
          control={form.control}
          name='username'
          rules={{required: "Username is required", minLength: {value: 3, message: "Min 3 characters"}}}
          render={({field}) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder='johndoe'
                  {...field}
                />
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
        <Button type='submit'>Submit</Button>
        <output
          className={styles.demoOutput}
          aria-live='polite'>
          {submitted ? `Saved ${submitted.username}: ${submitted.email}` : "Complete the fields, then submit."}
        </output>
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
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <Form {...form}>
      <form
        className={styles.demoForm}
        noValidate
        onSubmit={form.handleSubmit(() => setSubmitted(true))}>
        <FormField
          control={form.control}
          name='email'
          rules={{required: "Email is required"}}
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
          rules={{required: "Password is required", minLength: {value: 8, message: "Min 8 characters"}}}
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
        <Button type='submit'>Validate credentials</Button>
        <output
          className={styles.demoOutput}
          aria-live='polite'>
          {submitted
            ? "Credentials passed local validation. No request was sent."
            : "This example validates locally; it does not authenticate."}
        </output>
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

function ValidationErrorsFormContent(): React.JSX.Element {
  const form = useForm<{username: string; email: string; password: string}>({
    defaultValues: {username: "", email: "", password: ""},
  });

  const [submitted, setSubmitted] = React.useState(false);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          () => setSubmitted(false),
          () => {
            setSubmitted(true);
          },
        )}
        className={styles.demoForm}
        noValidate>
        <FormField
          control={form.control}
          name='username'
          rules={{
            required: "Username is required",
            minLength: {value: 3, message: "Username must be at least 3 characters"},
          }}
          render={({field}) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder='johndoe'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          rules={{
            required: "Email is required",
            pattern: {value: /^\S+@\S+$/i, message: "Please enter a valid email address"},
          }}
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
          rules={{
            required: "Password is required",
            minLength: {value: 8, message: "Password must be at least 8 characters"},
          }}
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
        <Button type='submit'>Submit</Button>
        {submitted && !form.formState.isValid ? (
          <div
            role='alert'
            className={styles.demoSummary}>
            Please fix the errors above before submitting.
          </div>
        ) : null}
      </form>
    </Form>
  );
}

/**
 * Form showing all fields with validation error messages.
 */
export const WithValidationErrors: Story = {
  render: () => <ValidationErrorsFormContent />,
};

function MultiStepFormContent(): React.JSX.Element {
  const [step, setStep] = React.useState(1);
  const form = useForm<{username: string; email: string; password: string; confirmPassword: string}>({
    defaultValues: {username: "", email: "", password: "", confirmPassword: ""},
  });
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className={styles.demoForm}>
      <div className={styles.demoProgress}>
        <progress
          aria-label='Form progress'
          max={2}
          value={step}
        />
        <p>
          Step {step} of 2: {step === 1 ? "Account Information" : "Security"}
        </p>
      </div>

      <Form {...form}>
        <form
          className={styles.demoFields}
          noValidate
          onSubmit={form.handleSubmit(() => setSubmitted(true))}>
          {step === 1 ? (
            <>
              <FormField
                control={form.control}
                name='username'
                rules={{required: "Username is required"}}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='johndoe'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                rules={{required: "Email is required"}}
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
              <Button
                type='button'
                onClick={async () => {
                  if (await form.trigger(["username", "email"])) setStep(2);
                }}>
                Next
              </Button>
            </>
          ) : (
            <>
              <FormField
                control={form.control}
                name='password'
                rules={{required: "Password is required"}}
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
              <FormField
                control={form.control}
                name='confirmPassword'
                rules={{
                  required: "Please confirm your password",
                  validate: (value) => value === form.getValues("password") || "Passwords must match",
                }}
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
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
              <div className={styles.demoActions}>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type='submit'>Submit</Button>
              </div>
            </>
          )}
          <output
            className={styles.demoOutput}
            aria-live='polite'>
            {submitted ? "Both steps passed local validation." : "Values are retained when moving between steps."}
          </output>
        </form>
      </Form>
    </div>
  );
}

/**
 * Multi-step form wizard with progress indicator.
 */
export const MultiStep: Story = {
  render: () => <MultiStepFormContent />,
};

function ObserverCompositionDemo(): React.JSX.Element {
  const form = useForm<{nickname: string}>({defaultValues: {nickname: ""}});
  const nickname = useWatch({control: form.control, name: "nickname"});
  const wrapperRef = React.useRef<HTMLInputElement>(null);
  const [observedValue, setObservedValue] = React.useState("");
  const [observedChanges, setObservedChanges] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  return (
    <Form {...form}>
      <form
        className={styles.demoForm}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}>
        <FormField
          control={form.control}
          name='nickname'
          render={({field}) => (
            <FormItem id='observer-item'>
              <FormLabel>Nickname</FormLabel>
              <FormControl
                id='observed-nickname'
                ref={wrapperRef}
                className={styles.demoComposedControl}
                onChange={(event) => {
                  setObservedValue(event.currentTarget.value);
                  setObservedChanges((count) => count + 1);
                }}>
                <Input
                  {...field}
                  className={(state) => (state.focused ? styles.demoFocusedControl : undefined)}
                  render={(props, state) => (
                    <input
                      {...props}
                      data-demo-focused={state.focused}
                    />
                  )}
                />
              </FormControl>
              <FormDescription id='observer-help'>
                RHF owns the value and ref; FormControl observes changes and shares the same DOM target.
              </FormDescription>
            </FormItem>
          )}
        />
        <output className={styles.demoOutput}>
          RHF: {nickname || "empty"} · Observer: {observedValue || "empty"} · Changes: {observedChanges}
          {observedChanges > 0 ? ` · Wrapper ref: ${wrapperRef.current?.tagName ?? "unmounted"}` : ""}
        </output>
        <Button type='submit'>Save nickname</Button>
        <output
          className={styles.demoOutput}
          aria-live='polite'>
          {submitted ? "Nickname saved locally." : ""}
        </output>
      </form>
    </Form>
  );
}

/** A real RHF field with a wrapper observer, primitive-owned callbacks, and both refs. */
export const ObserverComposition: Story = {
  render: () => <ObserverCompositionDemo />,
};

interface ChoicesValues {
  choices: {label: string}[];
}

function FieldArrayDemo(): React.JSX.Element {
  const form = useForm<ChoicesValues>({defaultValues: {choices: [{label: "First choice"}]}});
  const {fields, append, remove} = useFieldArray({control: form.control, name: "choices"});
  const choices = useWatch({control: form.control, name: "choices"});
  const [announcement, setAnnouncement] = React.useState("");
  return (
    <Form {...form}>
      <form
        className={styles.demoForm}
        noValidate
        onSubmit={form.handleSubmit(
          (values) => setAnnouncement(`Saved ${values.choices.length} choices locally.`),
          () => setAnnouncement("Complete the empty choices before saving."),
        )}>
        {fields.map((choice, index) => (
          <FormField
            key={choice.id}
            control={form.control}
            name={`choices.${index}.label`}
            rules={{required: "A choice label is required"}}
            render={({field}) => (
              <FormItem>
                <FormLabel>Choice {index + 1}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => remove(index)}>
                  Remove choice {index + 1}
                </Button>
              </FormItem>
            )}
          />
        ))}
        <div className={styles.demoActions}>
          <Button
            type='button'
            variant='outline'
            onClick={() => append({label: ""})}>
            Add choice
          </Button>
          <Button type='submit'>Save choices</Button>
        </div>
        <output className={styles.demoOutput}>Watched values: {JSON.stringify(choices)}</output>
        <output
          className={styles.demoOutput}
          aria-live='polite'>
          {announcement}
        </output>
      </form>
    </Form>
  );
}

/** Add/remove real useFieldArray rows, edit their watched values, and submit them. */
export const FieldArrayAndWatch: Story = {
  render: () => <FieldArrayDemo />,
};
