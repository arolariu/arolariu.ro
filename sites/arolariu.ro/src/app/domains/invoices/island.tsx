"use client";

/**
 * @fileoverview Invoice domain home page with workflow guide.
 * @module app/domains/invoices/island
 *
 * @remarks
 * This component serves as the main entry point for the invoices domain.
 * It guides users through the 3-step workflow: Upload → Organize → View.
 */

import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {useRef} from "react";
import {
  TbArrowRight,
  TbBrain,
  TbChartBar,
  TbChartPie,
  TbCloud,
  TbDeviceMobile,
  TbEye,
  TbFileInvoice,
  TbLock,
  TbPhoto,
  TbReceipt,
  TbShare,
  TbSparkles,
  TbUpload,
} from "react-icons/tb";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Workflow step card component.
 */
function WorkflowCard({
  step,
  title,
  description,
  icon,
  href,
  buttonText,
  gradient,
  delay,
}: Readonly<{
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
  gradient: string;
  delay: number;
}>): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5, delay}}>
      <Card className='group relative h-full overflow-hidden border-2 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg dark:hover:border-indigo-700'>
        {/* Step number badge */}
        <div
          className={`absolute -top-4 -right-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br ${gradient} text-2xl font-bold text-white opacity-20 transition-opacity group-hover:opacity-30`}>
          {step}
        </div>

        <CardHeader className='pb-2'>
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${gradient} text-white shadow-md`}>
            {icon}
          </div>
          <CardTitle className='text-xl'>{title}</CardTitle>
          <CardDescription className='text-base'>{description}</CardDescription>
        </CardHeader>

        <CardContent className='pt-2'>
          <Button
            asChild
            className={`w-full bg-linear-to-r ${gradient} text-white transition-transform group-hover:scale-[1.02]`}>
            <Link
              href={href}
              className='flex items-center justify-center gap-2'>
              {buttonText}
              <TbArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Feature highlight component.
 */
function FeatureItem({icon, title, description}: Readonly<{icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
  return (
    <div className='flex items-start gap-4'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'>
        {icon}
      </div>
      <div>
        <h3 className='font-semibold text-gray-900 dark:text-white'>{title}</h3>
        <p className='text-sm text-gray-600 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/**
 * Bento grid item data.
 */
const bentoItems = [
  {
    key: "ai",
    icon: TbBrain,
    title: "AI-Powered",
    desc: "GPT-4 extraction",
    gradient: "from-purple-600 to-indigo-600",
    span: "col-span-2 row-span-1",
  },
  {
    key: "analytics",
    icon: TbChartPie,
    title: "Analytics",
    desc: "Spending insights",
    gradient: "from-emerald-500 to-teal-500",
    span: "col-span-1 row-span-1",
  },
  {
    key: "cloud",
    icon: TbCloud,
    title: "Cloud Sync",
    desc: "Access anywhere",
    gradient: "from-blue-500 to-cyan-500",
    span: "col-span-1 row-span-2",
  },
  {
    key: "ocr",
    icon: TbReceipt,
    title: "Smart OCR",
    desc: "Auto data capture",
    gradient: "from-orange-500 to-amber-500",
    span: "col-span-1 row-span-1",
  },
  {
    key: "secure",
    icon: TbLock,
    title: "Secure",
    desc: "Bank-grade encryption",
    gradient: "from-slate-600 to-slate-800",
    span: "col-span-1 row-span-1",
  },
  {
    key: "share",
    icon: TbShare,
    title: "Share",
    desc: "Collaborate easily",
    gradient: "from-pink-500 to-rose-500",
    span: "col-span-1 row-span-1",
  },
] as const;

/**
 * Bento grid section showcasing capabilities.
 */
function BentoSection(): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='bg-gray-50 px-4 py-16 sm:px-6 lg:px-8 dark:bg-gray-900/50'>
      <div className='mx-auto max-w-5xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.5}}>
          <h2 className='mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white'>
            Everything You Need
          </h2>
          <p className='mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400'>
            Powerful features designed to make invoice management effortless
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className='grid auto-rows-[120px] grid-cols-2 gap-4 md:grid-cols-3'>
          {bentoItems.map((item, index) => (
            <motion.div
              key={item.key}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} ${item.span} cursor-default`}
              initial={{opacity: 0, y: 30, scale: 0.95}}
              animate={isInView ? {opacity: 1, y: 0, scale: 1} : {}}
              transition={{delay: 0.1 + index * 0.08, duration: 0.5, ease: "easeOut"}}
              whileHover={{scale: 1.02}}>
              {/* Shimmer effect on hover */}
              <div className='absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full' />

              {/* Floating particles */}
              <motion.div
                className='absolute top-2 right-2 h-2 w-2 rounded-full bg-white/30'
                animate={{y: [0, -8, 0], opacity: [0.3, 0.6, 0.3]}}
                transition={{duration: 3, repeat: Infinity, delay: index * 0.2}}
              />
              <motion.div
                className='absolute bottom-4 left-4 h-1.5 w-1.5 rounded-full bg-white/20'
                animate={{y: [0, -6, 0], opacity: [0.2, 0.5, 0.2]}}
                transition={{duration: 2.5, repeat: Infinity, delay: index * 0.3}}
              />

              {/* Content */}
              <div className='relative flex h-full flex-col justify-between p-4'>
                <motion.div
                  whileHover={{scale: 1.1, rotate: 5}}
                  transition={{duration: 0.3}}>
                  <item.icon className='h-8 w-8 text-white' />
                </motion.div>
                <div>
                  <h3 className='text-base font-bold text-white'>{item.title}</h3>
                  <p className='text-sm text-white/80'>{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile highlight */}
        <motion.div
          className='mt-8 flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.8, duration: 0.5}}>
          <TbDeviceMobile className='h-5 w-5' />
          <span className='text-sm'>Works beautifully on mobile devices</span>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Enhanced CTA section with animations.
 */
function EnhancedCTA(): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-50px"});

  return (
    <section
      ref={ref}
      className='relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8'>
      {/* Animated background */}
      <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500'>
        {/* Floating orbs */}
        <motion.div
          className='absolute top-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl'
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{duration: 8, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className='absolute right-20 bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl'
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{duration: 10, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className='absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl'
          animate={{scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3]}}
          transition={{duration: 6, repeat: Infinity, ease: "easeInOut"}}
        />

        {/* Grid pattern overlay */}
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]' />
      </div>

      {/* Content */}
      <div className='relative mx-auto max-w-4xl text-center'>
        {/* Sparkle icon */}
        <motion.div
          className='mb-6 inline-flex items-center justify-center'
          initial={{opacity: 0, scale: 0}}
          animate={isInView ? {opacity: 1, scale: 1} : {}}
          transition={{duration: 0.5, type: "spring"}}>
          <motion.div
            animate={{rotate: [0, 10, -10, 0]}}
            transition={{duration: 2, repeat: Infinity, ease: "easeInOut"}}>
            <TbSparkles className='h-12 w-12 text-yellow-300' />
          </motion.div>
        </motion.div>

        <motion.h2
          className='mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.1, duration: 0.5}}>
          Ready to Get Started?
        </motion.h2>

        <motion.p
          className='mb-8 text-lg text-indigo-100 sm:text-xl'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          Upload your first scan and experience the magic of AI-powered invoice management.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className='flex flex-col items-center justify-center gap-4 sm:flex-row'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group bg-white px-8 text-indigo-600 hover:bg-gray-100'>
            <Link href='/domains/invoices/upload-scans'>
              <TbUpload className='mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5' />
              Upload Your First Scan
            </Link>
          </Button>
          <Button
            asChild
            size='lg'
            variant='outline'
            className='border-white/30 bg-white/10 px-8 text-white backdrop-blur-sm hover:bg-white/20'>
            <Link href='/about/the-platform'>
              Learn More
              <TbArrowRight className='ml-2 h-5 w-5' />
            </Link>
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className='mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-indigo-200'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.5, duration: 0.5}}>
          <div className='flex items-center gap-2'>
            <TbLock className='h-4 w-4' />
            <span>Secure & Private</span>
          </div>
          <div className='flex items-center gap-2'>
            <TbCloud className='h-4 w-4' />
            <span>Cloud Synced</span>
          </div>
          <div className='flex items-center gap-2'>
            <TbBrain className='h-4 w-4' />
            <span>AI-Powered</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The invoice domain home page with workflow guide.
 *
 * @remarks
 * Guides users through the 3-step invoice management workflow:
 * 1. Upload scans (receipts, invoices, bills)
 * 2. View and organize scans, create invoices
 * 3. View, analyze, and manage invoices
 */
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  return (
    <main className='min-h-screen'>
      {/* Hero Section */}
      <section className='relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <div className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
            {/* Left: Content */}
            <div className='flex-1 text-center lg:text-left'>
              <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6}}>
                <h1 className='mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white'>
                  Manage Your <span className='bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>Invoices</span>{" "}
                  with Ease
                </h1>
                <p className='mb-8 max-w-2xl text-lg text-gray-600 lg:text-xl dark:text-gray-300'>
                  Upload your receipts and bills, organize them into invoices, and gain insights into your spending habits. Our AI-powered
                  system extracts data automatically.
                </p>

                <div className='flex flex-col items-center gap-4 sm:flex-row lg:justify-start'>
                  <Button
                    asChild
                    size='lg'
                    className='bg-linear-to-r from-indigo-600 to-purple-600 px-8 text-white hover:from-indigo-700 hover:to-purple-700'>
                    <Link href='/domains/invoices/upload-scans'>
                      <TbUpload className='mr-2 h-5 w-5' />
                      Get Started
                    </Link>
                  </Button>
                  {isAuthenticated && (
                    <Button
                      asChild
                      variant='outline'
                      size='lg'>
                      <Link href='/domains/invoices/view-invoices'>
                        <TbFileInvoice className='mr-2 h-5 w-5' />
                        View My Invoices
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right: Image */}
            <motion.div
              className='flex-1'
              initial={{opacity: 0, scale: 0.95}}
              animate={{opacity: 1, scale: 1}}
              transition={{duration: 0.6, delay: 0.2}}>
              <Image
                src='/images/domains/invoices/invoice-top.svg'
                alt='Invoice management illustration'
                width={500}
                height={500}
                className='mx-auto w-full max-w-md lg:max-w-lg'
                priority
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className='bg-gray-50 px-4 py-16 sm:px-6 lg:px-8 dark:bg-gray-900/50'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            className='mb-12 text-center'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}>
            <h2 className='mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white'>How It Works</h2>
            <p className='mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400'>
              Three simple steps to digitize and organize your financial documents
            </p>
          </motion.div>

          <div className='grid gap-8 md:grid-cols-3'>
            <WorkflowCard
              step={1}
              title='Upload Scans'
              description='Drag and drop your receipts, invoices, or bills. We support JPG, PNG, and PDF files up to 10MB each.'
              icon={<TbUpload className='h-6 w-6' />}
              href='/domains/invoices/upload-scans'
              buttonText='Upload Now'
              gradient='from-blue-500 to-cyan-500'
              delay={0.1}
            />

            <WorkflowCard
              step={2}
              title='View & Organize'
              description='Review your uploaded scans, select the ones you want, and create invoices from them individually or in batches.'
              icon={<TbEye className='h-6 w-6' />}
              href='/domains/invoices/view-scans'
              buttonText='View Scans'
              gradient='from-purple-500 to-pink-500'
              delay={0.2}
            />

            <WorkflowCard
              step={3}
              title='Manage Invoices'
              description='View your invoices, analyze spending patterns, and get AI-powered insights into your financial habits.'
              icon={<TbFileInvoice className='h-6 w-6' />}
              href='/domains/invoices/view-invoices'
              buttonText='View Invoices'
              gradient='from-green-500 to-emerald-500'
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='px-4 py-16 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <div className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
            {/* Left: Image */}
            <motion.div
              className='flex-1'
              initial={{opacity: 0, x: -20}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.6}}>
              <Image
                src='/images/domains/invoices/invoice-bottom.svg'
                alt='Invoice features illustration'
                width={500}
                height={500}
                className='mx-auto w-full max-w-md lg:max-w-lg'
              />
            </motion.div>

            {/* Right: Features */}
            <motion.div
              className='flex-1 space-y-8'
              initial={{opacity: 0, x: 20}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.6, delay: 0.2}}>
              <div>
                <h2 className='mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white'>Powerful Features</h2>
                <p className='text-lg text-gray-600 dark:text-gray-400'>Everything you need to manage your invoices efficiently</p>
              </div>

              <div className='space-y-6'>
                <FeatureItem
                  icon={<TbPhoto className='h-5 w-5' />}
                  title='Smart OCR Extraction'
                  description='Our AI automatically extracts merchant names, dates, amounts, and line items from your scans.'
                />
                <FeatureItem
                  icon={<TbChartBar className='h-5 w-5' />}
                  title='Spending Analytics'
                  description='Get detailed insights into your spending patterns with charts and reports.'
                />
                <FeatureItem
                  icon={<TbFileInvoice className='h-5 w-5' />}
                  title='Batch Processing'
                  description='Process multiple scans at once - create individual invoices or combine them into one.'
                />
              </div>

              {!isAuthenticated && (
                <div className='rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30'>
                  <p className='text-sm text-indigo-800 dark:text-indigo-200'>
                    <strong>Sign in</strong> to save your invoices permanently and access them from any device.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <BentoSection />

      {/* Enhanced CTA Section */}
      <EnhancedCTA />
    </main>
  );
}
