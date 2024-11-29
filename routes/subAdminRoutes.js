import express from "express";
import { authAdmin, authSubAdmin } from "../middleware/auth.js";
import { 
    create,
    login,
    logout
} from '../controllers/subAdminController.js'

const router = express.Router();

router.post("/create", authAdmin, create);
router.post("/login", login);
router.post("/logout", authSubAdmin ,logout);

export default router;