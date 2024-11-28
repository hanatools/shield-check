
document.querySelectorAll('.main-button').forEach(button => {
    button.addEventListener('click', function (e) {
        const excludedIds = ['index', 'logout']; // List of IDs to exclude from submenu handling
        const buttonId = this.getAttribute('id'); // Get the ID of the button

        // Skip buttons that are in the excluded ID list
        if (excludedIds.includes(buttonId)) {
            return;
        }

        // Get the submenu to toggle
        const targetSubmenuSelector = this.getAttribute('data-target');
        const targetSubmenu = targetSubmenuSelector ? document.querySelector(targetSubmenuSelector) : null;

        // Check if the submenu exists
        if (targetSubmenu) {
            e.preventDefault(); // Prevent default behavior only if a submenu exists

            // Toggle the submenu
            if (targetSubmenu.style.display === 'block') {
                targetSubmenu.style.display = 'none';
            } else {
                // Close any open submenu
                document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
                // Open the clicked submenu
                targetSubmenu.style.display = 'block';
            }
        }
    });
});

/**
 * Function to activate sidebar links and ensure the main menu containing the active sub-menu is open.
 */
function activateSidebar() {
    const currentPath = window.location.pathname; // Get the current page path
    const sidebarLinks = document.querySelectorAll('.sidebar a'); // Select all sidebar links

    sidebarLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');

        // Check if the current link matches the current path
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active'); // Highlight the current link

            // If the link is inside a submenu, activate the parent main-button and show submenu
            const parentSubmenu = link.closest('.submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block'; // Ensure submenu is shown
                const mainButton = parentSubmenu.previousElementSibling; // Parent main button
                if (mainButton) {
                    mainButton.classList.add('active'); // Highlight the parent main-button
                }
            }
        }
    });
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', activateSidebar);