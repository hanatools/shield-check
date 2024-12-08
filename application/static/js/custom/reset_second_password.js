document.getElementById("reset-password-form").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default form submission

    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector(".btn-confirm");
    const formInputs = form.querySelectorAll("input, textarea, select");

    // Disable form inputs and submit button to prevent multiple submissions
    toggleFormState(formInputs, submitButton, true);

    const csrfToken = formData.get("csrf_token");
    const newPassword = formData.get("new_password");
    const confirmPassword = formData.get("confirm_password");

    // Clear previous error messages
    const passwordError = document.getElementById("password-error");
    const confirmPasswordError = document.getElementById("confirm-password-error");
    passwordError.textContent = "";
    confirmPasswordError.textContent = "";

    // Validate passwords
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        passwordError.textContent =
            "Mật khẩu phải dài ít nhất 8 ký tự và bao gồm cả chữ hoa, chữ thường, số và ký tự đặc biệt.";
        toggleFormState(formInputs, submitButton, false);
        return;
    }

    if (newPassword !== confirmPassword) {
        confirmPasswordError.textContent = "Passwords do not match.";
        toggleFormState(formInputs, submitButton, false);
        return;
    }

    // Send AJAX request to the server
    fetch(form.action, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(formData),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // Show success alert
                alert(data.message);

                // Redirect to profile page
                const loginId = document.querySelector('input[name="loginId"]').value;
                setTimeout(() => {
                    window.location.href = "/soldier_info_personal_user/" + loginId;
                }, 3000);
            } else {
                alert(data.message || "An unexpected error occurred.");
                toggleFormState(formInputs, submitButton, false);
            }
        })
        .catch((error) => {
            console.error("Error submitting form:", error);
            alert("An error occurred while updating the password. Please try again.");
            toggleFormState(formInputs, submitButton, false);
        });
});

// Helper function to enable/disable form inputs and buttons
function toggleFormState(inputs, submitButton, disable) {
    inputs.forEach((input) => {
        input.disabled = disable;
    });
    submitButton.disabled = disable;
    submitButton.innerHTML = disable
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...'
        : "Confirm";
}