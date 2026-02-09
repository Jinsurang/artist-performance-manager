import postgres from "postgres";

const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const sql = postgres(url);

async function syncSchema() {
    try {
        console.log("Checking columns in 'artists' table...");
        const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'artists';
    `;

        const existingColumns = columns.map(c => c.column_name);
        console.log("Existing columns:", existingColumns);

        if (!existingColumns.includes("instagram")) {
            console.log("Adding 'instagram' column...");
            await sql`ALTER TABLE artists ADD COLUMN instagram VARCHAR(255);`;
        }

        if (!existingColumns.includes("available_time")) {
            console.log("Adding 'available_time' column...");
            await sql`ALTER TABLE artists ADD COLUMN available_time VARCHAR(255);`;
        }

        if (!existingColumns.includes("grade")) {
            console.log("Adding 'grade' column...");
            await sql`ALTER TABLE artists ADD COLUMN grade VARCHAR(50);`;
        }

        if (!existingColumns.includes("is_favorite")) {
            console.log("Adding 'is_favorite' column...");
            await sql`ALTER TABLE artists ADD COLUMN is_favorite BOOLEAN DEFAULT false;`;
        }

        console.log("Successfully synced schema!");
    } catch (err) {
        console.error("Failed to sync schema:", err);
    } finally {
        process.exit();
    }
}

syncSchema();
