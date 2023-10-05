import express from "express";
import { PORT } from './config.js';
import path from 'path';
import pool from "./db/connection.js";
import * as url from 'url';

const app = express();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static('node_modules'));
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
  const message = 'Results for "' + keyword + '"'
  const sqlQuery = `
    SELECT * FROM spokane.buildings 
    WHERE name LIKE '%${keyword}%'
    OR year_built LIKE '%${keyword}%'
    OR year_destroyed LIKE '%${keyword}%'
    OR address LIKE '%${keyword}%'
    OR address_description LIKE '%${keyword}%';`
  console.log(sqlQuery);
  try {
    pool.query(sqlQuery, (error, result) => {
      if (error) {
        console.log(error);
      }
      response.render('buildings', { buildings: result, message: message });
    });
  } catch (error) {
    console.log(error);
  }
});

app.get('/advancedSearch', async (request, response) => {
    response.render('advancedSearch');
});

app.get('/profile/:buildingName', async (request, response) => {
  const buildingName = request.params['buildingName'];
  const buildingQuery = `
    SELECT buildings.id, name, year_built, year_destroyed, address, 
    address_description, description, maps_link
    FROM spokane.buildings WHERE name = ?;`
  const resourceQuery = `
    SELECT url, caption, image_index, year_taken FROM spokane.resources WHERE building = ?;`

  const buildingResult = await new Promise((resolve, reject) => {
    pool.query(buildingQuery, [buildingName], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result[0]);
      }
    });
  })   
  
  const resourceResult = await new Promise((resolve, reject) => {
    pool.query(resourceQuery, [buildingName], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  })  
  
  response.render("profile", { building: buildingResult, images: resourceResult });

});
  
app.get('/buildings/:filter?/:method?', async (request, response) => {
  const filter = request.params['filter'] ? request.params['filter'] : null;
  const method = request.params['method'] ? request.params['method'] : null;
  let keyword;
  let sqlQuery;
  let startYear;
  let endYear;
  let message;

  if (filter) {
    switch (filter) {
      case ("sortedByName"):
        if (method === "z-a") {
          sqlQuery = `SELECT * FROM buildings ORDER BY name DESC;`
        } else {
          sqlQuery = `SELECT * FROM buildings ORDER BY name;`
        }
        break;
      case ("sortedByYearBuilt"):
        if (method === "most-recent") {
          sqlQuery = `SELECT * FROM buildings ORDER BY year_built DESC;`
        } else {
          sqlQuery = `SELECT * FROM buildings ORDER BY year_built;`
        }
        break;
      case ("sortedByYearDestroyed"):
        if (method === "most-recent") {
          sqlQuery = `SELECT * FROM buildings ORDER BY year_destroyed DESC;`
        } else {
          sqlQuery =
            `SELECT * FROM buildings
            ORDER BY
              CASE
                WHEN year_destroyed IS NULL THEN 1
                    ELSE 0 
              END,
            year_destroyed ASC;`
        }
        break;
      case ("existingInYear"):
        keyword = request.query.query;
        console.log(request.query);
        message = "Viewing buildings standing in " + keyword;
        
        sqlQuery = 
          `SELECT * FROM spokane.buildings 
          WHERE ${keyword} >= year_built 
          AND (${keyword} <= year_destroyed 
          OR year_destroyed IS NULL);`
        break;
      case ("builtBetween"):
        startYear = request.query.startYear;
        endYear = request.query.endYear;
        message = "Viewing buildings built between " + startYear + " & " + endYear;
        
        sqlQuery = 
          `SELECT * FROM spokane.buildings 
          WHERE ${startYear} <= year_built 
          AND ${endYear} >= year_built;`
        break;
      case ("destroyedBetween"):
        startYear = request.query.startYear;
        endYear = request.query.endYear;
        message = "Viewing buildings destroyed between " + startYear + " & " + endYear;
        
        sqlQuery = 
          `SELECT * FROM spokane.buildings 
          WHERE ${startYear} <= year_destroyed 
          AND ${endYear} >= year_destroyed;`
        break;
      default:
        break;
    }

  } else {
    sqlQuery = `SELECT * FROM buildings ORDER BY name;`
  }

  const result = await new Promise((resolve, reject) => {
    pool.query(sqlQuery, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  })   

  return response.render("buildings", {buildings: result, message: message});
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
