
$(document).ready(function () {
    // Initialize DataTable
    $("#military-units-table").DataTable({
        responsive: true,
        autoWidth: false,
        columnDefs: [{ targets: [0, 1, 5, 6], searchable: false }],
    });

    // Set CSRF token for AJAX requests
    const csrfToken = $('input[name="csrf_token"]').val();
    $.ajaxSetup({
        headers: { "X-CSRFToken": csrfToken },
    });

    // Generic function to show modals
    const showModal = (modalId) => $(modalId).modal("show");

    // Handle form submission with error display
    const handleFormSubmit = (formSelector, url, successCallback) => {
        $(formSelector).on("submit", function (e) {
            e.preventDefault();
            const data = $(this).serialize();
            $.post(url, data, function (response) {
                if (response.success) {
                    alert(response.message);
                    successCallback();
                } else {
                    displayErrorInModal(formSelector, response.message);
                }
            });
        });
    };

    // Display error in modal
    const displayErrorInModal = (formSelector, message) => {
        const errorAlert = `<div class="alert alert-danger" role="alert">${message}</div>`;
        $(`${formSelector} .modal-body`).prepend(errorAlert);
        setTimeout(() => $(`${formSelector} .alert-danger`).remove(), 5000);
    };

    // Reload page after successful action
    const reloadPage = () => location.reload();

    // Open Add Military Unit Modal
    $("#add_military_units_btn").on("click", () => showModal("#add_military_units_modal"));

    // Handle Add Military Unit Form Submission
    handleFormSubmit("#add_military_units_form", "/add_military_unit", reloadPage);

    // Handle Edit Button Click
    $(".edit-btn").on("click", function () {
        const unitId = $(this).data("id");
        $.get(`/get_military_unit/${unitId}`, function (response) {
            if (response.success) {
                const unit = response.data;
                $("#edit_military_units_id").val(unit.id);
                $("#edit_military_units_name").val(unit.name);
                $("#edit_military_units_key").val(unit.key);
                $("#edit_military_units_note").val(unit.note);
                $("#edit_military_units_parent").val(unit.parent || "");
                showModal("#edit_military_units_modal");
            } else {
                alert(response.message);
            }
        });
    });

    // Handle Edit Military Unit Form Submission
    handleFormSubmit("#edit_military_units_form", "/edit_military_unit", reloadPage);

    // Handle Delete Button Click
    $(".delete-btn").on("click", function () {
        const unitId = $(this).data("id");
        $("#delete-confirm-btn").data("id", unitId);
        showModal("#confirm-delete-modal");
    });

    // Confirm Delete
    $("#delete-confirm-btn").on("click", function () {
        const unitId = $(this).data("id");
        $.ajax({
            url: `/delete_military_unit/${unitId}`,
            type: "DELETE",
            success: (response) => {
                response.success ? reloadPage() : displayError("#delete-error-message", response.message);
            },
            error: (xhr) => {
                const errorMessage = xhr.responseJSON?.message || "An unexpected error occurred.";
                displayError("#delete-error-message", errorMessage);
            },
        });
    });

    // Display error
    const displayError = (selector, message) => {
        $(selector).text(message).removeClass("d-none");
    };

    // Fetch and render hierarchy map
    fetch("/military_units/hierarchy")
        .then((response) => response.json())
        .then(renderHierarchyMap)
        .catch((error) => console.error("Error fetching hierarchy data:", error));

    // Render hierarchy map
    function renderHierarchyMap(data) {
        const width = $("#hierarchy-map").width();
        const height = 400;
        const svg = d3.select("#hierarchy-map").append("svg").attr("width", width).attr("height", height);

        const root = d3.hierarchy({ name: "Units", children: data });
        d3.tree().size([width - 100, height - 100])(root);

        const nodes = root.descendants();
        const links = root.links();

        // Draw links
        svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y)
            .attr("stroke", "#ccc");

        // Draw nodes
        const nodeGroup = svg.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d) => `translate(${d.x},${d.y})`);

        nodeGroup.append("circle").attr("r", 10).attr("fill", "#007bff");
        nodeGroup.append("text")
            .attr("dy", -15)
            .attr("text-anchor", "middle")
            .text((d) => d.data.name)
            .attr("font-size", "10px")
            .attr("fill", "#333");
    }

    // Handle View Button Click
    $(".view-btn").on("click", function () {
        const unitId = $(this).data("id");
        $.get(`/get_military_unit/${unitId}`, function (response) {
            if (response.success) {
                const unit = response.data;
                $("#view_military_units_name").text(unit.name);
                $("#view_military_units_key").text(unit.key);
                $("#view_military_units_note").text(unit.note || "Không có");
                $("#view_military_units_parent").text(unit.parent || "Không có (Đơn vị gốc)");
                $("#view_military_units_created-date").text(unit.created_date);
                showModal("#view_military_units_modal");
            } else {
                alert(response.message);
            }
        });
    });

    // Initialize Bootstrap tooltips
    $("[data-bs-toggle='tooltip']").tooltip();
});