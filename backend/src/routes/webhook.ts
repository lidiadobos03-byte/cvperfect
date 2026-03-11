import { Router } from "express";

const router = Router();

router.post("/stripe", (_req, res) => {
  res.json({ received: true });
});

export default router;
