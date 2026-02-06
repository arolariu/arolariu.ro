"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Progress,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@arolariu/components";
import type {User} from "@clerk/nextjs/server";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbCalendar, TbCheck, TbEdit, TbShieldCheck, TbSparkles, TbUser} from "react-icons/tb";
import {calculateAccountAge, calculateProfileCompletion, getInitials} from "../_utils/helpers";
import styles from "./ProfileHeader.module.scss";

type Props = Readonly<{
  user: User | null;
  userIdentifier: string;
}>;

export function ProfileHeader({user, userIdentifier}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile");
  const profileCompletion = calculateProfileCompletion(user);
  const accountAgeDays = calculateAccountAge(user?.createdAt);

  return (
    <motion.div
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}>
      <Card className='overflow-hidden'>
        <div className={styles["bannerGradient"]}>
          <div className={styles["bannerOrb"]} />
        </div>
        <CardContent className={styles["cardBody"]}>
          <div className={styles["headerLayout"]}>
            <div className={styles["avatarGroup"]}>
              <div className={styles["avatarWrapper"]}>
                <Avatar className='border-background ring-primary/20 h-24 w-24 border-4 shadow-xl ring-2'>
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={`${user?.firstName ?? "User"}'s avatar`}
                  />
                  <AvatarFallback className='text-2xl'>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                </Avatar>
                <div className={styles["onlineIndicator"]}>
                  <TbCheck className={styles["onlineIcon"]} />
                </div>
              </div>

              <div className={styles["nameBlock"]}>
                <div className={styles["nameRow"]}>
                  <h1 className={styles["name"]}>
                    {user?.firstName ?? ""} {user?.lastName ?? ""}
                  </h1>
                  <Badge
                    variant='secondary'
                    className='gap-1'>
                    <TbSparkles className='h-3 w-3' />
                    {t("header.premium")}
                  </Badge>
                </div>
                <p className={styles["email"]}>{user?.primaryEmailAddress?.emailAddress}</p>

                <div className={styles["badges"]}>
                  <Badge variant='outline'>
                    <TbUser className='mr-1 h-3 w-3' />
                    {t("header.memberSince", {date: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"})}
                  </Badge>
                  <Badge variant='outline'>
                    <TbShieldCheck className='mr-1 h-3 w-3' />
                    {t("header.userId")}: {userIdentifier.slice(0, 8)}...
                  </Badge>
                  <Badge variant='outline'>
                    <TbCalendar className='mr-1 h-3 w-3' />
                    {accountAgeDays} {t("header.daysActive")}
                  </Badge>
                </div>
              </div>
            </div>

            <div className={styles["editActions"]}>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='cursor-pointer gap-2'>
                    <TbEdit className='h-4 w-4' />
                    {t("header.editProfile")}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{t("header.editProfileTitle")}</SheetTitle>
                    <SheetDescription>{t("header.editProfileDescription")}</SheetDescription>
                  </SheetHeader>
                  <div className={styles["sheetBody"]}>
                    <p className='text-muted-foreground text-sm'>{t("header.editProfileClerkNote")}</p>
                    <Button
                      className='w-full cursor-pointer'
                      asChild>
                      <a
                        href='https://accounts.arolariu.ro/user'
                        target='_blank'
                        rel='noopener noreferrer'>
                        {t("header.manageOnClerk")}
                      </a>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className={styles["progressSection"]}>
            <div className={styles["progressHeader"]}>
              <span className={styles["progressLabel"]}>{t("header.profileCompletion")}</span>
              <span className={styles["progressValue"]}>{profileCompletion}%</span>
            </div>
            <Progress
              value={profileCompletion}
              className='h-2'
            />
            {profileCompletion < 100 && <p className={styles["progressHint"]}>{t("header.completionHint")}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
