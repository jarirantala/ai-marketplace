import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  // Example: List all AIApps
  if (event.httpMethod === "GET") {
    const result = await client.send(new ScanCommand({ TableName: process.env.TABLE_NAME }));
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  }
  // Add other CRUD operations here...
};

// Example React fetch
const fetchAIApps = async () => {
  const response = await fetch('https://your-api-gateway-url/aiapps');
  const data = await response.json();
  return data;
};