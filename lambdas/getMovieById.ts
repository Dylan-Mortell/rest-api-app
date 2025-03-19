import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

interface Review {
  ReviewId: number;
  ReviewerId: string;
  ReviewDate: string;
  Content: string;
}

interface ResponseBody {
  movie: Record<string, any>;
  reviews: Review[];
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;

    console.log("Movie ID:", movieId);
    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    // Fetch the movie
    const movieCommandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );
    console.log("GetCommand response: ", movieCommandOutput);
    if (!movieCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }

    
    const body = {
      movie: movieCommandOutput.Item,
      reviews: [],
    };

   
    const queryParams = event?.queryStringParameters;
    const reviewId = queryParams?.reviewId;
    const reviewerName = queryParams?.reviewerName;

 
    let reviewQueryParams: any = {
      TableName: process.env.REVIEWS_TABLE_NAME,
      KeyConditionExpression: "movieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId": movieId,
      },
    };

    if (reviewId) {
      reviewQueryParams.KeyConditionExpression += " AND reviewId = :reviewId";
      reviewQueryParams.ExpressionAttributeValues[":reviewId"] = reviewId;
    }
    if (reviewerName) {
      reviewQueryParams.FilterExpression = "reviewerName = :reviewerName";
      reviewQueryParams.ExpressionAttributeValues[":reviewerName"] = reviewerName;
    }

   
    const reviewCommandOutput = await ddbDocClient.send(new QueryCommand(reviewQueryParams));
    console.log("Review QueryCommand response: ", reviewCommandOutput);

    if (reviewCommandOutput.Items) {
      body.reviews = reviewCommandOutput.Items;
    }

    
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
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
