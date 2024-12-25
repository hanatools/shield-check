
document.getElementById("identity-card-input").addEventListener("input", (event) => {
    const inputValue = event.target.value.trim();

    if (inputValue.length >= 12) {
        if (inputValue.includes("|")) {
            // Process the barcode string
            processBarcode(inputValue);
        } else {
            // Enable submit button if the length is 12 and no "|" character is present
            if (inputValue.length === 12) {
                enableSubmitButton();
            } else {
                disableSubmitButton();
            }
        }
    } else {
        disableSubmitButton(); // Disable submit if input is less than 12
    }
});


// Handle the "Submit" button click
document.getElementById("submit-identity-card").addEventListener("click", () => {
    const inputValue = document.getElementById("identity-card-input").value.trim();

    if (inputValue.length === 12) {
        processIdentityCard(inputValue);
    } else {
        document.getElementById("identity-card-error").textContent = "Số CCCD không hợp lệ. Vui lòng nhập đủ 12 số.";
    }
});

// Function to process the barcode
// function processBarcode(barcode) {
//     const parts = barcode.split("|");
//
//     // Validate the format
//     if (parts.length >= 4) {
//         const identityCardNumber = parts[0]; // Extract the first part of the barcode
//
//         if (identityCardNumber.length === 12) {
//             // Set the input value and enable the submit button
//             document.getElementById("identity-card-input").value = identityCardNumber;
//             enableSubmitButton();
//         } else {
//             console.error("Invalid Barcode Format: First part is not 12 characters.");
//             disableSubmitButton();
//         }
//     } else {
//         console.error("Invalid Barcode Format: Not enough parts.");
//         disableSubmitButton();
//     }
// }
// Function to process the barcode
function processBarcode(barcode) {
    const parts = barcode.split("|");

    // Validate the format
    if (parts.length >= 1) {
        let identityCardNumber = parts[0]; // Extract the first part of the barcode

        // Ensure the identity card number is trimmed to 12 characters
        if (identityCardNumber.length > 12) {
            identityCardNumber = identityCardNumber.substring(0, 12);
            console.warn("Identity card number exceeded 12 characters. Extra characters were removed.");
        }

        if (identityCardNumber.length === 12) {
            // Set the input value and enable the submit button
            document.getElementById("identity-card-input").value = identityCardNumber;
            enableSubmitButton();
        } else {
            console.error("Invalid Barcode Format: First part is not 12 characters.");
            disableSubmitButton();
        }
    } else {
        console.error("Invalid Barcode Format: Not enough parts.");
        disableSubmitButton();
    }
}
// Function to enable the submit button
function enableSubmitButton() {
    const submitButton = document.getElementById("submit-identity-card");
    submitButton.disabled = false; // Enable the submit button
}

// Function to disable the submit button
function disableSubmitButton() {
    const submitButton = document.getElementById("submit-identity-card");
    submitButton.disabled = true; // Disable the submit button
}


// Function to process the identity card number and move to the next step
function processIdentityCard(identityCardNumber) {
    document.getElementById("identity-card-error").textContent = ""; // Clear error message

    // Set the identity card number to Step 2 input
    document.getElementById("identity-card-number").value = identityCardNumber;

    // Move to Step 2
    moveToStep2(identityCardNumber);
}


function moveToStep2(cardNumber) {
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");

    // Populate the card number in Step 2
    document.getElementById("identity-card-number").value = cardNumber;

    // Transition to Step 2
    step1.classList.add("slide-out-left");
    setTimeout(() => {
        step1.classList.remove("active", "slide-out-left");
        step2.classList.add("slide-in-right", "active");
        setTimeout(() => {
            step2.classList.remove("slide-in-right");
        }, 500); // Match the transition duration in CSS
    }, 500);

    // Fetch user data from the server
    checkUserExistence(cardNumber);
}

// Fetch user data from the server
async function checkUserExistence(cardNumber) {
    const noteMessage = document.getElementById("user-exists-note");

    try {
        const response = await fetch(`/search_members?query=${cardNumber}`);
        const users = await response.json();

        if (users.length > 0) {
            const user = users[0];

            // Populate Step 2 fields with the user's data
            document.getElementById("full-name").value = user.full_name || "";
            document.getElementById("email").value = user.email || "";
            document.getElementById("military_unit_id").value = user.unit_id || "";
            document.getElementById("military-manager-id").value = user.military_manager_id || "";

            noteMessage.classList.remove("d-none");
        } else {
            // Clear the form if no user is found
            document.getElementById("full-name").value = "";
            document.getElementById("email").value = "";

            noteMessage.classList.add("d-none");
        }
    } catch (error) {
        console.error("Error checking user:", error);
        alert("Đã xảy ra lỗi khi kiểm tra người dùng. Vui lòng thử lại.");
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

    // initializeCamera();
}


// Validate Step 2 Form
function validateForm() {
    let isValid = true;

    const fullNameInput = document.getElementById("full-name");

    const fullNameError = document.getElementById("full-name-error");
    const unitNameError = document.getElementById("military_unit_error");
    const managementLevelError = document.getElementById("military-manager-id-error");

    // Clear all previous error messages
    fullNameError.textContent = "";
    unitNameError.textContent = "";
    managementLevelError.textContent = "";

    // Validate full name
    if (!fullNameInput.value.trim()) {
        fullNameError.textContent = "Họ và tên không được để trống.";
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
    document.getElementById("email-confirm").value = document.getElementById("email").value;
    const unitNameElement = document.getElementById("military_unit_id");
    document.getElementById("military_unit_id_confirm").value = unitNameElement.options[unitNameElement.selectedIndex]?.text || "Không có đơn vị";

    // Populate manager name
    const managerElement = document.getElementById("military-manager-id");
    document.getElementById("military-manager-id-confirm").value = managerElement.options[managerElement.selectedIndex]?.text || "Không có cấp quản lý";

    document.getElementById("note-confirm").value = document.getElementById("note").value;

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
        fullName: document.getElementById("full-name").value.trim(), // From Step 2
        identityCard: document.getElementById("identity-card-number").value.trim(), // From Step 2
        email: document.getElementById("email").value.trim(), // From Step 2
        militaryManagerId: document.getElementById("military-manager-id").value.trim() || null,
        militaryMilitaryUnitId: document.getElementById("military_unit_id").value.trim() || null, // From Step 2
        note: document.getElementById("note").value.trim() || "", // From Step 2
        images: capturedImages, // Include images from Step 3

    };

    console.log("Submitting user data:", userInfo);
    const csrfToken = document.querySelector("input[name='csrf_token']").value;
    // Make a POST request to the server
    fetch("/input-personal-submit-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(userInfo),
    })
        .then((response) => response.json().then((data) => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                console.log("Server response:", data);

                if (data.user) {
                    alert(`Đăng ký cá nhân thành công:\nHọ tên: ${data.user.full_name}\nCCCD: ${data.user.identity_card}`);
                    window.location.href = "/soldier_info_personal_user/".concat(data.user.id);
                } else {
                    throw new Error("Không tạo được người dùng: Không có người dùng nào được trả về trong phản hồi.");
                }
            } else {
                throw new Error(data.error || "Unexpected error occurred.");
            }
        })
        .catch((error) => {
            console.error("Error submitting form:", error);
            alert(`Đăng ký cá nhân thất bại:\n${error.message}`);
        });
});

$(document).ready(function() {
    // initializeCamera();

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
    // document.getElementById("reset-button").addEventListener("click", () => {
        // initializeCamera();
    // });

    // Add event listener for the Reset button
    document.getElementById("reset-capture-photo").addEventListener("click", resetAllCapturedPhotos);
    document.getElementById("next-to-step-3").addEventListener("click", moveToStep3);


// Event listeners for navigation
    document.getElementById("next-to-step-4").addEventListener("click", moveToStep4);
    document.getElementById("back-to-step-3").addEventListener("click", moveBackStep3);

    const unitNameSelect = document.getElementById("military_unit_id");
    const managementLevelSelect = document.getElementById("military-manager-id");

    // Fetch Military Units
    // fetch("/get_military_manager")
    fetch("/get_military_units")
        .then((response) => response.json())
        .then((units) => {
            units.forEach((unit) => {
                const option = document.createElement("option");
                option.value = unit.id;
                option.textContent = unit.name;
                unitNameSelect.appendChild(option);
            });
        });

    fetch("/get_military_manager")
        .then((response) => response.json())
        .then((users) => {
            if (users.length > 0) {
                // Populate Management Level dropdown
                users.forEach((user) => {
                    const option = document.createElement("option");
                    option.value = user.id;
                    // option.textContent = user.full_name;
                    option.textContent = user.name;
                    managementLevelSelect.appendChild(option);
                });
                managementLevelSelect.disabled = false;
            }
        });


});