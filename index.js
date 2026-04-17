import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  }),
);

const DB_FILE = path.join(process.cwd(), "profiles.json");

// Helper function to read profiles from file
async function readProfiles() {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Helper function to write profiles to file
async function writeProfiles(profiles) {
  await fs.writeFile(DB_FILE, JSON.stringify(profiles, null, 2));
}

// Helper function to classify age group
function classifyAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

// Helper function to fetch from API
async function fetchAPI(url, apiName) {
  const response = await fetch(url);
  if (!response.ok) {
    console.log(response.body);
    throw new Error(`${apiName} API error`);
  }
  return response.json();
}

// POST /api/profiles
app.post("/api/profiles", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty name",
      });
    }

    const trimmedName = name.trim().toLowerCase();
    const profiles = await readProfiles();

    // Check if profile already exists
    if (profiles[trimmedName]) {
      const existing = profiles[trimmedName];
      return res.status(201).json({
        status: "success",
        message: "Profile already exists",
        data: {
          id: existing.id,
          name: existing.name,
          gender: existing.gender,
          gender_probability: existing.gender_probability,
          sample_size: existing.sample_size,
          age: existing.age,
          age_group: existing.age_group,
          country_id: existing.country_id,
          country_probability: existing.country_probability,
          created_at: existing.created_at,
        },
      });
    }

    // Fetch from all APIs
    const [genderizeData, agifyData, nationalizeData] = await Promise.all([
      fetchAPI(
        `https://api.genderize.io?name=${encodeURIComponent(trimmedName)}`,
        "Genderize",
      ),
      fetchAPI(
        `https://api.agify.io?name=${encodeURIComponent(trimmedName)}`,
        "Agify",
      ),
      fetchAPI(
        `https://api.nationalize.io?name=${encodeURIComponent(trimmedName)}`,
        "Nationalize",
      ),
    ]);

    // Validate responses
    if (
      !genderizeData.gender ||
      !genderizeData.count ||
      genderizeData.count === 0
    ) {
      return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response",
      });
    }

    if (agifyData.age === null) {
      return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response",
      });
    }

    if (!nationalizeData.country || nationalizeData.country.length === 0) {
      return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response",
      });
    }

    // Process data
    const gender = genderizeData.gender;
    const gender_probability = genderizeData.probability;
    const sample_size = genderizeData.count;
    const age = agifyData.age;
    const age_group = classifyAgeGroup(age);
    const topCountry = nationalizeData.country.reduce((prev, current) =>
      prev.probability > current.probability ? prev : current,
    );
    const country_id = topCountry.country_id;
    const country_probability = topCountry.probability;

    const id = uuid();
    const created_at = new Date().toISOString();

    // Store profile
    profiles[trimmedName] = {
      id,
      name: trimmedName,
      gender,
      gender_probability,
      sample_size,
      age,
      age_group,
      country_id,
      country_probability,
      created_at,
    };

    await writeProfiles(profiles);

    res.status(201).json({
      status: "success",
      data: {
        id,
        name: trimmedName,
        gender,
        gender_probability,
        sample_size,
        age,
        age_group,
        country_id,
        country_probability,
        created_at,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.message.includes("API error")) {
      return res.status(502).json({
        status: "error",
        message: error.message.replace(
          " API error",
          " returned an invalid response",
        ),
      });
    }
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// GET /api/profiles/{id}
app.get("/api/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const profiles = await readProfiles();
    const profile = Object.values(profiles).find((p) => p.id === id);

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    res.json({
      status: "success",
      data: {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        sample_size: profile.sample_size,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_probability: profile.country_probability,
        created_at: profile.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// GET /api/profiles
app.get("/api/profiles", async (req, res) => {
  try {
    const { gender, country_id, age_group } = req.query;
    const profiles = await readProfiles();
    let filteredProfiles = Object.values(profiles);

    if (gender) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.gender === gender.toLowerCase(),
      );
    }

    if (country_id) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.country_id === country_id.toUpperCase(),
      );
    }

    if (age_group) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.age_group === age_group.toLowerCase(),
      );
    }

    const data = filteredProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
    }));

    res.json({
      status: "success",
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// DELETE /api/profiles/{id}
app.delete("/api/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const profiles = await readProfiles();
    const profileKey = Object.keys(profiles).find(
      (key) => profiles[key].id === id,
    );

    if (!profileKey) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    delete profiles[profileKey];
    await writeProfiles(profiles);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

app.listen(process.env.PORT || 3000, (err) => {
  if (err) return console.log("Servuce error" + err);
  console.log("Service started on port", process.env.PORT || 3000);
});
