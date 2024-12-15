document.addEventListener("DOMContentLoaded", async () => {
    let importedData = [];

    let militaryUnits = [];

    await fetchMilitaryUnits();
    const csrfToken = document.querySelector('input[name="csrf_token"]').value;

    // Attach event listener for template button
    const templateBtn = document.querySelector(".template-btn");
    templateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fetch("/generate_excel_template", {
            method: "GET",
            headers: {
                "X-CSRFToken": csrfToken,
            },
        })
            .then((response) => {
                if (!response.ok) throw new Error("Failed to generate the template");
                return response.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "template_import_manager.xlsx";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch((error) => {
                console.error("Error generating the template:", error);
                alert("Đã xảy ra lỗi khi tải mẫu Excel.");
            });
    });

// Fetch military units and store them globally
    function fetchMilitaryUnits() {
        return fetch("/get_military_units")
            .then((response) => response.json())
            .then((units) => {
                militaryUnits = units; // Cache the result
            })
            .catch((error) => console.error("Error fetching military units:", error));
    }

    // Transition between steps
    function goToStep(stepNumber) {
        document.querySelectorAll(".step").forEach((step, index) => {
            step.classList.toggle("active", index + 1 === stepNumber);
        });
    }
    window.goToStep = goToStep;
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("file-drop-zone");

    // Drag-and-drop functionality
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("hover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("hover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("hover");
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
        fileInput.value = ""; // Reset input for re-selection
    });

    function handleFile(file) {
        if (!file.name.endsWith(".xlsx")) {
            alert("Vui lòng chọn tệp Excel hợp lệ.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: "array"});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(sheet, {defval: ""});
            importedData = preprocessData(rawData);
            renderPreviewTable(importedData);
            goToStep(2);
        };
        reader.readAsArrayBuffer(file);
    }

    function preprocessData(data) {
        const columnMapping = {
            "STT": "index",
            "CCCD": "identityCardNumber",
            "Họ Và Tên": "fullName",
            "Email": "email",
            "Tên Đăng Nhập": "username",
            "Mật Khẩu": "password",
            "Đơn vị": "unit",
        };

        return data.map((row) => {
            const convertedRow = {};
            for (const key in row) {
                const mappedKey = columnMapping[key];
                if (mappedKey) convertedRow[mappedKey] = row[key];
            }
            return convertedRow;
        });
    }

    function renderPreviewTable(data) {
        const previewTableBody = document.getElementById("preview-table-body");
        previewTableBody.innerHTML = "";

        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="text-center" data-key="index">${index + 1}</td>
                <td><input type="text" value="${row.identityCardNumber || ""}" data-key="identityCardNumber"></td>
                <td><input type="text" value="${row.fullName || ""}" data-key="fullName"></td>
                <td><input type="text" value="${row.email || ""}" data-key="email"></td>
                <td><input type="text" value="${row.username || ""}" data-key="username"></td>
                <td><input type="text" value="${row.password || ""}" data-key="password"></td>
     
                <td>${renderRankDropdown(row.unit || "")}</td>
            `;
            previewTableBody.appendChild(tr);
        });
    }

// Function to render dropdown for unit with military units
    function renderRankDropdown(selectedValue) {
        // Add an empty option as the first item
        const options = `<option value="">Chọn Đơn vị</option>` +
            militaryUnits
                .map(
                    (unit) =>
                        `<option value="${unit.id}" ${
                            unit.name === selectedValue ? "selected" : ""
                        }>${unit.name}</option>`
                )
                .join("");

        return `<select class="form-control form-select " data-key="unit" >${options}</select>`;
    }

    const nextBtn = document.getElementById("next-btn");
    nextBtn.addEventListener("click", () => {
        const payload = { users: extractTableData() };

        fetch("/api/import-manager-users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify(payload),
        })
            .then((response) => {
                if (!response.ok) {
                    if (response.status === 403) {
                        window.location.href = "/unauthorized";
                    } else {
                        throw new Error(`Unexpected error: ${response.status}`);
                    }
                }
                return response.json();
            })
            .then((result) => {
                renderResultTable(result);
                goToStep(3);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    });
    function extractTableData() {
        const rows = document.querySelectorAll("#preview-table-body tr");
        const extractedData = [];

        rows.forEach((row) => {
            const rowData = {};
            row.querySelectorAll("input, select").forEach((input) => {
                const key = input.dataset.key; // The key defined in the `data-key` attribute
                if (key) {
                    rowData[key] = input.value; // Get the current value of the input/select
                }
            });
            extractedData.push(rowData);
        });

        return extractedData;
    }

    function renderResultTable(data) {
        const resultTableBody = document.getElementById("result-table-body");
        resultTableBody.innerHTML = "";

        // Create a lookup dictionary for military unit names by ID
        const militaryUnitMap = militaryUnits.reduce((map, unit) => {
            map[unit.id] = unit.name;
            return map;
        }, {});

        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.classList.toggle("failure-row", !row.success);

            // Map unit (military unit ID) to its name
            const unitName = militaryUnitMap[row.unit] || "";

            tr.innerHTML = `
            <td>${row.index || index + 1}</td>
            <td>${row.identityCardNumber || ""}</td>
            <td>${row.fullName || ""}</td>
            <td>${row.email || ""}</td>
            <td>${row.username || ""}</td>
            <td>${unitName}</td>
            <td>
                ${
                row.success
                    ? '<span class="success">Thành công</span>'
                    : '<span class="failure">Thất bại</span>'
            }
            </td>
            <td>${row.note || ""}</td>
        `;
            resultTableBody.appendChild(tr);
        });
    }

    const finishBtn = document.getElementById("finish-btn");
    finishBtn.addEventListener("click", () => {
        location.reload();
    });
});