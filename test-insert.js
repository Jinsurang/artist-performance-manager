import postgres from "postgres";

const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const sql = postgres(url);

async function testInsert() {
    try {
        console.log("Testing insert query...");
        // Attempt the exact query from the screenshot
        const result = await sql`
      insert into "artists" 
      ("id", "name", "genre", "phone", "instagram", "grade", "available_time", "instruments", "notes", "is_favorite", "created_at", "updated_at") 
      values (default, ${'123'}, ${'포크'}, ${'123'}, ${'123'}, ${'S'}, ${''}, ${'기타(2)'}, ${''}, default, default, default) 
      returning *;
    `;

        console.log("Insert successful:", result);
    } catch (err) {
        console.error("Insert FAILED with error:", err);
        console.error("Error Detail:", JSON.stringify(err, null, 2));
    } finally {
        process.exit();
    }
}

testInsert();
