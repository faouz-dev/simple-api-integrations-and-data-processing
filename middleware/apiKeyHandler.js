const apikey = "api-key-example";

/**
 *Example of adding apikey verifications
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {() => void} next
 */
export async function apiKeyHandler(req, res, next) {
  const { apikey: providedApikey } = req.query;

  if (!providedApikey || apikey !== providedApikey)
    return res.status(403).json({
      status: "error",
      message: "Apikey required",
    });

  return next();
}
