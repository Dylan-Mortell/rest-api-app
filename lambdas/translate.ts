import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import apiResponses from './common/apiResponses';
import * as AWS from 'aws-sdk';
import { Translate } from 'aws-sdk';

const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandler = async (event) => {
    if (!event.body) {
        return apiResponses._404({ message: 'No body found in the request' });
    }

    const body = JSON.parse(event.body);


    const { text, language } = body;

    if (!text || typeof text !== 'string') {
        return apiResponses._404({ message: 'missing or invalid text from the body' });
    }

    if (!language || typeof language !== 'string') {
        return apiResponses._404({ message: 'missing or invalid language from the body' });
    }

    try {
        const translateParams: Translate.Types.TranslateTextRequest = {
            Text: text,
            SourceLanguageCode: 'en',
            TargetLanguageCode: language 
        };

        const translateMessage = await translate.translateText(translateParams).promise();

        return apiResponses._200({ translateMessage });

    } catch (error) {
        console.log('Error in translation:', error);
        return apiResponses._404({ message: 'Unable to translate the message' });
    }
};
