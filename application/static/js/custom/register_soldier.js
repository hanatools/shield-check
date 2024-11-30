document.addEventListener("DOMContentLoaded", () => {
    const fullNameInput = document.getElementById("fullname");
    const managementLevelInput = document.getElementById("management_level");
    const identityCardInput = document.getElementById("identity_card");
    const errorMessage = document.getElementById("error-message");
    // Retrieve CSRF token from the form
    const csrfToken = document.querySelector("input[name='csrf_token']").value;
    function validateUser() {
        const fullName = fullNameInput.value.trim();
        const managementLevel = managementLevelInput.value.trim();

        // Clear any previous error message
        errorMessage.textContent = "";
        identityCardInput.value = "";

        if (fullName && managementLevel) {
            fetch("/validate_identity_card", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({ full_name: fullName, management_level: managementLevel }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.user) {
                        identityCardInput.value = data.user.identity_card; // Populate identity card
                    } else {
                        identityCardInput.value = ""; // Clear input
                        errorMessage.textContent = "User not found."; // Show error message
                    }
                })
                .catch((error) => {
                    console.error("Error validating user:", error);
                    errorMessage.textContent = "An error occurred. Please try again later.";
                });
        }
    }

    // Event listeners for validation
    fullNameInput.addEventListener("change", validateUser);
    managementLevelInput.addEventListener("change", validateUser);
});