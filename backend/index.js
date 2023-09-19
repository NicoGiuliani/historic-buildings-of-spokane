import express from "express";
import { PORT } from './config.js';
import path from 'path';
import pool from "./db/connection.js";
import * as url from 'url';

const app = express();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "pug");

app.listen(PORT, () => {
  console.log(`App is listening on port: ${PORT}`);
});

app.get('/', async (request, response) => {
  response.render('home');
});

app.get('/search', async (request, response) => {
  const keyword = request.query.query;
  console.log(keyword);
  const sqlQuery = `SELECT * FROM spokane.buildings WHERE name LIKE '%${keyword}%';`
  console.log(sqlQuery);
  try {
    pool.query(sqlQuery, (error, result) => {
      if (error) {
        console.log(error);
      }
      response.render('search', { search_results: result });
    });
  } catch (error) {
    console.log(error);
  }


  
});

app.get('/profile/:buildingName', async (request, response) => {
  const buildingName = request.params['buildingName'];
  console.log(buildingName);
  const sqlQuery = `
    SELECT buildings.id, name, year_built, year_destroyed, url
    FROM spokane.buildings INNER JOIN spokane.resources ON resources.building=buildings.name\
    WHERE name = ?;`
  try {
    pool.query(sqlQuery, [buildingName], (error, result) => {
      console.log(result);
      response.render("profile", { building: result })
    });
  }
  catch(error) {
    console.log(error);
  }
});
  
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
    const building = {
      name: request.body.name,
      year_built: request.body.year_built,
      year_destroyed: request.body.year_destroyed || null,
    }
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

app.post('/resources', async (request, response) => {
  try {
    if (
      !request.body.building ||
      !request.body.url
    ) {
      return response.status(400).send({
        message: "Send all required fields"
      });
    } 
    const resource = {
      building: request.body.building,
      url: request.body.url,
    }
    pool.query('INSERT INTO resources (building, url) VALUES (?, ?)', 
    [resource.building, resource.url], 
    (error, result) => {
      if (error) {
        return response.status(500).send({ message: error.message });
      } else {
        return response.status(201).send(resource);
      }
    });
  } catch (error) {
    console.log(error.message);
    return response.status(500).send({ message: error.message });
  }
});
