import db from "../db.server";

export async function loader() {
    const current_rate = await db.goldGSTRates.findFirst();

    if (!current_rate) {
        return "Something went wrong...";
    }
    else {
        return current_rate;
    }
}
