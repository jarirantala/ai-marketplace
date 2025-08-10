import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "eu-central-1" }));
const TABLE_NAME = "ai-marketplace-items";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*", // or your specific domain
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
};

export const handler = async (event) => {
  
  const method = event.requestContext.http.method;
  console.log('method: ' + method);
  const id = event.pathParameters?.id;

  if (method === "GET" && !id) {
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#active = :active",
      ExpressionAttributeNames: { "#active": "active" },
      ExpressionAttributeValues: { ":active": true }
    }));
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Items)
    };
  }

  if (method === "GET" && id) {
    const result = await client.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Item),
    };
  }

  if (method === "POST") {
    const body = JSON.parse(event.body);
    body.id = body.id || Date.now().toString();
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: body }));
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(body),
    };
  }

  if (method === "PUT" && id) {
    const body = JSON.parse(event.body);
    const updateExp = [];
    const expAttrVals = {};
    for (const key of Object.keys(body)) {
      if (key !== "id") {
        updateExp.push(`#${key} = :${key}`);
        expAttrVals[`:${key}`] = body[key];
      }
    }
    const expAttrNames = Object.fromEntries(Object.keys(body).filter(k => k !== "id").map(k => [`#${k}`, k]));
    await client.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${updateExp.join(", ")}`,
      ExpressionAttributeNames: expAttrNames,
      ExpressionAttributeValues: expAttrVals,
      ReturnValues: "ALL_NEW"
    }));
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ id, ...body }),
    };
  }

  if (method === "DELETE" && id) {
    await client.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  // OPTIONS preflight response
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  return {
    statusCode: 400,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: "Unsupported method or missing id" }),
  };
};