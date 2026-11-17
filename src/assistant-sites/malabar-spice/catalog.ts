/**
 * DEMO WEBSITE DATA ("Malabar Spice Market", a fictional Kerala spice shop).
 * Used by the demo pages AND by the assistant's knowledge, so the assistant
 * always describes exactly what the website shows.
 */

export type DemoProduct = {
  slug: string;
  name: string;
  malayalamName: string;
  category: "Whole spices" | "Ground spices" | "Blends" | "Gift boxes";
  price: string;
  size: string;
  origin: string;
  summary: string;
  description: string;
  heat: "None" | "Mild" | "Medium" | "Hot";
  bestFor: string[];
  inStock: boolean;
};

export const DEMO_SITE = {
  name: "Malabar Spice Market",
  tagline: "Single-origin spices from Kerala's Malabar coast, packed fresh every week.",
  basePath: "/demo",
  location: "Kozhikode, Kerala, India",
  email: "help@malabarspice.example",
  phone: "+91 495 000 0000",
  hours: "Monday to Saturday, 9:30 am – 6:00 pm IST",
} as const;

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: "black-pepper",
    name: "Tellicherry Black Pepper",
    malayalamName: "കുരുമുളക്",
    category: "Whole spices",
    price: "₹240",
    size: "200 g",
    origin: "Wayanad, Kerala",
    summary: "Large, bold peppercorns with a bright, citrusy heat.",
    description:
      "Extra-bold Tellicherry grade (4.25 mm+) peppercorns, sun-dried and hand-sorted. Grind fresh for soups, rasam, eggs and pepper chicken.",
    heat: "Medium",
    bestFor: ["pepper chicken", "rasam", "everyday cooking", "grinding fresh"],
    inStock: true,
  },
  {
    slug: "green-cardamom",
    name: "Green Cardamom (8 mm)",
    malayalamName: "ഏലക്കായ",
    category: "Whole spices",
    price: "₹420",
    size: "100 g",
    origin: "Idukki, Kerala",
    summary: "Plump, aromatic pods for chai, payasam and biryani.",
    description:
      "8 mm bold green cardamom pods from Idukki's cardamom hills. Intensely aromatic; crush lightly before use.",
    heat: "None",
    bestFor: ["chai", "payasam", "biryani", "desserts"],
    inStock: true,
  },
  {
    slug: "cinnamon-quills",
    name: "Ceylon Cinnamon Quills",
    malayalamName: "കറുവപ്പട്ട",
    category: "Whole spices",
    price: "₹310",
    size: "100 g",
    origin: "Kollam, Kerala",
    summary: "Delicate, sweet 'true cinnamon' quills.",
    description:
      "Thin, papery quills of true cinnamon (Cinnamomum verum), milder and sweeter than cassia. Good for desserts, tea and pulao.",
    heat: "None",
    bestFor: ["desserts", "tea", "pulao", "baking"],
    inStock: true,
  },
  {
    slug: "turmeric-powder",
    name: "Alleppey Turmeric Powder",
    malayalamName: "മഞ്ഞൾപ്പൊടി",
    category: "Ground spices",
    price: "₹180",
    size: "250 g",
    origin: "Alappuzha, Kerala",
    summary: "High-curcumin turmeric, stone-ground in small batches.",
    description:
      "Alleppey finger turmeric with naturally high curcumin (about 5%), stone-ground without colours or fillers.",
    heat: "None",
    bestFor: ["curries", "golden milk", "pickles"],
    inStock: true,
  },
  {
    slug: "kashmiri-chilli",
    name: "Kashmiri Chilli Powder",
    malayalamName: "കാശ്മീരി മുളകുപൊടി",
    category: "Ground spices",
    price: "₹160",
    size: "200 g",
    origin: "Sourced from Kashmir, packed in Kozhikode",
    summary: "Deep red colour with gentle heat.",
    description:
      "Gives fish curry and tandoori dishes a deep red colour without too much heat. No added colour.",
    heat: "Mild",
    bestFor: ["fish curry", "tandoori", "colour without heat"],
    inStock: false,
  },
  {
    slug: "sambar-masala",
    name: "Kerala Sambar Masala",
    malayalamName: "സാമ്പാർ പൊടി",
    category: "Blends",
    price: "₹150",
    size: "200 g",
    origin: "Blended in Kozhikode",
    summary: "Roasted coriander, chilli, fenugreek and curry leaves.",
    description:
      "Our family recipe: slow-roasted coriander, dried red chilli, fenugreek, cumin, asafoetida and curry leaves. Contains asafoetida (may contain traces of wheat).",
    heat: "Medium",
    bestFor: ["sambar", "vegetable curries"],
    inStock: true,
  },
  {
    slug: "garam-masala",
    name: "Malabar Garam Masala",
    malayalamName: "ഗരം മസാല",
    category: "Blends",
    price: "₹190",
    size: "150 g",
    origin: "Blended in Kozhikode",
    summary: "Warm blend for biryani and meat dishes.",
    description:
      "Cardamom, cinnamon, clove, fennel, star anise, mace and black pepper, ground after a light roast. Ideal for Thalassery biryani.",
    heat: "Medium",
    bestFor: ["biryani", "meat curries", "kurma"],
    inStock: true,
  },
  {
    slug: "kerala-gift-box",
    name: "Kerala Kitchen Gift Box",
    malayalamName: "സമ്മാനപ്പെട്ടി",
    category: "Gift boxes",
    price: "₹1,150",
    size: "6 tins",
    origin: "Kerala",
    summary: "Six best-sellers in reusable tins with a recipe card.",
    description:
      "Black pepper, cardamom, cinnamon, turmeric, sambar masala and garam masala in reusable tins, with a printed recipe card in English and Malayalam.",
    heat: "Medium",
    bestFor: ["gifts", "weddings", "new kitchens", "corporate gifting"],
    inStock: true,
  },
];

export function findProduct(slug: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((p) => p.slug === slug);
}

export const DEMO_PAGES = [
  {
    path: "/demo",
    title: "Home",
    summary: "Shop introduction, best-sellers and links to all sections.",
  },
  {
    path: "/demo/products",
    title: "Shop",
    summary: "All products with prices, sizes and stock status.",
  },
  {
    path: "/demo/shipping-returns",
    title: "Shipping & returns",
    summary:
      "Delivery areas, delivery times, shipping charges, returns, refunds and damaged items.",
  },
  {
    path: "/demo/faq",
    title: "FAQ",
    summary: "Answers to common questions about orders, freshness and payment.",
  },
  {
    path: "/demo/about",
    title: "About us",
    summary: "Our story, sourcing from Kerala farmers and how we pack.",
  },
  {
    path: "/demo/contact",
    title: "Contact",
    summary: "Email, phone, hours and address for help with orders.",
  },
] as const;
