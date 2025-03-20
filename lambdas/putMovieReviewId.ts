import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Review"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const reviewId = pathParameters?.reviewId ? parseInt(pathParameters.reviewId) : undefined;

    if (!movieId || !reviewId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movieId or reviewId" }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    // Validate body with schema
    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Incorrect type. Must match the Review schema`,
          schema: schema.definitions["Review"],
        }),
      };
    }

    // Check if the review exists before updating
    const getReviewCommand = new GetCommand({
      TableName: process.env.Assignment1Table,
      Key: { MovieId: movieId, ReviewId: reviewId },
    });

    const reviewCommandOutput = await ddbDocClient.send(getReviewCommand);
    console.log("Get review response: ", reviewCommandOutput);

    if (!reviewCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Review not found" }),
      };
    }

    // Prepare the update expression and parameters
    const updateParams = {
      TableName: process.env.REVIEWS_TABLE_NAME,
      Key: { MovieId: movieId, ReviewId: reviewId },
      UpdateExpression: "SET Content = :content, ReviewDate = :reviewDate", 
      ExpressionAttributeValues: {
        ":content": body.Content, // Update content
        ":reviewDate": new Date().toISOString(), 
      },
      ReturnValues: "ALL_NEW", 
    };

    const updateCommand = new UpdateCommand(updateParams);
    const updateCommandOutput = await ddbDocClient.send(updateCommand);
    console.log("Update review response: ", updateCommandOutput);

    // Return the updated review
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "Review updated",
        updatedReview: updateCommandOutput.Attributes,
      }),
    };
  } catch (error: any) {
    console.log("Error:", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message || error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
