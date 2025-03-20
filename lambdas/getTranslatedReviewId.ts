import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import 'source-map-support/register';
import apiResponses from './common/apiResponses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Translate } from 'aws-sdk';

const translate = new Translate();
const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const pathParameters = event?.pathParameters;
    const reviewId = pathParameters?.reviewId ? parseInt(pathParameters.reviewId) : undefined;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;

    if (!movieId || !reviewId) {
        return apiResponses._400({ message: 'Missing movieId or reviewId' });
    }

    const queryParams = event?.queryStringParameters;
    const language = queryParams?.language;

    if (!language || typeof language !== 'string') {
        return apiResponses._400({ message: 'Missing or invalid language query parameter' });
    }

    try {
        // Fetch the review from DynamoDB
        const reviewCommand = new GetCommand({
            TableName: process.env.Assignment1Table,
            Key: { MovieId: movieId, ReviewId: reviewId },
        });

        const reviewResult = await ddbDocClient.send(reviewCommand);

        if (!reviewResult.Item) {
            return apiResponses._404({ message: 'Review not found' });
        }

        const reviewContent = reviewResult.Item.Content;

        // Translate the review content
        const translateParams = {
            Text: reviewContent,
            SourceLanguageCode: 'en',  // Assuming the content is in English
            TargetLanguageCode: language,
        };

        const translatedMessage = await translate.translateText(translateParams).promise();

        // Return the translated message
        return apiResponses._200({ translatedMessage });

    } catch (error) {
        console.log('Error:', error);
        return apiResponses._500({ message: 'Unable to translate the message' });
    }
};
