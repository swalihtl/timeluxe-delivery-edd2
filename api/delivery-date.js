export default async function handler(req, res) {
  try {
    const { pincode } = req.query;

    if (!pincode) {
      return res.status(400).json({ ok: false, message: "Pincode missing" });
    }

    const key = process.env.DELHIVERY_API_KEY;
    const origin = process.env.ORIGIN_PINCODE;

    const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/?md=E&ss=Delivered&cod=0&d_pin=${pincode}&o_pin=${origin}`;

    const response = await fetch(url, {
      headers: { Authorization: `Token ${key}` },
    });

    const data = await response.json();

    const estimated = data?.edd || null;

    return res.status(200).json({
      ok: true,
      pincode,
      estimatedDate: estimated,
      message: estimated
        ? `Estimated delivery by ${estimated}`
        : "Delivery estimate unavailable",
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message,
    });
  }
}

