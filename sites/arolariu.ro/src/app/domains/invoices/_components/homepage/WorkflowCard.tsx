"use client";

import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {motion} from "motion/react";
import Link from "next/link";
import {type IconType} from "react-icons/lib";
import {TbArrowRight} from "react-icons/tb";
import styles from "./WorkflowCard.module.scss";

interface Props {
  step: number;
  title: string;
  description: string;
  icon: IconType;
  href: string;
  buttonText: string;
  delay: number;
}

/**
 * Renders a single workflow step card.
 *
 * @param props - Component props.
 * @returns The workflow card.
 */
export default function WorkflowCard({step, title, description, icon: Icon, href, buttonText, delay}: Readonly<Props>): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5, delay}}>
      <Card className={styles["workflowCard"]}>
        <div className={styles["stepBadge"]}>{step}</div>

        <CardHeader className='pb-2'>
          <div className={styles["stepIconBox"]}>
            <Icon className={styles["workflowIcon"]} />
          </div>
          <CardTitle className='text-xl'>{title}</CardTitle>
          <CardDescription className='text-base'>{description}</CardDescription>
        </CardHeader>

        <CardContent className='pt-2'>
          <Button
            asChild
            className={styles["stepButton"]}>
            <Link
              href={href}
              className={styles["cardLink"]}>
              {buttonText}
              <TbArrowRight className={styles["cardArrowIcon"]} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
