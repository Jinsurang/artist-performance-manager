import postgres from "postgres";

async function cleanupTestData() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        console.log("🧹 Cleaning up test data...");
        await sql`DELETE FROM notices WHERE title LIKE 'Test Notice%'`;
        console.log("✅ Cleanup complete.");
        await sql.end();
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
    }
}

cleanupTestData();
