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