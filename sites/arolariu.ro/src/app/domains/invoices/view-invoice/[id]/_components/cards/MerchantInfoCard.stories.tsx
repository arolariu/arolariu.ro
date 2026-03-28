import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantInfoCard displays merchant details: name, address, phone, category,
 * and website. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the merchant info card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/MerchantInfo",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full merchant info with website. */
export const WithWebsite: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Kaufland</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{marginTop: "0.125rem", color: "#9ca3af"}}>📍</span>
          <span>Calea Victoriei 123, Sector 1, Bucharest</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span
            style={{
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              fontSize: "0.75rem",
            }}>
            SUPERMARKET
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>🌐</span>
          <a
            href='#'
            style={{color: "#2563eb"}}>
            kaufland.ro
          </a>
        </div>
      </div>
      <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant without website. */
export const WithoutWebsite: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Local Bakery</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{marginTop: "0.125rem", color: "#9ca3af"}}>📍</span>
          <span>Str. Lipscani 42, Bucharest</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>📞</span>
          <span>+40 21 987 6543</span>
        </div>
        <div>
          <span
            style={{
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              fontSize: "0.75rem",
            }}>
            BAKERY
          </span>
        </div>
      </div>
      <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant with a logo image. */
export const WithLogo: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <img
            src='https://picsum.photos/64/64'
            alt='Merchant logo'
            style={{height: "2.5rem", width: "2.5rem", borderRadius: "9999px", objectFit: "cover"}}
          />
          <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Kaufland</h3>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{marginTop: "0.125rem", color: "#9ca3af"}}>📍</span>
          <span>Calea Victoriei 123, Sector 1, Bucharest</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span
            style={{
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              fontSize: "0.75rem",
            }}>
            SUPERMARKET
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>🌐</span>
          <a
            href='#'
            style={{color: "#2563eb"}}>
            kaufland.ro
          </a>
        </div>
      </div>
      <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant with a very long name to test text overflow and wrapping. */
export const LongMerchantName: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>
          Mega Image Supermarket International Premium Gold Deluxe Extra — Downtown Central Branch Nr. 42
        </h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{marginTop: "0.125rem", color: "#9ca3af"}}>📍</span>
          <span>Bulevardul Decebal Nr. 123, Bloc A4, Scara 2, Etaj 1, Apartament 42, Sector 3, Bucharest, 030167, Romania</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
          <span style={{color: "#9ca3af"}}>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span
            style={{
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              fontSize: "0.75rem",
            }}>
            SUPERMARKET
          </span>
        </div>
      </div>
      <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};
