/** Client island that aggregates all interactive About hub sections. */
"use client";

import CallToAction from "./_components/CallToAction";
import Faq from "./_components/Faq";
import Hero from "./_components/Hero";
import Mission from "./_components/Mission";
import Navigation from "./_components/Navigation";
import Stats from "./_components/Stats";
import Values from "./_components/Values";
import styles from "./page.module.scss";

/** Renders the About hub with all interactive sections. */
export default function RenderAboutScreen(): React.JSX.Element {
  return (
    <div className={styles["aboutInner"]}>
      <Hero />
      <Mission />
      <Values />
      <Stats />
      <Navigation />
      <Faq />
      <CallToAction />
    </div>
  );
}
