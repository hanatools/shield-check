document.addEventListener("DOMContentLoaded", function() {
    // Constants
    const IDENTITY_CARD_LENGTH = 12;

    // DOM Elements
    const container = document.getElementById('relativesContainer');
    const template = document.getElementById('relativeTemplate');
    const sponsorIdInput = document.getElementById('sponsor_identity_card');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('relativesForm');

    let relativeCount = 0;

    // Disable submit button initially
    submitBtn.disabled = true;

    // Initialize with first relative card
    addRelativeCard();

    // Validate all inputs and update submit button state
    function validateAllInputs() {
        const sponsorValid = isValidIdentityCard(sponsorIdInput.value.trim()) &&
            document.getElementById('sponsor_full_name').value.trim() !== '';

        let relativesValid = true;
        const relatives = new Set();

        container.querySelectorAll('.relative-card').forEach(card => {
            const identityInput = card.querySelector('.relative-identity');
            const nameInput = card.querySelector('.relative-name');
            const identity = identityInput.value.trim();

            if (!isValidIdentityCard(identity) ||
                !nameInput.value.trim() ||
                relatives.has(identity)) {
                relativesValid = false;
                return;
            }
            relatives.add(identity);
        });

        submitBtn.disabled = !(sponsorValid && relativesValid);
    }

    // Add Relative Button Click Handler
    document.getElementById('addRelativeBtn').addEventListener('click', addRelativeCard);

    // Validate Identity Card Format
    function isValidIdentityCard(value) {
        return /^\d{12}$/.test(value.trim());
    }

    // Display Error Message
    function showError(input, message) {
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
        input.classList.add('is-invalid');
        validateAllInputs();
    }

    // Clear Error Message
    function clearError(input) {
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.style.display = 'none';
        }
        input.classList.remove('is-invalid');
        validateAllInputs();
    }

    // Handle Identity Card Input Validation
    function handleIdentityCardInput(input) {
        const value = input.value.trim();

        if (value.length > 0 && !isValidIdentityCard(value)) {
            showError(input, "Số CCCD phải có đúng 12 chữ số");
            return false;
        }

        clearError(input);
        return true;
    }

    // API Requests
    async function makeRequest(url, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrf_token]').value
                }
            };
            if (data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(url, options);
            // if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            return null;
        }
    }

    // Fetch Relative Details
    async function fetchRelativeDetails(identityCard) {
        return await makeRequest(`/api/check-relative/${identityCard}`);
    }

    // Fetch Sponsor Details
    async function fetchSponsorDetails(identityCard) {
        return await makeRequest(`/get_user_by_identity/${identityCard}`);
    }

    // Clear Sponsor Fields
    function clearSponsorFields() {
        document.getElementById('sponsor_full_name').value = '';
        document.getElementById('sponsor_military_unit_name').value = '';
        document.getElementById('sponsor_military_unit_id').value = '';
        document.getElementById('sponsor_military_manager_full_name').value = '';
        document.getElementById('sponsor_military_manager_id').value = '';
        validateAllInputs();
    }

    // Update Sponsor Fields
    function updateSponsorFields(data) {
        document.getElementById('sponsor_full_name').value = data.full_name || '';
        document.getElementById('sponsor_military_unit_name').value = data.military_unit_name || '';
        document.getElementById('sponsor_military_unit_id').value = data.military_unit_id || '';
        document.getElementById('sponsor_military_manager_full_name').value = data.military_manager_name || '';
        document.getElementById('sponsor_military_manager_id').value = data.military_manager_id || '';
        validateAllInputs();
    }

    // Add New Relative Card
    function addRelativeCard() {
        const clone = template.content.cloneNode(true);

        // Replace INDEX placeholder with actual index
        clone.querySelectorAll('[name*="INDEX"]').forEach(input => {
            input.name = input.name.replace('INDEX', relativeCount);
        });

        container.appendChild(clone);
        relativeCount++;
        validateAllInputs();
    }

    // Event Delegation for Relative Cards
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-relative')) {
            const card = e.target.closest('.relative-card');
            if (container.children.length > 1) {
                card.remove();
                validateAllInputs();
            } else {
                alert('Phải có ít nhất một người thân');
            }
        }
    });

    // Handle Input Changes for All Fields
    container.addEventListener('input', function(e) {
        if (e.target.classList.contains('relative-identity') ||
            e.target.classList.contains('relative-name')) {
            validateAllInputs();
        }
        if (e.target.classList.contains('relative-identity')) {
            handleIdentityCardInput(e.target);
        }
    });

    // Handle Identity Card Validation and Data Fetch
    container.addEventListener('change', async function(e) {
        if (e.target.classList.contains('relative-identity')) {
            const card = e.target.closest('.relative-card');
            const identityInput = e.target;
            const nameInput = card.querySelector('.relative-name');

            if (!handleIdentityCardInput(identityInput)) return;

            const value = identityInput.value.trim();
            if (value.length === IDENTITY_CARD_LENGTH) {
                // Check for duplicate identity cards
                const allIdentityInputs = container.querySelectorAll('.relative-identity');
                const isDuplicate = Array.from(allIdentityInputs).some(input =>
                    input !== identityInput && input.value.trim() === value
                );

                if (isDuplicate) {
                    showError(identityInput, "Số CCCD này đã được thêm vào danh sách");
                    nameInput.value = '';
                    return;
                }

                const data = await fetchRelativeDetails(value);
                if (data && data.exists) {
                    nameInput.value = data.full_name;
                    nameInput.disabled = true;
                    clearError(identityInput);
                } else {
                    nameInput.value = '';
                    nameInput.disabled = false;
                }
                validateAllInputs();
            }
        }
    });

    // Handle Sponsor Identity Card Changes
    sponsorIdInput.addEventListener('input', function() {
        handleIdentityCardInput(this);
        validateAllInputs();
    });

    sponsorIdInput.addEventListener('change', async function() {
        if (!handleIdentityCardInput(this)) return;

        const value = this.value.trim();
        if (value.length === IDENTITY_CARD_LENGTH) {
            const data = await fetchSponsorDetails(value);
            if (data && data.identity_card) {
                updateSponsorFields(data);
                clearError(this);
            } else {
                clearSponsorFields();
                showError(this, "Không tìm thấy thông tin Quân nhân");
            }
            validateAllInputs();
        }
    });

    // Form Submit Handler with AJAX
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (submitBtn.disabled) return;

        // Prepare form data
        const formData = {
            sponsor_identity_card: sponsorIdInput.value.trim(),
            sponsor_military_unit_id: document.getElementById('sponsor_military_unit_id').value,
            sponsor_military_manager_id: document.getElementById('sponsor_military_manager_id').value,
            note: document.getElementById('note').value.trim(),
            relatives: []
        };

        // Collect relatives data
        container.querySelectorAll('.relative-card').forEach(card => {
            formData.relatives.push({
                identity_card: card.querySelector('.relative-identity').value.trim(),
                full_name: card.querySelector('.relative-name').value.trim(),
                relationship: card.querySelector('[name*="relationship"]').value.trim()
            });
        });

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';

            const response = await makeRequest('/register_relative', 'POST', formData);
            console.log(response);
            if (response.success) {
                // Show success message
                alert('Đăng ký thành công!');
                window.location.href = response.redirect_url || '/dashboard';
            } else {
                console.log(response.message);
                // Show error message
                alert(response.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Đăng ký';
            }
        } catch (error) {
            console.error('Submit Error:', error);
            alert('Có lỗi xảy ra. Vui lòng thử lại.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Đăng ký';
        }
    });
});