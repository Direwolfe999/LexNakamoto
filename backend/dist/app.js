import "dotenv/config";
import express from "express";
import routes from "./routes.js";
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(routes);
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    console.log(`[lex-nakamoto-backend] listening on :${port}`);
});
