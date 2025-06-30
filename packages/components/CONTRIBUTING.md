# 🤝 Contributing to @arolariu/components

> **Join our mission to build the best React component library!** Every contribution, no matter the size, makes a difference.

<div align="center">

![Contributors Welcome](https://img.shields.io/badge/Contributors-Welcome-brightgreen?style=for-the-badge)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-blue?style=for-the-badge)
![Good First Issues](https://img.shields.io/badge/Good%20First%20Issues-Available-orange?style=for-the-badge)

**Help us build beautiful, accessible components for the React community**

[🚀 Quick Start](#-quick-start-for-contributors) • [💡 Ways to Contribute](#-ways-to-contribute) • [🛠️ Development Setup](#️-development-setup) • [📋 Guidelines](#-guidelines)

</div>

---

## 🚀 Quick Start for Contributors

**Get contributing in under 5 minutes:**

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro/packages/components

# 3. Install dependencies
yarn install

# 4. Start development environment
yarn storybook    # 🎨 Component playground at http://localhost:6006
yarn build        # 🔨 Build the library

# 5. Make your amazing changes!
# 6. Test and submit a PR
```

---

## 💡 Ways to Contribute

### 🐛 Report Bugs

Found something broken? Help us fix it!

- **Before reporting**: Search [existing issues](https://github.com/arolariu/arolariu.ro/issues) to avoid duplicates
- **Include**: Steps to reproduce, expected vs actual behavior, environment details
- **Bonus points**: Provide a minimal reproduction case

**[📝 Report a Bug →](https://github.com/arolariu/arolariu.ro/issues/new?template=bug_report.md)**

### ✨ Suggest Features

Have a great idea for a new component or feature?

- **Describe the problem** it solves
- **Explain the solution** you'd like to see
- **Consider alternatives** and their trade-offs
- **Check accessibility** requirements

**[💡 Request a Feature →](https://github.com/arolariu/arolariu.ro/issues/new?template=feature_request.md)**

### 🔧 Fix Issues

Browse our [open issues](https://github.com/arolariu/arolariu.ro/issues) and help solve them:

- 🟢 **Good first issues** - Perfect for newcomers
- 🟡 **Help wanted** - We need your expertise
- 🔴 **Bug fixes** - Critical issues needing attention

### 🎨 Add Components

Want to contribute a new component? Here's what we look for:

- **Built on Radix UI** primitives when possible
- **Accessible by default** (WAI-ARIA compliant)
- **TypeScript support** with full type definitions
- **Responsive design** with mobile-first approach
- **Tailwind CSS** integration for styling
- **Storybook stories** documenting all variants
- **Comprehensive tests** ensuring reliability

### 📖 Improve Documentation

Help make our docs even better:

- **README improvements** - Clearer explanations and examples
- **API documentation** - Better prop descriptions and usage
- **Storybook stories** - More comprehensive examples
- **Debugging guides** - Help developers troubleshoot
- **Tutorials** - Step-by-step guides for common use cases

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 22+
- **Yarn** 4.9+ (preferred package manager)
- **Git** for version control

### Getting Started

```bash
# Clone the repository
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro/packages/components

# Install dependencies
yarn install

# Start development tools
yarn storybook    # 🎨 Component development at http://localhost:6006
yarn build        # 🔨 Build for production
yarn build:clean  # 🧹 Clean build artifacts
```

### Project Structure

```
packages/components/
├── 📁 src/
│   ├── 📁 components/ui/     # Component implementations
│   ├── 📁 hooks/            # Reusable React hooks
│   ├── 📁 lib/              # Utility functions
│   ├── 📄 index.ts          # Main entry point
│   └── 📄 index.css         # Global styles
├── 📁 stories/              # Storybook stories
├── 📁 dist/                 # Built output (generated)
├── 📄 package.json          # Package configuration
├── 📄 README.md             # Main documentation
└── 📄 tsconfig.json         # TypeScript configuration
```

### Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-new-component
   ```

2. **Develop your component**

   - Add component to `src/components/ui/`
   - Export from `src/index.ts`
   - Create Storybook story in `stories/`

3. **Test your changes**

   ```bash
   yarn build          # Ensure it builds
   yarn storybook      # Visual testing
   ```

4. **Submit a pull request**
   - Write a clear description
   - Include screenshots/GIFs for UI changes
   - Link related issues

---

## 📋 Guidelines

### Component Development

#### 🎯 Accessibility First

- Use **Radix UI primitives** as the foundation
- Include proper **ARIA attributes** and roles
- Support **keyboard navigation**
- Ensure **screen reader compatibility**
- Test with accessibility tools

#### 🎨 Design Principles

- **Mobile-first** responsive design
- **Consistent spacing** using Tailwind CSS
- **Theme-aware** components (light/dark mode)
- **Semantic HTML** structure
- **Consistent naming** conventions

#### 💻 Code Standards

```tsx
// ✅ Good: Well-structured component
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### 📚 Documentation Requirements

- **TypeScript definitions** for all props
- **JSDoc comments** for complex components
- **Storybook stories** showing all variants
- **Usage examples** in README
- **Accessibility notes** when relevant

### Storybook Stories

Create comprehensive stories for your components:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../src/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "A versatile button component with multiple variants and sizes.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
feat: add new Button component with variants
feat(input): add password visibility toggle

# Bug fixes
fix: resolve accessibility issue in Dialog component
fix(button): prevent double-click on async actions

# Documentation
docs: update README with new component examples
docs(storybook): add comprehensive Button stories

# Refactoring
refactor: simplify component prop interfaces
refactor(utils): optimize class name merging utility
```

---

## 🏆 Recognition

### Hall of Fame

Contributors who have made significant impacts:

- **[Alexandru-Razvan Olariu](https://github.com/arolariu)** - Project Creator & Maintainer
- **[Jia Wei Ng](https://github.com/jiaweing)** - DropDrawer Component
- **You could be next!** 🌟

### Ways We Say Thanks

- 📛 **Contributor badge** in README
- 🎉 **Shoutouts** in release notes
- 🏷️ **GitHub issue assignment** priority

---

## 🤔 Need Help?

### Getting Support

- 💬 **GitHub Discussions** - Ask questions and share ideas
- 🐛 **GitHub Issues** - Report bugs and request features
- 📧 **Email** - [admin@arolariu.ro](mailto:admin@arolariu.ro) for private matters

### Useful Resources

- 📖 **[Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction)**
- 🎨 **[Tailwind CSS Docs](https://tailwindcss.com/docs)**
- ♿ **[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)**
- 📚 **[Storybook Documentation](https://storybook.js.org/docs)**

---

<div align="center">

## 🙏 Thank You

**Every contribution makes @arolariu/components better for the entire React community.**

**Ready to contribute?** [🚀 **Start with a good first issue**](https://github.com/arolariu/arolariu.ro/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

**Built with ❤️ by contributors like you**

</div>
