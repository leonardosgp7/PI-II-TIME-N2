import express, { Request, Response } from "express";
import { pool } from "../database/database";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query("SELECT * FROM demanda");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar demandas:", error);
        res.status(500).json({ error: "Erro ao buscar demandas" });
    }
});

export default router;

