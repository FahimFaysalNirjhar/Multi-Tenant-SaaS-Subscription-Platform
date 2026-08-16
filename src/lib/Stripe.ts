import Stripe from "stripe";
import config from "../config";

console.log("Stripe key loaded:", config.stripe_secret_key ? "YES" : "NO");

export const stripe = new Stripe(config.stripe_secret_key as string);
