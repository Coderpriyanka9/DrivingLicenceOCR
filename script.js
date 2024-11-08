document.getElementById('uploadButton').addEventListener('click', uploadFile);

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert('Please select a file');
        return;
    }
    const file = fileInput.files[0];
    const image = await preprocessImage(file);
    
    // Perform OCR on the processed image
    try {
        const { data: { text } } = await Tesseract.recognize(
            image,
            'eng', // Specify English language
            {
                logger: info => console.log(info), // Optional: log progress
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK // Set page segmentation mode
            }
        );

        // Clean up the raw text
        const cleanedText = text.replace(/[\s@|]/g, ' ').replace(/\s+/g, ' ').trim();

        // Display the results
        displayResults(text, cleanedText);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to extract details. Please try again.');
    }
}

async function preprocessImage(file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    await img.decode();

    // Create a canvas to manipulate the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Resize image to standard Indian driving license size
    const standardWidth = 1200;
    const standardHeight = 700;
    canvas.width = standardWidth;
    canvas.height = standardHeight;

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, standardWidth, standardHeight);

    // Convert to grayscale
    const imageData = ctx.getImageData(0, 0, standardWidth, standardHeight);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg; // Red
        data[i + 1] = avg; // Green
        data[i + 2] = avg; // Blue
    }

    // Put the modified data back on the canvas
    ctx.putImageData(imageData, 0, 0);

    // Optionally apply thresholding for better contrast
    for (let i = 0; i < data.length; i += 4) {
        const brightness = data[i]; // Grayscale value
        const threshold = 128; // Set threshold
        data[i] = data[i + 1] = data[i + 2] = brightness < threshold ? 0 : 255; // Set to black or white
    }

    // Put the thresholded data back on the canvas
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL(); // Return the processed image data URL
}

function displayResults(rawText, cleanedText) {
   
    document.getElementById('rawText').innerHTML = `<strong>Raw Text:</strong>${rawText}`;
    document.getElementById('cleanedText').innerHTML = `<strong>Cleaned Text:</strong> ${cleanedText}`;
    document.getElementById('name').textContent = extractName(cleanedText) || "Not found";
    document.getElementById('licenseId').textContent = extractLicenseId(cleanedText) || "Not found"; // Using cleanedText
    document.getElementById('dob').textContent = extractDob(cleanedText) || "Not found";
    document.getElementById('expiryDate').textContent = extractExpiryDate(cleanedText) || "Not found";
}

// Regex-based functions to extract details
function extractName(cleanedText) {
    const nameRegex = /Name\s+.*?\s+(\w+\s+\w+)/;
    const match = cleanedText.match(nameRegex);
    return match ? match[1].trim() : null;
}

function extractLicenseId(cleanedText) {
    const licenseIdRegex = /([A-Z]{2}\d{2}\s\d{11})/; // Adjusted regex for license ID
    const match = cleanedText.match(licenseIdRegex);
    
    if (match) {
        const drivingLicenseId = match[1];
        console.log(drivingLicenseId); // Outputs: GJO1 19960040773
        return drivingLicenseId; // Return the driving license ID directly
    } else {
        console.log("Driving License ID not found.");
        return null; // Return null if not found
    }
}

function extractDob(cleanedText) {
    const dobRegex = /DOB\s*[:\-,\s]*([\d]{2}-[\d]{2}-[\d]{4})/;
    const match = cleanedText.match(dobRegex);
    return match ? match[1].trim() : null;
}

function extractExpiryDate(cleanedText) {
    const expiryDateRegex = /Valid Till:\s*[^0-9]*?(\d{2}-\d{2}-\d{4})/ // Modify as needed
    const match = cleanedText.match(expiryDateRegex);
    return match ? match[1].trim() : null;
}   