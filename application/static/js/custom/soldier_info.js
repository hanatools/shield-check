document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const searchQuery = formData.get('search');

    fetch(`/member_list?search=${searchQuery}`)
        .then(response => response.text())
        .then(html => {
            document.querySelector('.table-responsive').innerHTML = html;
        });
});


function handleSearch(query) {
    console.log("handleSearch called with query:", query);
    fetch(`/search_members?query=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => {
            const tableBody = document.getElementById("member-table");
            tableBody.innerHTML = ""; // Clear current table rows

            if (data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>`;
                return;
            }

            data.forEach((user, index) => {
                const row = document.createElement("tr");

                row.innerHTML = `
                   <td>${ user.id }</td>
                <td class="text-center">
                    <button
                            class="btn btn-info btn-sm"
                            data-bs-toggle="tooltip"
                            title="Xem"
                            onclick="viewUser(${ user.id })"
                    >
                        <i class="bi bi-eye"></i>
                    </button>
                    <button
                            class="btn btn-warning btn-sm"
                            data-bs-toggle="tooltip"
                            title="Sửa"
                            onclick="editUser(${ user.id })"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>
                    </form>
                </td>
                <td>${ user.full_name }</td>
                <td>${ user.identity_card }</td>
                <td>${ user.management_level }</td>
                <td>${ user.unit_name }</td>
                <td>${ user.email }</td>
                `;

                tableBody.appendChild(row);
            });

            // Reinitialize Bootstrap tooltips
            const tooltipTriggerList = [].slice.call(
                document.querySelectorAll('[data-bs-toggle="tooltip"]')
            );
            tooltipTriggerList.forEach((tooltipTriggerEl) => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        })
        .catch((error) => {
            console.error("Error fetching search results:", error);
        });
}

// Tooltip initialization
document.addEventListener("DOMContentLoaded", () => {
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

function viewUser(userId) {
    window.location.href = `/soldier_info_personal_user/${userId}`;
}