document.addEventListener("DOMContentLoaded", function () {
    const full_name = document.getElementById("full_name");
    const identity_card = document.getElementById("identity_card");
    const relationship = document.getElementById("relationship");
    const sponsor_full_name = document.getElementById("sponsor_full_name");
    const sponsor_identity_card = document.getElementById("sponsor_identity_card");
    const sponsor_military_unit_name = document.getElementById("sponsor_military_unit_name");
    const sponsor_military_unit_id = document.getElementById("sponsor_military_unit_id");
    const sponsor_military_manager_full_name = document.getElementById("sponsor_military_manager_full_name");

    // const sponsorIdInput = document.getElementById("sponsorId");
    const sponsorNameInput = document.getElementById("sponsorName");
    const rankInput = document.getElementById("rank");
    // const relativeIdInput = document.getElementById("relativeId");
    const submitButton = document.querySelector("button[type='submit']");


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
        if (inputElement === full_name) {
            if (full_name.value.trim() === "") {
                displayError(full_name, "Họ tên người thân không được để trống.");
                isValid = false;
            }
        } else if (inputElement === identity_card) {
            if (identity_card.value.trim().length !== 12) {
                displayError(identity_card, "Số CCCD phải gồm 12 ký tự.");
                isValid = false;
            }
        } else if (inputElement === sponsor_identity_card) {
            if (sponsor_identity_card.value.trim().length !== 12) {
                displayError(sponsor_identity_card, "Số CCCD của Quân nhân phải gồm 12 ký tự.");
                isValid = false;
            }
        }  else if (inputElement === relationship) {
            if (relationship.value.trim() === "") {
                displayError(relationship, "Mối quan hệ không được để trống.");
                isValid = false;
            }
        }



        return isValid;
    }

    // Function to validate the entire form and update submit button state
    function validateForm() {
        const isFullNameValid = validateField(full_name);
        const isIdentityCardValid = validateField(identity_card);
        const isSponsorMilitaryUnitIdValid = validateField(sponsor_military_unit_id);
        const isRelationshipValid = validateField(relationship);

        // Enable submit button if all fields are valid
        submitButton.disabled = !(isFullNameValid && isIdentityCardValid && isSponsorMilitaryUnitIdValid && isRelationshipValid);
    }

    // Function to display an error message under an input
    function displayError(inputElement, message) {
        const error = document.createElement("div");
        error.className = "error-message text-danger";
        error.textContent = message;
        inputElement.parentElement.appendChild(error);
    }

    // Add event listeners for individual input validation
    full_name.addEventListener("input", () => {
        touchedFields.add(full_name); // Mark field as touched
        validateField(full_name);
        validateForm();
    });

    relationship.addEventListener("input", () => {
        touchedFields.add(relationship); // Mark field as touched
        validateField(relationship);
        validateForm();
    });

    identity_card.addEventListener("input", () => {
        touchedFields.add(identity_card); // Mark field as touched
        validateField(identity_card);
        validateForm();
    });

    sponsor_identity_card.addEventListener("input", () => {
        touchedFields.add(sponsor_identity_card); // Mark field as touched
        validateField(sponsor_identity_card);
        validateForm();
    });

    // Add sponsorId onchange logic to fetch sponsor details
    sponsor_identity_card.addEventListener("change", function () {
        const sponsorId = sponsor_identity_card.value.trim();

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
                    document.getElementById("sponsor_full_name").value = data.full_name || "";
                    document.getElementById("sponsor_military_unit_name").value = data.military_unit_name || "";
                    document.getElementById("sponsor_military_unit_id").value = data.military_unit_id || "";
                    document.getElementById("sponsor_military_manager_full_name").value = data.manager_full_name || "";
                    document.getElementById("sponsor_military_manager_id").value = data.military_manager_id || "";
                })
                .catch((error) => {
                    document.getElementById("sponsor_full_name").value =  "";
                    document.getElementById("sponsor_military_unit_name").value =  "";
                    document.getElementById("sponsor_military_unit_id").value =  "";
                    document.getElementById("sponsor_military_manager_full_name").value =  "";
                    document.getElementById("sponsor_military_manager_id").value ="";
                    alert("User not exist.");
                });
        }
    });

//      submit form
    document.querySelector("form").addEventListener("submit", (event) => {
        validateForm(); // Final client-side validation
        if (submitButton.disabled) {
            event.preventDefault(); // Prevent submission if the form is invalid
            alert("Please correct the errors before submitting.");
        }
    });

});