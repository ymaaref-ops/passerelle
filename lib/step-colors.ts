export type StepColor = 'blue' | 'violet' | 'green' | 'orange'

// Full class names so Tailwind can detect them at build time.
export const STEP_COLORS: Record<
  StepColor,
  { solid: string; text: string; card: string; line: string }
> = {
  blue: {
    solid: 'bg-step-blue',
    text: 'text-step-blue',
    card: 'bg-step-blue-soft border-step-blue-border',
    line: 'bg-step-blue',
  },
  violet: {
    solid: 'bg-step-violet',
    text: 'text-step-violet',
    card: 'bg-step-violet-soft border-step-violet-border',
    line: 'bg-step-violet',
  },
  green: {
    solid: 'bg-step-green',
    text: 'text-step-green',
    card: 'bg-step-green-soft border-step-green-border',
    line: 'bg-step-green',
  },
  orange: {
    solid: 'bg-step-orange',
    text: 'text-step-orange',
    card: 'bg-step-orange-soft border-step-orange-border',
    line: 'bg-step-orange',
  },
}
