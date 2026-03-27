import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceDetailsCard displays the full invoice summary: date, category,
 * payment method, total, and a paginated items table. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the invoice details card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/InvoiceDetails",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full invoice details preview with items table. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1.5rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Invoice Details</h3>
          <span title='Important'>❤️</span>
        </div>
        <p style={{fontSize:'0.875rem', color:'#6b7280'}}>Kaufland • Weekly grocery shopping</p>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1.5rem'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'1rem'}}>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>📅 Date (UTC)</p>
            <p style={{fontSize:'0.875rem'}}>January 15, 2025, 10:30 AM</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Category</p>
            <span style={{borderRadius:'9999px', border:'1px solid #e5e7eb', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>GROCERIES</span>
          </div>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>💳 Payment</p>
            <p style={{fontSize:'0.875rem'}}>CREDIT CARD</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Total Amount</p>
            <p style={{fontSize:'1.125rem', fontWeight:700, color:'#16a34a'}}>$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 style={{marginBottom:'0.5rem', fontSize:'0.875rem', fontWeight:600}}>Items (8)</h4>
          <table style={{width:'100%', fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb', fontSize:'0.75rem', color:'#6b7280'}}>
                <th style={{paddingBottom:'0.5rem', textAlign:'left'}}>Item</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Qty</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Unit</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Price</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom:'1px solid #e5e7eb'}}>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>Organic Milk 2L</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>2</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>pcs</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>$3.99</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right', fontWeight:500}}>$7.98</td>
              </tr>
              <tr style={{borderBottom:'1px solid #e5e7eb'}}>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>Fresh Salmon</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>0.5</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>kg</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>$24.99</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right', fontWeight:500}}>$12.50</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{backgroundColor:'#f9fafb', fontWeight:600}}>
                <td
                  style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingLeft:'0.5rem'}}
                  colSpan={4}>
                  Grand Total
                </td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', textAlign:'right'}}>$125.50</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};

/** Invoice with 20+ items to test long lists and scrolling. */
export const ManyItems: Story = {
  render: () => {
    const items = [
      {name: "Organic Milk 2L", qty: "2", unit: "pcs", price: "$3.99", total: "$7.98"},
      {name: "Fresh Salmon", qty: "0.5", unit: "kg", price: "$24.99", total: "$12.50"},
      {name: "Whole Wheat Bread", qty: "1", unit: "pcs", price: "$2.49", total: "$2.49"},
      {name: "Free-Range Eggs (12)", qty: "2", unit: "pcs", price: "$4.99", total: "$9.98"},
      {name: "Avocados", qty: "4", unit: "pcs", price: "$1.50", total: "$6.00"},
      {name: "Greek Yogurt 500g", qty: "3", unit: "pcs", price: "$3.29", total: "$9.87"},
      {name: "Cherry Tomatoes 500g", qty: "2", unit: "pcs", price: "$2.99", total: "$5.98"},
      {name: "Sparkling Water 1.5L", qty: "6", unit: "pcs", price: "$0.89", total: "$5.34"},
      {name: "Olive Oil Extra Virgin", qty: "1", unit: "pcs", price: "$8.99", total: "$8.99"},
      {name: "Parmesan Cheese 200g", qty: "1", unit: "pcs", price: "$6.49", total: "$6.49"},
      {name: "Fresh Basil Bunch", qty: "1", unit: "pcs", price: "$1.99", total: "$1.99"},
      {name: "Chicken Breast 1kg", qty: "1", unit: "kg", price: "$9.99", total: "$9.99"},
      {name: "Brown Rice 1kg", qty: "2", unit: "pcs", price: "$3.49", total: "$6.98"},
      {name: "Almond Butter 250g", qty: "1", unit: "pcs", price: "$7.99", total: "$7.99"},
      {name: "Spinach 200g", qty: "2", unit: "pcs", price: "$2.29", total: "$4.58"},
      {name: "Blueberries 125g", qty: "3", unit: "pcs", price: "$3.99", total: "$11.97"},
      {name: "Granola 500g", qty: "1", unit: "pcs", price: "$5.49", total: "$5.49"},
      {name: "Dark Chocolate 85%", qty: "2", unit: "pcs", price: "$2.99", total: "$5.98"},
      {name: "Orange Juice 1L", qty: "2", unit: "pcs", price: "$3.49", total: "$6.98"},
      {name: "Bananas", qty: "1.2", unit: "kg", price: "$1.99", total: "$2.39"},
      {name: "Cheddar Cheese 300g", qty: "1", unit: "pcs", price: "$4.99", total: "$4.99"},
      {name: "Sourdough Loaf", qty: "1", unit: "pcs", price: "$4.49", total: "$4.49"},
    ];
    return (
      <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
        <div style={{borderBottom:'1px solid #e5e7eb', padding:'1.5rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Invoice Details</h3>
          </div>
          <p style={{fontSize:'0.875rem', color:'#6b7280'}}>Mega Image • Large weekly haul</p>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1.5rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'1rem'}}>
            <div>
              <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>📅 Date (UTC)</p>
              <p style={{fontSize:'0.875rem'}}>February 1, 2025, 2:15 PM</p>
            </div>
            <div>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Category</p>
              <span style={{borderRadius:'9999px', border:'1px solid #e5e7eb', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>GROCERIES</span>
            </div>
            <div>
              <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>💳 Payment</p>
              <p style={{fontSize:'0.875rem'}}>DEBIT CARD</p>
            </div>
            <div>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Total Amount</p>
              <p style={{fontSize:'1.125rem', fontWeight:700, color:'#16a34a'}}>$147.43</p>
            </div>
          </div>
          <hr />
          <div>
            <h4 style={{marginBottom:'0.5rem', fontSize:'0.875rem', fontWeight:600}}>Items ({items.length})</h4>
            <table style={{width:'100%', fontSize:'0.875rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #e5e7eb', fontSize:'0.75rem', color:'#6b7280'}}>
                  <th style={{paddingBottom:'0.5rem', textAlign:'left'}}>Item</th>
                  <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Qty</th>
                  <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Unit</th>
                  <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Price</th>
                  <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.name}
                    style={{borderBottom:'1px solid #e5e7eb'}}>
                    <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>{item.name}</td>
                    <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>{item.qty}</td>
                    <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>{item.unit}</td>
                    <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>{item.price}</td>
                    <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right', fontWeight:500}}>{item.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{backgroundColor:'#f9fafb', fontWeight:600}}>
                  <td
                    style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingLeft:'0.5rem'}}
                    colSpan={4}>
                    Grand Total
                  </td>
                  <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', textAlign:'right'}}>$147.43</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  },
};

/** Invoice with no items — empty state. */
export const EmptyItems: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1.5rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Invoice Details</h3>
        </div>
        <p style={{fontSize:'0.875rem', color:'#6b7280'}}>Unknown Merchant • No items detected</p>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1.5rem'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'1rem'}}>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>📅 Date (UTC)</p>
            <p style={{fontSize:'0.875rem'}}>January 20, 2025, 3:00 PM</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Category</p>
            <span style={{borderRadius:'9999px', border:'1px solid #e5e7eb', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>UNCATEGORIZED</span>
          </div>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>💳 Payment</p>
            <p style={{fontSize:'0.875rem'}}>CASH</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Total Amount</p>
            <p style={{fontSize:'1.125rem', fontWeight:700, color:'#16a34a'}}>$0.00</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 style={{marginBottom:'0.5rem', fontSize:'0.875rem', fontWeight:600}}>Items (0)</h4>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:'2rem', paddingBottom:'2rem', textAlign:'center', color:'#9ca3af'}}>
            <p style={{fontSize:'0.875rem'}}>No items detected on this invoice.</p>
            <p style={{marginTop:'0.25rem', fontSize:'0.75rem'}}>Try re-scanning or manually adding items.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Invoice with exactly one item — minimal line item display. */
export const SingleItem: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1.5rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Invoice Details</h3>
        </div>
        <p style={{fontSize:'0.875rem', color:'#6b7280'}}>Corner Shop • Quick purchase</p>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1.5rem'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'1rem'}}>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>📅 Date (UTC)</p>
            <p style={{fontSize:'0.875rem'}}>March 5, 2025, 9:15 AM</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Category</p>
            <span style={{borderRadius:'9999px', border:'1px solid #e5e7eb', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>BEVERAGES</span>
          </div>
          <div>
            <p style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>💳 Payment</p>
            <p style={{fontSize:'0.875rem'}}>CASH</p>
          </div>
          <div>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Total Amount</p>
            <p style={{fontSize:'1.125rem', fontWeight:700, color:'#16a34a'}}>$2.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 style={{marginBottom:'0.5rem', fontSize:'0.875rem', fontWeight:600}}>Items (1)</h4>
          <table style={{width:'100%', fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb', fontSize:'0.75rem', color:'#6b7280'}}>
                <th style={{paddingBottom:'0.5rem', textAlign:'left'}}>Item</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Qty</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Unit</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Price</th>
                <th style={{paddingBottom:'0.5rem', textAlign:'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom:'1px solid #e5e7eb'}}>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem'}}>Espresso Coffee</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>1</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>pcs</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right'}}>$2.50</td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', textAlign:'right', fontWeight:500}}>$2.50</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{backgroundColor:'#f9fafb', fontWeight:600}}>
                <td
                  style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingLeft:'0.5rem'}}
                  colSpan={4}>
                  Grand Total
                </td>
                <td style={{paddingTop:'0.5rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', textAlign:'right'}}>$2.50</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};
