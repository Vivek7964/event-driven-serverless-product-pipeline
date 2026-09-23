import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Received SQS Event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        try {
            // Parse product sent by CSVProcessorFunction
            const product = JSON.parse(record.body);

            console.log("Processing product:", product);

            // Basic validation
            if (!product.productId) {
                throw new Error("productId is required");
            }

            // Convert numeric fields from CSV strings to numbers
            if (product.price !== undefined) {
                product.price = Number(product.price);
            }

            if (product.quantity !== undefined) {
                product.quantity = Number(product.quantity);
            }

            // Write product to DynamoDB
            await dynamoDB.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: product
                })
            );

            console.log(
                `Product ${product.productId} successfully stored in DynamoDB`
            );

        } catch (error) {
            console.error("Error processing SQS message:", error);

            // Throwing the error causes SQS/Lambda retry behavior
            throw error;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "SQS messages processed successfully"
        })
    };
};