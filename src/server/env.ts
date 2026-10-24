import "server-only";

import { parseEnvironment } from "../config/env";

// Importing this server module validates configuration without a fallback mode.
// API/DB credentials remain optional until their later implementation STEPs.
export const env = parseEnvironment(process.env);
