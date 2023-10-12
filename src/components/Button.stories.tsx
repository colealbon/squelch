import type { Meta, StoryObj } from 'storybook-solidjs';
import { within, userEvent } from '@storybook/testing-library';
import "virtual:uno.css"

import { Button } from './Button';

// More on how to set up stories at: https://storybook.js.org/docs/7.0/solid/writing-stories/introduction
const meta = {
  title: 'components/Button',
  parameters: {
    layout: 'centered'
  },
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    onClick: {action: "clicked"}
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
// More on writing stories with args: https://storybook.js.org/docs/7.0/solid/writing-stories/args
export const Basic: Story = {
  args: {
    label: 'test',
    class: "text-xl border-transparent transition-colors rounded-full bg-slate700 color-white hover-bg-black hover-color-white"
  },
  play: async({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.getByRole("button");
    await userEvent.click(button);
  }
};