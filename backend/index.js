import express from "express";
import { Building } from "./models/buildingModel.js";
import path from 'path';
import pool from "./db/connection.js";
import * as url from 'url';
import 'dotenv/config';

const app = express();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

app.use(express.json());
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, 'public')));

app.get('/buildings', async (request, response) => {
  try {
    pool.query('SELECT * FROM buildings', (error, result) => {
      if (error) {
        return response.status(404).send({ message: error.message });
      }
      return response.render("buildings", {buildings: result});
    });
  } catch(error) {
    response.render('error');
  }
});

app.post('/buildings', async (request, response) => {
  try {
    if (
      !request.body.name ||
      !request.body.year_built
    ) {
      return response.status(400).send({
        message: "Send all required fields"
      });
    } 
    const newBuilding = {
      name: request.body.name,
      year_built: request.body.year_built,
      year_destroyed: request.body.year_destroyed,
      resources: request.body.resources,
    }
    const building = await Building.create(newBuilding);
    pool.query('INSERT INTO buildings (name, year_built, year_destroyed) VALUES (?, ?, ?)', 
    [building.name, building.year_built, building.year_destroyed], 
    (error, result) => {
      if (error) {
        return response.status(500).send({ message: error.message });
      } else {
        return response.status(201).send(building);
      }
    });
  } catch (error) {
    console.log(error.message);
    return response.status(500).send({ message: error.message });
  }
});

// mongoose.connect(mongoDBURL)
// .then(() => {
//   console.log("Connected to the database");
//   app.listen(PORT, () => {
//     console.log(`App is listening on port: ${PORT}`);
//   });
// })
// .catch((error) => {
//   console.log(error);
// });
