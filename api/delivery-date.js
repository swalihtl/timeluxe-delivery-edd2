export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;

  try {
    const token = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    const slaUrl =
      `https://track.delhivery.com/api/cmu/pincode-stats/?origin=${pickup}&destination=${pincode}&token=${token}`;

    const r = await fetch(slaUrl);
    const rawText = await r.text(); // 👈 IMPORTANT

    return res.status(200).json({
      ok: true,
      status: r.status,
      rawResponse: rawText
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
