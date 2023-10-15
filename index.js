import express from "express";
import bodyParser from 'body-parser';
import path from 'path';
import pool from "./db/connection.js";
import * as url from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const port = process.env.PORT || 3000;

console.log("check this out:", process.env.PGUSER)

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static('node_modules'));
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "pug");

app.listen(port, "0.0.0.0", () => {
  console.log(`App is listening on port: ${port}`);
});

app.get('/', async (request, response) => {
  response.render('home');
});

app.get('/search', async (request, response) => {
  const keyword = request.query.query;
  let message = 'Results for "' + keyword + '"'
  const sqlQuery = 
  `SELECT * FROM buildings 
  WHERE name ILIKE '%${keyword}%'
  OR CAST(year_built AS TEXT) ILIKE '%${keyword}%'
  OR CAST(year_destroyed AS TEXT) ILIKE '%${keyword}%'
  OR address ILIKE '%${keyword}%'
  OR address_description ILIKE '%${keyword}%'
  ORDER BY name;`
  try {
    pool.query(sqlQuery, (error, result) => {
      if (error) {
        console.log(error);
      }
      let previousFilter = request.url.split('/')[1];
      console.log(result);
      response.render('buildings', { buildings: result['rows'], message: message, previousFilter: previousFilter });
    });
  } catch (error) {
    console.log(error);
  }
});

app.get('/profile/:buildingName', async (request, response) => {
  const buildingName = request.params['buildingName'];
  const buildingQuery = `
    SELECT buildings.id, name, year_built, year_destroyed, address, 
    address_description, description, maps_link, preceded_by, succeeded_by
    FROM buildings WHERE name = $1;`
  const resourceQuery = `
    SELECT url, caption, image_index, year_taken, source, source_name FROM resources WHERE building = $1 ORDER BY image_index;`
  const newspaperQuery = `
    SELECT date, source, source_name, title FROM newspapers WHERE building = $1;`
    

  const buildingResult = await new Promise((resolve, reject) => {
    pool.query(buildingQuery, [buildingName], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
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

  const newspaperResult = await new Promise((resolve, reject) => {
    pool.query(newspaperQuery, [buildingName], (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  })

  let resources = {};
  resourceResult['rows'].forEach(resource => {
    if (!(resource.source_name in resources)) {
      resources[resource.source_name] = [resource];
    } else {
      resources[resource.source_name].push(resource);
    }
  })

  newspaperResult['rows'].forEach(newspaper => {
    if (!(newspaper.source_name in resources)) {
      resources[newspaper.source_name] = [newspaper];
    } else {
      resources[newspaper.source_name].push(newspaper);
    }
  })

  response.render("profile", { building: buildingResult['rows'][0], images: resourceResult['rows'], resources: resources });
});
  
app.get('/buildings/:filter?/:method?/:secondFilter?', async (request, response) => {
  const filter = request.params['filter'] ? request.params['filter'] : null;
  const method = request.params['method'] ? request.params['method'] : null;
  let keyword;
  let sqlQuery;
  let startYear;
  let endYear;
  let message;
  let previousFilter;
  let filterName;
  let secondQuery;

  const applySecondFilter = () => {
    previousFilter = request.url.split('/')[4];
    filterName = previousFilter.split('?')[0];

    if (filterName === 'existingInYear') {
      secondQuery = previousFilter.split('?')[1].split('=')[1];
      sqlQuery += `WHERE year_built <= ${secondQuery} AND (year_destroyed >= ${secondQuery} OR year_destroyed IS NULL) `
      message = "Viewing buildings standing in " + secondQuery
    }
    else if (filterName === 'search') {
      secondQuery = previousFilter.split('?')[1].split('=')[1];
      sqlQuery += 
        `WHERE name LIKE '%${secondQuery}%'
        OR year_built LIKE '%${secondQuery}%'
        OR year_destroyed LIKE '%${secondQuery}%'
        OR address LIKE '%${secondQuery}%'
        OR address_description LIKE '%${secondQuery}%' `
      message = 'Results for "' + secondQuery + '"'
    }
    else if (filterName === 'builtBetween') {
      secondQuery = previousFilter.split('?')[1];
      startYear = secondQuery.split('&')[0].split('=')[1];
      endYear = secondQuery.split('&')[1].split('=')[1];
      sqlQuery += 
        `WHERE year_built >= ${startYear} AND year_built <= ${endYear} `
      message = "Viewing buildings built between " + startYear + " & " + endYear
    }
    else if (filterName === 'destroyedBetween') {
      secondQuery = previousFilter.split('?')[1];
      startYear = secondQuery.split('&')[0].split('=')[1];
      endYear = secondQuery.split('&')[1].split('=')[1];
      sqlQuery += 
        `WHERE year_destroyed >= ${startYear} AND year_destroyed <= ${endYear} `
      message = "Viewing buildings destroyed between " + startYear + " & " + endYear
    }
    else {
      console.log("An error has occurred in applySecondFilter");
    }
  }
  
  if (filter) {
    switch (filter) {
      case ("sortedByName"):
        sqlQuery = `SELECT * FROM buildings `
        if ('secondFilter' in request.params) {
          applySecondFilter();
        }
        if (method === "z-a") {
          sqlQuery += `ORDER BY name DESC;`
        } else {
          sqlQuery += `ORDER BY name ASC;`
        }
        break;
      case ("sortedByYearBuilt"):
        sqlQuery = `SELECT * FROM buildings `
        if ('secondFilter' in request.params) {
          applySecondFilter();
        }
        if (method === "most-recent") {
          sqlQuery += `ORDER BY year_built DESC;`
        } else {
          sqlQuery += `ORDER BY year_built ASC;`
        }
        break;
      case ("sortedByYearDestroyed"):
        sqlQuery = `SELECT * FROM buildings `
        if ('secondFilter' in request.params) {
          applySecondFilter();
        }
        if (method === "most-recent") {
          sqlQuery += 
          `ORDER BY CASE WHEN year_destroyed IS NULL THEN 1 ELSE 0 END, year_destroyed DESC;`
        } else {
          sqlQuery += `ORDER BY CASE WHEN year_destroyed IS NULL THEN 1 ELSE 0 END, year_destroyed ASC;`
        }
        break;
      case ("existingInYear"):
        keyword = request.query.query;
        previousFilter = request.url.split('/')[2];
        message = "Viewing buildings standing in " + keyword;
        sqlQuery = 
          `SELECT * FROM buildings 
          WHERE ${keyword} >= year_built 
          AND (${keyword} <= year_destroyed 
          OR year_destroyed IS NULL) 
          ORDER BY name;`
        break;
      case ("builtBetween"):
        previousFilter = request.url.split('/')[2];
        startYear = request.query.startYear;
        endYear = request.query.endYear;
        message = "Viewing buildings built between " + startYear + " & " + endYear;
        sqlQuery = 
          `SELECT * FROM buildings 
          WHERE ${startYear} <= year_built 
          AND ${endYear} >= year_built
          ORDER BY name;`
        break;
      case ("destroyedBetween"):
        previousFilter = request.url.split('/')[2];
        startYear = request.query.startYear;
        endYear = request.query.endYear;
        message = "Viewing buildings destroyed between " + startYear + " & " + endYear;
        sqlQuery = 
          `SELECT * FROM buildings 
          WHERE ${startYear} <= year_destroyed 
          AND ${endYear} >= year_destroyed
          ORDER BY name;`
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

  return response.render("buildings", {buildings: result["rows"], message: message, previousFilter: previousFilter, secondQuery: secondQuery});
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
    pool.query('INSERT INTO buildings (name, year_built, year_destroyed) VALUES ($1, $2, $3)', 
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
    pool.query('INSERT INTO resources (building, url) VALUES ($1, $2)', 
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
