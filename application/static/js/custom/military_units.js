$(document).ready(function () {

    $("#military-units-table").DataTable({
        responsive: true,
        autoWidth: false,
        columnDefs: [
            {
                targets: [0, 1, 5, 6], // Exclude "Hành động", "ID", "Ngày tạo" from search
                searchable: false,
            },
        ],
    });


    // Set CSRF token in AJAX headers
    const csrfToken = $('input[name="csrf_token"]').val();
    $.ajaxSetup({
        headers: {
            "X-CSRFToken": csrfToken,
        },
    });

    // Add Military Unit Modal
    $("#add_military_units_btn").on("click", function () {
        $("#add_military_units_modal").modal("show");
    });

    // Handle Add Military Unit Form Submission
    $("#add_military_units_form").on("submit", function (e) {
        e.preventDefault();

        const data = $(this).serialize(); // Serialize form data, including `parent`
        $.post("/add_military_unit", data, function (response) {
            if (response.success) {
                alert(response.message);
                location.reload(); // Reload the page to refresh the table and hierarchy map
            } else {
                // Display error message in modal
                const errorAlert = `<div class="alert alert-danger" role="alert">${response.message}</div>`;
                $("#add_military_units_modal .modal-body").prepend(errorAlert);

                // Remove error message after a few seconds
                setTimeout(() => {
                    $("#add_military_units_modal .alert-danger").remove();
                }, 5000);
            }
        });
    });

    // Handle Delete Button Click
    $(".delete-btn").on("click", function () {
        const unitId = $(this).data("id");
        $("#delete-confirm-btn").data("id", unitId);
        $("#confirm-delete-modal").modal("show");
    });

    // Confirm Delete
    $("#delete-confirm-btn").on("click", function () {
        const unitId = $(this).data("id");

        $.ajax({
            url: `/delete_military_unit/${unitId}`,
            type: "DELETE",
            success: function (response) {
                if (response.success) {
                    // If deletion is successful, reload the page
                    alert(response.message);
                    location.reload();
                } else {
                    // If deletion fails, display the error message in the modal
                    $("#delete-error-message")
                        .text(response.message) // Set the error message
                        .removeClass("d-none"); // Show the error message
                }
            },
            error: function (xhr) {
                // Handle unexpected errors
                const errorMessage =
                    xhr.responseJSON && xhr.responseJSON.message
                        ? xhr.responseJSON.message
                        : "An unexpected error occurred.";
                $("#delete-error-message")
                    .text(errorMessage) // Set the error message
                    .removeClass("d-none"); // Show the error message
            },
        });
    });

    //  init tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
//     Hiererachy   map
    // Fetch hierarchy data and render the map
    fetch("/military_units/hierarchy")
        .then((response) => response.json())
        .then((data) => renderHierarchyMap(data))
        .catch((error) => console.error("Error fetching hierarchy data:", error));

    function renderHierarchyMap(data) {
        const width = document.getElementById("hierarchy-map").offsetWidth;
        const height = 400;

        const svg = d3
            .select("#hierarchy-map")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const root = d3.hierarchy({ name: "Units", children: data });
        const treeLayout = d3.tree().size([width - 100, height - 100]);
        treeLayout(root);

        const nodes = root.descendants();
        const links = root.links();

        // Draw links
        svg
            .selectAll(".link")
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
        const nodeGroup = svg
            .selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d) => `translate(${d.x},${d.y})`);

        nodeGroup
            .append("circle")
            .attr("r", 10)
            .attr("fill", "#007bff");

        nodeGroup
            .append("text")
            .attr("dy", -15)
            .attr("text-anchor", "middle")
            .text((d) => d.data.name)
            .attr("font-size", "10px")
            .attr("fill", "#333");
    }

//      edit
    // Handle Edit Button Click
    $(".edit-btn").on("click", function () {
        const unitId = $(this).data("id");

        // Fetch record details and populate the modal
        $.get(`/get_military_unit/${unitId}`, function (response) {
            if (response.success) {
                const unit = response.data;

                // Populate modal fields
                $("#edit_military_units_id").val(unit.id);
                $("#edit_military_units_name").val(unit.name);
                $("#edit_military_units_key").val(unit.key);
                $("#edit_military_units_note").val(unit.note);
                $("#edit_military_units_parent").val(unit.parent || ""); // Select parent if exists

                // Show the edit modal
                $("#edit_military_units_modal").modal("show");
            } else {
                alert(response.message);
            }
        });
    });

    // Handle Edit Military Unit Form Submission
    $("#edit_military_units_form").on("submit", function (e) {
        e.preventDefault();

        const data = $(this).serialize(); // Serialize form data
        $.post("/edit_military_unit", data, function (response) {
            if (response.success) {
                alert(response.message);
                location.reload(); // Reload the page to refresh the table and hierarchy map
            } else {
                // Display error message in modal
                const errorAlert = `<div class="alert alert-danger" role="alert">${response.message}</div>`;
                $("#edit_military_units_modal .modal-body").prepend(errorAlert);

                // Remove error message after a few seconds
                setTimeout(() => {
                    $("#edit_military_units_modal .alert-danger").remove();
                }, 5000);
            }
        });
    });

    // Handle View Button Click
    $(".view-btn").on("click", function () {
        const unitId = $(this).data("id");

        // Fetch record details and populate the modal
        $.get(`/get_military_unit/${unitId}`, function (response) {
            if (response.success) {
                const unit = response.data;

                // Populate modal fields
                $("#view_military_units_name").text(unit.name);
                $("#view_military_units_key").text(unit.key);
                $("#view_military_units_note").text(unit.note || "Không có");
                $("#view_military_units_parent").text(unit.parent || "Không có (Đơn vị gốc)");
                $("#view_military_units_created-date").text(unit.created_date);

                // Show the view modal
                $("#view_military_units_modal").modal("show");
            } else {
                alert(response.message);
            }
        });
    });

});