/** @format */

import DomainServiceCard from "@/app/domains/_components/DomainServiceCard";
import type {Meta, StoryObj} from "@storybook/react";
import {getTranslationProviderDecorator} from "./utils/mocks";

const meta: Meta<typeof DomainServiceCard> = {
  title: "Design System/Cards/Domain Service Card",
  component: DomainServiceCard,
  argTypes: {
    title: {control: "text"},
    description: {control: "text"},
    imageUrl: {control: "text"},
    linkTo: {control: "text"},
  },
  decorators: [getTranslationProviderDecorator()],
};

type Story = StoryObj<typeof DomainServiceCard>;

export const Default: Story = {
  args: {
    title: "Lorem Ipsum Dolor",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aperiam perspiciatis eligendi perferendis laudantium neque, quisquam harum itaque aliquid. Laboriosam iure, excepturi illo nihil ut soluta saepe cum enim architecto provident?",
    imageUrl: "https://dummyimage.com/300x600.jpg",
    linkTo: "https://arolariu.ro",
  },
};

export default meta;
