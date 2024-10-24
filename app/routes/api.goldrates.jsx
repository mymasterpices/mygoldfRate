import db from "../db.server";
import { cors } from 'remix-utils/cors';

export async function loader() {
    const current_rate = await db.goldGSTRates.findFirst();

    if (!current_rate) {
        return "Something went wrong...";
    }
    else {
        return cors(current_rate);
    }
}