import { Router } from "express";
import { createCheckoutSession } from "../controllers/paymentsController.js";

const router = Router();

router.post("/create-checkout", createCheckoutSession);

export default router;
