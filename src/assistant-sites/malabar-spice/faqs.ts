/** Demo FAQ, rendered on /demo/faq and fed to the assistant's knowledge. */
export const DEMO_FAQS = [
  {
    question: "How fresh are your spices?",
    answer:
      "We grind and pack in small batches every week. Each pack shows its packing date; ground spices are best within 6 months and whole spices within 12 months of that date.",
  },
  {
    question: "Which payment methods do you accept?",
    answer:
      "UPI, debit and credit cards (Visa, Mastercard, RuPay) and net banking. Cash on delivery is available for orders up to ₹2,000 within India.",
  },
  {
    question: "Do you ship outside India?",
    answer:
      "Not yet. We currently deliver only within India. International shipping is planned but has no date yet.",
  },
  {
    question: "Are your products organic?",
    answer:
      "Our spices are grown by small farmers with traditional methods, but they are NOT certified organic, so we do not label them organic.",
  },
  {
    question: "Can I change or cancel my order?",
    answer:
      "Yes, within 12 hours of ordering and before it is packed. Email help@malabarspice.example with your order number. After it is packed, use our returns process instead.",
  },
  {
    question: "Do you offer bulk or corporate orders?",
    answer:
      "Yes. For 20 or more gift boxes or 10 kg or more of any spice, email help@malabarspice.example for a quote. Bulk prices are not listed on the website.",
  },
  {
    question: "Do I need an account to order?",
    answer:
      "No. You can check out as a guest. An account lets you see past orders and save addresses.",
  },
] as const;
