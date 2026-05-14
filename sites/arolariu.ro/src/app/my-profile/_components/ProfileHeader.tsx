"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
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
import {TbEdit, TbShieldCheck} from "react-icons/tb";
import {getInitials} from "../_utils/helpers";
import styles from "./ProfileHeader.module.scss";

type Props = Readonly<{
  user: User | null;
  userIdentifier: string;
}>;

export function ProfileHeader({user, userIdentifier}: Props): React.JSX.Element {
  const t = useTranslations("Profile");

  return (
    <motion.div
      className={styles["headerRow"]}
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}>
      {/* Avatar */}
      <Avatar className={styles["avatar"]}>
        <AvatarImage
          src={user?.imageUrl}
          alt={`${user?.firstName ?? "User"}'s avatar`}
        />
        <AvatarFallback className={styles["avatarFallback"]}>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
      </Avatar>

      {/* Name + email */}
      <div className={styles["nameBlock"]}>
        <h1 className={styles["name"]}>
          {user?.firstName ?? ""} {user?.lastName ?? ""}
        </h1>
        <p className={styles["email"]}>{user?.primaryEmailAddress?.emailAddress}</p>
      </div>

      {/* Edit button */}
      <div className={styles["editActions"]}>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant='ghost'
                size='sm'
                className={styles["editButton"]}>
                <TbEdit className={styles["editIcon"]} />
                {t("header.editProfile")}
              </Button>
            }
          />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{t("header.editProfileTitle")}</SheetTitle>
              <SheetDescription>{t("header.editProfileDescription")}</SheetDescription>
            </SheetHeader>
            <div className={styles["sheetBody"]}>
              <Button
                className={styles["manageButton"]}
                onClick={() =>
                  window.open(userIdentifier ? `https://accounts.clerk.dev/user/${userIdentifier}` : "https://accounts.clerk.dev", "_blank")
                }>
                <TbShieldCheck className={styles["iconSmSize"]} />
                {t("header.manageOnClerk")}
              </Button>
              <p className={styles["sheetNote"]}>{t("header.editProfileClerkNote")}</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.div>
  );
}
