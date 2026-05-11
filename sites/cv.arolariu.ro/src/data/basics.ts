/**
 * @fileoverview JSON Resume `basics` block.
 *
 * Identity, contact, and profile data shaped per the JSON Resume v1.0.0
 * schema. Re-uses {@link author} for name/title/email/url and adds the
 * JSON-Resume-only fields (location detail, profiles[], summary).
 */

import type {JsonResumeBasics} from "@/types";

import {author} from "./author";

export const basics: JsonResumeBasics = Object.freeze({
  name: author.name,
  label: author.title,
  image: "https://cv.arolariu.ro/avatar.jpg",
  email: author.email,
  url: author.website,
  summary:
    "Ambitious, respectful and hard working software engineer that wants to share his knowledge and help become a business force multiplier. Currently working at Microsoft as a software engineer in the E+D MSAI FAST organization, building solutions that are used by millions of users worldwide.",
  location: {
    address: "",
    postalCode: "",
    city: "Bucharest",
    countryCode: "RO",
    region: "Romania / European Union",
  },
  profiles: [
    {network: "LinkedIn", username: "olariu-alexandru", url: "https://www.linkedin.com/in/olariu-alexandru/"},
    {network: "GitHub", username: "arolariu", url: "https://www.github.com/arolariu"},
    {network: "Website", username: "arolariu", url: "https://arolariu.ro"},
  ],
});
