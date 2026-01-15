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
import {useTranslations} from "next-intl";
import {TbCalendar, TbCheck, TbEdit, TbShieldCheck, TbSparkles, TbUser} from "react-icons/tb";
import {calculateAccountAge, calculateProfileCompletion, getInitials} from "../_utils/helpers";

type Props = Readonly<{
  user: User | null;
  userIdentifier: string;
}>;

export function ProfileHeader({user, userIdentifier}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile");
  const profileCompletion = calculateProfileCompletion(user);
  const accountAgeDays = calculateAccountAge(user?.createdAt);

  return (
    <Card className='overflow-hidden'>
      <div className='from-primary/20 via-primary/10 relative h-32 bg-gradient-to-r to-transparent'>
        <div className='bg-primary/10 absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl' />
      </div>
      <CardContent className='relative -mt-16 px-6 pb-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex flex-col items-center gap-4 sm:flex-row sm:items-end'>
            <div className='relative'>
              <Avatar className='border-background ring-primary/20 h-24 w-24 border-4 shadow-xl ring-2'>
                <AvatarImage
                  src={user?.imageUrl}
                  alt={`${user?.firstName ?? "User"}'s avatar`}
                />
                <AvatarFallback className='text-2xl'>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
              </Avatar>
              <div className='ring-background absolute -right-1 -bottom-1 rounded-full bg-green-500 p-1.5 ring-2'>
                <TbCheck className='h-3 w-3 text-white' />
              </div>
            </div>

            <div className='text-center sm:text-left'>
              <div className='flex flex-col items-center gap-2 sm:flex-row'>
                <h1 className='text-2xl font-bold'>
                  {user?.firstName ?? ""} {user?.lastName ?? ""}
                </h1>
                <Badge
                  variant='secondary'
                  className='gap-1'>
                  <TbSparkles className='h-3 w-3' />
                  {t("header.premium")}
                </Badge>
              </div>
              <p className='text-muted-foreground mt-1'>{user?.primaryEmailAddress?.emailAddress}</p>

              <div className='mt-3 flex flex-wrap justify-center gap-2 sm:justify-start'>
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

          <div className='flex items-center gap-2'>
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
                <div className='mt-6 space-y-4'>
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

        <div className='mt-6 max-w-md'>
          <div className='mb-2 flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>{t("header.profileCompletion")}</span>
            <span className='font-medium'>{profileCompletion}%</span>
          </div>
          <Progress
            value={profileCompletion}
            className='h-2'
          />
          {profileCompletion < 100 && <p className='text-muted-foreground mt-2 text-xs'>{t("header.completionHint")}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
