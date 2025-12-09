export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode) return res.status(400).json({ ok: false, error: "Missing pincode" });

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?token=${apiKey}&md=1&ss=1&d_pin=${pincode}&o_pin=${pickup}&cgm=0.5`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data?.estimated_delivery_date) {
      return res.status(200).json({
        ok: false,
        message: "Delivery not available to this pincode"
      });
    }

    const formatted = data.estimated_delivery_date; // YYYY-MM-DD format returned by Delhivery

    return res.status(200).json({
      ok: true,
      pincode,
      estimatedDate: formatted,
      message: `Estimated delivery by ${formatted}`
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: err.message
    });
  }
}


