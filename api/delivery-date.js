export default function handler(req, res) {
  // CORS FIX
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { pincode, productId } = req.query;

  const today = new Date();
  const estimated = new Date(today);
  estimated.setDate(today.getDate() + 5);

  const formatted = estimated.toISOString().split("T")[0];

  res.status(200).json({
    ok: true,
    pincode: pincode || null,
    productId: productId || null,
    estimatedDate: formatted,
    message: `Estimated delivery by ${formatted}`
  });
}

