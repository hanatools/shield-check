document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const elements = {
        fullName: document.getElementById("fullname"),
        managementLevel: document.getElementById("management_level"),
        unitName: document.getElementById("unit_name"),
        identityCard: document.getElementById("identity_card"),
        errorMessage: document.getElementById("error-message"),
        nextStepButton: document.getElementById("next-step"),
        backStepButton: document.getElementById("back-step"),
        capturePhotoButton: document.getElementById("capture-photo"),
        resetPhotoButton: document.getElementById("reset-capture-photo"),
        nextStep3Button: document.getElementById("next-step-3"),
        finishButton: document.getElementById("finish-step"),
        faceCamera: document.getElementById("face-camera"),
        step1: document.getElementById("step-1"),
        step2: document.getElementById("step-2"),
        step3: document.getElementById("step-3"),
        fileScanStep1: document.getElementById("file-scan-step1"),
        fileScanError: document.getElementById("file-scan-error"),
    };

    let faceCameraStream = null;
    const capturedImages = { left: null, right: null, front: null };
    const captureOrder = ["left", "right", "front"];
    let currentPhotoIndex = 0;
    let userData = {}; // Store user data across steps

    /**
     * Toggles visibility between steps.
     * @param {HTMLElement} hideStep - The step to hide.
     * @param {HTMLElement} showStep - The step to show.
     * @param {"start"|"stop"|null} cameraAction - Camera action to perform.
     */
    function toggleSteps(hideStep, showStep, cameraAction = null) {
        hideStep.classList.add("hidden");
        setTimeout(() => {
            hideStep.style.display = "none";
            showStep.style.display = "block";
            showStep.classList.remove("hidden");

            if (cameraAction === "start") initializeFaceCamera();
            if (cameraAction === "stop") stopFaceCamera();
        }, 300);
    }

    /** Initializes the camera stream. */
    function initializeFaceCamera() {
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                faceCameraStream = stream;
                elements.faceCamera.srcObject = stream;
            })
            .catch((err) => console.error("Error accessing face camera:", err.message));
    }

    /** Stops the camera stream. */
    function stopFaceCamera() {
        if (faceCameraStream) {
            faceCameraStream.getTracks().forEach((track) => track.stop());
            faceCameraStream = null;
        }
    }

    /** Validates user data and fetches details from the server. */
    function validateUser() {
        const { fullName, managementLevel, unitName, identityCard, errorMessage, nextStepButton } = elements;
        const csrfToken = document.querySelector("input[name='csrf_token']").value;

        errorMessage.textContent = "";
        identityCard.value = "";
        nextStepButton.disabled = true;

        if (fullName.value.trim() && managementLevel.value.trim() && unitName.value.trim()) {
            fetch("/validate_identity_card", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                body: JSON.stringify({
                    full_name: fullName.value.trim(),
                    management_level: managementLevel.value.trim(),
                    unit_name: unitName.value.trim(),
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.user) {
                        userData = data.user; // Store user data
                        identityCard.value = data.user.identity_card;
                        nextStepButton.disabled = false;
                    } else {
                        errorMessage.textContent = "User not found.";
                        userData = {};
                    }
                })
                .catch((error) => {
                    console.error("Error validating user:", error);
                    errorMessage.textContent = "An error occurred. Please try again later.";
                });
        }
    }

    /** Captures a photo and updates the placeholder. */
    function capturePhoto() {
        const photoKey = captureOrder[currentPhotoIndex];
        if (!photoKey) return console.error("All photos already captured.");

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDimension = 720;

        let { videoWidth: width, videoHeight: height } = elements.faceCamera;

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = (height * maxDimension) / width;
                width = maxDimension;
            } else {
                width = (width * maxDimension) / height;
                height = maxDimension;
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(elements.faceCamera, 0, 0, width, height);
        const capturedImage = canvas.toDataURL("image/png");

        if (capturedImage) {
            updatePhotoPlaceholder(photoKey, capturedImage);
            currentPhotoIndex++;
            checkAllPhotosCaptured();
        } else {
            console.error("Failed to capture the photo.");
        }
    }

    /** Updates the photo placeholder with a captured image. */
    function updatePhotoPlaceholder(photoKey, imageSrc) {
        const previewElement = document.getElementById(`${photoKey}-photo-preview`);
        previewElement.src = imageSrc;
        previewElement.style.display = "block";
        capturedImages[photoKey] = imageSrc;
    }

    /** Resets all captured photos. */
    function resetCapturedPhotos() {
        Object.keys(capturedImages).forEach((key) => {
            capturedImages[key] = null;
            const previewElement = document.getElementById(`${key}-photo-preview`);
            previewElement.src = "";
            previewElement.style.display = "none";
        });
        currentPhotoIndex = 0;
        elements.nextStep3Button.disabled = true;
    }

    /** Checks if all photos are captured. */
    function checkAllPhotosCaptured() {
        elements.nextStep3Button.disabled = !Object.values(capturedImages).every((img) => img);
    }

    /** Populates data for Step 3 review. */
    function populateStep3() {
        document.getElementById("fullname-step3").value = userData.full_name || "";
        document.getElementById("identity-card-step3").value = userData.identity_card || "";
        document.getElementById("management-level-step3").value = userData.management_level || "";
        document.getElementById("unit-step3").value = userData.unit_name || "";

        const fileInput = document.getElementById("file-scan-step1");
        const fileScanField = document.getElementById("file-scan-step3");
        if (fileInput && fileInput.files[0]) {
            fileScanField.value = fileInput.files[0].name; // Display file name
        } else {
            fileScanField.value = "Không có tệp nào được chọn.";
        }

        Object.entries(capturedImages).forEach(([key, imageSrc]) => {
            const previewElement = document.getElementById(`${key}-photo-preview-step3`);
            if (imageSrc) {
                previewElement.src = imageSrc;
                previewElement.style.display = "block";
            }
        });
    }

    /** Handles form submission. */
    // function handleFinish() {
    //     const payload = { ...userData, images: capturedImages };
    //     const csrfToken = document.querySelector("input[name='csrf_token']").value;
    //     fetch("/register_soldier_submit_data", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    //         body: JSON.stringify(payload),
    //     })
    //         .then((response) => response.json())
    //         .then((data) => {
    //             if (data.error) {
    //                 alert(`Error: ${data.error}`);
    //             } else {
    //                 alert("Soldier registered successfully!");
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Error submitting soldier data:", error);
    //             alert("An error occurred. Please try again.");
    //         });
    // }

    function handleFinish() {
        const finishButton = document.getElementById("finish-step");
        const backButton = document.getElementById("back-to-step-2");
        const errorMessage = document.getElementById("result-error-message"); // Add an error display element if not present
        const payload = {
            full_name: userData.full_name,
            identity_card: userData.identity_card,
            management_level: userData.management_level,
            unit_name: userData.unit_name,
            file_scan: userData.fileScan,
            images: capturedImages,
        };

        // Disable buttons and show loading indicator
        finishButton.disabled = true;
        backButton.disabled = true;
        finishButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`; // Show spinner
        const csrfToken = document.querySelector("input[name='csrf_token']").value;
        fetch("/register_soldier_submit_data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(payload),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    errorMessage.textContent = `Error: ${data.error}`; // Show error message
                } else {
                    alert("Soldier registered successfully!");
                    console.log(data);
                    // Optionally redirect to another page or reset form
                    // location.href = "/success"; // Redirect to success page
                }
            })
            .catch((error) => {
                console.error("Error submitting soldier data:", error);
                errorMessage.textContent = "An error occurred. Please try again.";
            })
            .finally(() => {
                // Re-enable buttons and restore text
                finishButton.disabled = false;
                backButton.disabled = false;
                finishButton.innerHTML = `<i class="bi bi-arrow-right"></i>`; // Restore button icon
            });
    }

    // File validation for Step 1
    elements.fileScanStep1.addEventListener("change", (event) => {
        const file = event.target.files[0];
        const maxSize = 10485760; // 10MB

        elements.fileScanError.textContent = "";
        if (file) {
            const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];
            const extension = file.name.split(".").pop().toLowerCase();

            if (!allowedExtensions.includes(extension)) {
                elements.fileScanError.textContent = "Only PDF, PNG, JPG, JPEG files are allowed.";
                event.target.value = "";
            } else if (file.size > maxSize) {
                elements.fileScanError.textContent = "File size must not exceed 10MB.";
                event.target.value = "";
            }
        }
    });

    // Event listeners
    elements.fullName.addEventListener("change", validateUser);
    elements.managementLevel.addEventListener("change", validateUser);
    elements.unitName.addEventListener("change", validateUser);
    elements.nextStepButton.addEventListener("click", () => toggleSteps(elements.step1, elements.step2, "start"));
    elements.backStepButton.addEventListener("click", () => toggleSteps(elements.step2, elements.step1, "stop"));
    elements.capturePhotoButton.addEventListener("click", capturePhoto);
    elements.resetPhotoButton.addEventListener("click", resetCapturedPhotos);
    elements.nextStep3Button.addEventListener("click", () => {
        toggleSteps(elements.step2, elements.step3, "stop");
        populateStep3();
    });
    elements.finishButton.addEventListener("click", handleFinish);

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

});