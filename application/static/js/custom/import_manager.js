document.addEventListener("DOMContentLoaded", () => {
    // Attach event listener to the "template-btn" button
    const templateBtn = document.querySelector(".template-btn");

    templateBtn.addEventListener("click", () => {
        // Create a POST request to generate the Excel template
        fetch("/generate_excel_template", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": document.querySelector("input[name='csrf_token']").value, // Ensure you include CSRF token if needed
            },
        })
            .then((response) => {
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