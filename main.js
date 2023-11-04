import axios from "axios";
import jmespath from "jmespath";

export function getModelRefFromPath(swaggerData, path, method) {
  const queryStr = `paths."${path}".${method.toLowerCase()}.responses."HTTPStatus.OK".schema."$ref"`;
  return jmespath.search(swaggerData, queryStr);
}

export function extractPropertiesFromModel(
  swaggerData,
  modelRef,
  parentPath = ""
) {
  const modelName = modelRef.split("/").pop();
  const properties = jmespath.search(
    swaggerData,
    `definitions."${modelName}".properties`
  );
  let result = [];

  for (const key in properties) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    // Check for array type with $ref
    if (
      properties[key].type === "array" &&
      properties[key].items &&
      properties[key].items["$ref"]
    ) {
      const nestedModelRef = properties[key].items["$ref"];
      result = result.concat(
        extractPropertiesFromModel(
          swaggerData,
          nestedModelRef,
          `${currentPath}[]`
        )
      );
    } else if (properties[key].hasOwnProperty("$ref")) {
      const nestedModelRef = properties[key]["$ref"];
      result = result.concat(
        extractPropertiesFromModel(swaggerData, nestedModelRef, currentPath)
      );
    } else {
      result.push(currentPath);
    }
  }

  return result;
}

export function extractModelDataPaths(apiData, path, method) {
  const modelRef = getModelRefFromPath(apiData, path, method);
  if (!modelRef) return [];
  return extractPropertiesFromModel(apiData, modelRef);
}

async function fetchData() {
  try {
    const response = await axios.get("http://localhost:5000/swagger.json");
    const data = response.data;

    const result = extractModelDataPaths(data, "/v1/order/{order_id}", "GET");
    console.log(result);
    // Display data in the browser
    document.getElementById("app").innerHTML = `<pre>${JSON.stringify(
      result,
      null,
      2
    )}</pre>`;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();
