import type { Database } from "../../src/data/database.types";

// Compile-only negative checks; this file never connects to a database.
declare const statistic: Database["public"]["Tables"]["pass_statistics"]["Insert"];
statistic.examinees = "9007199254740993";
statistic.examinees = null;
statistic.stage = "written";
// @ts-expect-error bigint needs a lossless decoder boundary.
statistic.examinees = 1;
// @ts-expect-error generated values cannot be written.
statistic.calculated_rate = "40.5";
// @ts-expect-error the database enum excludes unknown stages.
statistic.stage = "oral";
// @ts-expect-error the catalog view is read-only at this boundary.
const catalogInsert: Database["public"]["Views"]["qualification_catalog"]["Insert"] = {};
void catalogInsert;
