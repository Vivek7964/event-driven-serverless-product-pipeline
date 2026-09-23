import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        // Get request body from API Gateway
        const body = event.body ? JSON.parse(event.body) : {};

        const fileName = body.fileName;

        // Validate file name
        if (!fileName) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    message: "fileName is required"
                })
            };
        }

        // Only allow CSV files
        if (!fileName.toLowerCase().endsWith(".csv")) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    message: "Only CSV files are allowed"
                })
            };
        }

        // Generate a unique object key
        const objectKey = `uploads/${Date.now()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            ContentType: "text/csv"
        });

        // Generate presigned URL valid for 5 minutes
        const uploadUrl = await getSignedUrl(
            s3Client,
            command,
            {
                expiresIn: 300
            }
        );

        console.log("Generated upload URL for:", objectKey);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                uploadUrl: uploadUrl,
                key: objectKey
            })
        };

    } catch (error) {

        console.error("Error generating upload URL:", error);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                message: "Failed to generate upload URL"
            })
        };
    }
};