const API_URL =
    "https://add-your-api-gateway-url.us-east-1.amazonaws.com";


const uploadButton =
    document.getElementById("uploadButton");

const refreshButton =
    document.getElementById("refreshButton");

const statusElement =
    document.getElementById("uploadStatus");


uploadButton.addEventListener("click", uploadCSV);

refreshButton.addEventListener("click", loadProducts);


// ----------------------------
// Upload CSV
// ----------------------------

async function uploadCSV() {

    const fileInput =
        document.getElementById("csvFile");

    const file =
        fileInput.files[0];


    if (!file) {

        statusElement.textContent =
            "Please select a CSV file.";

        return;
    }


    if (!file.name.toLowerCase().endsWith(".csv")) {

        statusElement.textContent =
            "Only CSV files are allowed.";

        return;
    }


    try {

        statusElement.textContent =
            "Generating upload URL...";


        // STEP 1
        // Request presigned URL

        const response = await fetch(
            `${API_URL}/upload-url`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    fileName: file.name
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                "Failed to generate upload URL"
            );

        }


        const data =
            await response.json();


        // STEP 2
        // Upload CSV directly to S3

        statusElement.textContent =
            "Uploading CSV to S3...";


        const uploadResponse =
            await fetch(
                data.uploadUrl,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "text/csv"
                    },

                    body: file
                }
            );


        if (!uploadResponse.ok) {

            throw new Error(
                "Failed to upload CSV"
            );

        }


        statusElement.textContent =
            "CSV uploaded successfully. Processing products...";


        // Wait briefly because
        // S3 → Lambda → SQS → Lambda → DynamoDB
        // is asynchronous

        setTimeout(
            loadProducts,
            3000
        );


    }
    catch (error) {

        console.error(error);

        statusElement.textContent =
            "Upload failed: " +
            error.message;

    }

}


// ----------------------------
// Get Products
// ----------------------------

async function loadProducts() {

    try {

        const response =
            await fetch(
                `${API_URL}/products`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to retrieve products"
            );

        }


        const data =
            await response.json();


        displayProducts(
            data.products
        );


    }
    catch (error) {

        console.error(
            "Error loading products:",
            error
        );

    }

}


// ----------------------------
// Display Products
// ----------------------------

function displayProducts(products) {

    const tableBody =
        document.getElementById(
            "productsTable"
        );


    tableBody.innerHTML = "";


    products.forEach(product => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>${product.productId}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.price}</td>
            <td>${product.quantity}</td>
        `;


        tableBody.appendChild(row);

    });

}


// Load products when page opens

loadProducts();