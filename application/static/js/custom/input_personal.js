let codeReader = null;

// Initialize QR code reader
async function initializeCamera() {
    const videoElement = document.getElementById("camera-stream");
    const imageElement = document.getElementById("captured-image");
    const qrResultContainer = document.getElementById("qr-result-container");
    const qrResultElement = document.getElementById("qr-result");
    const resetButton = document.getElementById("reset-button");

    qrResultContainer.style.display = "none"; // Hide result initially
    qrResultElement.textContent = ""; // Clear result text
    imageElement.style.display = "none"; // Hide the image initially
    videoElement.style.display = "block"; // Ensure video is displayed

    // Stop any existing codeReader
    if (codeReader) {
        codeReader.reset();
    }

    codeReader = new ZXing.BrowserQRCodeReader();

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        if (videoInputDevices.length > 0) {
            const selectedDeviceId = videoInputDevices[0].deviceId;

            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, error) => {
                if (result) {
                    const extractedValue = extractIdentityCardValue(result.text);
                    if (extractedValue) {
                        showResult(extractedValue, videoElement, imageElement);
                    } else {
                        console.error("Invalid QR code format.");
                    }
                }

                if (error && !(error instanceof ZXing.NotFoundException)) {
                    console.error("Error reading QR code:", error.message);
                }
            });
        } else {
            console.error("No camera devices found.");
        }
    } catch (err) {
        console.error("Error initializing camera:", err.message);
    }
}

// Extract value from QR code content
function extractIdentityCardValue(qrContent) {
    const parts = qrContent.split("|");
    if (parts.length > 0 && parts[0].length === 12) {
        return parts[0];
    }
    return null;
}

// Show the result and freeze the camera feed
function showResult(extractedValue, videoElement, imageElement) {
    const qrResultContainer = document.getElementById("qr-result-container");
    const qrResultElement = document.getElementById("qr-result");

    qrResultElement.textContent = `Mã định danh: ${extractedValue}`;
    qrResultContainer.style.display = "block";

    // Use a new offscreen canvas to grab the current video frame
    const offscreenCanvas = document.createElement("canvas");
    const ctx = offscreenCanvas.getContext("2d");

    // Set canvas size to match video frame
    offscreenCanvas.width = videoElement.videoWidth;
    offscreenCanvas.height = videoElement.videoHeight;

    // Ensure the video feed is still active before capturing the frame
    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        // Draw the current video frame onto the canvas
        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Convert the canvas to a data URL
        const capturedImage = offscreenCanvas.toDataURL("image/png");
        if (capturedImage && capturedImage.startsWith("data:image/png")) {
            imageElement.src = capturedImage; // Set the image src to the captured data URL
            imageElement.style.display = "block"; // Show the captured image
            videoElement.style.display = "none"; // Hide the video feed
        } else {
            console.error("Failed to capture the video frame.");
        }
    } else {
        console.error("Video feed is not available or has been stopped.");
    }

    // Stop camera stream and QR code reader
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoElement.srcObject = null;
    }

    // Reset the codeReader to stop listening for QR codes
    if (codeReader) {
        codeReader.reset();
        codeReader = null; // Completely remove the instance
    }
}

// Reset camera for rescan
document.getElementById("reset-button").addEventListener("click", () => {
    initializeCamera();
});

// Initialize the camera when the page loads
document.addEventListener("DOMContentLoaded", () => {
    initializeCamera();
});
