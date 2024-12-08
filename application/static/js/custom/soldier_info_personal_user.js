function validateEditForm() {
    let isValid = true;

    const fullNameInput = document.getElementById("edit-full-name");
    const emailInput = document.getElementById("edit-email");
    const unitInput = document.getElementById("edit-military-unit-id");
    const managerInput = document.getElementById("edit-military-manager-id");

    const fullNameError = document.getElementById("edit-full-name-error");
    const emailError = document.getElementById("edit-email-error");
    const unitError = document.getElementById("edit-military-unit-error");
    const managerError = document.getElementById("edit-military-manager-error");

    // Clear all previous error messages
    fullNameError.textContent = "";
    emailError.textContent = "";
    unitError.textContent = "";
    managerError.textContent = "";

    // Validate full name
    if (!fullNameInput.value.trim()) {
        fullNameError.textContent = "Họ và tên không được để trống.";
        isValid = false;
    }

    // Validate email if provided
    if (emailInput.value.trim() && !/\S+@\S+\.\S+/.test(emailInput.value.trim())) {
        emailError.textContent = "Email không hợp lệ.";
        isValid = false;
    }

    // Validate unit if provided
    if (unitInput.value.trim() && !unitInput.value) {
        unitError.textContent = "Vui lòng chọn đơn vị hợp lệ.";
        isValid = false;
    }

    // Validate manager if provided
    if (managerInput.value.trim() && !managerInput.value) {
        managerError.textContent = "Vui lòng chọn chức danh quản lý hợp lệ.";
        isValid = false;
    }

    // Enable or disable the submit button based on validation
    document.querySelector("#edit-user-form button[type='submit']").disabled = !isValid;
    return isValid;
}

function openEditModal(userId) {
    const unitNameSelect = document.getElementById("edit-military-unit-id");
    const managementLevelSelect = document.getElementById("edit-military-manager-id");
    const editRoleSelect = document.getElementById("edit-role");
    // Clear any previous data
    document.getElementById("edit-user-form").reset();
    unitNameSelect.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
    managementLevelSelect.innerHTML = '<option value="">-- Chọn cấp quản lý --</option>';

    // Fetch the user details
    fetch(`/get_user_details/${userId}`)
        .then((response) => response.json())
        .then((user) => {
            console.log("User details:", user);
            // Populate the form with user details
            document.getElementById("edit-full-name").value = user.full_name;
            document.getElementById("edit-email").value = user.email || "";
            document.getElementById("edit-note").value = user.note || "";

            editRoleSelect.value = user.role || "USER_ROLE";
            // Load Military Units
            fetch("/get_military_units")
                .then((response) => response.json())
                .then((units) => {
                    units.forEach((unit) => {
                        const option = document.createElement("option");
                        option.value = unit.id;
                        option.textContent = unit.name;
                        // Set selected value for military unit
                        if (`${unit.id}` === user.military_military_unit_id) {
                            option.selected = true;
                        }
                        unitNameSelect.appendChild(option);
                    });

                    // If user has a military unit, load management level users
                    if (user.military_military_unit_id) {
                        fetch(`/get_users_by_unit/${user.military_military_unit_id}`)
                            .then((response) => response.json())
                            .then((users) => {
                                users.forEach((manager) => {
                                    const option = document.createElement("option");
                                    option.value = manager.id;
                                    option.textContent = manager.full_name;

                                    // Set selected value for management level
                                    if (`${manager.id}` === user.military_manager_id) {
                                        option.selected = true;
                                    }
                                    managementLevelSelect.appendChild(option);
                                });

                                // Enable the management level select if users exist
                                managementLevelSelect.disabled = false;
                            })
                            .catch((error) => {
                                console.error("Error fetching management levels:", error);
                            });
                    }
                })
                .catch((error) => {
                    console.error("Error fetching military units:", error);
                });
        })
        .catch((error) => {
            console.error("Error fetching user details:", error);
            alert("Không thể tải thông tin người dùng.");
        });
}

// Handle Unit Name Change for Edit Modal
document.getElementById("edit-military-unit-id").addEventListener("change", function () {
    const unitId = this.value;
    const managementLevelSelect = document.getElementById("edit-military-manager-id");

    // Clear and disable the Management Level dropdown
    managementLevelSelect.innerHTML = '<option value="">-- Chọn cấp quản lý --</option>';
    managementLevelSelect.disabled = true;

    if (unitId) {
        // Fetch Users for the selected Military Unit
        fetch(`/get_users_by_unit/${unitId}`)
            .then((response) => response.json())
            .then((users) => {
                if (users.length > 0) {
                    // Populate Management Level dropdown
                    users.forEach((user) => {
                        const option = document.createElement("option");
                        option.value = user.id;
                        option.textContent = user.full_name;
                        managementLevelSelect.appendChild(option);
                    });
                    managementLevelSelect.disabled = false;
                }
            })
            .catch((error) => {
                console.error("Error fetching users by unit:", error);
                alert("Không thể tải danh sách cấp quản lý.");
            });
    }
});

// Submit Edit Form
document.getElementById("edit-user-form").addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateEditForm()) return;

    const updatedUserInfo = {
        fullName: document.getElementById("edit-full-name").value.trim(),
        email: document.getElementById("edit-email").value.trim(),
        militaryUnitId: document.getElementById("edit-military-unit-id").value.trim(),
        militaryManagerId: document.getElementById("edit-military-manager-id").value.trim(),
        note: document.getElementById("edit-note").value.trim(),
        role: document.getElementById("edit-role").value.trim(),
    };

    // const userId = document.getElementById("editUserModal").dataset.userId;
    const userId = getUserIdFromUrl();

    fetch(`/update_user/${userId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("input[name='csrf_token']").value,
        },
        body: JSON.stringify(updatedUserInfo),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert("Thông tin đã được cập nhật!");
                location.reload();
            } else {
                alert(`Có lỗi xảy ra: ${data.message}`);
            }
        })
        .catch((error) => {
            console.error("Error updating user:", error);
            alert("Đã xảy ra lỗi khi cập nhật thông tin.");
        });
});


function getUserIdFromUrl() {
    const url = new URL(window.location.href); // Create a URL object from the current URL
    const pathname = url.pathname; // Get the pathname (e.g., "/soldier_info_personal_user/1")
    const segments = pathname.split("/"); // Split the pathname into segments
    return segments[segments.length - 1]; // The last segment is the user ID
}

$(document).ready(function () {
    const $editModal = $("#editUserModal");
    const $editUserForm = $("#edit-user-form");

    // Detect when the modal is opened
    $editModal.on("shown.bs.modal", function () {
        console.log("Edit modal is now open.");

        // Example usage
        const userId = getUserIdFromUrl();
        openEditModal(userId);
        // Additional actions when modal is opened can be added here
    });

    // Reset the form when the modal is closed
    $editModal.on("hidden.bs.modal", function () {
        console.log("Edit modal is now closed.");
        resetEditForm();
    });

    // Reset the edit form
    function resetEditForm() {
        $editUserForm[0].reset(); // Reset the form
        $("#edit-military-unit-id").html('<option value="">-- Chọn đơn vị --</option>');
        $("#edit-military-manager-id")
            .html('<option value="">-- Chọn cấp quản lý --</option>')
            .prop("disabled", true);

        // Clear any error messages
        $(".error-message").each(function () {
            $(this).text("");
        });
    }

    const userId = getUserIdFromUrl(); // Function to get user ID from URL
    fetch(`/get_user_details/${userId}`)
        .then((response) => response.json())
        .then((user) => {
            // Fetch and render military unit name
            if (user.military_military_unit_id) {
                fetch(`/get_military_unit_by_id/${user.military_military_unit_id}`)
                    .then((response) => response.json())
                    .then((unit) => {
                        document.getElementById("military-unit-name").textContent = unit.name || "Chưa cập nhật";
                    })
                    .catch((error) => console.error("Error fetching military unit:", error));
            }

            // Fetch and render manager name
            if (user.military_manager_id) {
                fetch(`/get_user_by_id/${user.military_manager_id}`)
                    .then((response) => response.json())
                    .then((manager) => {
                        document.getElementById("military-manager-name").textContent = manager.full_name || "Chưa cập nhật";
                    })
                    .catch((error) => console.error("Error fetching manager:", error));
            }
        })
        .catch((error) => {
            console.error("Error fetching user details:", error);
        });


});