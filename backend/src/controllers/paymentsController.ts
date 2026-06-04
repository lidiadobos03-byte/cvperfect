import { Request, Response } from "express";
import { getStripeClient } from "../utils/stripe.js";

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || "https://cvperfect.online").replace(/\/+$/, "");

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const stripe = getStripeClient();
    const frontendUrl = getFrontendUrl();
    const templateName =
      typeof req.body?.templateName === "string" ? req.body.templateName : "CV";
    const lang = typeof req.body?.lang === "string" ? req.body.lang : "ro";
    const documentHash = req.body?.documentHash;

    if (
      typeof documentHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(documentHash)
    ) {
      return res.status(400).json({ error: "Missing or invalid documentHash" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: "CVPerfect — PDF CV",
            },
            unit_amount: 1900,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?payment=cancel`,
      metadata: {
        templateName,
        lang,
        documentHash,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stripe session error" });
  }
};
