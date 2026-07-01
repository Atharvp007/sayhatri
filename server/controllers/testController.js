import { getNearbyPlaces } from "../services/geoapifyService.js";

export const testGeo = async (req, res) => {
  try {
    const places = await getNearbyPlaces(
      16.8509965,
      74.6028035,
      1000
    );

    res.status(200).json({
      success: true,
      total: places.length,
      places,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch nearby places",
    });
  }
};