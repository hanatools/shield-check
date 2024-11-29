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

let currentPhotoKey = "front";
let captureOrder = ["left", "right", "front"];
let currentPhotoIndex = 0;

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
    const photoKey = captureOrder[currentPhotoIndex]; // Use the current photo index to determine which photo to capture

    if (!photoKey) {
        console.error("All photos already captured.");
        return;
    }

    const maxDimension = 720; // Max dimension for resizing
    const videoWidth = faceCamera.videoWidth;
    const videoHeight = faceCamera.videoHeight;

    // Validate the video feed dimensions
    if (videoWidth === 0 || videoHeight === 0) {
        console.error("Video feed dimensions are invalid.");
        return;
    }

    // Maintain aspect ratio while resizing
    let canvasWidth, canvasHeight;

    if (videoWidth > videoHeight) {
        // Landscape orientation
        canvasWidth = maxDimension;
        canvasHeight = (videoHeight / videoWidth) * maxDimension;
    } else {
        // Portrait orientation
        canvasHeight = maxDimension;
        canvasWidth = (videoWidth / videoHeight) * maxDimension;
    }

    const offscreenCanvas = document.createElement("canvas");
    const ctx = offscreenCanvas.getContext("2d");

    // Set canvas dimensions
    offscreenCanvas.width = canvasWidth;
    offscreenCanvas.height = canvasHeight;

    // Scale down the video feed to fit the resized canvas
    ctx.drawImage(
        faceCamera,
        0,
        0,
        faceCamera.videoWidth,
        faceCamera.videoHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    // Convert the canvas to a data URL
    const capturedImage = offscreenCanvas.toDataURL("image/png");

    // Check if the image was successfully captured
    if (capturedImage && capturedImage.startsWith("data:image/png")) {
        updatePhotoPlaceholder(photoKey, capturedImage); // Update the placeholder with the captured image
        capturedImages[photoKey] = capturedImage; // Store the captured image in the `capturedImages` object for Step 4
        currentPhotoIndex++;
        checkAllPhotosCaptured();
    } else {
        console.error("Failed to capture the photo.");
    }
}

function updatePhotoPlaceholder(photoKey, imageSrc) {
    const previewElement = document.getElementById(`${photoKey}-photo-preview`);
    const placeholderElement = document.getElementById(`${photoKey}-photo`);

    if (previewElement && placeholderElement) {
        // Update Step 3 placeholder
        previewElement.src = imageSrc;
        previewElement.style.display = "block";
        placeholderElement.classList.add("taken");

        // Update Step 4 confirmation placeholders
        const confirmationPreview = document.getElementById(`${photoKey}-photo-preview-confirm`);
        if (confirmationPreview) {
            confirmationPreview.src = imageSrc;
            confirmationPreview.style.display = "block";
        }
    }
}

function checkAllPhotosCaptured() {
    const nextButton = document.getElementById("next-to-step-4");

    if (currentPhotoIndex >= captureOrder.length) {
        nextButton.disabled = false; // Enable the Next button
    } else {
        nextButton.disabled = true; // Disable if not all photos are taken
    }
}

function retakePhoto(photoKey) {
    const index = captureOrder.indexOf(photoKey);
    if (index !== -1) currentPhotoIndex = index;

    const previewElement = document.getElementById(`${photoKey}-photo-preview`);
    const placeholderElement = document.getElementById(`${photoKey}-photo`);

    if (previewElement) {
        previewElement.src = "";
        previewElement.style.display = "none";
    }

    if (placeholderElement) {
        placeholderElement.classList.remove("taken");
    }

    const nextButton = document.getElementById("next-to-step-4");
    nextButton.disabled = true; // Disable Next button until all images are recaptured
}

function resetAllCapturedPhotos() {
    // Clear all captured images
    capturedImages = {
        left: null,
        right: null,
        front: null,
    };
    currentPhotoIndex = 0;

    // Reset placeholders and preview elements
    ["left", "right", "front"].forEach((photoKey) => {
        const previewElement = document.getElementById(`${photoKey}-photo-preview`);
        const placeholderElement = document.getElementById(`${photoKey}-photo`);

        if (previewElement) {
            previewElement.src = "";
            previewElement.style.display = "none"; // Hide the preview image
        }

        if (placeholderElement) {
            placeholderElement.classList.remove("taken"); // Remove the "taken" style
        }
    });

    // Disable the "Next" button until all images are recaptured
    const nextButton = document.getElementById("next-to-step-4");
    if (nextButton) {
        nextButton.disabled = true;
    }

    console.log("All captured photos have been reset.");
}

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

function moveBackStep3() {
    const step3 = document.getElementById("step-3");
    const step4 = document.getElementById("step-4");

    // Navigate back to Step 3
    step4.classList.remove("active");
    step4.classList.add("hidden");

    setTimeout(() => {
        step4.style.display = "none";
        step3.style.display = "block";
        step3.classList.remove("hidden");
        step3.classList.add("active");
        initializeFaceCamera(); // Reinitialize camera for retaking photos
    }, 300); // Match the CSS transition duration
}


function moveToStep4() {
    const step3 = document.getElementById("step-3");
    const step4 = document.getElementById("step-4");
    // Stop the camera from Step 3
    stopFaceCamera();
    // Populate Step 4 form
    document.getElementById("full-name-confirm").value = document.getElementById("full-name").value;
    document.getElementById("identity-card-confirm").value = document.getElementById("identity-card-number").value;
    document.getElementById("management-level-confirm").value = document.getElementById("management-level").value;
    document.getElementById("unit-name-confirm").value = document.getElementById("unit-name").value;

    // Populate images
    for (const [key, imageSrc] of Object.entries(capturedImages)) {
        const imgElement = document.querySelector(`#${key}-photo-preview-confirm img`);
        if (imgElement && imageSrc) {
            imgElement.src = imageSrc;
        }
    }

    // Switch steps
    step3.classList.remove("active");
    step3.classList.add("hidden");

    setTimeout(() => {
        step3.style.display = "none";
        step4.style.display = "block";
        step4.classList.remove("hidden");
        step4.classList.add("active");
    }, 300);
}

// Finalize the form and send data to the server
document.getElementById("finish-form").addEventListener("click", () => {
    const userInfo = {
        fullName: document.getElementById("full-name-confirm").value,
        identityCard: document.getElementById("identity-card-confirm").value,
        managementLevel: document.getElementById("management-level-confirm").value,
        unitName: document.getElementById("unit-name-confirm").value,
        images: capturedImages, // Include images
    };

    console.log("Submitting user data:", userInfo);

    // Make a POST request to the server
    fetch("/submit-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Server response:", data);
            alert("Form submitted successfully!");
        })
        .catch((error) => {
            console.error("Error submitting form:", error);
            alert("Failed to submit the form.");
        });
});




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

    // Add event listener for the Reset button
    document.getElementById("reset-capture-photo").addEventListener("click", resetAllCapturedPhotos);
    document.getElementById("next-to-step-3").addEventListener("click", moveToStep3);


// Event listeners for navigation
    document.getElementById("next-to-step-4").addEventListener("click", moveToStep4);
    document.getElementById("back-to-step-3").addEventListener("click", moveBackStep3);

});

