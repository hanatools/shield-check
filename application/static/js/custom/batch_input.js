
document.addEventListener("DOMContentLoaded", async () => {
    let importedData = [];
    let militaryUnits = [];
    let processedImages = {};

    await fetchMilitaryUnits();
    function fetchMilitaryUnits() {
        return fetch("/get_military_units")
            .then((response) => response.json())
            .then((units) => {
                militaryUnits = units; // Cache the result
            })
            .catch((error) => console.error("Error fetching military units:", error));
    }

    const csrfToken = document.querySelector('input[name="csrf_token"]').value;

    // Attach event listener for template button
    const templateBtn = document.querySelector(".template-btn");
    templateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fetch("/generate_excel_template_import_normal_user", {
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
                a.download = "template_import_normal_soldier.xlsx";
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
            const identityCardNumber = row.identityCardNumber || "";
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td class="text-center" data-key="index">${index + 1}</td>
            <td>
                <input 
                    type="text" 
                    value="${identityCardNumber}" 
                    data-key="identityCardNumber" 
                    data-old-id="${identityCardNumber}" 
                    onchange="updateImageIds(this)"
                >
            </td>
            <td><input type="text" value="${row.fullName || ""}" data-key="fullName"></td>
            <td>${renderRankDropdown(row.unit || "")}</td>
            <td>
                <img 
                    src="" 
                    class="d-none" 
                    id="${identityCardNumber}_left" 
                    alt="" 
                    style="width: 50px; height: 50px; margin-top: 5px;" 
                />
            </td>
            <td>
                <img 
                    src="" 
                    class="d-none" 
                    id="${identityCardNumber}_right" 
                    alt="" 
                    style="width: 50px; height: 50px; margin-top: 5px;" 
                />
            </td>
            <td>
                <img 
                    src="" 
                    class="d-none" 
                    id="${identityCardNumber}_front" 
                    alt="" 
                    style="width: 50px; height: 50px; margin-top: 5px;" 
                />
            </td>
        `;
            previewTableBody.appendChild(tr);
        });
    }

    function updateImageIds(inputElement) {
        const oldId = inputElement.getAttribute("data-old-id") || ""; // Get the previous ID
        const newId = inputElement.value.trim(); // Get the updated value

        if (newId.length === 12) {
            // Update image IDs
            ["left", "right", "front"].forEach((side) => {
                const imgElement = document.getElementById(`${oldId}_${side}`);
                if (imgElement) {
                    imgElement.id = `${newId}_${side}`; // Set the new ID
                }
            });

            // Update the old ID in the data-key attribute
            inputElement.setAttribute("data-old-id", newId);
        } else {
            alert("CCCD phải có độ dài là 12 ký tự.");
            inputElement.value = oldId; // Revert to the old value
        }
    }
window.updateImageIds = updateImageIds
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

    document.getElementById("folder-upload-btn").addEventListener("click", () => {
        const folderInput = document.createElement("input");
        folderInput.type = "file";
        folderInput.multiple = true;

        folderInput.addEventListener("change", (event) => {
            const files = event.target.files;
            const fileArray = Array.from(files);

            fileArray.forEach((file) => {
                const fileName = file.name;
                console.log("fileName", fileName);

                const match = fileName.match(/^(\d{12})_(left|right|front)\.(png|jpg|jpeg)$/i);

                if (match) {
                    const [_, identityCardNumber, side] = match;

                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                        const base64Image = readerEvent.target.result;
                        updatePreviewImages(identityCardNumber, side, base64Image);

                    };
                    reader.readAsDataURL(file); // Convert file to base64
                }
            });
        });

        folderInput.click();
    });

        function updatePreviewImages(identityCardNumber, side, base64Image) {
        const imgElement = document.getElementById(`${identityCardNumber}_${side}`);
        if (imgElement) {
            imgElement.src = base64Image;
            imgElement.classList.remove("d-none");
            if (!processedImages[identityCardNumber]) {
                processedImages[identityCardNumber] = {};
            }
            processedImages[`${identityCardNumber}`][`${side}`] = base64Image
        }
    }



    document.getElementById("next-btn").addEventListener("click", () => {
        const nextBtn = document.getElementById("next-btn");

        // Disable the button and show loading indicator
        nextBtn.disabled = true;
        const originalText = nextBtn.innerHTML;
        nextBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';

        // Extract the latest data from the table
        const users = [];
        const tableRows = document.querySelectorAll("#preview-table-body tr");

        tableRows.forEach((row) => {
            const user = {};
            const inputs = row.querySelectorAll("input, select");

            inputs.forEach((input) => {
                const key = input.getAttribute("data-key");
                if (key) {
                    user[key] = input.value.trim(); // Get the latest value from the input
                }
            });

            if (user.identityCardNumber && user.fullName) {
                // Include only rows with required fields filled
                users.push(user);
            }
        });

        // Prepare the payload with the latest user data and images
        const payload = { users, images: processedImages };

        // Send the request to the API
        fetch("/api/import-normal-users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": document.querySelector("input[name='csrf_token']").value,
            },
            body: JSON.stringify(payload),
        })
            .then((response) => response.json())
            .then((result) => {
                console.log("Result:", result);
                renderResultTable(result); // Render results in the table
                goToStep(3); // Move to the next step
            })
            .catch((error) => console.error("Error:", error))
            .finally(() => {
                // Restore button state
                nextBtn.disabled = false; // Enable the button
                nextBtn.innerHTML = originalText; // Restore the original text
            });
    });

    function renderResultTable(data) {
        const resultTableBody = document.getElementById("result-table-body");
        resultTableBody.innerHTML = "";
        const militaryUnitMap = militaryUnits.reduce((map, unit) => {
            map[unit.id] = unit.name;
            return map;
        }, {});


        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            if (!row.success) {
                tr.classList.add("failure-row"); // Add class for failed rows
            }
            const unitName = militaryUnitMap[row.unit] || "";

            tr.innerHTML = `
            <td>${row.index || index + 1}</td>
            <td>${row.identityCardNumber || ""}</td>
            <td>${row.fullName || ""}</td>
            <td>${unitName}</td>
            <td>
                ${row.success
                ? '<span class="success">Thành công</span>'
                : '<span class="failure">Thất bại</span>'}
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


})