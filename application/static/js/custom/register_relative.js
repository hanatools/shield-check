document.addEventListener("DOMContentLoaded", function () {
    const sponsorIdInput = document.getElementById("sponsorId");
    const sponsorNameInput = document.getElementById("sponsorName");
    const rankInput = document.getElementById("rank");
    const relativeIdInput = document.getElementById("relativeId");
    const submitButton = document.querySelector("button[type='submit']");



    // const sponsorIdInput = document.getElementById("sponsorId");
    // const relativeIdInput = document.getElementById("relativeId");
    const relativeNameInput = document.getElementById("relativeName");
    // const submitButton = document.querySelector("button[type='submit']");


    // sponsorIdInput.addEventListener("change", function () {
    //     const sponsorId = sponsorIdInput.value.trim();
    //
    //     if (!sponsorId) {
    //         sponsorNameInput.value = "";
    //         rankInput.value = "";
    //         alert("Please enter a valid Sponsor ID.");
    //         return;
    //     }
    //
    //     fetch(`/get_sponsor_details/${sponsorId}`)
    //         .then((response) => {
    //             if (response.ok) {
    //                 return response.json();
    //             } else {
    //                 throw new Error("User not found");
    //             }
    //         })
    //         .then((data) => {
    //             sponsorNameInput.value = data.full_name || "";
    //             rankInput.value = data.management_level || "";
    //         })
    //         .catch((error) => {
    //             sponsorNameInput.value = "";
    //             rankInput.value = "";
    //             alert("User not exist.");
    //         });
    // });

    // Track which fields have been interacted with
    const touchedFields = new Set();

    // Function to validate a single field
    function validateField(inputElement) {
        // Remove existing error message for this field
        const existingError = inputElement.parentElement.querySelector(".error-message");
        if (existingError) {
            existingError.remove();
        }

        // Skip validation if the field hasn't been interacted with yet
        if (!touchedFields.has(inputElement)) {
            return true; // Assume valid until user interacts
        }

        // Perform validation based on input
        let isValid = true;
        if (inputElement === relativeNameInput) {
            if (relativeNameInput.value.trim() === "") {
                displayError(relativeNameInput, "Họ tên người thân không được để trống.");
                isValid = false;
            }
        } else if (inputElement === relativeIdInput) {
            if (relativeIdInput.value.trim().length !== 12) {
                displayError(relativeIdInput, "Số CCCD phải gồm 12 ký tự.");
                isValid = false;
            }
        } else if (inputElement === sponsorIdInput) {
            if (sponsorIdInput.value.trim().length !== 12) {
                displayError(sponsorIdInput, "Số CCCD của Quân nhân phải gồm 12 ký tự.");
                isValid = false;
            }
        }

        return isValid;
    }

    // Function to validate the entire form and update submit button state
    function validateForm() {
        const isRelativeNameValid = validateField(relativeNameInput);
        const isRelativeIdValid = validateField(relativeIdInput);
        const isSponsorIdValid = validateField(sponsorIdInput);

        // Enable submit button if all fields are valid
        submitButton.disabled = !(isRelativeNameValid && isRelativeIdValid && isSponsorIdValid);
    }

    // Function to display an error message under an input
    function displayError(inputElement, message) {
        const error = document.createElement("div");
        error.className = "error-message text-danger";
        error.textContent = message;
        inputElement.parentElement.appendChild(error);
    }

    // Add event listeners for individual input validation
    relativeNameInput.addEventListener("input", () => {
        touchedFields.add(relativeNameInput); // Mark field as touched
        validateField(relativeNameInput);
        validateForm();
    });

    relativeIdInput.addEventListener("input", () => {
        touchedFields.add(relativeIdInput); // Mark field as touched
        validateField(relativeIdInput);
        validateForm();
    });

    sponsorIdInput.addEventListener("input", () => {
        touchedFields.add(sponsorIdInput); // Mark field as touched
        validateField(sponsorIdInput);
        validateForm();
    });

    // Add sponsorId onchange logic to fetch sponsor details
    sponsorIdInput.addEventListener("change", function () {
        const sponsorId = sponsorIdInput.value.trim();

        if (sponsorId.length === 12) {
            fetch(`/get_sponsor_details/${sponsorId}`)
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error("User not found");
                    }
                })
                .then((data) => {
                    document.getElementById("sponsorName").value = data.full_name || "";
                    document.getElementById("rank").value = data.management_level || "";
                })
                .catch((error) => {
                    document.getElementById("sponsorName").value = "";
                    document.getElementById("rank").value = "";
                    alert("User not exist.");
                });
        }
    });
});