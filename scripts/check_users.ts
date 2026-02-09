import postgres from "postgres";

async function checkUsers() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        const result = await sql`SELECT * FROM users`;
        console.log("Users:", JSON.stringify(result, null, 2));
        await sql.end();
    } catch (error) {
        console.error("Users Check Failed:", error);
    }
}

checkUsers();
