import { logger, logActionStart, logActionSuccess, logActionError, logSecurityEvent } from "../src/lib/logger";

console.log("Testing Logger...");

logger.info("This is an info message");
logger.warn("This is a warning message");
logger.error("This is an error message");

logActionStart("testAction", { userId: "123" });
logActionSuccess("testAction", 150, { userId: "123" });
logActionError("testAction", new Error("Something went wrong"), 200, { userId: "123" });

logSecurityEvent("login_failed", "medium", { ip: "127.0.0.1" });

console.log("Logger Test Completed");
