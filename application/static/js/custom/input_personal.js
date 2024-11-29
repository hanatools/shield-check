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
        moveToStep2(extractedValue, videoElement, imageElement)
    }
}

// Move to Step 2
// Move to Step 2 with animation
function moveToStep2(cardNumber, videoElement, imageElement) {
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");

    // Populate the card number in Step 2
    document.getElementById("identity-card-number").value = cardNumber;

    // Add slide-out animation to Step 1 and slide-in animation to Step 2
    step1.classList.add("slide-out-left");
    setTimeout(() => {
        step1.classList.remove("active", "slide-out-left");
        step2.classList.add("slide-in-right", "active");
        setTimeout(() => {
            step2.classList.remove("slide-in-right");
        }, 500); // Match the transition duration in CSS
    }, 500);

    // Freeze the last video frame
    const offscreenCanvas = document.createElement("canvas");
    const ctx = offscreenCanvas.getContext("2d");
    offscreenCanvas.width = videoElement.videoWidth;
    offscreenCanvas.height = videoElement.videoHeight;

    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const capturedImage = offscreenCanvas.toDataURL("image/png");
        if (capturedImage && capturedImage.startsWith("data:image/png")) {
            imageElement.src = capturedImage;
            imageElement.style.display = "block";
            videoElement.style.display = "none";
        }
    }

    // Stop the video stream
    const stream = videoElement.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

// Move back to Step 1 with animation
function moveToStep1() {
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");

    // Add slide-out animation to Step 2 and slide-in animation to Step 1
    step2.classList.add("slide-out-left");
    setTimeout(() => {
        step2.classList.remove("active", "slide-out-left");
        step1.classList.add("slide-in-right", "active");
        setTimeout(() => {
            step1.classList.remove("slide-in-right");
        }, 500); // Match the transition duration in CSS
    }, 500);

    initializeCamera();
}


// Validate Step 2 Form
function validateForm() {
    let isValid = true;

    const fullNameInput = document.getElementById("full-name");
    const unitNameInput = document.getElementById("unit-name");
    const managementLevelInput = document.getElementById("management-level");

    const fullNameError = document.getElementById("full-name-error");
    const unitNameError = document.getElementById("unit-name-error");
    const managementLevelError = document.getElementById("management-level-error");

    // Clear all previous error messages
    fullNameError.textContent = "";
    unitNameError.textContent = "";
    managementLevelError.textContent = "";

    // Validate full name
    if (!fullNameInput.value.trim()) {
        fullNameError.textContent = "Họ và tên không được để trống.";
        isValid = false;
    }

    // Validate unit name
    if (!unitNameInput.value.trim()) {
        unitNameError.textContent = "Tên đơn vị không được để trống.";
        isValid = false;
    }

    // Validate management level
    if (!managementLevelInput.value.trim()) {
        managementLevelError.textContent = "Cấp quản lý không được để trống.";
        isValid = false;
    }

    // Enable or disable the submit button based on validation
    document.getElementById("next-to-step-3").disabled = !isValid;
}

// Attach validation logic to input fields
document
    .getElementById("personal-info-form")
    .addEventListener("input", validateForm);



// step 3
let faceCameraStream = null;
let capturedImages = {
    left: null,
    right: null,
    front: null,
};

function initializeFaceCamera() {
    const faceCamera = document.getElementById("face-camera");

    navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
            faceCameraStream = stream;
            faceCamera.srcObject = stream;
        })
        .catch((err) => {
            console.error("Error accessing face camera:", err.message);
        });
}

function stopFaceCamera() {
    if (faceCameraStream) {
        faceCameraStream.getTracks().forEach((track) => track.stop());
        faceCameraStream = null;
    }
}

function capturePhoto() {
    const faceCamera = document.getElementById("face-camera");
    const activePhotoKey = Object.keys(capturedImages).find((key) => !capturedImages[key]);

    if (!activePhotoKey) {
        console.error("All photos already captured.");
        return;
    }

    const offscreenCanvas = document.createElement("canvas");
    const ctx = offscreenCanvas.getContext("2d");

    offscreenCanvas.width = faceCamera.videoWidth;
    offscreenCanvas.height = faceCamera.videoHeight;

    ctx.drawImage(faceCamera, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const capturedImage = offscreenCanvas.toDataURL("image/png");

    if (capturedImage && capturedImage.startsWith("data:image/png")) {
        capturedImages[activePhotoKey] = capturedImage;
        updatePhotoPlaceholder(activePhotoKey, capturedImage);
        checkAllPhotosCaptured();
    } else {
        console.error("Failed to capture the photo.");
    }
}

function updatePhotoPlaceholder(photoKey, imageSrc) {
    const previewElement = document.getElementById(`${photoKey}-photo-preview`);
    const placeholderElement = document.getElementById(`${photoKey}-photo`);

    previewElement.src = imageSrc;
    previewElement.style.display = "block";
    placeholderElement.classList.add("taken");
}

function checkAllPhotosCaptured() {
    const nextButton = document.getElementById("next-to-step-4");

    if (Object.values(capturedImages).every((img) => img !== null)) {
        nextButton.disabled = false; // Enable the Next button
    } else {
        nextButton.disabled = true; // Disable if not all photos are taken
    }
}

function retakePhoto(photoKey) {
    capturedImages[photoKey] = null;

    const previewElement = document.getElementById(`${photoKey}-photo-preview`);
    const placeholderElement = document.getElementById(`${photoKey}-photo`);

    previewElement.src = "";
    previewElement.style.display = "none";
    placeholderElement.classList.remove("taken");

    const nextButton = document.getElementById("next-to-step-4");
    nextButton.disabled = true; // Disable Next button until all images are recaptured
}



// Initialize
document.addEventListener("DOMContentLoaded", () => {
    initializeFaceCamera();
});

function moveToStep3() {
    const step2 = document.getElementById("step-2");
    const step3 = document.getElementById("step-3");

    step2.classList.remove("active");
    step2.classList.add("hidden");

    setTimeout(() => {
        step2.style.display = "none";
        step3.style.display = "block";
        step3.classList.remove("hidden");
        step3.classList.add("active");
        initializeFaceCamera(); // Open the face camera
    }, 300); // Match the CSS transition duration
}

function moveBackStep2() {
    const step2 = document.getElementById("step-2");
    const step3 = document.getElementById("step-3");

    stopFaceCamera(); // Close the face camera

    step3.classList.remove("active");
    step3.classList.add("hidden");

    setTimeout(() => {
        step3.style.display = "none";
        step2.style.display = "block";
        step2.classList.remove("hidden");
        step2.classList.add("active");
    }, 300); // Match the CSS transition duration
}


document.getElementById("next-to-step-3").addEventListener("click", moveToStep3);
// document.getElementById("back-to-step-2").addEventListener("click", moveBackStep2);

$(document).ready(function() {
    initializeCamera();

    // Event Listeners
    document.getElementById("capture-photo").addEventListener("click", capturePhoto);
    document.getElementById("back-to-step-2").addEventListener("click", () => {
        stopFaceCamera();
        moveBackStep2();
    });
    document.getElementById("next-to-step-4").addEventListener("click", () => {
        console.log("Move to Step 4 with images:", capturedImages);
    });

    // Event Listeners
    document.getElementById("back-to-step-1").addEventListener("click", moveToStep1);
    document.getElementById("personal-info-form").addEventListener("input", validateForm);
    document.getElementById("reset-button").addEventListener("click", () => {
        initializeCamera();
    });

});