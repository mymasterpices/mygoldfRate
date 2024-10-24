import db from "../db.server";
import { cors } from 'remix-utils/cors';

export async function loader() {
    try {
        const current_rate = await db.goldGSTRates.findFirst();

        if (!current_rate) {
            return new Response("Something went wrong...", { status: 500 });
        }

        // Assuming you want to return JSON data; adjust according to your needs
        return new Response(JSON.stringify(current_rate), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...cors(), // Include CORS headers if needed
            },
        });
    } catch (error) {
        console.error("Error fetching gold rates:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
