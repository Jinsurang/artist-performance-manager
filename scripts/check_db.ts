import postgres from "postgres";

async function checkDb() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        const result = await sql`SELECT * FROM artists ORDER BY id DESC LIMIT 5`;
        console.log("Recent Artists:", JSON.stringify(result, null, 2));

        const count = await sql`SELECT COUNT(*) FROM artists`;
        console.log("Total Artists Count:", count[0].count);

        await sql.end();
    } catch (error) {
        console.error("DB Check Failed:", error);
    }
}

checkDb();
