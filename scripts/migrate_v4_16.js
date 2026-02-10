import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const sql = postgres(url, { ssl: 'require' });

async function migrate() {
    try {
        console.log("Checking if member_count column exists...");
        const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'artists' AND column_name = 'member_count'
    `;

        if (columns.length === 0) {
            console.log("Adding member_count column to artists table...");
            await sql`ALTER TABLE artists ADD COLUMN member_count INTEGER DEFAULT 1 NOT NULL`;
            console.log("Column added successfully.");
        } else {
            console.log("member_count column already exists.");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await sql.end();
    }
}

migrate();
