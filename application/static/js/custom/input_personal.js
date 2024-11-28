const video = document.getElementById('camera-stream');
const qrResult = document.getElementById('qr-result');
const codeReader = new ZXing.BrowserQRCodeReader();

// Start the video stream and QR code reader
codeReader
    .decodeFromVideoDevice(null, video, (result, err) => {
        if (result) {
            // Process the decoded QR code
            const qrText = result.text;

            // Validate and extract data
            const parts = qrText.split('|');
            if (parts.length > 0 && parts[0].length === 12 && !isNaN(parts[0])) {
                const extractedValue = parts[0]; // Get the first value from the QR code
                qrResult.style.display = 'block';
                qrResult.textContent = `Mã định danh: ${extractedValue}`;
            } else {
                qrResult.style.display = 'block';
                qrResult.textContent = 'QR không hợp lệ. Vui lòng thử lại.';
            }
        }

        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error('Error reading QR code:', err);
        }
    })
    .catch((err) => {
        console.error('Error initializing QR code reader:', err);
        alert('Unable to access the camera. Please check your device settings.');
    });