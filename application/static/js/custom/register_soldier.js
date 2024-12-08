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
        backToStep2Button: document.getElementById("back-to-step-2"),
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
        acceptor1: document.getElementById("acceptor_level_1_id"),
        acceptor2: document.getElementById("acceptor_level_2_id"),
        acceptor3: document.getElementById("acceptor_level_3_id"),
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
    // function validateUser() {
    //     const { identityCard, errorMessage, nextStepButton } = elements;
    //     const csrfToken = document.querySelector("input[name='csrf_token']").value;
    //
    //     errorMessage.textContent = "";
    //     identityCard.value = "";
    //     nextStepButton.disabled = true;
    //
    //     if (fullName.value.trim() && managementLevel.value.trim() && unitName.value.trim()) {
    //         fetch("/validate_identity_card", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    //             body: JSON.stringify({
    //                 full_name: fullName.value.trim(),
    //                 management_level: managementLevel.value.trim(),
    //                 unit_name: unitName.value.trim(),
    //             }),
    //         })
    //             .then((response) => response.json())
    //             .then((data) => {
    //                 if (data.user) {
    //                     userData = data.user; // Store user data
    //                     identityCard.value = data.user.identity_card;
    //                     nextStepButton.disabled = false;
    //                 } else {
    //                     errorMessage.textContent = "User not found.";
    //                     userData = {};
    //                 }
    //             })
    //             .catch((error) => {
    //                 console.error("Error validating user:", error);
    //                 errorMessage.textContent = "An error occurred. Please try again later.";
    //             });
    //     }
    // }

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
        document.getElementById("identity-card-step3").value = userData.identity_card || "";

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

        document.getElementById("acceptor-level-1").value =
            document.getElementById("acceptor_level_1_id").options[
                document.getElementById("acceptor_level_1_id").selectedIndex
                ].text;

        document.getElementById("acceptor-level-2").value =
            document.getElementById("acceptor_level_2_id").options[
                document.getElementById("acceptor_level_2_id").selectedIndex
                ].text;

        document.getElementById("acceptor-level-3").value =
            document.getElementById("acceptor_level_3_id").options[
                document.getElementById("acceptor_level_3_id").selectedIndex
                ].text;


    }

    // Function to validate required fields and enable the "Next" button
    function validateForm() {
        const isValid =
            elements.identityCard.value.trim().length === 12 &&
            elements.acceptor1.value &&
            elements.acceptor2.value &&
            elements.acceptor3.value;
        elements.nextStepButton.disabled = !isValid;
    }

    // Event listener to fetch user data when identity card is 12 characters
    elements.identityCard.addEventListener("input", () => {
        const identityCardValue = elements.identityCard.value.trim();
        if (identityCardValue.length === 12) {
            fetch(`/get_user_by_identity/${identityCardValue}`)
                .then((response) => {
                    if (!response.ok) throw new Error("User not found");
                    return response.json();
                })
                .then((data) => {
                    userData = data;
                    // Populate the form fields with user data
                    elements.fullName.value = data.full_name || "";
                    elements.managementLevel.value = data.management_level || "";
                    elements.unitName.value = data.unit_name || "";
                    elements.errorMessage.textContent = ""; // Clear error message
                })
                .catch((error) => {
                    console.error("Error fetching user:", error);
                    userData = {};
                    elements.fullName.value = "";
                    elements.managementLevel.value = "";
                    elements.unitName.value = "";
                    elements.errorMessage.textContent = "User not found or an error occurred.";
                })
                .finally(() => {
                    validateForm(); // Ensure "Next" button state is updated
                });
        } else {
            // Clear fields if input is less than 12 characters
            elements.fullName.value = "";
            elements.managementLevel.value = "";
            elements.unitName.value = "";
            elements.errorMessage.textContent = "";
        }
    });

    // Event listeners for acceptor dropdowns to validate the form
    [elements.acceptor1, elements.acceptor2, elements.acceptor3].forEach((dropdown) => {
        dropdown.addEventListener("change", validateForm);
    });

    // Validate form on load (in case of pre-filled values)
    // validateForm();

    function handleFinish() {
        const finishButton = document.getElementById("finish-step");
        const backButton = document.getElementById("back-to-step-2");
        const errorMessage = document.getElementById("result-error-message"); // Add an error display element if not present
        const payload = {
            identity_card: userData.identity_card,
            acceptor_level_1_id: document.getElementById("acceptor_level_1_id").value,
            acceptor_level_2_id: document.getElementById("acceptor_level_2_id").value,
            acceptor_level_3_id:document.getElementById("acceptor_level_3_id").value,
            file_scan: userData.fileScan,
            images: capturedImages,
        };

        // Disable buttons and show loading indicator
        finishButton.disabled = true;
        backButton.disabled = true;
        finishButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`; // Show spinner
        const csrfToken = document.querySelector("input[name='csrf_token']").value;
        fetch("/register_soldier_checkin_data", {
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
                    alert("Bạn đã tạo yêu cầu thành công.  Xin hãy đợi duyệt");
                    console.log(data);
                    // Optionally redirect to another page or reset form
                    location.href = "/reports"; // Redirect to success page
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
    // elements.fullName.addEventListener("change", validateUser);
    // elements.managementLevel.addEventListener("change", validateUser);
    // elements.unitName.addEventListener("change", validateUser);
    // elements.nextStepButton.addEventListener("change", validateUser);
    elements.nextStepButton.addEventListener("click", () => toggleSteps(elements.step1, elements.step2, "start"));
    elements.backStepButton.addEventListener("click", () => toggleSteps(elements.step2, elements.step1, "stop"));
    elements.backToStep2Button.addEventListener("click", () => toggleSteps(elements.step3, elements.step2, "start"));
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

document.addEventListener("DOMContentLoaded", function () {
    // Fetch managers on page load
    fetch("/get_managers")
        .then((response) => response.json())
        .then((data) => {
            const level1Select = document.getElementById("acceptor_level_1_id");
            const level2Select = document.getElementById("acceptor_level_2_id");
            const level3Select = document.getElementById("acceptor_level_3_id");

            // Populate dropdowns with managers
            populateDropdown(level1Select, data);
            populateDropdown(level2Select, data);
            populateDropdown(level3Select, data);

            // Ensure unique selections across levels
            handleUniqueSelections(level1Select, level2Select, level3Select);
        })
        .catch((error) => console.error("Error fetching managers:", error));
});

function populateDropdown(selectElement, data) {
    data.forEach((manager) => {
        const option = document.createElement("option");
        option.value = manager.id;
        option.textContent = `${manager.full_name} (${manager.identity_card})`;
        selectElement.appendChild(option);
    });
}

function handleUniqueSelections(...selectElements) {
    selectElements.forEach((currentSelect) => {
        currentSelect.addEventListener("change", () => {
            const selectedValues = selectElements.map((select) => select.value);
            selectElements.forEach((select) => {
                Array.from(select.options).forEach((option) => {
                    option.disabled = selectedValues.includes(option.value) && select !== currentSelect;
                });
            });
        });
    });
}