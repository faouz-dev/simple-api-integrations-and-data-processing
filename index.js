import express from "express";
import cors from "cors";
import { apiKeyHandler } from "./middleware/apiKeyHandler.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", allowedHeaders: ["GET"] }));

app.get("/api/classify", async (req, res) => {
  try {
    const { name } = req.query;
    const isoDate = new Date(Date.now()).toISOString();

    if (!name || typeof name !== "string" || name.length == 0)
      return res.status(400).json({
        status: "error",
        message: "name must be a string",
      });

    const response = await fetch("https://api.genderize.io?name=" + name);
    if (!response.ok)
      return res.status(500).json({
        status: "error",
        message: "No prediction available for the provided name",
      });

    const { gender, count: sample_size, probability } = await response.json();

    if (!gender || !sample_size || sample_size == 0)
      return res.status(400).json({
        status: "error",
        message: "No prediction available for the provided name",
      });

    return res.status(200).json({
      status: "success",
      data: {
        name,
        gender,
        probability,
        sample_size,
        is_confident: probability >= 0.7 && sample_size >= 100,
        processed_at: isoDate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Unexcepted Error Occured",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("app started");
});
