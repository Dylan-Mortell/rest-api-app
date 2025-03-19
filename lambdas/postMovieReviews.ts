import { APIGatewayProxyHandlerV2 } from "aws-lambda";  // CHANGED
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
      // Print Event
      console.log("Event: ", event);

        const token = event.headers?.Authorization?.split('Bearer ')[1];
        if (!token) {
        return {
            statusCode: 401,
            headers: {
            "content-type": "application/json",
            },
            body: JSON.stringify({ Message: "Unauthorized" }),
        };
    }

    const reviewData = JSON.parse(event.body || '{}');
    const { movieId, reviewerId, reviewDate, content } = reviewData;

    // Validation of the review data
    if (!movieId || !reviewerId || !reviewDate || !content) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing required fields" }),
      };
    }

    const newReview = {
        MovieId: movieId,
        ReviewId: reviewerId,
        ReviewerId: reviewerId,
        ReviewDate: reviewDate,
        Content: content,
      };

      const putCommandOutput = await ddbDocClient.send(
        new PutCommand({
          TableName: process.env.REVIEWS_TABLE_NAME,
          Item: newReview,
        })
      );
  
      // Return response with the new review
      return {
        statusCode: 201,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Review successfully added", Review: newReview }),
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