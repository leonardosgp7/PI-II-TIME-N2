import express, { Request, Response } from "express";
import { pool } from "../database/database";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query("SELECT id_usuario, nome, email, ativo, fk_perfil_id_perfil FROM usuario");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ mensagem: "Erro ao buscar usuários" });
    }
});

export default router;