import type {Testimonial} from "@/types";

type TestimonialKeys =
  | "perspectiveFromX"
  | "perspectiveFromXX"
  | "perspectiveFromXY"
  | "perspectiveFromXZ"
  | "perspectiveFromY"
  | "perspectiveFromYX"
  | "perspectiveFromYY"
  | "perspectiveFromYZ"
  | "perspectiveFromZ";

type Testimonials = Readonly<Record<TestimonialKeys, Testimonial>>;

/**
 * Collection of testimonials from colleagues and peers.
 * Each testimonial includes the author's name, position, company, and a quote.
 * This data is structured to provide insights into the author's professional relationships and impact.
 */
export const testimonials: Readonly<Testimonials> = {
  perspectiveFromX: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Software Engineer",
    quote:
      "The thing that I appreciate a lot about you is your relentless pursuit of improvement and your willingness to challenge the status quo. Your commitment to continuous self-development is evident in the way you approach every task with a mindset geared towards innovation and excellence. Your ability to question existing methods and propose better alternatives has been instrumental in driving our projects forward. This proactive attitude not only enhances the quality of our work but also inspires the team to strive for higher standards. I am happy to have worked with you and hope our paths will cross again in the future.",
  },
  perspectiveFromXX: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Software Engineer",
    quote:
      "Alex is an intelligent engineer whose capabilities shone brightly during our collaboration on our projects. He consistently demonstrates eagerness to assist the team with any request, showcasing his dedication to collective success. His proactive approach to problem-solving and dedication to system stability greatly benefit our team's workflow. Additionally, Alex's availability and willingness to support others during our release flow highlight his value as a colleague who prioritizes teamwork and collaboration.",
  },
  perspectiveFromXY: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Escalation Engineer",
    quote:
      "Alex, if I am to choose one thing, I value the most about working with you, it has to be your mindset - as it includes multiple aspects. Working with you is genuine, funny, wise and relevant at the same time. It is easy to notice that your daily drivers are commitment, reasoning and continuous learning. I admire your approach, your genuine desire to help, to build on the success of others and to support everyone in their growth which is such a rare value. On top of that I value your patience, as well as the great amount of knowledge you bring into our interactions. The way you manage stressful situations and your overall approach have the power to shape a positive outcome for any matter or topic.",
  },
  perspectiveFromXZ: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Software Engineer",
    quote:
      "I've been consistently impressed with your work output. You always deliver high-quality work, paying close attention to details and ensuring that everything is done to the best of your abilities, Additionally, you have a deep understanding of the technical aspects of our work, which has been a valuable asset for the team. Your willingness to share your knowledge and experience with others has been invaluable and it's clear that you take pride in mentoring others and helping them grow.",
  },
  perspectiveFromY: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Software Engineer II",
    quote:
      "I really appreciate your proactive approach and collaborative spirit, and your support and friendly communication style have been very positive to my onboarding experience and to learning the ins and outs of our project. Your ability to communicate effectively and keep everyone in the loop is something I'm looking up to, you are experienced with dealing with cross-functional teams, especially with our partner teams, with learning their needs and solving their problems. Your technical skills are impressive and your attention to detail is commendable.",
  },
  perspectiveFromYX: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Product Manager",
    quote:
      "Alexandru's depth of character is evident in his passion and commitment towards helping others succeed and nowhere is that clearer that in his mentorship of. I hold Alexandru in high regard - I may have a few years on him, but he should not hesitate to challenge me if he believes there's a better way to approach a problem.",
  },
  perspectiveFromYY: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Staff Software Engineer",
    quote:
      "I love your attitude and open mindset, I find it easy to work and talk with you. I don't have much for you to leverage these strength further: keep being yourself and you are already doing great work!",
  },
  perspectiveFromYZ: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Staff Software Engineer",
    quote:
      "Alexandru is a great software engineer. He's incredibly sharp and I would rate him in the top 1% for his age - at 25 most people struggle to find a job, while Alexandru is delivering impact that translates into millions of dollars. He's extremely talented.",
  },
  perspectiveFromZ: {
    author: "Anonymous",
    company: "Microsoft",
    position: "Senior Software Engineer",
    quote:
      "You always step up to help, sharing your time generously, even when you have your own pressing tasks. Your quick and helpful replies to any questions are greatly appreciated. You take a prioritized and meticulous approach, providing instant solutions that not only unblock us in the short term but also outline long-term fixes and their implementation timelines. Your solution-oriented mindset is a true asset for our team. Your expertise, willingness to assist, and pleasant personality make you a great colleague. Keep up the great work!",
  },
} as const;

/**
 * Array of all testimonials, flattened.
 * This is useful for iterating through testimonials in components.
 * Each entry in the array corresponds to a testimonial defined in the `testimonials` object.
 */
export const testimonialsAsArray: ReadonlyArray<Testimonial> = Object.freeze(Object.values(testimonials));
