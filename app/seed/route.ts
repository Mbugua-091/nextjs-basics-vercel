// Import bcrypt for hashing passwords
import bcrypt from 'bcrypt';

// Import the database client from Vercel Postgres
import { db } from '@vercel/postgres';

// Import placeholder data for seeding (users, invoices, customers, revenue)
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

// Establish a connection to the database
const client = await db.connect();

/**
 * Creates required extensions in the database.
 * Ensures the "uuid-ossp" extension is available for generating UUIDs.
 */
async function createExtensions() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`; // Creates the extension only if it doesn't already exist
}

/**
 * Seeds the `users` table with data from the placeholder.
 */
async function seedUsers() {
  // Create the `users` table if it doesn't exist
  await client.sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,  -- Automatically generated UUID as primary key
      name VARCHAR(255) NOT NULL,                     -- Name of the user
      email TEXT NOT NULL UNIQUE,                     -- Unique email address
      password TEXT NOT NULL                          -- Hashed password
    );
  `;

  // Insert data for each user in the `users` array
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10); // Hash the user's password with a salt factor of 10
      try {
        return await client.sql`
          INSERT INTO users (id, name, email, password)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword}) -- Insert user details
          ON CONFLICT (id) DO NOTHING; -- Prevent duplicate entries by ignoring conflicts
        `;
      } catch (err) {
        console.error(`Error inserting user: ${user.email}`, err); // Log errors for debugging
      }
    })
  );

  return insertedUsers; // Return the result of the insertion
}

/**
 * Seeds the `invoices` table with data from the placeholder.
 */
async function seedInvoices() {
  // Create the `invoices` table if it doesn't exist
  await client.sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,   -- Automatically generated UUID as primary key
      customer_id UUID NOT NULL REFERENCES customers(id), -- Foreign key to the customers table
      amount INT NOT NULL,                                 -- Invoice amount
      status VARCHAR(255) NOT NULL,                        -- Status of the invoice (e.g., "paid", "pending")
      date DATE NOT NULL                                   -- Invoice date
    );
  `;

  // Insert data for each invoice in the `invoices` array
  const insertedInvoices = await Promise.all(
    invoices.map(async (invoice) => {
      try {
        return await client.sql`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date}) -- Insert invoice details
          ON CONFLICT (id) DO NOTHING; -- Prevent duplicate entries by ignoring conflicts
        `;
      } catch (err) {
        console.error(`Error inserting invoice for customer: ${invoice.customer_id}`, err); // Log errors
      }
    })
  );

  return insertedInvoices;
}

/**
 * Seeds the `customers` table with data from the placeholder.
 */
async function seedCustomers() {
  // Create the `customers` table if it doesn't exist
  await client.sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, -- Automatically generated UUID as primary key
      name VARCHAR(255) NOT NULL,                    -- Customer name
      email VARCHAR(255) NOT NULL UNIQUE,            -- Unique email address
      image_url VARCHAR(255) NOT NULL                -- URL of the customer's profile image
    );
  `;

  // Insert data for each customer in the `customers` array
  const insertedCustomers = await Promise.all(
    customers.map(async (customer) => {
      try {
        return await client.sql`
          INSERT INTO customers (id, name, email, image_url)
          VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url}) -- Insert customer details
          ON CONFLICT (id) DO NOTHING; -- Prevent duplicate entries by ignoring conflicts
        `;
      } catch (err) {
        console.error(`Error inserting customer: ${customer.email}`, err); // Log errors
      }
    })
  );

  return insertedCustomers;
}

/**
 * Seeds the `revenue` table with data from the placeholder.
 */
async function seedRevenue() {
  // Create the `revenue` table if it doesn't exist
  await client.sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE, -- Month as a short string (e.g., "Jan")
      revenue INT NOT NULL              -- Revenue for the month
    );
  `;

  // Insert data for each revenue entry in the `revenue` array
  const insertedRevenue = await Promise.all(
    revenue.map(async (rev) => {
      try {
        return await client.sql`
          INSERT INTO revenue (month, revenue)
          VALUES (${rev.month}, ${rev.revenue}) -- Insert revenue details
          ON CONFLICT (month) DO NOTHING; -- Prevent duplicate entries by ignoring conflicts
        `;
      } catch (err) {
        console.error(`Error inserting revenue for month: ${rev.month}`, err); // Log errors
      }
    })
  );

  return insertedRevenue;
}

/**
 * Main GET handler for seeding the database.
 * Orchestrates all the seeding operations inside a database transaction.
 */
export async function GET() {
  try {
    await client.sql`BEGIN`; // Start a database transaction

    await createExtensions(); // Ensure required extensions are available
    await seedUsers();       // Seed the `users` table
    await seedCustomers();   // Seed the `customers` table
    await seedInvoices();    // Seed the `invoices` table
    await seedRevenue();     // Seed the `revenue` table

    await client.sql`COMMIT`; // Commit the transaction if all seeding operations succeed
    return new Response('Database seeded successfully');
  } catch (error) {
    await client.sql`ROLLBACK`; // Rollback the transaction in case of an error
    console.error('Error during database seeding:', error);
    return new Response(`Error seeding database`, { status: 500 });
  }
}
