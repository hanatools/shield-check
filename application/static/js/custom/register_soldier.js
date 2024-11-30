document.addEventListener("DOMContentLoaded", () => {
    const fullNameInput = document.getElementById("fullname");
    const managementLevelInput = document.getElementById("management_level");
    const identityCardInput = document.getElementById("identity_card");
    const errorMessage = document.getElementById("error-message");
    const unitNameInput = document.getElementById("unit_name");
    const nextStepButton = document.getElementById("next-step");
    // Retrieve CSRF token from the form
    const csrfToken = document.querySelector("input[name='csrf_token']").value;
    function validateUser() {
        const fullName = fullNameInput.value.trim();
        const managementLevel = managementLevelInput.value.trim();
        const unitName = unitNameInput.value.trim();

        // Clear any previous error message
        errorMessage.textContent = "";
        identityCardInput.value = "";

        if (fullName && managementLevel && unitName) {
            fetch("/validate_identity_card", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({ full_name: fullName, management_level: managementLevel, unit_name: unitName }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.user) {
                        identityCardInput.value = data.user.identity_card; // Populate identity card
                        unitName.value = data.user.unit_name;
                        nextStepButton.disabled = false;
                    } else {
                        identityCardInput.value = "";
                        unitName.value = "";
                        errorMessage.textContent = "User not found."; // Show error message
                        nextStepButton.disabled = true;
                    }
                })
                .catch((error) => {
                    console.error("Error validating user:", error);
                    errorMessage.textContent = "An error occurred. Please try again later.";
                    identityCardInput.value = "";
                    unitName.value = "";
                    nextStepButton.disabled = true;
                });
        } else {
            nextStepButton.disabled = true;
        }
    }

    // Event listeners for validation
    fullNameInput.addEventListener("change", validateUser);
    managementLevelInput.addEventListener("change", validateUser);
    unitNameInput.addEventListener("change", validateUser);
});


document.addEventListener("DOMContentLoaded", () => {
    const fullNameInput = document.getElementById("fullname");
    const managementLevelInput = document.getElementById("management_level");
    const identityCardInput = document.getElementById("identity_card");
    const errorMessage = document.getElementById("error-message");
    const nextStepButton = document.getElementById("next-step");
    const backStepButton = document.getElementById("back-step");
    const nextStep3Button = document.getElementById("next-step-3");
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const faceCamera = document.getElementById("face-camera");

    let faceCameraStream = null;
    const capturedImages = {
        left: null,
        right: null,
        front: null,
    };

    const captureOrder = ["left", "right", "front"];
    let currentPhotoIndex = 0;

    // Step 1: Validate User
    function validateUser() {
        const fullName = fullNameInput.value.trim();
        const managementLevel = managementLevelInput.value.trim();

        errorMessage.textContent = "";
        identityCardInput.value = "";
        nextStepButton.disabled = true;

        if (fullName && managementLevel) {
            fetch("/validate_identity_card", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ full_name: fullName, management_level: managementLevel }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.user) {
                        identityCardInput.value = data.user.identity_card;
                        nextStepButton.disabled = false;
                    } else {
                        identityCardInput.value = "";
                        errorMessage.textContent = "User not found.";
                        nextStepButton.disabled = true;
                    }
                })
                .catch((error) => {
                    console.error("Error validating user:", error);
                    errorMessage.textContent = "An error occurred. Please try again later.";
                    nextStepButton.disabled = true;
                });
        }
    }

    // Step 2: Initialize Camera
    function initializeFaceCamera() {
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

    // Step 2: Stop Camera
    function stopFaceCamera() {
        if (faceCameraStream) {
            faceCameraStream.getTracks().forEach((track) => track.stop());
            faceCameraStream = null;
        }
    }

    // Step 2: Capture Image
    function capturePhoto() {
        const faceCamera = document.getElementById("face-camera");
        const photoKey = captureOrder[currentPhotoIndex]; // Use the current photo index to determine which photo to capture

        if (!photoKey) {
            console.error("All photos already captured.");
            return;
        }

        // Create an offscreen canvas
        const offscreenCanvas = document.createElement("canvas");
        const ctx = offscreenCanvas.getContext("2d");

        // Calculate new dimensions to fit within 720 pixels
        const maxDimension = 720; // Maximum size for the larger dimension
        let width = faceCamera.videoWidth;
        let height = faceCamera.videoHeight;

        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        // Set canvas dimensions
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;

        // Scale down the video feed to fit the canvas size
        ctx.drawImage(faceCamera, 0, 0, faceCamera.videoWidth, faceCamera.videoHeight, 0, 0, width, height);

        // Convert canvas to image data URL
        const capturedImage = offscreenCanvas.toDataURL("image/png");

        if (capturedImage && capturedImage.startsWith("data:image/png")) {
            updatePhotoPlaceholder(photoKey, capturedImage);
            currentPhotoIndex++;
            checkAllPhotosCaptured();
        } else {
            console.error("Failed to capture the photo.");
        }
    }

    // Step 2: Update Photo Placeholder
    function updatePhotoPlaceholder(photoKey, imageSrc) {
        const placeholderElement = document.getElementById(`${photoKey}-photo`);
        placeholderElement.style.backgroundImage = `url(${imageSrc})`;
        placeholderElement.classList.add("captured");
        capturedImages[photoKey] = imageSrc; // Save captured image
    }

    // Step 2: Check if all photos are captured
    function checkAllPhotosCaptured() {
        if (Object.values(capturedImages).every((img) => img !== null)) {
            nextStep3Button.disabled = false; // Enable Next button
        }
    }

    // Navigate to Step 2
    function goToStep2() {
        console.log("Navigating to Step 2...");
        step1.classList.add("hidden");
        setTimeout(() => {
            step1.style.display = "none";
            step2.style.display = "block";
            step2.classList.remove("hidden");
            initializeFaceCamera(); // Start camera
        }, 300); // Add smooth transition effect
    }

    // Navigate back to Step 1
    function backToStep1() {
        stopFaceCamera(); // Stop camera
        step2.classList.add("hidden");
        setTimeout(() => {
            step2.style.display = "none";
            step1.style.display = "block";
            step1.classList.remove("hidden");
        }, 300);
    }

    // Attach Event Listeners
    fullNameInput.addEventListener("change", validateUser);
    managementLevelInput.addEventListener("change", validateUser);
    nextStepButton.addEventListener("click", goToStep2);
    backStepButton.addEventListener("click", backToStep1);
    document.getElementById("capture-photo").addEventListener("click", capturePhoto);
});

document.addEventListener("DOMContentLoaded", () => {
    const faceCamera = document.getElementById("face-camera");
    const backStepButton = document.getElementById("back-step");
    const capturePhotoButton = document.getElementById("capture-photo");
    const resetCapturePhotoButton = document.getElementById("reset-capture-photo");
    const nextStep3Button = document.getElementById("next-step-3");

    let faceCameraStream = null;
    const capturedImages = {
        left: null,
        right: null,
        front: null,
    };

    const captureOrder = ["left", "right", "front"];
    let currentPhotoIndex = 0;

    // Initialize the face camera
    function initializeFaceCamera() {
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

    // Stop the face camera
    function stopFaceCamera() {
        if (faceCameraStream) {
            faceCameraStream.getTracks().forEach((track) => track.stop());
            faceCameraStream = null;
        }
    }

    // Capture photo and update the respective placeholder
    function capturePhoto() {
        const photoKey = captureOrder[currentPhotoIndex];
        if (!photoKey) {
            console.error("All photos already captured.");
            return;
        }

        const offscreenCanvas = document.createElement("canvas");
        const ctx = offscreenCanvas.getContext("2d");

        // Resize captured image to fit the preview
        offscreenCanvas.width = 200;
        offscreenCanvas.height = 200;
        ctx.drawImage(
            faceCamera,
            0,
            0,
            faceCamera.videoWidth,
            faceCamera.videoHeight,
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height
        );
        const capturedImage = offscreenCanvas.toDataURL("image/png");

        if (capturedImage.startsWith("data:image/png")) {
            updatePhotoPlaceholder(photoKey, capturedImage);
            currentPhotoIndex++;
            checkAllPhotosCaptured();
        } else {
            console.error("Failed to capture the photo.");
        }
    }

    // Reset all captured images
    function resetCapturedPhotos() {
        Object.keys(capturedImages).forEach((key) => {
            capturedImages[key] = null;

            const previewElement = document.getElementById(`${key}-photo-preview`);
            const placeholderElement = document.getElementById(`${key}-photo`);

            previewElement.src = "";
            previewElement.style.display = "none";
            placeholderElement.classList.remove("captured");
        });

        currentPhotoIndex = 0;
        nextStep3Button.disabled = true; // Disable the Next button until photos are recaptured
    }

    // Update the photo placeholder with the captured image
    function updatePhotoPlaceholder(photoKey, imageSrc) {
        const previewElement = document.getElementById(`${photoKey}-photo-preview`);
        const placeholderElement = document.getElementById(`${photoKey}-photo`);

        previewElement.src = imageSrc;
        previewElement.style.display = "block"; // Show the preview
        placeholderElement.classList.add("captured");
        capturedImages[photoKey] = imageSrc; // Save captured image
    }

    // Check if all photos are captured and enable the Next button
    function checkAllPhotosCaptured() {
        if (Object.values(capturedImages).every((img) => img !== null)) {
            nextStep3Button.disabled = false; // Enable the Next button
        }
    }

    // Go back to Step 1
    // function backToStep1() {
    //     stopFaceCamera(); // Stop the camera
    //     document.getElementById("step-1").classList.add("active");
    //     document.getElementById("step-2").classList.remove("active");
    // }

    // Event listeners
    // backStepButton.addEventListener("click", backToStep1);
    capturePhotoButton.addEventListener("click", capturePhoto);
    resetCapturePhotoButton.addEventListener("click", resetCapturedPhotos);
    nextStep3Button.addEventListener("click", () => {
        console.log("Captured images:", capturedImages);
        alert("Proceeding to Step 3!");
    });

});