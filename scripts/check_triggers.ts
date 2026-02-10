
import postgres from "postgres";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

async function checkTriggers() {
    if (!DATABASE_URL) {
        console.error("DATABASE_URL not found");
        return;
    }

    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    try {
        const triggers = await sql`
      SELECT 
        trigger_name, 
        event_manipulation, 
        event_object_table, 
        action_statement, 
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'performances';
    `;

        console.log("Triggers on 'performances' table:");
        console.table(triggers);

        const functions = await sql`
      SELECT 
        routine_name, 
        routine_definition
      FROM information_schema.routines
      WHERE routine_type = 'FUNCTION' 
        AND routine_schema = 'public';
    `;

        console.log("\nFunctions in 'public' schema:");
        // Filter for anything related to deletion
        const suspectedFunctions = functions.filter(f =>
            f.routine_definition?.toLowerCase().includes('delete') &&
            f.routine_definition?.toLowerCase().includes('performances')
        );
        console.table(suspectedFunctions);

    } catch (error) {
        console.error("Error checking triggers:", error);
    } finally {
        await sql.end();
    }
}

checkTriggers();
