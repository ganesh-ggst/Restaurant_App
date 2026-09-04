import { neon } from "@neondatabase/serverless";

// Initialize Neon client
const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

// 1. Create the table if it doesn't exist
export const initDB = async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        phone VARCHAR(20) PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Database table verified/created.");
  } catch (err) {
    console.error("❌ DB Init Error:", err);
  }
};

// 2. Fetch a user by phone number
export const getUserByPhone = async (phone: string) => {
  const result = await sql`SELECT * FROM users WHERE phone = ${phone}`;
  return result.length > 0 ? result[0] : null;
};

// 3. Create a new user
export const createUser = async (
  phone: string,
  firstName: string,
  lastName: string,
) => {
  const result = await sql`
    INSERT INTO users (phone, first_name, last_name)
    VALUES (${phone}, ${firstName}, ${lastName})
    RETURNING *
  `;
  return result[0];
};
