console.log("NEXT_APP_DATABASE_URL before import:", process.env.NEXT_APP_DATABASE_URL ? "SET" : "MISSING");
import { db } from "../src/db/client";
console.log("imported ok");
