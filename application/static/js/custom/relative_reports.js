document.addEventListener('DOMContentLoaded', function() {
    const detailsModal = document.getElementById('detailsModal');

    // Handle click on view details button
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', async function() {
            const recordId = this.dataset.recordId;

            try {
                const response = await fetch(`/api/relative-details/${recordId}`);
                const data = await response.json();

                if (data.success) {
                    // Update modal content
                    document.getElementById('modalFullName').textContent = data.full_name;
                    document.getElementById('modalIdentityCard').textContent = data.identity_card;
                    document.getElementById('modalStatus').textContent = data.status_display;
                    document.getElementById('modalCreatedTime').textContent = data.created_time;
                    document.getElementById('modalSoldierName').textContent = data.sponsor_full_name;
                    document.getElementById('modalSoldierIdentityCard').textContent = data.sponsor_identity_card;
                    document.getElementById('modalUnitName').textContent = data.sponsor_military_unit_name;
                    document.getElementById('modalManagementLevel').textContent = data.sponsor_military_unit ? data.sponsor_military_unit.name : 'Không xác định';
                    document.getElementById('modalCheckInTime').textContent = data.check_in_time || 'Chưa đi vào';
                    document.getElementById('modalCheckOutTime').textContent = data.check_out_time || 'Chưa đi ra';

                    // Update images
                    const checkInImg = document.getElementById('modalCheckInImage');
                    const checkOutImg = document.getElementById('modalCheckOutImage');

                    if (data.check_in_image) {
                        checkInImg.src = "/public" + data.check_in_image;
                        checkInImg.style.display = 'block';
                    } else {
                        checkInImg.style.display = 'none';
                    }

                    if (data.check_out_image) {
                        checkOutImg.src = "/public" + data.check_out_image;
                        checkOutImg.style.display = 'block';
                    } else {
                        checkOutImg.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error fetching details:', error);
                alert('Có lỗi xảy ra khi tải thông tin chi tiết');
            }
        });
    });
});