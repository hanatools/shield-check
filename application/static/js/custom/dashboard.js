document.addEventListener("DOMContentLoaded", () => {
    // Initialize camera when the modal is shown
    const scanModal = document.getElementById("scanModal");

    scanModal.addEventListener("shown.bs.modal", () => {
        stopFaceCamera();
        initializeCamera();
    });

    scanModal.addEventListener("hidden.bs.modal", () => {
        stopCamera();
    });


    const faceScanModal = document.getElementById("faceScanModal");

    faceScanModal.addEventListener("shown.bs.modal", () => {
        stopCamera();
        initializeFaceScan();
    });

    faceScanModal.addEventListener("hidden.bs.modal", () => {
        stopFaceCamera()
    });





});



let codeReader = null;

// Initialize camera for QR scanning
async function initializeCamera() {
    const videoElement = document.getElementById("camera-stream");
    const imageElement = document.getElementById("captured-image");
    const qrResultContainer = document.getElementById("qr-result-container");
    const qrResultElement = document.getElementById("qr-result");
    const resetButton = document.getElementById("reset-button");

    qrResultContainer.style.display = "none"; // Hide result initially
    qrResultElement.textContent = ""; // Clear result text
    imageElement.style.display = "none"; // Hide the image initially
    videoElement.style.display = "block"; // Ensure video is displayed

    // Stop any existing codeReader
    if (codeReader) {
        codeReader.reset();
    }

    codeReader = new ZXing.BrowserQRCodeReader();

    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        if (videoInputDevices.length > 0) {
            const selectedDeviceId = videoInputDevices[0].deviceId;

            codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, error) => {
                if (result) {
                    console.log("QR code read:", result.text);
                    const extractedValue = extractIdentityCardValue(result.text);
                    if (extractedValue) {
                        showResult(extractedValue, videoElement, imageElement);
                    } else {
                        console.error("Invalid QR code format.");
                    }
                }

                if (error && !(error instanceof ZXing.NotFoundException)) {
                    console.error("Error reading QR code:", error.message);
                }
            });
        } else {
            console.error("No camera devices found.");
        }
    } catch (err) {
        console.error("Error initializing camera:", err.message);
    }

    resetButton.addEventListener("click", () => {
        initializeCamera();
    });
}

// Show QR scan result and handle frame capture
function showResult(extractedValue, videoElement, imageElement) {
    const qrResultContainer = document.getElementById("qr-result-container");
    const qrResultElement = document.getElementById("qr-result");

    qrResultElement.textContent = `Mã định danh: ${extractedValue}`;
    qrResultContainer.style.display = "block";

    // Use a new offscreen canvas to grab the current video frame
    const offscreenCanvas = document.createElement("canvas");
    const ctx = offscreenCanvas.getContext("2d");

    // Set canvas size to match video frame
    offscreenCanvas.width = videoElement.videoWidth;
    offscreenCanvas.height = videoElement.videoHeight;

    // Ensure the video feed is still active before capturing the frame
    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        // Draw the current video frame onto the canvas
        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Convert the canvas to a data URL
        const capturedImage = offscreenCanvas.toDataURL("image/png");
        if (capturedImage && capturedImage.startsWith("data:image/png")) {
            imageElement.src = capturedImage; // Set the image src to the captured data URL
            imageElement.style.display = "block"; // Show the captured image
            videoElement.style.display = "none"; // Hide the video feed
        } else {
            console.error("Failed to capture the video frame.");
        }
    } else {
        console.error("Video feed is not available or has been stopped.");
    }

    // Stop camera stream and QR code reader
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoElement.srcObject = null;
    }

    // Reset the codeReader to stop listening for QR codes
    if (codeReader) {
        console.log("Extracted value: ", extractedValue);
        sendToServer(extractedValue);
    }
}

// Send identity card value to server and handle response
function sendToServer(identityCardValue) {
    fetch(`/api/check-in/${identityCardValue}`, { method: "GET" })
        .then((response) => response.json())
        .then((record) => {
            closeScanModal()
            if (record.error) {
                showErrorModal(record.error);
            } else {
                populateUserDetails(record);
            }

        })
        .catch((error) => {
            console.error("Error sending identity card value to server:", error);
            closeScanModal()
        });
}

// Populate user details in the UI
function populateUserDetails(record) {
    console.log("Record: ", record);
    document.getElementById("fullname").value = record.full_name;
    document.getElementById("identity-card-number").value = record.identity_card;
    document.getElementById("unit").value = record.unit_name;
    document.getElementById("manager").value = record.management_level;
    document.getElementById("check-in-record-id-hidden").value = record.id;
    document.getElementById("created_time").value = formatDateTime(record.created_time);
    document.getElementById("status").value = record.status;
    document.getElementById("check_out_time").value = formatDateTime(record.check_out_time);
    document.getElementById("accepted_datetime").value = formatDateTime(record.accepted_datetime);

    const faceScanButton = document.getElementById("face-scan-button");
    if (faceScanButton) {
        faceScanButton.classList.remove("d-none");
    }

    const openScanModalBtn = document.getElementById("openScanModalBtn");
    if (openScanModalBtn) {
        openScanModalBtn.classList.add("d-none");
    }



}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);

    // Format day, month, year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();

    // Format hours, minutes, seconds
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Show error modal
function showErrorModal(message) {
    const errorModal = new bootstrap.Modal(document.getElementById("errorModal"));
    document.getElementById("error-message").textContent = message;
    errorModal.show();
}

// Helper to extract the identity card number


function extractIdentityCardValue(qrContent) {
    const parts = qrContent.split("|");
    if (parts.length > 0 && parts[0].length === 12) {
        return parts[0];
    }
    return null;
}

// Initialize camera on page load
function stopCamera() {
    const videoElement = document.getElementById("camera-stream");
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoElement.srcObject = null;
    }

    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
}

function closeScanModal() {
    const modalElement = document.getElementById("scanModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();
}

let faceCameraStream = null;

function initializeFaceScan() {
    const videoElement = document.getElementById("face-camera");

    // Access the camera
    navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
            faceCameraStream = stream; // Store the stream globally for later use
            videoElement.srcObject = stream;
        })
        .catch((error) => {
            console.error("Error accessing the camera:", error);
        });

}

function stopFaceCamera() {
    if (faceCameraStream) {
        // Stop all tracks of the stream
        faceCameraStream.getTracks().forEach((track) => track.stop());
        faceCameraStream = null; // Reset the stream variable
        console.log("Camera stopped.");
    }
}
document.getElementById("capture-photo").addEventListener("click", async () => {
    try {
        const videoElement = document.getElementById("face-camera");
        const identityCard = document.getElementById("identity-card-number").value;
        const checkInRecordId = document.getElementById("check-in-record-id-hidden").value;

        if (!identityCard || !checkInRecordId) {
            console.error("Identity card or check-in record ID is missing.");
            alert("Thông tin không đầy đủ để thực hiện xác minh.");
            return;
        }

        // Get CSRF token
        const csrfTokenInput = document.querySelector("input[name='csrf_token']");
        if (!csrfTokenInput) {
            console.error("CSRF token is missing.");
            alert("Không tìm thấy token bảo mật. Vui lòng tải lại trang.");
            return;
        }

        const csrfToken = csrfTokenInput.value;

        // Capture the current video frame
        const offscreenCanvas = document.createElement("canvas");
        const ctx = offscreenCanvas.getContext("2d");

        offscreenCanvas.width = videoElement.videoWidth;
        offscreenCanvas.height = videoElement.videoHeight;

        ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const capturedImage = offscreenCanvas.toDataURL("image/png");

        if (!capturedImage.startsWith("data:image/png")) {
            console.error("Failed to capture image.");
            alert("Không thể chụp ảnh. Vui lòng thử lại.");
            return;
        }

        // Prepare data for server
        const payload = {
            identity_card: identityCard,
            check_in_record_id: checkInRecordId,
            captured_image: capturedImage,
        };

        // Send the data to the server
        const response = await fetch("/validate-face-scan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            // Show success alert
            alert("Xác minh thành công!");

            // Close the modal
            const faceScanModal = bootstrap.Modal.getInstance(document.getElementById("faceScanModal"));
            faceScanModal.hide();
            window.location.href = "/reports";
        }

        else {
            alert(result.error || "Xác minh thất bại. Vui lòng thử lại.");
            console.error("Server error:", result);
        }
    } catch (error) {
        console.error("Error during face scan validation:", error);
        alert("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    }
});