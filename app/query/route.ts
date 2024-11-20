import { db } from '@vercel/postgres';

export async function listInvoices() {
  const client = await db.connect();

  try {
    // Run the SQL query
    const result = await client.sql`
      SELECT invoices.amount, customers.name
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE invoices.amount = 666;
    `;
    
    // Return the result
    return result.rows;
  } catch (error) {
    console.error('Error querying the database:', error);
    throw error;
  } finally {
    client.release(); // Always release the client
  }
}

// This function will be called when a GET request is made to /query
export async function GET() {
  try {
    // Get the list of invoices
    const invoices = await listInvoices();

    // Return the response as JSON
    return new Response(JSON.stringify(invoices), {
      status: 200,
    });
  } catch (error) {
    // Handle errors and return an appropriate response
    return new Response(JSON.stringify({ error: 'Failed to fetch invoices' }), {
      status: 500,
    });
  }
}
