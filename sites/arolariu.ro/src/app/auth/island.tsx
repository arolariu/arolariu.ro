/** @format */

import AuthCard from "./_components/AuthCard";

export default function RenderAuthScreen() {
  return (
    <section className='flex gap-4 2xsm:flex-col md:flex-row'>
      <AuthCard
        title='Become a new member today.'
        description='Being part of the `arolariu.ro` domain space allows you to save your profile across all the different domains
          hosted under the `arolariu.ro` umbrella. You can benefit from seamless synchronization and a unified
          experience across all the domains.'
        ctaText='Sign up.'
        cardType='sign-up'
      />
      <AuthCard
        title='Continue as an existing member.'
        description='Sign in using your member credentials. Your profile will be kept in sync during this browser session. You can
          benefit from seamless synchronization and a unified experience across all the domains.'
        ctaText='Sign in.'
        cardType='sign-in'
      />
    </section>
  );
}
