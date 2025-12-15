export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    return res.status(400).json({ ok: false, message: "Invalid pincode" });
  }

  try {
    const token = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    if (!token || !pickup) {
      return res.status(500).json({
        ok: false,
        message: "Server misconfiguration"
      });
    }

    /* 1️⃣ Serviceability check */
    const serviceRes = await fetch(
      `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`,
      {
        headers: {
          "Authorization": `Token ${token}`
        }
      }
    );

    const serviceText = await serviceRes.text();
    if (!serviceText.startsWith("{")) {
      return res.json({
        ok: false,
        message: "Delhivery serviceability error"
      });
    }

    const service = JSON.parse(serviceText);
    if (!service?.delivery_codes?.length) {
      return res.json({
        ok: false,
        message: "Delivery not available to this pincode"
      });
    }

    /* 2️⃣ Dynamic SLA / ETA */
    const slaRes = await fetch(
      `https://track.delhivery.com/api/cmu/pincode-stats/?origin=${pickup}&destination=${pincode}`,
      {
        headers: {
          "Authorization": `Token ${token}`,
          "Accept": "application/json"
        }
      }
    );

    const slaText = await slaRes.text();
    if (!slaText.startsWith("{")) {
      return res.json({
        ok: false,
        message: "Delhivery SLA API not enabled for this account"
      });
    }

    const sla = JSON.parse(slaText);

    // ⚠️ This field name may vary per account
    const tat =
      sla?.data?.tat ??
      sla?.tat ??
      sla?.data?.[0]?.tat;

    if (!tat) {
      return res.json({
        ok: false,
        message: "Unable to determine delivery time"
      });
    }

    /* 3️⃣ Dispatch logic (6 PM IST) */
    const istNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    let dispatch = new Date(istNow);
    if (istNow.getHours() >= 18) {
      dispatch.setDate(dispatch.getDate() + 1);
    }
    dispatch.setHours(0, 0, 0, 0);

    /* 4️⃣ Final EDD */
    const edd = new Date(dispatch);
    edd.setDate(edd.getDate() + Number(tat));

    const fmt = d => d.toISOString().split("T")[0];

    return res.json({
      ok: true,
      pincode,
      dispatchDate: fmt(dispatch),
      estimatedDeliveryDate: fmt(edd),
      source: "delhivery-dynamic"
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Unexpected server error",
      error: err.message
    });
  }
}
