document.addEventListener("DOMContentLoaded", () => {
    // Attach event listener to the "template-btn" button
    const templateBtn = document.querySelector(".template-btn");

    templateBtn.addEventListener("click", () => {
        event.stopPropagation();
        fetch("/generate_excel_template", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": document.querySelector("input[name='csrf_token']").value, // Ensure you include CSRF token if needed
            },
        })
            .then((response) => {
                console.log("Response:", response);
                if (!response.ok) {
                    throw new Error("Failed to generate the template");
                }
                return response.blob(); // Convert the response to a Blob
            })
            .then((blob) => {
                // Create a URL for the blob and trigger the download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = "template_import_manager.xlsx"; // Set the downloaded file name
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url); // Clean up the URL object
            })
            .catch((error) => {
                console.error("Error generating the template:", error);
                alert("Đã xảy ra lỗi khi tải mẫu Excel.");
            });
    });
});
let importedData = [];

// Function to reset Step 2
function resetStep2() {
    const previewTable = document.getElementById("preview-table");
    const previewHeader = document.getElementById("preview-header");

    // Clear the table content
    previewTable.innerHTML = "";

    // Reset the header or additional UI elements
    previewHeader.innerHTML = "Xem Trước Dữ Liệu";

    // Clear the imported data
    importedData = [];
}

function goToStep(stepNumber) {
    const steps = document.querySelectorAll(".step");
    steps.forEach((step, index) => {
        if (index + 1 === stepNumber) {

            step.classList.add("active"); // Add active class for the target step
            if (step.id === "step-2") {
                step.classList.add("full-width"); // Add full-width for Step 2
            } else {
                step.classList.remove("full-width"); // Reset for other steps
            }
        } else {
            step.classList.remove("active");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("file-drop-zone");
    const previewTable = document.getElementById("preview-table");
    const resultTable = document.getElementById("result-table").querySelector("tbody");



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
        handleFile(file);
        resetFileInput();
    });

    dropZone.addEventListener("click", () => fileInput.click());
    // fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
    fileInput.addEventListener("change", (e) => {
        handleFile(e.target.files[0]);
        resetFileInput(); // Reset the file input after handling the file
    });
    function resetFileInput() {
        fileInput.value = ""; // Reset file input so it can detect the same file again
    }
    function handleFile(file) {
        if (!file || !file.name.endsWith(".xlsx")) {
            alert("Vui lòng chọn tệp Excel hợp lệ.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Use the first sheet
           const raw_data = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // Use `defval` to handle empty cells
            importedData = preprocessData(raw_data);
            console.log(importedData);
            console.log("start go to step 2")
            renderPreviewTable(importedData);
            goToStep(2); // Transition to step 2
        };
        reader.readAsArrayBuffer(file);
    }


    function preprocessData(data) {
        // Mapping of Vietnamese column names to English keys
        const columnMapping = {
            "STT": "index",
            "CCCD": "identityCardNumber",
            "Họ Và Tên": "fullName",
            "Email": "email",
            "Tên Đăng Nhập": "username",
            "Mật Khẩu": "password",
            "Mật Khẩu Cấp Cấp2": "secondPassword",
            "Cấp Bậc": "rank",
        };

        // Map the data to match the backend expected structure
        return data.map((row) => {
            const convertedRow = {};
            Object.keys(row).forEach((key) => {
                const mappedKey = columnMapping[key]; // Get the English key
                if (mappedKey) {
                    convertedRow[mappedKey] = row[key]; // Assign the value to the new key
                }
            });
            return convertedRow;
        });
    }


    function renderPreviewTable(data) {
        const previewTableBody = document.getElementById("preview-table-body");
        previewTableBody.innerHTML = "";

        // Render the processed data into the preview table
        importedData.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td class="text-center" data-key="index" >${index + 1}</td>
            <td><input type="text" value="${row.identityCardNumber || ""}" data-key="identityCardNumber" /></td>
            <td><input type="text" value="${row.fullName || ""}" data-key="fullName" /></td>
            <td><input type="text" value="${row.email || ""}" data-key="email" /></td>
            <td><input type="text" value="${row.username || ""}" data-key="username" /></td>
            <td><input type="text" value="${row.password || ""}" data-key="password" /></td>
            <td><input type="text" value="${row.secondPassword || ""}" data-key="secondPassword" /></td>
            <td><input type="text" value="${row.rank || ""}" data-key="rank" /></td>
        `;
            previewTableBody.appendChild(tr);
        });
    }

    document.getElementById("next-btn").addEventListener("click", () => {
        const payload = { users: importedData };  // Wrap the data in an object with "users" key
        fetch("/api/import-manager-users", {
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
                renderResultTable(result);
                goToStep(3);
            })
            .catch((error) => console.error("Error:", error));
    });
    function renderResultTable(data) {
        const resultTableBody = document.getElementById("result-table-body");
        resultTableBody.innerHTML = ""; // Clear existing rows

        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            if (!row.success) {
                tr.classList.add("failure-row"); // Add class for failed rows
            }
            tr.innerHTML = `
            <td>${row.index || index + 1}</td>
            <td>${row.identityCardNumber || ""}</td>
            <td>${row.fullName || ""}</td>
            <td>${row.email || ""}</td>
            <td>${row.username || ""}</td>
            <td>${row.rank || ""}</td>
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

    function goToStep(stepNumber) {
        document.querySelectorAll(".step").forEach((step, index) => {
            step.classList.toggle("active", index + 1 === stepNumber);
        });
    }
});

document.getElementById("finish-btn").addEventListener("click", () => {
    location.reload(); // Reload the current page
});