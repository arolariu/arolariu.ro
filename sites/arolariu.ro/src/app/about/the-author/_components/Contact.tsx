/** @format */

"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbBrandGithub, TbBrandLinkedin, TbCheck, TbCopy, TbExternalLink, TbMail, TbWorld} from "react-icons/tb";
import {useInView} from "react-intersection-observer";

/**
 * @description CSR'ed component that displays the author's contact information and collaboration interests.
 * @returns A section containing cards with contact information and collaboration opportunities
 */
export default function Contact(): React.JSX.Element {
  const t = useTranslations("About.Author.Contact");
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText("olariu.alexandru@pm.me");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }, []);

  const contactLinks = [
    {
      id: "email",
      label: "olariu.alexandru@pm.me",
      icon: <TbMail className='h-5 w-5' />,
      href: "mailto:olariu.alexandru@pm.me",
      color: "#D14836",
    },
    {
      id: "linkedin",
      label: "/olariu-alexandru",
      icon: <TbBrandLinkedin className='h-5 w-5' />,
      href: "https://www.linkedin.com/in/olariu-alexandru/",
      color: "#0077B5",
    },
    {
      id: "github",
      label: "/arolariu",
      icon: <TbBrandGithub className='h-5 w-5' />,
      href: "https://github.com/arolariu",
      color: "#333",
    },
    {
      id: "website",
      label: "arolariu.ro",
      icon: <TbWorld className='h-5 w-5' />,
      href: "https://arolariu.ro",
      color: "#1e90ff",
    },
  ];

  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {opacity: 0, y: 20},
    visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
  };

  return (
    <section className='mx-auto max-w-6xl px-4 py-20 md:px-8'>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.6}}
        className='mb-16 text-center'>
        <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>{t("title")}</h2>
        <span className='text-muted-foreground mx-auto block max-w-2xl'>{t("subtitle")}</span>
      </motion.div>

      <motion.div
        ref={ref}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className='2xsm:gap-8 grid md:grid-cols-2 md:gap-0 lg:gap-8'>
        <motion.div variants={itemVariants}>
          <Card className='bg-card h-full overflow-hidden border-none shadow-lg transition-all duration-300 hover:shadow-xl'>
            <div className='from-primary to-primary/30 absolute top-0 left-0 h-1 w-full bg-linear-to-r' />

            <CardHeader>
              <CardTitle className='text-glow'>{t("socials.title")}</CardTitle>
              <CardDescription>{t("socials.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className='space-y-6'>
              <div className='grid gap-4'>
                {contactLinks.map((link, index) => (
                  <motion.div
                    key={link.id}
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{delay: index * 0.1, duration: 0.5}}
                    onHoverStart={() => setHoveredLink(link.id)}
                    onHoverEnd={() => setHoveredLink(null)}
                    className='relative'>
                    <div
                      className={`absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 ${hoveredLink === link.id ? "opacity-10" : ""}`}
                      style={{backgroundColor: link.color}}
                    />

                    <div className='group border-border/50 relative flex items-center justify-between overflow-hidden rounded-lg border p-3'>
                      <div className='flex items-center'>
                        <div
                          className='mr-3 rounded-full p-2 transition-colors duration-300'
                          style={{
                            backgroundColor: hoveredLink === link.id ? link.color : "rgba(var(--primary), 0.1)",
                            color: hoveredLink === link.id ? "white" : "hsl(var(--primary))",
                          }}>
                          {link.icon}
                        </div>
                        <span className='font-medium'>{link.label}</span>
                      </div>

                      <div className='flex items-center gap-2'>
                        {link.id === "email" && (
                          <motion.button
                            onClick={copyEmail}
                            className='text-muted-foreground hover:text-primary rounded-full p-2 transition-colors duration-300'
                            whileHover={{scale: 1.1}}
                            whileTap={{scale: 0.95}}>
                            {copiedEmail ? <TbCheck className='h-4 w-4' /> : <TbCopy className='h-4 w-4' />}
                          </motion.button>
                        )}

                        <motion.a
                          href={link.href}
                          target={link.id === "email" ? undefined : "_blank"}
                          rel={link.id === "email" ? undefined : "noopener noreferrer"}
                          className='text-muted-foreground hover:text-primary rounded-full p-2 transition-colors duration-300'
                          whileHover={{scale: 1.1}}
                          whileTap={{scale: 0.95}}>
                          <TbExternalLink className='h-4 w-4' />
                        </motion.a>
                      </div>

                      <motion.div
                        className='bg-primary absolute bottom-0 left-0 h-0.5'
                        initial={{width: "0%"}}
                        animate={{width: hoveredLink === link.id ? "100%" : "0%"}}
                        transition={{duration: 0.3}}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className='border-border/30 border-t pt-4'>
                <span className='text-muted-foreground block text-sm'>{t("socials.footer")}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className='bg-card relative h-full overflow-hidden border-none shadow-lg transition-all duration-300 hover:shadow-xl'>
            <div className='bg-grid-pattern absolute inset-0 opacity-[0.03]' />
            <div className='from-primary to-primary/30 absolute top-0 left-0 h-1 w-full bg-linear-to-r' />

            <CardHeader>
              <CardTitle className='text-glow'>{t("collaborate.title")}</CardTitle>
              <CardDescription>{t("collaborate.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className='mb-6 grid grid-cols-2 gap-4'>
                {[
                  t("collaborate.discipline1"),
                  t("collaborate.discipline2"),
                  t("collaborate.discipline3"),
                  t("collaborate.discipline4"),
                ].map((field, index) => (
                  <motion.div
                    key={field}
                    initial={{opacity: 0, scale: 0.8}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{delay: index * 0.1, duration: 2.5}}
                    whileHover={{scale: 1.05, transition: {duration: 0.3}}}
                    className='bg-primary/10 hover:bg-primary/50 rounded-lg p-3 text-center transition-colors duration-300'>
                    <span className='text-primary font-medium'>{field}</span>
                  </motion.div>
                ))}
              </div>

              <p className='mb-6'>{t("collaborate.footer")}</p>

              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.5, duration: 1}}
                className='text-center'>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, 0, -2, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}>
                  <h3 className='text-glow-strong text-2xl font-bold lg:text-5xl'>{t("footer")}</h3>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
