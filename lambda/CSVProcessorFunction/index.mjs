import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

const QUEUE_URL = process.env.QUEUE_URL;

// Convert S3 response stream into a string
const streamToString = async (stream) => {
    return await stream.transformToString();
};

export const handler = async (event) => {
    console.log("Received S3 Event:", JSON.stringify(event, null, 2));

    try {
        // Get bucket name and file name from S3 event
        const bucketName = event.Records[0].s3.bucket.name;

        const objectKey = decodeURIComponent(
            event.Records[0].s3.object.key.replace(/\+/g, " ")
        );

        console.log("Bucket:", bucketName);
        console.log("File:", objectKey);

        // Read CSV file from S3
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey
        });

        const response = await s3Client.send(command);

        const csvContent = await streamToString(response.Body);

        console.log("CSV Content:");
        console.log(csvContent);

        // Split CSV into rows
        const rows = csvContent.trim().split(/\r?\n/);

        // Get header
        const headers = rows[0].split(",").map(header => header.trim());

        console.log("CSV Headers:", headers);

        let messagesSent = 0;

        // Process each CSV row
        for (let i = 1; i < rows.length; i++) {

            if (!rows[i].trim()) {
                continue;
            }

            const values = rows[i].split(",").map(value => value.trim());

            const product = {};

            headers.forEach((header, index) => {
                product[header] = values[index];
            });

            console.log("Sending product to SQS:", product);

            // Send product as SQS message
            const sendMessageCommand = new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: JSON.stringify(product)
            });

            await sqsClient.send(sendMessageCommand);

            messagesSent++;
        }

        console.log(`Successfully sent ${messagesSent} messages to SQS`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "CSV processed successfully",
                messagesSent: messagesSent
            })
        };

    } catch (error) {

        console.error("Error processing CSV:", error);

        throw error;
    }
};