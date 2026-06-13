import type {Meta, StoryObj} from "@storybook/react";

/**
 * ShoppingCalendarCard shows a calendar heat map of spending by day with
 * month statistics and shopping pattern insights. Depends on `useInvoiceContext`
 * and `useInvoicesStore`.
 *
 * These stories render static previews of the shopping calendar card.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/ShoppingCalendar",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const intensityStyles = [
  {backgroundColor: "transparent"},
  {backgroundColor: "#dcfce7"},
  {backgroundColor: "#bbf7d0"},
  {backgroundColor: "#4ade80"},
  {backgroundColor: "#16a34a", color: "#fff"},
] as const;

type CalendarPreviewProps = Readonly<{
  monthTotal: string;
  shoppingDays: number;
  averageEveryDays: number;
  perTrip: string;
  intensity: readonly number[];
}>;

/**
 * Static replica of the shopping calendar card driven by simple props.
 *
 * @param props - Display values for the calendar heat map and stats.
 * @returns The static calendar preview element.
 */
function CalendarPreview({monthTotal, shoppingDays, averageEveryDays, perTrip, intensity}: CalendarPreviewProps): React.JSX.Element {
  return (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          📅 Shopping Calendar
          <span
            style={{color: "#9ca3af"}}
            title='Based on cached invoices'>
            ℹ️
          </span>
        </h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1rem"}}>
        <div
          style={{
            display: "grid",
            width: "100%",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.75rem",
          }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div
              key={`header-${String(i)}`}
              style={{paddingTop: "0.25rem", paddingBottom: "0.25rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280"}}>
              {day}
            </div>
          ))}
          {Array.from({length: 31}, (_, i) => (
            <div
              key={`day-${String(i)}`}
              style={{
                display: "flex",
                height: "2rem",
                width: "2rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                ...intensityStyles[intensity[i] ?? 0],
              }}>
              {i + 1}
            </div>
          ))}
        </div>

        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>Less</span>
          <div style={{display: "flex", gap: "0.125rem"}}>
            <div style={{height: "0.75rem", width: "0.75rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
            <div style={{height: "0.75rem", width: "0.75rem", borderRadius: "0.25rem", backgroundColor: "#bbf7d0"}} />
            <div style={{height: "0.75rem", width: "0.75rem", borderRadius: "0.25rem", backgroundColor: "#4ade80"}} />
            <div style={{height: "0.75rem", width: "0.75rem", borderRadius: "0.25rem", backgroundColor: "#16a34a"}} />
          </div>
          <span>More</span>
        </div>

        <hr style={{width: "100%"}} />

        <div style={{display: "grid", width: "100%", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem"}}>
            <span style={{color: "#9ca3af"}}>🛒</span>
            <div>
              <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Month Total</p>
              <p style={{fontSize: "0.875rem", fontWeight: 600}}>{monthTotal}</p>
            </div>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem"}}>
            <span style={{color: "#9ca3af"}}>📅</span>
            <div>
              <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Shopping Days</p>
              <p style={{fontSize: "0.875rem", fontWeight: 600}}>{shoppingDays}</p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.75rem",
            fontSize: "0.875rem",
          }}>
          <span style={{color: "#9ca3af"}}>📈</span>
          <p>
            You shop every <strong>{averageEveryDays} days</strong> on average, spending <strong>{perTrip}</strong> per trip.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Preview of a busy shopping month with frequent trips. */
export const Preview: Story = {
  render: () => (
    <CalendarPreview
      monthTotal="$485.30"
      shoppingDays={8}
      averageEveryDays={4}
      perTrip="$60.66"
      intensity={[0, 0, 1, 0, 2, 0, 0, 0, 3, 0, 0, 1, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 2]}
    />
  ),
};

/** Quiet month with only a couple of shopping trips. */
export const QuietMonth: Story = {
  render: () => (
    <CalendarPreview
      monthTotal="$92.10"
      shoppingDays={2}
      averageEveryDays={15}
      perTrip="$46.05"
      intensity={[0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]}
    />
  ),
};
