
import { json } from "@remix-run/node";

export async function loader() {


    return json({
        ok: true,
        message: "Message from API",
    });
}

// export async function actions(request) {
//     const method = request.method;

//     switch (method) {
//         case "POST": return json({ message: "This is a POST request" });

//         case "PATCH": return json({ message: "This is a PATCH request" });

//             break;

//         default: return new Response("Method Not Allowed", { status: 405 });
//     }
//     // return json({ message: "Success" });
// }