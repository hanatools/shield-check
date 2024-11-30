document.addEventListener("DOMContentLoaded", () => {
    const fullnameInput = document.getElementById("fullname");
    const managementLevelInput = document.getElementById("management_level");
    const cccdInput = document.getElementById("cccd");
    const nextStepButton = document.getElementById("next-step");
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const backButton = document.getElementById("back-step");

    // Form validation
    function validateForm() {
        const fullname = fullnameInput.value.trim();
        const managementLevel = managementLevelInput.value.trim();

        if (!fullname || !managementLevel) {
            nextStepButton.disabled = true;
        } else {
            fetch("/validate_identity_card", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('input[name="csrf_token"]').value,
                },
                body: JSON.stringify({
                    full_name: fullname,
                    management_level: managementLevel,
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.cccd) {
                        cccdInput.value = data.cccd; // Autofill CCCD
                        nextStepButton.disabled = false; // Enable button
                    } else {
                        nextStepButton.disabled = true;
                    }
                })
                .catch((err) => console.error("Validation failed:", err.message));
        }
    }

    // Navigation
    nextStepButton.addEventListener("click", () => {
        step1.classList.remove("active");
        step1.classList.add("hidden");
        step2.classList.add("active");
        step2.classList.remove("hidden");
    });

    backButton.addEventListener("click", () => {
        step2.classList.remove("active");
        step2.classList.add("hidden");
        step1.classList.add("active");
        step1.classList.remove("hidden");
    });

    fullnameInput.addEventListener("input", validateForm);
    managementLevelInput.addEventListener("input", validateForm);
});