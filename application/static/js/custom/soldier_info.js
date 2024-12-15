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

function maskIdentityCard(identityCard) {
    // Mask all but the last 4 digits
    return identityCard.replace(/.(?=.{4})/g, "*");
}

function maskEmail(email) {
    // Mask the email's username part
    const [username, domain] = email.split("@");
    if (username.length <= 2) {
        return "*".repeat(username.length) + "@" + domain;
    }
    return username[0] + "*".repeat(username.length - 2) + username[username.length - 1] + "@" + domain;
}


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
                   <td>${user.id}</td>
                <td class="text-center">
                    <button
                            class="btn btn-info btn-sm"
                            data-bs-toggle="tooltip"
                            title="Xem"
                            onclick="viewUser(${user.id})"
                    >
                        <i class="bi bi-eye"></i>
                    </button>
         
                    </form>
                </td>
                <td>${user.full_name}</td>
               <td>${maskIdentityCard(user.identity_card)}</td>
                   <td>${user.management_level}</td>
                   <td>${user.unit_name}</td>
                   <td>${maskEmail(user.email)}</td>
                <td>${user.note}</td>
                <td>${user.created_time}</td>
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