"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {AnimatePresence, motion, useInView} from "motion/react";
import Link from "next/link";
import {useRef, useState} from "react";
import {
  TbArrowRight,
  TbBrain,
  TbChartBar,
  TbCurrencyDollar,
  TbFileInvoice,
  TbLanguage,
  TbLock,
  TbReceipt,
  TbShieldCheck,
  TbToolsKitchen2,
} from "react-icons/tb";

interface Feature {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  gradient: string;
  link: string;
  tags: string[];
}

const features: Feature[] = [
  {
    id: "invoices",
    title: "Invoice Processing",
    description: "AI-powered invoice analysis and management",
    longDescription:
      "Upload receipt photos and let AI extract merchant details, items, prices, and more. Automatic categorization, expense tracking, and detailed analytics help you understand your spending patterns.",
    icon: TbFileInvoice,
    color: "text-blue-500",
    gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
    link: "/domains/invoices",
    tags: ["AI", "OCR", "Analytics"],
  },
  {
    id: "merchants",
    title: "Merchant Intelligence",
    description: "Automatic merchant detection and insights",
    longDescription:
      "Our AI identifies merchants from receipt data, building a comprehensive database of your shopping patterns. Get insights into where you shop, spending trends, and merchant comparisons.",
    icon: TbReceipt,
    color: "text-purple-500",
    gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
    link: "/domains/invoices/view-merchants",
    tags: ["ML", "Insights", "Tracking"],
  },
  {
    id: "budgets",
    title: "Budget Management",
    description: "Smart budget tracking and alerts",
    longDescription:
      "Set budgets by category and receive intelligent alerts when approaching limits. Visualize your spending with interactive charts and identify areas for optimization.",
    icon: TbCurrencyDollar,
    color: "text-green-500",
    gradient: "from-green-500/20 via-green-500/10 to-transparent",
    link: "/domains/invoices",
    tags: ["Budgets", "Alerts", "Planning"],
  },
  {
    id: "analytics",
    title: "Expense Analytics",
    description: "Deep insights into your spending",
    longDescription:
      "Comprehensive analytics dashboard with spending trends, category breakdowns, monthly comparisons, and predictive insights powered by machine learning algorithms.",
    icon: TbChartBar,
    color: "text-orange-500",
    gradient: "from-orange-500/20 via-orange-500/10 to-transparent",
    link: "/domains/invoices",
    tags: ["Charts", "Trends", "Reports"],
  },
  {
    id: "recipes",
    title: "Recipe Management",
    description: "Organize and discover culinary creations",
    longDescription:
      "Store your favorite recipes, discover new ones, and plan meals efficiently. AI-powered suggestions based on ingredients, dietary preferences, and past cooking history.",
    icon: TbToolsKitchen2,
    color: "text-pink-500",
    gradient: "from-pink-500/20 via-pink-500/10 to-transparent",
    link: "/domains/recipes",
    tags: ["Cooking", "Meal Planning", "AI"],
  },
  {
    id: "ai",
    title: "AI Assistant",
    description: "Intelligent automation at your fingertips",
    longDescription:
      "Powered by Azure OpenAI, our AI assistant helps with document understanding, data extraction, smart categorization, and natural language queries about your data.",
    icon: TbBrain,
    color: "text-cyan-500",
    gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
    link: "/domains",
    tags: ["GPT-4", "Azure AI", "NLP"],
  },
  {
    id: "security",
    title: "Enterprise Security",
    description: "Bank-grade security for your data",
    longDescription:
      "Your data is protected with enterprise-grade encryption, secure authentication via Azure AD B2C, and compliance with GDPR. We never sell or share your personal information.",
    icon: TbShieldCheck,
    color: "text-red-500",
    gradient: "from-red-500/20 via-red-500/10 to-transparent",
    link: "/about/the-platform",
    tags: ["Encryption", "GDPR", "SSO"],
  },
  {
    id: "i18n",
    title: "Multi-Language",
    description: "Fully internationalized experience",
    longDescription:
      "The platform supports multiple languages with full RTL support. Currently available in English and Romanian, with more languages planned for future releases.",
    icon: TbLanguage,
    color: "text-indigo-500",
    gradient: "from-indigo-500/20 via-indigo-500/10 to-transparent",
    link: "/about/the-platform",
    tags: ["i18n", "English", "Romanian"],
  },
  {
    id: "auth",
    title: "Secure Authentication",
    description: "Flexible and secure sign-in options",
    longDescription:
      "Sign in with Microsoft, Google, GitHub, or email. Azure AD B2C provides enterprise-grade identity management with MFA support and seamless SSO experience.",
    icon: TbLock,
    color: "text-amber-500",
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    link: "/auth/sign-in",
    tags: ["OAuth", "MFA", "SSO"],
  },
];

/**
 * Features component displaying the platform's main capabilities.
 * Features interactive cards with hover effects and detailed descriptions.
 * @returns The Features component, CSR'ed.
 */
export default function Features(): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  return (
    <section
      ref={ref}
      className='relative py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background via-primary/5 to-background absolute inset-0 bg-gradient-to-b' />
      </div>

      <div className='container mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          className='mx-auto mb-16 max-w-3xl text-center'
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className='mb-4 px-4 py-1 text-sm'>
              Platform Features
            </Badge>
          </motion.div>
          <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl'>
            Everything you need,{" "}
            <span className='bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'>beautifully crafted</span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>
            A comprehensive suite of tools designed for modern personal finance management, recipe organization, and more. Built with cutting-edge
            technologies and a focus on user experience.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: index * 0.1}}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverStart={() => setHoveredFeature(feature.id)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverEnd={() => setHoveredFeature(null)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onClick={() => setSelectedFeature(feature)}>
              <Card
                className={`group relative h-full cursor-pointer overflow-hidden transition-all duration-300 ${
                  hoveredFeature === feature.id ? "border-primary shadow-lg shadow-primary/10" : "hover:border-primary/30"
                }`}>
                {/* Gradient background on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300`}
                  animate={{opacity: hoveredFeature === feature.id ? 1 : 0}}
                />

                <CardHeader className='relative'>
                  <div className='mb-4 flex items-center justify-between'>
                    <motion.div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient}`}
                      animate={{
                        scale: hoveredFeature === feature.id ? 1.1 : 1,
                        rotate: hoveredFeature === feature.id ? 5 : 0,
                      }}
                      transition={{duration: 0.3}}>
                      <feature.icon className={`h-7 w-7 ${feature.color}`} />
                    </motion.div>
                    <motion.div
                      animate={{
                        x: hoveredFeature === feature.id ? 0 : 10,
                        opacity: hoveredFeature === feature.id ? 1 : 0,
                      }}
                      transition={{duration: 0.3}}>
                      <TbArrowRight className={`h-5 w-5 ${feature.color}`} />
                    </motion.div>
                  </div>
                  <CardTitle className='text-xl'>{feature.title}</CardTitle>
                  <CardDescription className='text-base'>{feature.description}</CardDescription>
                </CardHeader>

                <CardContent className='relative'>
                  <div className='flex flex-wrap gap-2'>
                    {feature.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant='secondary'
                        className='text-xs'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Detail Modal */}
      <AnimatePresence>
        {selectedFeature !== null && (
          <motion.div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            // eslint-disable-next-line react/jsx-no-bind -- simple modal
            onClick={() => setSelectedFeature(null)}>
            <motion.div
              className='bg-background relative max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl p-8 shadow-2xl'
              initial={{scale: 0.9, y: 20}}
              animate={{scale: 1, y: 0}}
              exit={{scale: 0.9, y: 20}}
              // eslint-disable-next-line react/jsx-no-bind -- simple modal
              onClick={(e) => e.stopPropagation()}>
              <div className='mb-6 flex items-start gap-4'>
                <div className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${selectedFeature.gradient}`}>
                  <selectedFeature.icon className={`h-8 w-8 ${selectedFeature.color}`} />
                </div>
                <div>
                  <h3 className='text-2xl font-bold'>{selectedFeature.title}</h3>
                  <p className='text-muted-foreground'>{selectedFeature.description}</p>
                </div>
              </div>

              <p className='text-muted-foreground mb-6 text-lg leading-relaxed'>{selectedFeature.longDescription}</p>

              <div className='mb-6 flex flex-wrap gap-2'>
                {selectedFeature.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant='secondary'>
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className='flex gap-4'>
                <Link
                  href={selectedFeature.link}
                  className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r ${selectedFeature.gradient} px-6 py-3 font-medium transition-transform hover:scale-105`}>
                  Explore Feature
                  <TbArrowRight className='h-5 w-5' />
                </Link>
                <button
                  type='button'
                  // eslint-disable-next-line react/jsx-no-bind -- simple modal
                  onClick={() => setSelectedFeature(null)}
                  className='text-muted-foreground hover:text-foreground px-6 py-3 transition-colors'>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
