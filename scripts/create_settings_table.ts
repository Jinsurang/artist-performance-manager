import postgres from "postgres";

async function createSettingsTable() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        console.log("Creating settings table...");
        await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
        console.log("Settings table created successfully.");
        await sql.end();
    } catch (error) {
        console.error("Failed to create settings table:", error);
    }
}

createSettingsTable();
