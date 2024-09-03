// Import necessary modules
import { json } from "@remix-run/node";
import db from "../db.server";
import { useLoaderData } from "@remix-run/react";

// Loader function to fetch data from the database
export async function loader() {
    // Get gold_rate_22K from the database
    let getGoldRate = await db.Price.findFirst();
    if (!getGoldRate) {
        return json(null);
    }

    console.log("New Gold Rate -->", getGoldRate.gold_rate_22K);

    // Return the gold rate as JSON
    return json({ goldRate22K: getGoldRate.gold_rate_22K });
}

// Correctly define and export the Settings component
export default function Settings() {
    const goldRate22K = useLoaderData();
    return (
        <div>
            <h1>Settings</h1>
            {/* Display the fetched gold rate */}
            <p>Current Gold Rate: {goldRate22K?.goldRate22K || "Loading..."}</p>
        </div>
    );
}
