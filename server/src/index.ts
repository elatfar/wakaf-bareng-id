import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared";
import authRoutes from "./routes/auth";
import templateRoutes from "./routes/template";
import penggunaRoutes from "./routes/pengguna";
import transaksiRoutes from "./routes/transaksi";
import { authMiddleware } from "./middleware/auth";

export const app = new Hono()

.use(cors())

.get("/", (c) => {
	return c.text("Hello Hono!");
})

.get("/hello", async (c) => {
	const data: ApiResponse = {
		message: "Hello BHVR!",
		success: true,
	};

	return c.json(data, { status: 200 });
})

.route("/auth", authRoutes)
.route("/template", templateRoutes)
.use("/pengguna/*", authMiddleware)
.route("/pengguna", penggunaRoutes)
.route("/transaksi", transaksiRoutes);

export default app;