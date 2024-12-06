document.addEventListener("DOMContentLoaded", function () {
    const sponsorIdInput = document.getElementById("sponsorId");
    const sponsorNameInput = document.getElementById("sponsorName");
    const rankInput = document.getElementById("rank");

    sponsorIdInput.addEventListener("change", function () {
        const sponsorId = sponsorIdInput.value.trim();

        if (!sponsorId) {
            sponsorNameInput.value = "";
            rankInput.value = "";
            alert("Please enter a valid Sponsor ID.");
            return;
        }

        fetch(`/get_sponsor_details/${sponsorId}`)
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error("User not found");
                }
            })
            .then((data) => {
                sponsorNameInput.value = data.full_name || "";
                rankInput.value = data.management_level || "";
            })
            .catch((error) => {
                sponsorNameInput.value = "";
                rankInput.value = "";
                alert("User not exist.");
            });
    });
});