document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const elements = {
        fullName: document.getElementById("fullname"),
        militaryManagerId: document.getElementById("military-manager-id"),
        militaryUnitIdSelect: document.getElementById("military_unit_id"),
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

    function populateStep3() {
        const identityCardInput = document.getElementById("identity_card");
        const fullNameInput = document.getElementById("fullname");
        const militaryUnitIdSelect = document.getElementById("military_unit_id");
        const militaryManagerIdSelect = document.getElementById("military-manager-id");
        const noteInput = document.getElementById("note");

        document.getElementById("management-level-step3").value = militaryManagerIdSelect.options[militaryManagerIdSelect.selectedIndex]?.text || "Không có cấp quản lý";

        // Populate Step 3 fields
        document.getElementById("identity-card-step3").value = identityCardInput.value.trim();
        document.getElementById("fullname-step3").value = fullNameInput.value.trim();
        document.getElementById("unit-step3").value =
            militaryUnitIdSelect.options[militaryUnitIdSelect.selectedIndex]?.text || "Không có đơn vị";
        document.getElementById("note-step3").value = noteInput.value.trim() || "Không có ghi chú";

        // Handle dynamic acceptors
        const acceptorsContainerStep3 = document.getElementById("acceptors-container-step3");
        acceptorsContainerStep3.innerHTML = ""; // Clear any previous acceptors

        const acceptorsContainerStep1 = document.getElementById("acceptors-container");
        const acceptorSelects = acceptorsContainerStep1.querySelectorAll(".acceptor-select");

        acceptorSelects.forEach((select, index) => {
            const selectedOptionText = select.options[select.selectedIndex]?.text || "Chưa chọn";
            const acceptorElement = document.createElement("div");
            acceptorElement.className = "acceptor-item mb-2";

            acceptorElement.innerHTML = `
            <label for="acceptor-level-${index + 1}-step3">Người duyệt cấp ${index + 1}:</label>
            <input 
                type="text" 
                class="form-control" 
                id="acceptor-level-${index + 1}-step3" 
                value="${selectedOptionText}" 
                readonly
            />
        `;

            acceptorsContainerStep3.appendChild(acceptorElement);
        });

            const fileInput = document.getElementById("file-scan-step1");
            const fileScanField = document.getElementById("file-scan-step3");
            if (fileInput && fileInput.files[0]) {
                fileScanField.value = fileInput.files[0].name; // Display file name
            } else {
                fileScanField.value = "Không có tệp nào được chọn.";
            }

        // Populate photo previews
        Object.keys(capturedImages).forEach((key) => {
            const previewElement = document.getElementById(`${key}-photo-preview-step3`);
            if (previewElement && capturedImages[key]) {
                previewElement.src = capturedImages[key];
                previewElement.style.display = "block";
            }
        });
    }

    // Event listener to handle "Next" button click for Step 3
    document.getElementById("next-step-3").addEventListener("click", () => {
        populateStep3();
        toggleSteps(document.getElementById("step-2"), document.getElementById("step-3"));
    });


    function validateForm() {
        const identityCardValue = elements.identityCard.value.trim();
        const acceptorDropdowns = document.querySelectorAll(".acceptor-select");
        const isIdentityCardValid = identityCardValue.length === 12;

        // Check if all acceptor dropdowns have a selected value
        const areAllAcceptorsSelected = Array.from(acceptorDropdowns).every(
            (dropdown) => dropdown.value.trim() !== ""
        );

        // Enable the "Next" button only if all validations pass
        elements.nextStepButton.disabled = !(isIdentityCardValid && areAllAcceptorsSelected);
    }

    function handleAcceptorDropdownChanges() {
        const acceptorDropdowns = document.querySelectorAll(".acceptor-select");
        acceptorDropdowns.forEach((dropdown) => {
            dropdown.addEventListener("change", validateForm);
        });
    }

    // Event listener to fetch user data when identity card is 12 characters
    elements.identityCard.addEventListener("input", () => {
        const identityCardValue = elements.identityCard.value.trim();
        if (identityCardValue.length === 12) {
            fetch(`/get_user_by_identity/${identityCardValue}`)
                .then((response) => {
                    if (!response.ok) throw new Error("Không tìm thấy người dùng");
                    return response.json();
                })
                .then((data) => {
                    userData = data;
                    elements.fullName.value = data.full_name || "";
                    elements.militaryManagerId.value = data.military_manager_id || "";
                    elements.militaryUnitIdSelect.value = data.military_unit_id || "";
                    elements.errorMessage.textContent = ""; // Clear error message
                })
                .catch((error) => {
                    console.error("Error fetching user:", error);
                    userData = {};
                    elements.fullName.value = "";
                    elements.militaryManagerId.value = "";
                    elements.militaryUnitIdSelect.value = "";
                    elements.errorMessage.textContent = "Không tìm thấy người dùng hoặc đã xảy ra lỗi.";
                })
                .finally(() => {
                    validateForm(); // Ensure "Next" button state is updated
                });
        } else {
            // Clear fields if input is less than 12 characters
            elements.fullName.value = "";
            elements.militaryManagerId.value = "";
            elements.militaryUnitIdSelect.value = "";
            elements.errorMessage.textContent = "";
        }
    });

    function handleFinish() {
        const finishButton = document.getElementById("finish-step");
        const backButton = document.getElementById("back-to-step-2");
        const errorMessage = document.getElementById("result-error-message");
        const acceptorSelects = document.querySelectorAll(".acceptor-select");

        // Create the acceptors JSON array
        const acceptors = Array.from(acceptorSelects).map((select, index) => ({
            [`acceptor-level-${index + 1}`]: select.value,
            status: "Chờ duyệt",
            [`acceptor-level-${index + 1}-full_name`]: select.options[select.selectedIndex]?.text || "N/A",
            [`acceptor-level-${index + 1}-manager_email`]:  "",
            [`acceptor-level-${index + 1}-manager_id`]:  select.value,
        }));

        // Validate acceptors length and uniqueness
        const managerIds = acceptors.map((acceptor, index) => acceptor[`acceptor-level-${index + 1}`]);
        const hasDuplicate = new Set(managerIds).size !== managerIds.length;

        if (acceptors.length === 0 || acceptors.length > 4) {
            errorMessage.textContent = "Người duyệt phải từ 1 đến 4.";
            return;
        }

        if (hasDuplicate) {
            errorMessage.textContent = "Không được chọn trùng người duyệt.";
            return;
        }

        // Prepare payload
        const payload = {
            identity_card: document.getElementById("identity_card").value.trim(),
            acceptors: acceptors, // Send directly as an array
            file_scan: userData.fileScan || null,
            images: capturedImages || {},
        };

        // Disable buttons and show loading indicator
        finishButton.disabled = true;
        backButton.disabled = true;
        finishButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

        const csrfToken = document.querySelector("input[name='csrf_token']").value;

        fetch("/register_soldier_checkin_data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify(payload),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    errorMessage.textContent = `Error: ${data.error}`;
                } else {
                    alert("Bạn đã tạo yêu cầu thành công. Xin hãy đợi duyệt");
                    console.log(data);
                    location.href = "/reports";
                }
            })
            .catch((error) => {
                console.error("Error submitting soldier data:", error);
                errorMessage.textContent = "Đã xảy ra lỗi. Vui lòng thử lại.";
            })
            .finally(() => {
                // Re-enable buttons and restore text
                finishButton.disabled = false;
                backButton.disabled = false;
                finishButton.innerHTML = `<i class="bi bi-arrow-right"></i>`;
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

    const MAX_ACCEPTORS = 4;

    const acceptorsContainer = document.getElementById("acceptors-container");
    const addAcceptorButton = document.getElementById("add-acceptor");

    /**
     * Populate a dropdown with acceptor options
     * @param {HTMLSelectElement} selectElement - The select element to populate
     */
    function populateAcceptorDropdown(selectElement) {
        fetch("/get_managers")
            .then((response) => response.json())
            .then((managers) => {
                selectElement.innerHTML = '<option value="">Chọn người duyệt</option>';
                managers.forEach((manager) => {
                    const option = document.createElement("option");
                    option.value = manager.id;
                    option.textContent = `${manager.full_name} (${manager.identity_card})`;
                    selectElement.appendChild(option);
                });
            })
            .catch((error) => console.error("Error fetching managers:", error));
    }

    /**
     * Add a new acceptor dropdown
     */
    function addAcceptor() {
        const acceptorItem = document.createElement("div");
        acceptorItem.classList.add("acceptor-item", "d-flex", "align-items-center", "mb-2");

        const selectElement = document.createElement("select");
        selectElement.classList.add("form-control", "acceptor-select");
        selectElement.name = "acceptor_ids";
        selectElement.required = true;

        populateAcceptorDropdown(selectElement);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.classList.add("btn", "btn-danger", "btn-sm", "ms-2", "remove-acceptor");
        removeButton.textContent = "X";

        removeButton.addEventListener("click", () => {
            acceptorsContainer.removeChild(acceptorItem);
            handleAcceptorDropdownChanges();
            validateAcceptors();
        });

        acceptorItem.appendChild(selectElement);
        acceptorItem.appendChild(removeButton);

        acceptorsContainer.appendChild(acceptorItem);
        handleAcceptorDropdownChanges();
        validateAcceptors();
    }

    // Populate the initial acceptor dropdown
    const initialSelect = document.querySelector(".acceptor-select");
    populateAcceptorDropdown(initialSelect);

    // Add event listener to the Add Acceptor button
// Attach initial validation and event listeners
    elements.identityCard.addEventListener("input", validateForm);
    handleAcceptorDropdownChanges();

// Revalidate whenever acceptors are added or removed
    addAcceptorButton.addEventListener("click", () => {
        addAcceptor();
        handleAcceptorDropdownChanges();
    });


    function validateAcceptors() {
        const acceptorItems = document.querySelectorAll(".acceptor-item");
        const removeButtons = document.querySelectorAll(".remove-acceptor");

        // Show or hide remove buttons based on number of acceptors
        removeButtons.forEach((btn, index) => {
            btn.style.display = acceptorItems.length > 1 ? "inline-block" : "none";
        });

        // Show or hide the Add Acceptor button based on the limit
        addAcceptorButton.style.display = acceptorItems.length >= MAX_ACCEPTORS ? "none" : "inline-block";
    }

    validateAcceptors();

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

$(document).ready(function() {
    const militaryManagerSelect = document.getElementById("military-manager-id");
    fetch("/get_military_manager")
        .then((response) => response.json())
        .then((users) => {
            if (users.length > 0) {
                users.forEach((user) => {
                    const option = document.createElement("option");
                    option.value = user.id;
                    option.textContent = user.name;
                    militaryManagerSelect.appendChild(option);
                });
                militaryManagerSelect.disabled = false;
            }
        });

    const militaryUnitIdSelect = document.getElementById("military_unit_id");
    fetch("/get_military_units")
        .then((response) => response.json())
        .then((units) => {
            units.forEach((unit) => {
                const option = document.createElement("option");
                option.value = unit.id;
                option.textContent = unit.name;
                militaryUnitIdSelect.appendChild(option);
            });
        });

})