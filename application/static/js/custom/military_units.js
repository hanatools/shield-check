// $(document).ready(function () {
//     // Initialize DataTable
//     $("#military-units-table").DataTable();
//
//     // Add Military Unit Modal
//     $("#add-unit-btn").on("click", function () {
//         $("#add-unit-modal").modal("show");
//     });
//
//     // Handle Add Military Unit Form Submission
//     $("#add-unit-form").on("submit", function (e) {
//         e.preventDefault();
//         const data = $(this).serialize();
//         $.post("/add_military_unit", data, function (response) {
//             alert(response.message);
//             if (response.success) {
//                 location.reload();
//             }
//         });
//     });
//
//     // Handle Delete Button Click
//     $(".delete-btn").on("click", function () {
//         const unitId = $(this).data("id");
//         $("#delete-confirm-btn").data("id", unitId);
//         $("#confirm-delete-modal").modal("show");
//     });
//
//     // Confirm Delete
//     $("#delete-confirm-btn").on("click", function () {
//         const unitId = $(this).data("id");
//         $.ajax({
//             url: `/delete_military_unit/${unitId}`,
//             type: "DELETE",
//             success: function (response) {
//                 alert(response.message);
//                 if (response.success) {
//                     location.reload();
//                 }
//             },
//         });
//     });
// });

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
    $("#add-unit-btn").on("click", function () {
        $("#add-unit-modal").modal("show");
    });

    // Handle Add Military Unit Form Submission
    // $("#add-unit-form").on("submit", function (e) {
    //     e.preventDefault();
    //     const data = $(this).serialize();
    //     $.post("/add_military_unit", data, function (response) {
    //         alert(response.message);
    //         if (response.success) {
    //             location.reload();
    //         }
    //     });
    // });

    // Handle Add Military Unit Form Submission
    $("#add-unit-form").on("submit", function (e) {
        e.preventDefault();

        const data = $(this).serialize(); // Serialize form data, including `parent`
        $.post("/add_military_unit", data, function (response) {
            if (response.success) {
                alert(response.message);
                location.reload(); // Reload the page to refresh the table and hierarchy map
            } else {
                // Display error message in modal
                const errorAlert = `<div class="alert alert-danger" role="alert">${response.message}</div>`;
                $("#add-unit-modal .modal-body").prepend(errorAlert);

                // Remove error message after a few seconds
                setTimeout(() => {
                    $("#add-unit-modal .alert-danger").remove();
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
                alert(response.message);
                if (response.success) {
                    location.reload();
                }
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
                $("#edit-unit-id").val(unit.id);
                $("#edit-unit-name").val(unit.name);
                $("#edit-unit-key").val(unit.key);
                $("#edit-unit-note").val(unit.note);
                $("#edit-unit-parent").val(unit.parent || ""); // Select parent if exists

                // Show the edit modal
                $("#edit-unit-modal").modal("show");
            } else {
                alert(response.message);
            }
        });
    });

    // Handle Edit Military Unit Form Submission
    $("#edit-unit-form").on("submit", function (e) {
        e.preventDefault();

        const data = $(this).serialize(); // Serialize form data
        $.post("/edit_military_unit", data, function (response) {
            if (response.success) {
                alert(response.message);
                location.reload(); // Reload the page to refresh the table and hierarchy map
            } else {
                // Display error message in modal
                const errorAlert = `<div class="alert alert-danger" role="alert">${response.message}</div>`;
                $("#edit-unit-modal .modal-body").prepend(errorAlert);

                // Remove error message after a few seconds
                setTimeout(() => {
                    $("#edit-unit-modal .alert-danger").remove();
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
                $("#view-unit-name").text(unit.name);
                $("#view-unit-key").text(unit.key);
                $("#view-unit-note").text(unit.note || "Không có");
                $("#view-unit-parent").text(unit.parent || "Không có (Đơn vị gốc)");
                $("#view-unit-created-date").text(unit.created_date);

                // Show the view modal
                $("#view-unit-modal").modal("show");
            } else {
                alert(response.message);
            }
        });
    });

});