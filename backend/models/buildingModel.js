import mongoose from "mongoose";

const buildingSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    year_built: { type: Number, required: true },
    year_destroyed: { type: Number },
    resources: { type: Array }
  }
)

export const Building = mongoose.model("Building", buildingSchema);